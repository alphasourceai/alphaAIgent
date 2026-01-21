import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConversationTimer from './ConversationTimer';
import { DailyVideoInterface } from './DailyVideoInterface';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AIConversationInterfaceProps {
  sessionId: string;
  onEnd: () => void;
  conversationDuration?: number;
  personaId?: string;
  replicaId?: string;
  appSlug?: string;
  source?: string;
}

export default function AIConversationInterface({ 
  sessionId, 
  onEnd,
  conversationDuration = 150,
  personaId,
  replicaId,
  appSlug,
  source
}: AIConversationInterfaceProps) {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    createConversation();
  }, [sessionId]);

  const createConversation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest('POST', '/api/conversations', {
        sessionId,
        personaId,
        replicaId,
        appSlug,
        source,
      });

      const data = await response.json();
      setConversationUrl(data.conversationUrl);
      setIsLoading(false);
    } catch (err) {
      console.error('Error creating conversation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start conversation';
      setError(errorMessage);
      setIsLoading(false);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleEndConversation = () => {
    console.log('Conversation ended by user');
    onEnd();
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
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Unable to Start Conversation</h3>
            <p className="text-sm text-muted-foreground mb-6">{error || 'An error occurred'}</p>
            <Button onClick={onEnd} data-testid="button-return">
              Return to Home
            </Button>
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
