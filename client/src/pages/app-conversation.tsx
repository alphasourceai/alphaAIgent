import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import AIConversationInterface from "@/components/AIConversationInterface";
import { fetchAppConfig, type AppConfig } from "@/lib/appConfig";
import { Button } from "@/components/ui/button";

export default function AppConversation() {
  const [, params] = useRoute("/a/:slug/conversation/:sessionId");
  const [, setLocation] = useLocation();
  const slug = params?.slug;
  const sessionId = params?.sessionId || "unknown";

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setErrorMessage("Missing app slug");
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchAppConfig(slug)
      .then((config) => {
        if (isActive) {
          setAppConfig(config);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (isActive) {
          const message = error instanceof Error ? error.message : "Failed to load app";
          setErrorMessage(message);
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [slug]);

  const searchParams = new URLSearchParams(window.location.search);
  const source = searchParams.get("source") || undefined;

  const handleConversationEnd = () => {
    if (slug) {
      setLocation(`/a/${slug}`);
      return;
    }
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Unable to Load App</h3>
            <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
            <Button onClick={handleConversationEnd}>Return</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!appConfig) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Unable to Load App</h3>
            <p className="text-sm text-muted-foreground mb-6">App configuration is missing.</p>
            <Button onClick={handleConversationEnd}>Return</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AIConversationInterface
      sessionId={sessionId}
      onEnd={handleConversationEnd}
      conversationDuration={appConfig.conversationDurationSeconds ?? 150}
      appSlug={slug}
      source={source}
    />
  );
}
