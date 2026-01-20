import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import Landing from '../../pages/landing';

const queryClient = new QueryClient();

export default function LandingExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Landing />
      </Router>
    </QueryClientProvider>
  );
}
