import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConversationTimer from './ConversationTimer';
import { DailyVideoInterface } from './DailyVideoInterface';
import { useToast } from '@/hooks/use-toast';
import {
  CLIENT_SESSION_TTL_MS,
  clearConversationSession,
  getFreshConversationSession,
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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createInFlightRef = useRef(false);
  const lastSessionRef = useRef<string | null>(null);
  const preflightStreamRef = useRef<MediaStream | null>(null);

  const resumeSession = storageKey
    ? getFreshConversationSession(storageKey, CLIENT_SESSION_TTL_MS)
    : null;
  const canResume = Boolean(
    resumeSession?.conversationUrl && resumeSession.sessionId !== sessionId,
  );

  const persistConversationSession = (url: string) => {
    if (!storageKey) {
      return;
    }
    const existing = readConversationSession(storageKey);
    if (!existing || existing.sessionId !== sessionId) {
      writeConversationSession(storageKey, {
        sessionId,
        startedAt: Date.now(),
        conversationUrl: url,
      });
      return;
    }
    updateConversationSession(storageKey, { conversationUrl: url });
  };

  const buildConversationPath = (nextSessionId: string) => {
    const currentPath = window.location.pathname;
    const search = window.location.search || '';
    if (currentPath.includes('/conversation/')) {
      return currentPath.replace(/\/conversation\/[^/]+$/, `/conversation/${nextSessionId}`) + search;
    }
    return `/conversation/${nextSessionId}${search}`;
  };

  const stopPreflightStream = () => {
    const stream = preflightStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      preflightStreamRef.current = null;
    }
  };

  const getMediaErrorMessage = (errorName?: string) => {
    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return 'Camera/mic access is blocked. Please click the camera icon in your browser address bar and allow access, then retry.';
    }
    if (errorName === 'NotFoundError') {
      return 'No camera or microphone was detected. Please connect a device and retry.';
    }
    return 'Unable to access camera/mic. Please check browser permissions and retry.';
  };

  const preflightMediaPermissions = async (sessionLabel: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: 'Camera/Mic Required',
        description: 'Your browser does not support camera/mic access. Please try a supported browser.',
        variant: 'destructive',
      });
      console.warn(`resume.preflight failed session=${sessionLabel} name=Unsupported`);
      return false;
    }
    stopPreflightStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      preflightStreamRef.current = stream;
      stopPreflightStream();
      return true;
    } catch (err) {
      const errorName = err instanceof Error ? err.name : 'UnknownError';
      console.warn(`resume.preflight failed session=${sessionLabel} name=${errorName}`);
      toast({
        title: 'Camera/Mic Required',
        description: getMediaErrorMessage(errorName),
        variant: 'destructive',
      });
      stopPreflightStream();
      return false;
    }
  };

  const createConversation = async () => {
    if (createInFlightRef.current) {
      return;
    }
    createInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setConversationUrl(null);

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          personaId,
          replicaId,
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
      persistConversationSession(data.conversationUrl);
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
      stopPreflightStream();
    };
  }, []);

  const handleEndConversation = () => {
    console.log('Conversation ended by user');
    stopPreflightStream();
    onEnd();
  };

  const handleResumeConversation = async () => {
    if (!resumeSession || !resumeSession.conversationUrl) {
      return;
    }
    const sessionLabel = resumeSession.sessionId.slice(0, 8);
    const hasMediaAccess = await preflightMediaPermissions(sessionLabel);
    if (!hasMediaAccess) {
      return;
    }
    setLocation(buildConversationPath(resumeSession.sessionId));
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

  if (error || !conversationUrl) {
    const showMaxConcurrent = errorCode === 'TAVUS_MAX_CONCURRENT';
    const displayMessage = showMaxConcurrent
      ? 'It looks like you already have an active conversation. Resume it or start over.'
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
                {canResume && (
                  <Button onClick={handleResumeConversation} data-testid="button-resume-conversation">
                    Resume Conversation
                  </Button>
                )}
                <Button
                  variant={canResume ? 'outline' : 'default'}
                  onClick={handleStartOver}
                  data-testid="button-start-over"
                >
                  Start Over
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
            console.error('Daily video error:', error);
            toast({
              title: 'Connection Error',
              description: error,
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
