type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  storageBucket: string;
};

function getSupabaseConfig(): SupabaseConfig {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const storageBucket = String(process.env.SUPABASE_STORAGE_BUCKET || "app-assets").trim();

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }

  return { url, serviceRoleKey, storageBucket };
}

export async function supabaseRest<T>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...options.headers,
  };

  const hasBody = options.body !== undefined;
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${url}${path}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    const snippet = text.length > 300 ? `${text.slice(0, 300)}...` : text;
    throw new Error(`supabase ${response.status}: ${snippet || response.statusText}`);
  }

  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export function buildStoragePublicUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) {
    return null;
  }

  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }

  const { url, storageBucket } = getSupabaseConfig();
  const safePath = storagePath.replace(/^\/+/, "");
  return `${url}/storage/v1/object/public/${storageBucket}/${safePath}`;
}

export function buildLogoPath(tenantId: string, appId: string, filename: string): string {
  return `logos/${tenantId}/${appId}/${filename}`;
}

export function buildKbPath(tenantId: string, appId: string, filename: string): string {
  return `kb/${tenantId}/${appId}/${filename}`;
}
