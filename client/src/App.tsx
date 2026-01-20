import { useState, useCallback } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Conversation from "@/pages/conversation";
import ThankYou from "@/pages/thank-you";
import SplashScreen from "@/components/SplashScreen";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/conversation/:sessionId" component={Conversation} />
      <Route path="/thank-you" component={ThankYou} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {showSplash && (
          <SplashScreen onComplete={handleSplashComplete} />
        )}
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
