import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import AIConversationInterface from '../AIConversationInterface';

const queryClient = new QueryClient();

export default function AIConversationInterfaceExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AIConversationInterface 
          sessionId="abc123def456" 
          onEnd={() => console.log('Conversation ended')}
          conversationDuration={120}
        />
      </Router>
    </QueryClientProvider>
  );
}
