import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z, ZodError } from "zod";
import { buildStoragePublicUrl, supabaseRest } from "./supabase";
import { createRateLimiter } from "./rateLimit";
import { createHash, createHmac } from "crypto";

const appConfigLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });
const leadLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
const conversationLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional(),
);

const appSlugSchema = z.object({
  slug: z.string().trim().min(1).max(64),
});

const leadCaptureSchema = z.object({
  appSlug: z.string().trim().min(1).max(64),
  name: optionalTrimmedString,
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : undefined),
    z.string().email().optional(),
  ),
  phone: optionalTrimmedString,
  source: optionalTrimmedString,
});

function normalizeSource(source?: string) {
  const validSources = ["nfc", "qr", "link", "direct"];
  const normalized = source ? source.trim().toLowerCase() : "direct";
  return validSources.includes(normalized) ? normalized : "direct";
}

const parsedWebhookTtlMs = Number.parseInt(
  String(process.env.TAVUS_WEBHOOK_DEDUPE_TTL_MS || "600000"),
  10,
);
const WEBHOOK_DEDUPE_TTL_MS = Number.isFinite(parsedWebhookTtlMs)
  ? parsedWebhookTtlMs
  : 600000;
const webhookDedupeStore = new Map<string, number>();

function getWebhookDedupeKey(req: Request): string | null {
  const signature = req.headers["x-tavus-signature"];
  if (typeof signature === "string" && signature.length > 0) {
    return `sig:${signature}`;
  }

  const rawBody = req.rawBody instanceof Buffer
    ? req.rawBody
    : Buffer.from(JSON.stringify(req.body ?? {}));
  const hash = createHash("sha256").update(rawBody).digest("hex");
  return `body:${hash}`;
}

function isDuplicateWebhook(key: string): boolean {
  const now = Date.now();
  const existing = webhookDedupeStore.get(key);
  if (existing && existing > now) {
    return true;
  }
  webhookDedupeStore.set(key, now + WEBHOOK_DEDUPE_TTL_MS);
  return false;
}

function verifyWebhookSignature(req: Request, secret: string): boolean {
  const signature = req.headers["x-tavus-signature"];
  if (typeof signature !== "string" || signature.length === 0) {
    return false;
  }

  const rawBody = req.rawBody instanceof Buffer
    ? req.rawBody
    : Buffer.from(JSON.stringify(req.body ?? {}));
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signature === expected;
}

function withRateLimit(
  req: Request,
  res: { status: (code: number) => any; json: (body: unknown) => any; setHeader: (name: string, value: string) => any },
  limiter: ReturnType<typeof createRateLimiter>,
  keySuffix: string,
) {
  const ip = req.ip || "unknown";
  const result = limiter(`${ip}:${keySuffix}`);
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  res.setHeader("X-RateLimit-Reset", String(result.resetAt));
  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(Math.max(result.resetAt - Date.now(), 0) / 1000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Too many requests" });
    return false;
  }
  return true;
}

