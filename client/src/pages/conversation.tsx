import { useRoute, useLocation } from 'wouter';
import AIConversationInterface from '@/components/AIConversationInterface';

export default function Conversation() {
  const [, params] = useRoute('/conversation/:sessionId');
  const [, setLocation] = useLocation();
  const sessionId = params?.sessionId || 'unknown';

  // Get query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const personaId = searchParams.get('personaId') || undefined;
  const replicaId = searchParams.get('replicaId') || undefined;
  const source = searchParams.get('source') || undefined;

  const handleConversationEnd = () => {
    console.log('Redirecting to thank you page');
    setLocation('/thank-you');
  };

  return (
    <AIConversationInterface 
      sessionId={sessionId}
      onEnd={handleConversationEnd}
      conversationDuration={150}
      personaId={personaId}
      replicaId={replicaId}
      source={source}
    />
  );
}
