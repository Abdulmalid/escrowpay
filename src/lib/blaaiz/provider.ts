// Financial provider abstraction. Routes depend on this interface only,
// so Blaaiz can be replaced or supplemented without touching call sites.

import type { FundingStatus, PayoutStatus } from "@/lib/fsm";

export type ProviderKind = "demo" | "blaaiz";

export interface FundingIntentRequest {
  milestoneId: string;
  amountMinor: number; // integer minor units, validated upstream
  currency: string;
  idempotencyKey: string;
  customerRef?: string;
  walletId?: string;
  method?: "card" | "bank_transfer";
}

export interface FundingIntentResult {
  intentId: string;
  providerRef: string;
  status: FundingStatus;
  redirectUrl?: string;
  accountNumber?: string;
  bankName?: string;
  expiresAt?: string;
}

export interface ProviderPayoutRequest {
  payoutId: string;
  amountMinor: number;
  currency: string;
  method: "bank_transfer" | "interac" | "ach" | "wire" | "mobile_money";
  idempotencyKey: string;
  walletId?: string;
  customerRef?: string;
  beneficiary: {
    label: string;
    accountHint: string;
    currency: string;
  };
}

export interface ProviderPayoutResult {
  providerRef: string;
  status: PayoutStatus;
  eta?: string;
}

export interface ProviderRateQuote {
  base: string;
  quote: string;
  rateMicros: bigint; // quote majors per 1 base major, scaled by RATE_SCALE
  feeBps?: bigint;
  indicative: boolean;
  fetchedAt: string;
  source: ProviderKind;
}

export interface VerifiedWebhook {
  valid: boolean;
  eventId: string;
  event: string;
  data: Record<string, unknown>;
}

export interface FinancialProvider {
  readonly kind: ProviderKind;
  /** True when no real money can move. Demo UI/API labels key off this. */
  readonly simulated: boolean;

  createFundingIntent(req: FundingIntentRequest): Promise<FundingIntentResult>;
  getFundingStatus(providerRef: string): Promise<FundingStatus>;
  createPayout(req: ProviderPayoutRequest): Promise<ProviderPayoutResult>;
  getPayoutStatus(providerRef: string): Promise<PayoutStatus>;
  getRate(base: string, quote: string): Promise<ProviderRateQuote>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhook>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string, detail: string) {
    super(`${provider} is not configured: ${detail}`);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.name = "ProviderError";
    this.retryable = retryable;
  }
}
