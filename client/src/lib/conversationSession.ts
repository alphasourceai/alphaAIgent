export type StoredConversationSession = {
  sessionId: string;
  startedAt: number;
  conversationUrl?: string | null;
};

const STORAGE_PREFIX = "alphaai:conversation";
export const CLIENT_SESSION_TTL_MS = 30 * 60 * 1000;

export function getConversationStorageKey(scope?: string | null): string {
  const normalizedScope = scope && scope.trim().length > 0 ? scope.trim() : "default";
  return `${STORAGE_PREFIX}:${normalizedScope}`;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readConversationSession(key: string): StoredConversationSession | null {
  if (!canUseStorage()) {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredConversationSession;
    if (!parsed || typeof parsed.sessionId !== "string") {
      return null;
    }
    if (typeof parsed.startedAt !== "number" || !Number.isFinite(parsed.startedAt)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeConversationSession(key: string, session: StoredConversationSession): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(session));
}

export function updateConversationSession(
  key: string,
  patch: Partial<StoredConversationSession>,
): StoredConversationSession | null {
  const existing = readConversationSession(key);
  if (!existing) {
    return null;
  }
  const nextSession: StoredConversationSession = {
    ...existing,
    ...patch,
  };
  writeConversationSession(key, nextSession);
  return nextSession;
}

export function clearConversationSession(key: string): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(key);
}

export function getFreshConversationSession(
  key: string,
  ttlMs: number = CLIENT_SESSION_TTL_MS,
): StoredConversationSession | null {
  const session = readConversationSession(key);
  if (!session) {
    return null;
  }
  if (Date.now() - session.startedAt > ttlMs) {
    clearConversationSession(key);
    return null;
  }
  return session;
}
