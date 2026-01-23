import { type Session, type InsertSession } from "@shared/schema";
import { supabaseRest } from "./supabase";

export interface IStorage {
  getSession(id: string): Promise<Session | undefined>;
  getSessionByConversationId(conversationId: string): Promise<Session | undefined>;
  createSession(id: string, session: InsertSession): Promise<Session>;
  updateSession(id: string, session: Partial<InsertSession>): Promise<Session | undefined>;
}

type SessionRow = {
  id: string;
  app_id: string | null;
  lead_id: string | null;
  source: string | null;
  conversation_id: string | null;
  conversation_url: string | null;
  status: string | null;
  created_at: string | null;
};

function mapRowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    appId: row.app_id,
    leadId: row.lead_id,
    source: row.source,
    conversationId: row.conversation_id,
    conversationUrl: row.conversation_url,
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function mapInsertSession(id: string, session: InsertSession) {
  return {
    id,
    app_id: session.appId ?? null,
    lead_id: session.leadId ?? null,
    source: session.source ?? null,
    conversation_id: session.conversationId ?? null,
    conversation_url: session.conversationUrl ?? null,
    status: session.status ?? null,
  };
}

function mapPartialSession(session: Partial<InsertSession>) {
  const payload: Record<string, string | null> = {};
  if ("appId" in session) {
    payload.app_id = session.appId ?? null;
  }
  if ("leadId" in session) {
    payload.lead_id = session.leadId ?? null;
  }
  if ("source" in session) {
    payload.source = session.source ?? null;
  }
  if ("conversationId" in session) {
    payload.conversation_id = session.conversationId ?? null;
  }
  if ("conversationUrl" in session) {
    payload.conversation_url = session.conversationUrl ?? null;
  }
  if ("status" in session) {
    payload.status = session.status ?? null;
  }
  return payload;
}

export class SupabaseStorage implements IStorage {
  async getSession(id: string): Promise<Session | undefined> {
    const params = new URLSearchParams({
      id: `eq.${id}`,
      limit: "1",
    });
    const rows = await supabaseRest<SessionRow[]>(`/rest/v1/sessions?${params.toString()}`);
    const row = rows?.[0];
    return row ? mapRowToSession(row) : undefined;
  }

  async getSessionByConversationId(conversationId: string): Promise<Session | undefined> {
    for (const session of this.sessions.values()) {
      if (session.conversationId === conversationId) {
        return session;
      }
    }
    return undefined;
  }

  async createSession(id: string, insertSession: InsertSession): Promise<Session> {
    const payload = mapInsertSession(id, insertSession);
    const rows = await supabaseRest<SessionRow[]>(`/rest/v1/sessions`, {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: payload,
    });
    const row = rows?.[0];
    if (!row) {
      return mapRowToSession({
        id,
        app_id: payload.app_id,
        lead_id: payload.lead_id,
        source: payload.source,
        conversation_id: payload.conversation_id,
        conversation_url: payload.conversation_url,
        status: payload.status,
        created_at: new Date().toISOString(),
      });
    }
    return mapRowToSession(row);
  }

  async updateSession(id: string, partialSession: Partial<InsertSession>): Promise<Session | undefined> {
    const payload = mapPartialSession(partialSession);
    const rows = await supabaseRest<SessionRow[]>(
      `/rest/v1/sessions?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: payload,
      },
    );
    const row = rows?.[0];
    return row ? mapRowToSession(row) : undefined;
  }
}

export const storage = new SupabaseStorage();
