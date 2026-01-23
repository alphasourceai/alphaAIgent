import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConversationTimer from './ConversationTimer';
import { DailyVideoInterface } from './DailyVideoInterface';
import { useToast } from '@/hooks/use-toast';
import {
  clearConversationSession,
  readConversationSession,
  updateConversationSession,
  writeConversationSession,
} from '@/lib/conversationSession';

interface AIConversationInterfaceProps {
  sessionId: string;
  onEnd: () => void;
  conversationDuration?: number;
  personaId?: string;
  replicaId?: string;
  source?: string;
  storageKey?: string;
}

type ConversationError = Error & { code?: string };

export default function AIConversationInterface({ 
  sessionId, 
  onEnd,
  conversationDuration = 150,
  personaId,
  replicaId,
  source,
  storageKey,
}: AIConversationInterfaceProps) {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createInFlightRef = useRef(false);
  const lastSessionRef = useRef<string | null>(null);

  const buildConversationPath = (nextSessionId: string) => {
    const currentPath = window.location.pathname;
    const search = window.location.search || '';
    if (currentPath.includes('/conversation/')) {
      return currentPath.replace(/\/conversation\/[^/]+$/, `/conversation/${nextSessionId}`) + search;
    }
    return `/conversation/${nextSessionId}${search}`;
  };

  const persistConversationSessionForId = (url: string, targetSessionId: string) => {
    if (!storageKey) {
      return;
    }
    const existing = readConversationSession(storageKey);
    if (!existing || existing.sessionId !== targetSessionId) {
      writeConversationSession(storageKey, {
        sessionId: targetSessionId,
        startedAt: Date.now(),
        conversationUrl: url,
      });
      return;
    }
    updateConversationSession(storageKey, { conversationUrl: url });
  };

  const createConversation = async () => {
    if (createInFlightRef.current) {
      return;
    }
    createInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setSessionExpired(false);
    setConversationUrl(null);
    const targetSessionId = sessionId;

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: targetSessionId,
          source,
        }),
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {
          errorText = '';
        }

        let errorPayload: any = null;
        if (errorText) {
          try {
            errorPayload = JSON.parse(errorText);
          } catch {
            errorPayload = null;
          }
        }

        const nestedMessage =
          (typeof errorPayload?.message === 'string' && errorPayload.message)
          || (typeof errorPayload?.error === 'string' && errorPayload.error)
          || (typeof errorPayload?.details?.message === 'string' && errorPayload.details.message)
          || (typeof errorPayload?.details === 'string' && errorPayload.details)
          || null;
        const errorMessage = nestedMessage
          || errorText
          || `Failed to start conversation (${response.status})`;
        const errorObject: ConversationError = new Error(errorMessage);
        if (typeof errorPayload?.code === 'string') {
          errorObject.code = errorPayload.code;
        }
        throw errorObject;
      }

      const data = await response.json();
      if (!data?.conversationUrl) {
        throw new Error('Missing conversation URL from server');
      }
      setConversationUrl(data.conversationUrl);
      persistConversationSessionForId(data.conversationUrl, targetSessionId);
    } catch (err) {
      console.error('Error creating conversation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start conversation';
      const errorValue = err as ConversationError;
      const code = typeof errorValue.code === 'string' ? errorValue.code : null;
      setError(errorMessage);
      setErrorCode(code);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      createInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!sessionId || sessionId === 'unknown') {
      setError('Missing session information');
      setIsLoading(false);
      return;
    }
    if (lastSessionRef.current === sessionId) {
      return;
    }
    lastSessionRef.current = sessionId;
    createConversation();
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (storageKey) {
        clearConversationSession(storageKey);
      }
    };
  }, [storageKey]);

  const handleEndConversation = () => {
    console.log('Conversation ended by user');
    if (storageKey) {
      clearConversationSession(storageKey);
    }
    onEnd();
  };

  const handleStartOver = () => {
    if (!storageKey) {
      onEnd();
      return;
    }
    clearConversationSession(storageKey);
    const newSessionId = crypto.randomUUID();
    writeConversationSession(storageKey, {
      sessionId: newSessionId,
      startedAt: Date.now(),
      conversationUrl: null,
    });
    setLocation(buildConversationPath(newSessionId));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="text-xl font-semibold mb-2">Connecting to AI Agent</h3>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  const normalizeDailyError = (payload: { message: string; type?: string; code?: string } | string) => {
    if (typeof payload === 'string') {
      return { message: payload, type: undefined, code: undefined };
    }
    return {
      message: payload.message || 'Connection error occurred',
      type: payload.type,
      code: payload.code,
    };
  };

  const isSessionExpiredError = (payload: { message: string; type?: string; code?: string }) => {
    const message = payload.message.toLowerCase();
    if (payload.type === 'no-room' || payload.code === 'no-room') {
      return true;
    }
    return (
      message.includes('meeting has ended')
      || message.includes('no-room')
      || message.includes('no room')
      || message.includes('room was deleted')
      || message.includes('exiting meeting because room was deleted')
    );
  };

  const handleSessionExpired = () => {
    setSessionExpired(true);
    setError('This session expired. Please start a new demo.');
    toast({
      title: 'Session expired',
      description: 'This session expired. Please start a new demo.',
      variant: 'destructive',
    });
  };

  if (error || !conversationUrl) {
    const showMaxConcurrent = errorCode === 'TAVUS_MAX_CONCURRENT';
    const showSessionExpired = sessionExpired;
    const displayMessage = showMaxConcurrent
      ? 'It looks like you already have an active conversation. Please start a new demo.'
      : showSessionExpired
        ? 'This session expired. Please start a new demo.'
      : (error || 'An error occurred');

    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Unable to Start Conversation</h3>
            <p className="text-sm text-muted-foreground mb-6">{displayMessage}</p>
            {showMaxConcurrent ? (
              <div className="flex flex-col gap-3">
                <Button
                  variant="default"
                  onClick={handleStartOver}
                  data-testid="button-start-over"
                >
                  Start New Demo
                </Button>
                <Button variant="ghost" onClick={onEnd} data-testid="button-return">
                  Return to Home
                </Button>
              </div>
            ) : showSessionExpired ? (
              <div className="flex flex-col gap-3">
                <Button onClick={handleStartOver} data-testid="button-start-new-demo">
                  Start New Demo
                </Button>
                <Button variant="ghost" onClick={onEnd} data-testid="button-return">
                  Return to Home
                </Button>
              </div>
            ) : (
              <Button onClick={onEnd} data-testid="button-return">
                Return to Home
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen w-screen bg-background overflow-hidden">
      {/* Full-screen Daily.js video interface */}
      <div className="absolute inset-0">
        <DailyVideoInterface 
          conversationUrl={conversationUrl}
          onError={(error) => {
            const normalized = normalizeDailyError(error);
            if (isSessionExpiredError(normalized)) {
              console.warn(`daily.session_expired session=${sessionId.slice(0, 8)} type=${normalized.type || 'unknown'}`);
              handleSessionExpired();
              return;
            }
            console.error('Daily video error:', normalized.message);
            toast({
              title: 'Connection Error',
              description: normalized.message,
              variant: 'destructive',
            });
          }}
        />
      </div>

      {/* Floating controls overlay - top of screen */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="max-w-2xl mx-auto px-3 pt-3 md:px-4 md:pt-4">
          <div className="flex items-center justify-between gap-2 md:gap-3 pointer-events-auto">
            {/* Timer - left side */}
            <div className="flex-1 max-w-fit">
              <ConversationTimer 
                duration={conversationDuration} 
                onComplete={onEnd}
              />
            </div>

            {/* End button - right side */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndConversation}
              data-testid="button-end-conversation"
              className="bg-background/95 backdrop-blur-sm border-border hover:bg-background shrink-0"
            >
              <X className="h-4 w-4 mr-1 md:mr-2" />
              <span className="text-sm">End</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
