import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import ThankYou from '../../pages/thank-you';

const queryClient = new QueryClient();

export default function ThankYouExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ThankYou />
      </Router>
    </QueryClientProvider>
  );
}
