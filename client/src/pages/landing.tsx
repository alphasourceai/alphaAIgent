import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, QrCode, Smartphone } from 'lucide-react';
import Logo from '@/components/Logo';
import NFCDetector from '@/components/NFCDetector';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

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
    const qrUrl = `${window.location.origin}?source=qr`;
    QRCode.toDataURL(qrUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#AD8BF7',
        light: '#061551'
      }
    }).then(setQrCodeUrl);
  }, []);

  const handleStartConversation = (conversationSource?: string) => {
    const sessionId = crypto.randomUUID();
    const actualSource = conversationSource || source || 'direct';
    console.log('Starting conversation with session:', sessionId, 'source:', actualSource);
    setLocation(`/conversation/${sessionId}?source=${actualSource}`);
  };

  const handleNFCDetected = () => {
    console.log('NFC tap detected - auto-starting conversation');
    handleStartConversation('nfc');
  };

  const handleCopyLink = () => {
    const sessionId = crypto.randomUUID();
    const link = `${window.location.origin}/conversation/${sessionId}?source=link`;
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
            <Button
              size="lg"
              className="rounded-full min-h-16 px-12 text-lg font-bold"
              onClick={() => handleStartConversation()}
              data-testid="button-start-conversation"
            >
              Start Conversation
            </Button>
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
