// Server-only runtime configuration. Never import from client components.

export type ProviderKind = "demo" | "blaaiz";

export function financialProviderKind(): ProviderKind {
  return process.env.FINANCIAL_PROVIDER === "blaaiz" ? "blaaiz" : "demo";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isBlaaizConfigured(): boolean {
  return Boolean(
    process.env.BLAAIZ_CLIENT_ID && process.env.BLAAIZ_CLIENT_SECRET,
  );
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
