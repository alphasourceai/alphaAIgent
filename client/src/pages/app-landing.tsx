import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Calendar, Copy, QrCode, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import NFCDetector from "@/components/NFCDetector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { fetchAppConfig, type AppConfig } from "@/lib/appConfig";

const DEFAULT_PRIMARY = "#AD8BF7";
const DEFAULT_SECONDARY = "#061551";

const HEX_REGEX = /^#?[0-9a-fA-F]{6}$/;

function normalizeHex(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!HEX_REGEX.test(trimmed)) {
    return fallback;
  }
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function getLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function normalizeSource(input: string | null) {
  const validSources = ["nfc", "qr", "link", "direct"];
  const normalized = input ? input.trim().toLowerCase() : "direct";
  return validSources.includes(normalized) ? normalized : "direct";
}

export default function AppLanding() {
  const [, params] = useRoute("/a/:slug");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const slug = params?.slug;

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const rawPublicBaseUrl = String(process.env.PUBLIC_BASE_URL || "").trim();
  const normalizedPublicBaseUrl = rawPublicBaseUrl.replace(/\/+$/, "");
  const baseUrl = normalizedPublicBaseUrl || window.location.origin;

  const source = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return normalizeSource(params.get("source"));
  }, []);

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
        }
      })
      .catch((error) => {
        if (isActive) {
          const message = error instanceof Error ? error.message : "Failed to load app";
          setErrorMessage(message);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [slug]);

  const primaryColor = normalizeHex(appConfig?.primaryColor ?? null, DEFAULT_PRIMARY);
  const secondaryColor = normalizeHex(appConfig?.secondaryColor ?? null, DEFAULT_SECONDARY);
  const backgroundBase = appConfig?.backgroundColor
    ? normalizeHex(appConfig.backgroundColor, DEFAULT_SECONDARY)
    : secondaryColor;
  const isDarkBackground = getLuminance(backgroundBase) < 0.5;
  const textColor = appConfig?.foregroundColor && HEX_REGEX.test(appConfig.foregroundColor)
    ? normalizeHex(appConfig.foregroundColor, "#ffffff")
    : isDarkBackground
      ? "#ffffff"
      : "#0b0b0b";
  const mutedTextColor = isDarkBackground ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";
  const cardColor = isDarkBackground ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const borderColor = isDarkBackground ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)";
  const buttonTextColor = getLuminance(primaryColor) < 0.5 ? "#ffffff" : "#0b0b0b";
  const backgroundStyle = appConfig?.backgroundColor
    ? backgroundBase
    : `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%)`;

  useEffect(() => {
    if (!appConfig) {
      return;
    }

    const qrUrl = `${baseUrl}/a/${appConfig.slug}?source=qr`;
    QRCode.toDataURL(qrUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: primaryColor,
        light: backgroundBase,
      },
    })
      .then(setQrCodeUrl)
      .catch((error) => {
        console.error("QR generation failed:", error);
      });
  }, [appConfig, baseUrl, primaryColor, backgroundBase]);

  const startConversation = (conversationSource?: string) => {
    if (!appConfig) {
      return;
    }
    const sessionId = crypto.randomUUID();
    const actualSource = conversationSource || source || "direct";
    setLocation(`/a/${appConfig.slug}/conversation/${sessionId}?source=${actualSource}`);
  };

  const handleLeadSubmit = async () => {
    if (!appConfig) {
      return;
    }
    setIsSubmittingLead(true);

    const hasLeadFields = Boolean(leadName || leadEmail || leadPhone);
    if (appConfig.leadCaptureEnabled && hasLeadFields) {
      try {
        await apiRequest("POST", "/api/public/leads", {
          appSlug: appConfig.slug,
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          source,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save lead";
        toast({
          title: "Lead capture issue",
          description: message,
          variant: "destructive",
        });
      }
    }

    setIsSubmittingLead(false);
    startConversation();
  };

  const handleCopyLink = () => {
    if (!appConfig) {
      return;
    }
    const sessionId = crypto.randomUUID();
    const link = `${baseUrl}/a/${appConfig.slug}/conversation/${sessionId}?source=link`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this link via text or email",
    });
  };

  const handleNFCDetected = () => {
    startConversation("nfc");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: backgroundStyle, color: textColor }}>
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  if (errorMessage || !appConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: backgroundStyle, color: textColor }}>
        <div className="text-center space-y-4">
          <p className="text-sm">{errorMessage || "App not found"}</p>
          <Button
            variant="outline"
            style={{ borderColor, color: textColor }}
            onClick={() => setLocation("/")}
          >
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: backgroundStyle, color: textColor }}>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            {appConfig.logoUrl ? (
              <img
                src={appConfig.logoUrl}
                alt={appConfig.companyName ? `${appConfig.companyName} logo` : "Company logo"}
                className="max-h-16 w-auto"
              />
            ) : (
              <div className="text-2xl font-semibold">{appConfig.companyName || "Welcome"}</div>
            )}
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {appConfig.productLabel ? `Ask our AI about ${appConfig.productLabel}` : "Talk with our AI"}
            </h1>
            <p className="text-lg md:text-xl" style={{ color: mutedTextColor }}>
              {appConfig.companyName
                ? `Get a quick, tailored overview from ${appConfig.companyName}'s assistant.`
                : "Start a quick conversation with our AI assistant."}
            </p>
          </div>

          <div className="flex justify-center">
            <NFCDetector onNFCDetected={handleNFCDetected} />
          </div>

          {appConfig.leadCaptureEnabled ? (
            <Card className="p-6" style={{ backgroundColor: cardColor, borderColor }}>
              <div className="space-y-4 text-left">
                <div>
                  <h3 className="text-lg font-semibold">Stay in the loop</h3>
                  <p className="text-sm" style={{ color: mutedTextColor }}>
                    Share your details to get follow-ups after the conversation.
                  </p>
                </div>
                <div className="grid gap-3">
                  <Input
                    placeholder="Name (optional)"
                    value={leadName}
                    onChange={(event) => setLeadName(event.target.value)}
                    style={{ backgroundColor: "transparent", color: textColor, borderColor }}
                  />
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    value={leadEmail}
                    onChange={(event) => setLeadEmail(event.target.value)}
                    style={{ backgroundColor: "transparent", color: textColor, borderColor }}
                  />
                  <Input
                    placeholder="Phone (optional)"
                    value={leadPhone}
                    onChange={(event) => setLeadPhone(event.target.value)}
                    style={{ backgroundColor: "transparent", color: textColor, borderColor }}
                  />
                </div>
                <Button
                  size="lg"
                  className="w-full rounded-full min-h-12 text-lg font-semibold"
                  style={{ backgroundColor: primaryColor, color: buttonTextColor, borderColor: primaryColor }}
                  onClick={handleLeadSubmit}
                  disabled={isSubmittingLead}
                >
                  {isSubmittingLead ? "Starting..." : "Start Conversation"}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="pt-4">
              <Button
                size="lg"
                className="rounded-full min-h-12 px-10 text-lg font-semibold"
                style={{ backgroundColor: primaryColor, color: buttonTextColor, borderColor: primaryColor }}
                onClick={() => startConversation()}
              >
                Start Conversation
              </Button>
            </div>
          )}

          {appConfig.schedulingUrl ? (
            <div className="pt-2 flex justify-center">
              <Button
                asChild
                variant="outline"
                className="rounded-full min-h-12 px-8 text-base font-semibold"
                style={{ borderColor, color: textColor }}
              >
                <a href={appConfig.schedulingUrl} target="_blank" rel="noreferrer">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Time
                </a>
              </Button>
            </div>
          ) : null}

          <div className="pt-8">
            <Card className="p-6" style={{ backgroundColor: cardColor, borderColor }}>
              <h3 className="font-semibold mb-4">Share This Experience</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  style={{ borderColor, color: textColor }}
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  style={{ borderColor, color: textColor }}
                  onClick={() => setShowQR(!showQR)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {showQR ? "Hide" : "Show"} QR Code
                </Button>
              </div>

              {showQR && qrCodeUrl && (
                <div className="mt-6 p-6 rounded-lg" style={{ backgroundColor: cardColor }}>
                  <div className="w-64 h-64 mx-auto flex items-center justify-center">
                    <img src={qrCodeUrl} alt="QR Code to start conversation" className="w-full h-full" />
                  </div>
                  <p className="text-sm text-center mt-4" style={{ color: mutedTextColor }}>
                    Scan to start conversation
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <footer className="border-t py-6 px-4" style={{ borderColor }}>
        <div className="max-w-2xl mx-auto text-center text-sm" style={{ color: mutedTextColor }}>
          {appConfig.companyUrl ? (
            <a
              href={appConfig.companyUrl}
              className="inline-flex items-center gap-2"
              target="_blank"
              rel="noreferrer"
            >
              <Smartphone className="h-4 w-4" />
              {appConfig.companyName || "Visit site"}
            </a>
          ) : (
            <p>Powered by Tavus AI</p>
          )}
        </div>
      </footer>
    </div>
  );
}
