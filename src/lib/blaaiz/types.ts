// Blaaiz API types. Only endpoints verified against docs.blaaiz.com (2026-11-06).
// See design.md section 6 for the verified endpoint list with doc URLs.

export type BlaaizEnv = "dev" | "prod";

export const BLAAIZ_BASE_URLS: Record<BlaaizEnv, string> = {
  dev: "https://api-dev.blaaiz.com",
  prod: "https://api-prod.blaaiz.com",
};

export interface BlaaizOAuthToken {
  access_token: string;
  token_type: "Bearer";
  expires_in: number; // seconds, typically ~900; no refresh token
  scope: string;
}

export interface BlaaizWallet {
  id: string;
  currency: string;
  balance?: string;
  status?: string;
}

export interface BlaaizCollection {
  id: string;
  status: string;
  amount?: string;
  currency?: string;
  redirect_url?: string;
}

export interface BlaaizVirtualAccount {
  id: string;
  status: string; // SUCCESSFUL | PENDING | FAILED | REJECTED
  account_number?: string;
  bank_name?: string;
  wallet_id?: string;
}

export interface BlaaizPayout {
  id: string;
  status: string;
  from_amount?: string;
  to_amount?: string;
}

export interface BlaaizRate {
  pair?: string;
  rate?: string;
  from_currency?: string;
  to_currency?: string;
}

export type BlaaizPayoutMethod =
  | "bank_transfer"
  | "interac"
  | "ach"
  | "wire"
  | "mobile_money";

/** Standard webhook envelope. Crypto events are flat (no `data` wrapper). */
export interface BlaaizWebhookPayload {
  event: string;
  event_id: string;
  timestamp: string;
  signature?: string;
  data?: Record<string, unknown>;
}
