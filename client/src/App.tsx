import { useState, useCallback } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import SplashScreen from "@/components/SplashScreen";
import AppLanding from "@/pages/app-landing";
import AppConversation from "@/pages/app-conversation";

function Router() {
  return (
    <Switch>
      <Route path="/a/:slug/conversation/:sessionId" component={AppConversation} />
      <Route path="/a/:slug" component={AppLanding} />
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
