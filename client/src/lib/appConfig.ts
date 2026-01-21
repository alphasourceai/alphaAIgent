export type AppConfig = {
  id: string;
  slug: string;
  companyName: string | null;
  companyUrl: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  foregroundColor: string | null;
  schedulingUrl: string | null;
  productLabel: string | null;
  conversationDurationSeconds: number | null;
  leadCaptureEnabled: boolean;
  replica: { id: string; name: string | null; tavusReplicaId: string | null } | null;
};

export async function fetchAppConfig(slug: string): Promise<AppConfig> {
  const response = await fetch(`/api/public/apps/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text || response.statusText}`);
  }
  return (await response.json()) as AppConfig;
}