const createConversationSchema = z.object({
  sessionId: z.string(),
  appSlug: z.string().trim().min(1).max(64).optional(),
  personaId: z.string().optional(),
  replicaId: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
  attendeeName: z.string().optional(),
  source: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/api/public/apps/:slug", async (req, res) => {
    const requestId = req.headers["x-request-id"] || "unknown";
    if (!withRateLimit(req, res, appConfigLimiter, "public-app")) {
      return;
    }

    try {
      const { slug } = appSlugSchema.parse(req.params);
      const appConfig = await fetchPublicAppConfig(slug);

      if (!appConfig) {
        return res.status(404).json({ error: "App not found" });
      }

      res.json(appConfig);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`public.app-config error requestId=${requestId} message=${errorMessage}`);

      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors,
        });
      }

      res.status(500).json({ error: "Failed to load app configuration" });
    }
  });

  app.post("/api/public/leads", async (req, res) => {
    const requestId = req.headers["x-request-id"] || "unknown";
    if (!withRateLimit(req, res, leadLimiter, "public-lead")) {
      return;
    }

    try {
      const { appSlug, name, email, phone, source } = leadCaptureSchema.parse(req.body);
      const leadSource = normalizeSource(source);
      const appRecord = await fetchLeadCaptureApp(appSlug);

      if (!appRecord) {
        return res.status(404).json({ error: "App not found" });
      }

      if (!appRecord.leadCaptureEnabled) {
        return res.status(403).json({ error: "Lead capture disabled" });
      }

      await supabaseRest("/rest/v1/leads", {
        method: "POST",
        headers: {
          Prefer: "return=minimal",
        },
        body: {
          app_id: appRecord.id,
          name,
          email,
          phone,
          source: leadSource,
        },
      });

      res.json({ ok: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`public.lead error requestId=${requestId} message=${errorMessage}`);

      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors,
        });
      }

      res.status(500).json({ error: "Failed to capture lead" });
    }
  });

  // Create Tavus conversation
  app.post("/api/conversations", async (req, res) => {
    const requestId = req.headers["x-request-id"] || "unknown";
    if (!withRateLimit(req, res, conversationLimiter, "public-conversation")) {
      return;
    }

    try {
      const { sessionId, appSlug, personaId, replicaId, documentIds, attendeeName, source } = createConversationSchema.parse(req.body);

      // Normalize and validate traffic source for analytics
      const validSources = ['nfc', 'qr', 'link', 'direct'];
      const normalizedSource = source ? source.trim().toLowerCase() : 'direct';
      const trafficSource = validSources.includes(normalizedSource) ? normalizedSource : 'direct';
      
      console.log(`📊 New conversation - Session: ${sessionId.slice(0, 8)}, Source: ${trafficSource}`);
      console.log(`tavus.create start session=${sessionId.slice(0, 8)} source=${trafficSource}`);

      const API_KEY = String(process.env.TAVUS_API_KEY || '').trim();
      const REPLICA_ID = String(process.env.TAVUS_REPLICA_ID || '').trim();
      const PERSONA_ID = String(process.env.TAVUS_PERSONA_ID || '').trim();
      const DOCUMENT_STRATEGY = String(process.env.TAVUS_DOCUMENT_STRATEGY || 'balanced').trim();
      const WEBHOOK_SECRET = String(process.env.TAVUS_WEBHOOK_SECRET || '').trim();

      // Short-circuit if API key is missing
      if (!API_KEY) {
        return res.status(500).json({
          error: "Server configuration error",
          message: "TAVUS_API_KEY is not configured. Please contact system administrator.",
        });
      }

      const appConfig = appSlug ? await fetchConversationConfig(appSlug) : null;
      if (appSlug && !appConfig) {
        return res.status(404).json({ error: "App not found" });
      }

      const effectiveReplicaId = appConfig
        ? appConfig.replica?.tavusReplicaId || undefined
        : replicaId || REPLICA_ID;
      const effectivePersonaId = appConfig
        ? appConfig.replica?.tavusPersonaId || undefined
        : personaId || PERSONA_ID;

      // Validate that we have at least one identifier
      if (!effectivePersonaId && !effectiveReplicaId) {
        return res.status(400).json({
          error: "Missing required identifier",
          message: appConfig
            ? "App configuration missing Tavus replica or persona ID"
            : "Either personaId or replicaId must be provided, or TAVUS_REPLICA_ID/TAVUS_PERSONA_ID must be configured",
        });
      }

      const baseLabel = appConfig?.productLabel || appConfig?.companyName || appConfig?.slug || "AI Conversation";
      const conversationName = attendeeName
        ? `${baseLabel} - ${attendeeName} (${trafficSource}) [${sessionId.slice(0, 8)}]`
        : `${baseLabel} (${trafficSource}) [${sessionId.slice(0, 8)}]`;

      const maxCallDuration = appConfig?.conversationDurationSeconds && appConfig.conversationDurationSeconds > 0
        ? appConfig.conversationDurationSeconds
        : 150;

      // Build Tavus API payload using app configuration
      const payload: any = {
        persona_id: effectivePersonaId || undefined,
        replica_id: effectiveReplicaId || undefined,
        conversation_name: conversationName,
        properties: {
          max_call_duration: maxCallDuration,
          participant_left_timeout: 0,
          participant_absent_timeout: 300,
          enable_recording: false,
          enable_transcription: true,
        },
      };

      if (appConfig?.conversationContext) {
        payload.conversational_context = appConfig.conversationContext;
      }

      if (appConfig?.customGreeting) {
        payload.custom_greeting = appConfig.customGreeting;
      }

      const effectiveDocumentIds = appConfig ? appConfig.documentIds : documentIds;
      if (effectiveDocumentIds && effectiveDocumentIds.length > 0) {
        payload.document_ids = effectiveDocumentIds;
        payload.document_retrieval_strategy = appConfig?.documentStrategy || DOCUMENT_STRATEGY;
      }

      // Add webhook callback URL if secret is configured
      if (WEBHOOK_SECRET && req.headers.host) {
        const protocol = req.secure ? 'https' : 'http';
        payload.callback_url = `${protocol}://${req.headers.host}/api/webhook/conversation-ended`;
      }

      // Call Tavus API to create conversation
      const tavusResponse = await fetch("https://tavusapi.com/v2/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!tavusResponse.ok) {
        const errorText = await tavusResponse.text();
        const errorMessage = errorText.length > 300 ? `${errorText.slice(0, 300)}...` : errorText;
        console.error(`tavus.create failed requestId=${requestId} status=${tavusResponse.status} message=${errorMessage}`);
        
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }
        
        return res.status(tavusResponse.status).json({
          error: "Failed to create Tavus conversation",
          details: errorDetails,
        });
      }

      const tavusData = await tavusResponse.json();

      // Extract conversation URL and ID (with fallbacks like reference implementation)
      const conversationUrl = tavusData.conversation_url || tavusData.url || tavusData.link || null;
      const conversationId = tavusData.conversation_id || tavusData.id || null;

      if (!conversationUrl || !conversationId) {
        console.error(`Tavus API response missing required fields requestId=${requestId}:`, tavusData);
        return res.status(500).json({
          error: "Invalid Tavus API response",
          message: "Missing conversation_url or conversation_id in response",
        });
      }

      console.log(`tavus.create ok status=${tavusResponse.status} id=${conversationId}`);

      // Store session with conversation data using the provided sessionId
      const session = await storage.createSession(sessionId, {
        appId: appConfig?.id,
        source: trafficSource,
        conversationId,
        conversationUrl,
        status: tavusData.status || 'active',
      });

      res.json({
        sessionId: session.id,
        conversationUrl,
        conversationId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`tavus.create exception requestId=${requestId} message=${errorMessage}`);
      
      // Handle Zod validation errors as 400 Bad Request
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors,
        });
      }
      
      const status = (error as any).status || 500;
      const message = error instanceof Error ? error.message : "Unknown error";
      
      res.status(status).json({
        error: "Failed to create conversation",
        message,
      });
    }
  });

  // Get session status
  app.get("/api/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Webhook endpoint for Tavus conversation events
  app.post("/api/webhook/conversation-ended", async (req, res) => {
    try {
      const WEBHOOK_SECRET = String(process.env.TAVUS_WEBHOOK_SECRET || '').trim();
      const WEBHOOK_VERIFY = String(process.env.TAVUS_WEBHOOK_VERIFY || "").trim().toLowerCase() === "true";

      const dedupeKey = getWebhookDedupeKey(req);
      if (dedupeKey && isDuplicateWebhook(dedupeKey)) {
        console.log("Tavus webhook duplicate event ignored");
        return res.json({ received: true, duplicate: true });
      }
      
      // Verify webhook signature if secret is configured
      if (WEBHOOK_SECRET) {
        const signature = req.headers['x-tavus-signature'] as string;
        console.log("Tavus webhook signature:", signature ? "present" : "missing");

        if (WEBHOOK_VERIFY && !verifyWebhookSignature(req, WEBHOOK_SECRET)) {
          console.warn("Tavus webhook signature verification failed");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      // Log the webhook event
      console.log("Tavus conversation ended webhook:", JSON.stringify(req.body, null, 2));

      // You can add custom logic here to handle conversation completion
      // For example: update session status, send follow-up emails, etc.

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

type AppConfigRow = {
  id: string;
  slug: string;
  company_name: string | null;
  company_url: string | null;
  logo_path: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  background_color: string | null;
  foreground_color: string | null;
  scheduling_url: string | null;
  product_label: string | null;
  conversation_duration_seconds: number | null;
  lead_capture_enabled: boolean | null;
  replica: { id: string; name: string | null; tavus_replica_id: string | null } | null;
  tenant: { id: string; enabled: boolean | null } | null;
};

type PublicAppConfig = {
  id: string;
  slug: string;
  companyName: string | null;
  companyUrl: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  foregroundColor: string | null;
  schedulingUrl: string | null;
  productLabel: string | null;
  conversationDurationSeconds: number | null;
  leadCaptureEnabled: boolean;
  replica: { id: string; name: string | null; tavusReplicaId: string | null } | null;
};

type ConversationAppRow = {
  id: string;
  slug: string;
  company_name: string | null;
  product_label: string | null;
  conversation_context: string | null;
  custom_greeting: string | null;
  conversation_duration_seconds: number | null;
  document_strategy: string | null;
  replica: {
    id: string;
    name: string | null;
    tavus_replica_id: string | null;
    tavus_persona_id: string | null;
  } | null;
  tenant: { id: string; enabled: boolean | null } | null;
};

type AppDocumentRow = {
  document: { tavus_document_id: string | null; enabled: boolean | null } | null;
};

type ConversationAppConfig = {
  id: string;
  slug: string;
  companyName: string | null;
  productLabel: string | null;
  conversationContext: string | null;
  customGreeting: string | null;
  conversationDurationSeconds: number | null;
  documentStrategy: string | null;
  replica: { id: string; name: string | null; tavusReplicaId: string | null; tavusPersonaId: string | null } | null;
  documentIds: string[];
};

async function fetchPublicAppConfig(slug: string): Promise<PublicAppConfig | null> {
  const params = new URLSearchParams({
    slug: `eq.${slug}`,
    enabled: "eq.true",
    limit: "1",
    select: [
      "id",
      "slug",
      "company_name",
      "company_url",
      "logo_path",
      "logo_url",
      "primary_color",
      "secondary_color",
      "background_color",
      "foreground_color",
      "scheduling_url",
      "product_label",
      "conversation_duration_seconds",
      "lead_capture_enabled",
      "replica:replicas(id,name,tavus_replica_id)",
      "tenant:tenants(id,enabled)",
    ].join(","),
  });

  const rows = await supabaseRest<AppConfigRow[]>(`/rest/v1/apps?${params.toString()}`);
  const row = rows?.[0];

  if (!row || row.tenant?.enabled === false) {
    return null;
  }

  const logoUrl = buildStoragePublicUrl(row.logo_path || row.logo_url);

  const conversationDurationSeconds = Number.isFinite(row.conversation_duration_seconds)
    ? row.conversation_duration_seconds
    : row.conversation_duration_seconds
      ? Number(row.conversation_duration_seconds)
      : null;

  return {
    id: row.id,
    slug: row.slug,
    companyName: row.company_name,
    companyUrl: row.company_url,
    logoUrl,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    backgroundColor: row.background_color,
    foregroundColor: row.foreground_color,
    schedulingUrl: row.scheduling_url,
    productLabel: row.product_label,
    conversationDurationSeconds: Number.isFinite(conversationDurationSeconds) ? conversationDurationSeconds : null,
    leadCaptureEnabled: Boolean(row.lead_capture_enabled),
    replica: row.replica
      ? {
          id: row.replica.id,
          name: row.replica.name,
          tavusReplicaId: row.replica.tavus_replica_id,
        }
      : null,
  };
}

async function fetchLeadCaptureApp(
  slug: string,
): Promise<{ id: string; leadCaptureEnabled: boolean } | null> {
  const params = new URLSearchParams({
    slug: `eq.${slug}`,
    enabled: "eq.true",
    limit: "1",
    select: ["id", "lead_capture_enabled", "tenant:tenants(id,enabled)"].join(","),
  });

  const rows = await supabaseRest<AppConfigRow[]>(`/rest/v1/apps?${params.toString()}`);
  const row = rows?.[0];

  if (!row || row.tenant?.enabled === false) {
    return null;
  }

  return {
    id: row.id,
    leadCaptureEnabled: Boolean(row.lead_capture_enabled),
  };
}

async function fetchConversationConfig(slug: string): Promise<ConversationAppConfig | null> {
  const params = new URLSearchParams({
    slug: `eq.${slug}`,
    enabled: "eq.true",
    limit: "1",
    select: [
      "id",
      "slug",
      "company_name",
      "product_label",
      "conversation_context",
      "custom_greeting",
      "conversation_duration_seconds",
      "document_strategy",
      "replica:replicas(id,name,tavus_replica_id,tavus_persona_id)",
      "tenant:tenants(id,enabled)",
    ].join(","),
  });

  const rows = await supabaseRest<ConversationAppRow[]>(`/rest/v1/apps?${params.toString()}`);
  const row = rows?.[0];

  if (!row || row.tenant?.enabled === false) {
    return null;
  }

  const documentIds = await fetchAppDocumentIds(row.id);

  const conversationDurationSeconds = Number.isFinite(row.conversation_duration_seconds)
    ? row.conversation_duration_seconds
    : row.conversation_duration_seconds
      ? Number(row.conversation_duration_seconds)
      : null;

  return {
    id: row.id,
    slug: row.slug,
    companyName: row.company_name,
    productLabel: row.product_label,
    conversationContext: row.conversation_context,
    customGreeting: row.custom_greeting,
    conversationDurationSeconds: Number.isFinite(conversationDurationSeconds) ? conversationDurationSeconds : null,
    documentStrategy: row.document_strategy,
    replica: row.replica
      ? {
          id: row.replica.id,
          name: row.replica.name,
          tavusReplicaId: row.replica.tavus_replica_id,
          tavusPersonaId: row.replica.tavus_persona_id,
        }
      : null,
    documentIds,
  };
}

async function fetchAppDocumentIds(appId: string): Promise<string[]> {
  const params = new URLSearchParams({
    app_id: `eq.${appId}`,
    enabled: "eq.true",
    select: "document:kb_documents(tavus_document_id,enabled)",
  });

  const rows = await supabaseRest<AppDocumentRow[]>(`/rest/v1/app_documents?${params.toString()}`);
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows
    .map((row) => row.document)
    .filter((document): document is { tavus_document_id: string; enabled: boolean | null } =>
      Boolean(document?.tavus_document_id) && document?.enabled !== false,
    )
    .map((document) => document.tavus_document_id);
}
