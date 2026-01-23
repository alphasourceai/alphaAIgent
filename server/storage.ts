import { type Session, type InsertSession } from "@shared/schema";

export interface IStorage {
  getSession(id: string): Promise<Session | undefined>;
  getSessionByConversationId(conversationId: string): Promise<Session | undefined>;
  createSession(id: string, session: InsertSession): Promise<Session>;
  updateSession(id: string, session: Partial<InsertSession>): Promise<Session | undefined>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
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
    const session: Session = { 
      id,
      conversationId: insertSession.conversationId || null,
      conversationUrl: insertSession.conversationUrl || null,
      status: insertSession.status || null,
      createdAt: new Date()
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: string, partialSession: Partial<InsertSession>): Promise<Session | undefined> {
    const existingSession = this.sessions.get(id);
    if (!existingSession) {
      return undefined;
    }

    const updatedSession: Session = {
      ...existingSession,
      conversationId: partialSession.conversationId ?? existingSession.conversationId,
      conversationUrl: partialSession.conversationUrl ?? existingSession.conversationUrl,
      status: partialSession.status ?? existingSession.status,
    };
    
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }
}

export const storage = new MemStorage();
