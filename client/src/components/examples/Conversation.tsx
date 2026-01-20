import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import Conversation from '../../pages/conversation';

const queryClient = new QueryClient();

export default function ConversationExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Conversation />
      </Router>
    </QueryClientProvider>
  );
}
