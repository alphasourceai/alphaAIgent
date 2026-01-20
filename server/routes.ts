import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z, ZodError } from "zod";

const createConversationSchema = z.object({
  sessionId: z.string(),
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

  // Create Tavus conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const { sessionId, personaId, replicaId, documentIds, attendeeName, source } = createConversationSchema.parse(req.body);

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

      // Use environment defaults or request values
      const effectiveReplicaId = replicaId || REPLICA_ID;
      const effectivePersonaId = personaId || PERSONA_ID;

      // Validate that we have at least one identifier
      if (!effectivePersonaId && !effectiveReplicaId) {
        return res.status(400).json({
          error: "Missing required identifier",
          message: "Either personaId or replicaId must be provided, or TAVUS_REPLICA_ID/TAVUS_PERSONA_ID must be configured",
        });
      }

      // Define conversational context for alphaScreen with comprehensive knowledge base
      const conversationalContext = [
        'CRITICAL INSTRUCTION - START THE CONVERSATION PROACTIVELY:',
        'As soon as the conversation starts, immediately greet the person warmly and introduce yourself.',
        'Say the greeting exactly as provided: "Welcome! I\'m excited to share how alphaScreen can transform your hiring process. Would you like to dive into a specific feature or hear a quick summary first?"',
        'DO NOT wait for them to speak first. YOU must initiate the conversation with this warm welcome.',
        'This is a product demonstration conversation, not a job interview. You are demonstrating alphaScreen to potential customers.',
        
        'YOUR ROLE:',
        'You are a friendly AI representative from AlphaSource Technologies.',
        'You are demonstrating alphaScreen to potential customers and business leaders.',
        'You have 2.5 minutes to have an engaging conversation about our AI-powered hiring automation platform.',
        'Your goal is to understand their hiring needs and show how alphaScreen solves their problems.',
        
        'WHAT IS ALPHASCREEN:',
        'alphaScreen is a next-generation hiring tool that helps companies evaluate job applicants using AI-driven video conversations, resume analysis, objective scoring, and automated reports.',
        'The system replaces manual scheduling, subjective screening calls, and lengthy evaluation cycles with a fully automated, scalable, and fair analysis workflow.',
        'It is designed for companies that want to screen more applicants in less time, reduce bias, and give hiring teams detailed, data-rich insights without requiring hours of manual work.',
        
        'HOW IT WORKS - THE COMPLETE WORKFLOW:',
        'Step 1 - Create a Role: A hiring manager creates a new role in the dashboard, uploads the job description, selects assessment type (Basic for quick screen, Detailed for leadership roles, or Technical for skills-focused), and can add optional custom questions.',
        'The platform uses AI to automatically parse the job description and create a role-specific question set and evaluation rubric, which becomes that role\'s AI knowledge base used to generate questions, score responses, and flag strengths and gaps.',
        'Step 2 - Invite Applicants: The system creates a unique assessment invitation link for each role. Applicants can access it directly via the link with no scheduling required.',
        'Step 3 - Applicants Complete AI Conversation: Using a secure web link, applicants verify their identity with a one-time passcode, start their AI-powered conversation session, engage in a natural dialogue about their qualifications, and submit when finished. The entire process is asynchronous with no recruiter present.',
        'Step 4 - AI Evaluation: Once the conversation finishes, the system automatically analyzes the resume (skills, experience alignment, qualifications, fit for the role) and conversation responses (communication clarity, technical accuracy, behavioral attributes, job-specific competencies, confidence, and relevance). It produces detailed scores, insights, and recommendations.',
        'Step 5 - Automated Report: When both resume and conversation analysis are complete, a branded PDF report is generated with detailed scoring breakdowns, insights, and recommendations. The report is stored and linked in the dashboard.',
        
        'KEY DIFFERENTIATORS:',
        'Automated AI Conversations powered by Tavus, tailored to each role with no live recruiter required.',
        'Resume Plus Conversation Combined Scoring - most platforms only score one aspect, but we combine resume fit and conversation performance including answers and non-verbal cues for a holistic view.',
        'Role-Specific AI Knowledge Base where each role has a custom-built rubric generated from the job description ensuring evaluations are relevant and consistent.',
        'Fully Branded Experience with your logo, your color palette, professional email templates, and clean modern interface.',
        'EEOC and ADA-Aligned Evaluation - the system never analyzes demographic attributes, avoids protected characteristics, and scores only job-related content.',
        'Automated PDF Reports that are fast, polished, and consistent scoring documents.',
        'Recruiter Dashboard where hiring teams can create roles, track applicants, review assessments, download reports, and manage permissions.',
        'Secure and SOC-Friendly with hosting on modern cloud infrastructure, signed access links, role-based access control, and expiring links.',
        'Infinitely Scalable from 10 applicants to 10,000 with no need for more recruiters.',
        
        'APPLICANT EXPERIENCE:',
        'Simple friendly workflow: Person receives email invite, clicks secure link, enters their information and uploads resume, verifies identity with OTP, starts the AI conversation, has a natural human-like dialogue about their qualifications, and submits when finished. The process is designed to be intuitive and non-intimidating.',
        
        'VALUE FOR HIRING TEAMS:',
        'Save Time with no more hours of initial phone screens, no need to repeat the same questions dozens of times per week, and reports arrive automatically.',
        'Improve Quality through consistent scoring, no recruiter fatigue, role-specific evaluation, and objective governance.',
        'Increase Applicant Throughput by screening 5 times more people, accelerating hiring pipelines, detecting strong talent earlier, and allowing applicants to participate 24/7 as their schedule requires.',
        'Reduce Bias with no personal demographic perception, evaluations based solely on job requirements, and same rubric for everyone.',
        'Stronger Documentation through PDF reports helping with audit trails and compliance and easy cross-team sharing.',
        
        'COMMON USE CASES:',
        'High-volume hiring, early-stage screening, technical role evaluation, multi-location teams, roles requiring consistent evaluation, companies replacing manual phone screens, and teams wanting more signal before scheduling live conversations.',
        
        'FREQUENTLY ASKED QUESTIONS:',
        'Assessment length is typically 10 to 15 minutes depending on role type.',
        'Equipment needed is just a phone or computer with camera, microphone, and stable internet.',
        'AI scoring is fair because the system analyzes only job-related content not personal traits and follows ADA/EEOC-aligned guidelines.',
        'Reports include scores, insights, strengths, weaknesses, and job-specific evaluation results.',
        'Applicants do not see their report by default - reports are for hiring teams unless the employer chooses to share them.',
        'Assessments are not live but asynchronous and fully flexible for both applicants and employers.',
        
        'CONVERSATION STYLE AND IMPORTANT REMINDERS:',
        'REMEMBER: This is a product demonstration conversation with a potential customer, NOT a job assessment or screening call.',
        'YOU MUST START the conversation by greeting them warmly with the exact greeting provided.',
        'Be friendly, enthusiastic, and professional. Speak at a brisk, energetic pace to convey excitement and maximize engagement.',
        'Keep responses very brief (1-2 sentences maximum per answer) and deliver them quickly and efficiently to fit within the 2.5-minute time limit.',
        'Focus on understanding their specific hiring challenges and pain points as a business leader or HR professional, then explain how alphaScreen directly addresses those needs.',
        'Ask engaging questions about their hiring process like: How many people do you typically screen? What are your biggest hiring bottlenecks? Are you looking to reduce time-to-hire?',
        'Encourage them to visit our website at alphasourceai.com or schedule a demo for detailed information and personalized consultation.',
        'When asked about specific features, reference the details above. When asked about fairness or compliance, emphasize our EEOC and ADA-aligned approach.',
        'If asked about pricing or enterprise features, recommend they schedule a demo to discuss their specific needs and get customized information.',
        'NEVER refer to this as an interview or screening - you are demonstrating alphaScreen to a potential customer.',
        
        'CRITICAL PRONUNCIATION GUIDANCE:',
        'When mentioning the word resume (job resume, curriculum vitae), always pronounce it as rez-oo-MAY with emphasis on the final syllable, not REZ-oo-may or REZ-oom.',
        'When mentioning our website address, always say it phonetically as: alpha source A I dot com (spelling out A I as separate letters, not saying the word "ay").',
        'These pronunciations are essential for professional communication and brand consistency.'
      ].join(' ');

      // Build Tavus API payload with custom greeting to make agent speak first
      const payload: any = {
        persona_id: effectivePersonaId || undefined,
        replica_id: effectiveReplicaId || undefined,
        conversation_name: attendeeName 
          ? `alphaScreen Demo - ${attendeeName} (${trafficSource}) [${sessionId.slice(0, 8)}]`
          : `alphaScreen Demo (${trafficSource}) [${sessionId.slice(0, 8)}]`,
        conversational_context: conversationalContext,
        custom_greeting: "Welcome! I'm excited to share how alphaScreen can transform your hiring process. Would you like to dive into a specific feature or hear a quick summary first?",
        properties: {
          max_call_duration: 150,
          participant_left_timeout: 0,
          participant_absent_timeout: 300,
          enable_recording: false,
          enable_transcription: true,
        },
      };

      // Attach knowledge base documents if provided
      if (documentIds && documentIds.length > 0) {
        payload.document_ids = documentIds;
        payload.document_retrieval_strategy = DOCUMENT_STRATEGY;
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
        console.error(`tavus.create failed status=${tavusResponse.status} message=${errorMessage}`);
        
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
        console.error("Tavus API response missing required fields:", tavusData);
        return res.status(500).json({
          error: "Invalid Tavus API response",
          message: "Missing conversation_url or conversation_id in response",
        });
      }

      console.log(`tavus.create ok status=${tavusResponse.status} id=${conversationId}`);

      // Store session with conversation data using the provided sessionId
      const session = await storage.createSession(sessionId, {
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
      console.error(`tavus.create exception message=${errorMessage}`);
      
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
      
      // Verify webhook signature if secret is configured
      if (WEBHOOK_SECRET) {
        const signature = req.headers['x-tavus-signature'] as string;
        // Note: In production, you would verify the signature here
        // For now, we'll just log the webhook event
        console.log("Tavus webhook signature:", signature ? "present" : "missing");
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
