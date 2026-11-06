// Blaaiz HTTP client: OAuth token cache, 429 backoff, request validation.
// Server-only. Only calls endpoints verified in design.md section 6.

import { z } from "zod";
import { ProviderError, ProviderNotConfiguredError } from "./provider";
import { BLAAIZ_BASE_URLS, type BlaaizEnv, type BlaaizOAuthToken } from "./types";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().default("Bearer"),
  expires_in: z.number().int().positive().default(900),
  scope: z.string().default(""),
});

interface CachedToken {
  token: string;
  expiresAtMs: number;
  scopes: string;
}

const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BlaaizClient {
  private tokenCache = new Map<string, CachedToken>();
  readonly env: BlaaizEnv;
  readonly baseUrl: string;

  constructor(env?: BlaaizEnv) {
    this.env = env ?? (process.env.BLAAIZ_ENV === "prod" ? "prod" : "dev");
    this.baseUrl = BLAAIZ_BASE_URLS[this.env];
  }

  private credentials(): { clientId: string; clientSecret: string; scopes: string } {
    const clientId = process.env.BLAAIZ_CLIENT_ID;
    const clientSecret = process.env.BLAAIZ_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new ProviderNotConfiguredError(
        "Blaaiz",
        "set BLAAIZ_CLIENT_ID and BLAAIZ_CLIENT_SECRET (dashboard: API & Webhooks)",
      );
    }
    const scopes =
      process.env.BLAAIZ_SCOPES ??
      "wallet:read collection:create virtual-account:create virtual-account:read payout:create swap:create fees:read currency:read webhook:write webhook:read";
    return { clientId, clientSecret, scopes };
  }

  /** OAuth2 client_credentials. Short-lived Bearer (~900s), no refresh token. */
  async accessToken(): Promise<string> {
    const { clientId, clientSecret, scopes } = this.credentials();
    const cacheKey = `${this.env}:${scopes}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAtMs - 60_000 > Date.now()) return cached.token;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes,
    });
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new ProviderError(`Blaaiz OAuth failed: HTTP ${res.status}`, res.status >= 500);
    }
    const parsed = tokenResponseSchema.parse(
      (await res.json()) as unknown,
    ) as BlaaizOAuthToken;
    this.tokenCache.set(cacheKey, {
      token: parsed.access_token,
      expiresAtMs: Date.now() + parsed.expires_in * 1000,
      scopes,
    });
    return parsed.access_token;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt < MAX_ATTEMPTS) {
      attempt += 1;
      const token = await this.accessToken();
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") ?? "0");
        await sleep(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 1000 * 2 ** attempt,
        );
        lastError = new ProviderError("Blaaiz rate limited (429)", true);
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ProviderError(
          `Blaaiz ${init.method ?? "GET"} ${path} failed: HTTP ${res.status} ${text.slice(0, 300)}`,
          res.status >= 500,
        );
      }
      return (await res.json()) as T;
    }
    throw lastError instanceof Error ? lastError : new ProviderError("Blaaiz request failed", true);
  }
}
