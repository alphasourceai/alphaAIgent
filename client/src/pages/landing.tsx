import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, QrCode } from 'lucide-react';
import Logo from '@/components/Logo';
import NFCDetector from '@/components/NFCDetector';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import {
  CLIENT_SESSION_TTL_MS,
  clearConversationSession,
  getConversationStorageKey,
  getFreshConversationSession,
  type StoredConversationSession,
  writeConversationSession,
} from '@/lib/conversationSession';

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [resumeSession, setResumeSession] = useState<StoredConversationSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const lastStartRef = useRef(0);
  const preflightStreamRef = useRef<MediaStream | null>(null);
  const storageKey = getConversationStorageKey(null);

  const rawPublicBaseUrl = String(process.env.PUBLIC_BASE_URL || '').trim();
  const normalizedPublicBaseUrl = rawPublicBaseUrl.replace(/\/+$/, '');
  const baseUrl = normalizedPublicBaseUrl || window.location.origin;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');
    if (sourceParam) {
      const normalizedSource = sourceParam.trim().toLowerCase();
      const validSources = ['nfc', 'qr', 'link'];
      const validatedSource = validSources.includes(normalizedSource) ? normalizedSource : null;
      if (validatedSource) {
        setSource(validatedSource);
        console.log('Traffic source detected:', validatedSource);
      }
    }

    // Generate QR code for this page with ?source=qr parameter
    if (!normalizedPublicBaseUrl) {
      console.error('PUBLIC_BASE_URL is not set; falling back to window.location.origin');
    }

    const qrUrl = `${baseUrl}?source=qr`;
    QRCode.toDataURL(qrUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#AD8BF7',
        light: '#061551'
      }
    }).then(setQrCodeUrl);
  }, []);

  useEffect(() => {
    const stored = getFreshConversationSession(storageKey, CLIENT_SESSION_TTL_MS);
    if (stored?.conversationUrl) {
      setResumeSession(stored);
    } else {
      setResumeSession(null);
    }
  }, [storageKey]);

  useEffect(() => {
    return () => {
      const stream = preflightStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        preflightStreamRef.current = null;
      }
    };
  }, []);

  const beginStart = () => {
    if (isStarting) {
      return false;
    }
    const now = Date.now();
    if (now - lastStartRef.current < 800) {
      return false;
    }
    lastStartRef.current = now;
    setIsStarting(true);
    return true;
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

  const navigateToConversation = (sessionId: string, conversationSource?: string) => {
    const actualSource = conversationSource || source || 'direct';
    setLocation(`/conversation/${sessionId}?source=${actualSource}`);
  };

  const handleStartConversation = (conversationSource?: string) => {
    if (!beginStart()) {
      return;
    }
    const sessionId = crypto.randomUUID();
    writeConversationSession(storageKey, {
      sessionId,
      startedAt: Date.now(),
      conversationUrl: null,
    });
    setResumeSession(null);
    navigateToConversation(sessionId, conversationSource);
  };

  const handleResumeConversation = async (conversationSource?: string) => {
    if (!resumeSession) {
      return;
    }
    if (!beginStart()) {
      return;
    }
    const sessionLabel = resumeSession.sessionId.slice(0, 8);
    const hasMediaAccess = await preflightMediaPermissions(sessionLabel);
    if (!hasMediaAccess) {
      setIsStarting(false);
      return;
    }
    navigateToConversation(resumeSession.sessionId, conversationSource);
  };

  const handleStartOver = () => {
    if (!beginStart()) {
      return;
    }
    clearConversationSession(storageKey);
    setResumeSession(null);
    const sessionId = crypto.randomUUID();
    writeConversationSession(storageKey, {
      sessionId,
      startedAt: Date.now(),
      conversationUrl: null,
    });
    navigateToConversation(sessionId, source || 'direct');
  };

  const handleNFCDetected = () => {
    console.log('NFC tap detected - auto-starting conversation');
    if (resumeSession?.conversationUrl) {
      void handleResumeConversation('nfc');
      return;
    }
    handleStartConversation('nfc');
  };

  const handleCopyLink = () => {
    const sessionId = crypto.randomUUID();
    const link = `${baseUrl}/conversation/${sessionId}?source=link`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied!',
      description: 'Share this link via text or email',
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Ask our AI about alphaScreen
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Have a conversation with our AI agent to learn about alphaScreen
            </p>
          </div>

          {/* NFC Detector */}
          <div className="flex justify-center">
            <NFCDetector onNFCDetected={handleNFCDetected} />
          </div>

          {/* Start Button */}
          <div className="pt-4">
            {resumeSession?.conversationUrl ? (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="rounded-full min-h-16 px-12 text-lg font-bold"
                  onClick={() => handleResumeConversation()}
                  disabled={isStarting}
                  data-testid="button-resume-conversation"
                >
                  Resume Conversation
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full min-h-16 px-12 text-lg font-bold"
                  onClick={handleStartOver}
                  disabled={isStarting}
                  data-testid="button-start-over"
                >
                  Start Over
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                className="rounded-full min-h-16 px-12 text-lg font-bold"
                onClick={() => handleStartConversation()}
                disabled={isStarting}
                data-testid="button-start-conversation"
              >
                {isStarting ? 'Starting...' : 'Start Conversation'}
              </Button>
            )}
          </div>

          {/* Sharing Options */}
          <div className="pt-8">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Share This Experience</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQR(!showQR)}
                  data-testid="button-show-qr"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {showQR ? 'Hide' : 'Show'} QR Code
                </Button>
              </div>

              {showQR && qrCodeUrl && (
                <div className="mt-6 p-6 rounded-lg bg-card" data-testid="container-qr-code">
                  <div className="w-64 h-64 mx-auto flex items-center justify-center">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code to start conversation" 
                      className="w-full h-full"
                      data-testid="img-qr-code"
                    />
                  </div>
                  <p className="text-sm text-center mt-4 text-muted-foreground">
                    Scan to start conversation
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-2xl mx-auto text-center text-sm text-muted-foreground">
          <p>Powered by Tavus AI • Conference Demo Experience</p>
        </div>
      </footer>
    </div>
  );
}
