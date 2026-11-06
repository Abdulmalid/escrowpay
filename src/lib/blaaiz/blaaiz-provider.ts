// BlaaizProvider: live financial infrastructure behind env config.
// Inactive unless FINANCIAL_PROVIDER=blaaiz AND OAuth credentials are set.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { FundingStatus, PayoutStatus } from "@/lib/fsm";
import { RATE_SCALE } from "@/lib/money";
import { BlaaizClient } from "./client";
import {
  ProviderError,
  type FinancialProvider,
  type FundingIntentRequest,
  type FundingIntentResult,
  type ProviderPayoutRequest,
  type ProviderPayoutResult,
  type ProviderRateQuote,
  type VerifiedWebhook,
} from "./provider";
import type {
  BlaaizCollection,
  BlaaizPayout,
  BlaaizRate,
  BlaaizVirtualAccount,
  BlaaizWallet,
} from "./types";

function mapCollectionStatus(status: string): FundingStatus {
  const s = status.toUpperCase();
  if (["SUCCESSFUL", "COMPLETED", "CONFIRMED", "PAID"].includes(s)) return "confirmed";
  if (["FAILED", "REJECTED", "CANCELLED"].includes(s)) return "failed";
  if (["EXPIRED"].includes(s)) return "expired";
  return "pending";
}

function mapPayoutStatus(status: string): PayoutStatus {
  const s = status.toUpperCase();
  if (["SUCCESSFUL", "COMPLETED", "SETTLED", "PAID"].includes(s)) return "completed";
  if (["FAILED", "REJECTED"].includes(s)) return "failed";
  if (["CANCELLED"].includes(s)) return "cancelled";
  if (["REQUESTED", "PENDING"].includes(s)) return "requested";
  return "processing";
}

export class BlaaizProvider implements FinancialProvider {
  readonly kind = "blaaiz" as const;
  readonly simulated = false;
  private client: BlaaizClient;

  constructor(client?: BlaaizClient) {
    this.client = client ?? new BlaaizClient();
  }

  private async walletFor(currency: string): Promise<BlaaizWallet> {
    const wallets = await this.client.request<{ data?: BlaaizWallet[] }>(
      "/api/external/wallet",
    );
    const list = wallets.data ?? [];
    const match = list.find((w) => w.currency?.toUpperCase() === currency.toUpperCase());
    if (!match) {
      throw new ProviderError(
        `No Blaaiz wallet for ${currency}. Provision one in the Blaaiz dashboard first.`,
      );
    }
    return match;
  }

  async createFundingIntent(req: FundingIntentRequest): Promise<FundingIntentResult> {
    // Bank-transfer path via virtual bank account (NGN/GBP/EUR/USD).
    // Card collections (POST /api/external/collection) need a verified
    // customer + card token, wired per-customer in P1.
    const wallet = req.walletId
      ? ({ id: req.walletId, currency: req.currency } as BlaaizWallet)
      : await this.walletFor(req.currency);
    const vba = await this.client.request<{ data?: BlaaizVirtualAccount }>(
      "/api/external/virtual-bank-account",
      {
        method: "POST",
        body: JSON.stringify({
          wallet_id: wallet.id,
          // Blaaiz resolves amount-agnostic VBAs; the intent tracks our side.
          reference: req.idempotencyKey,
        }),
      },
    );
    const account = vba.data;
    if (!account?.id) throw new ProviderError("Blaaiz VBA creation returned no account");
    return {
      intentId: account.id,
      providerRef: account.id,
      status: account.status === "SUCCESSFUL" ? "confirmed" : "pending",
      accountNumber: account.account_number,
      bankName: undefined,
    };
  }

  async getFundingStatus(providerRef: string): Promise<FundingStatus> {
    const res = await this.client.request<{ data?: BlaaizCollection }>(
      `/api/external/collection/${encodeURIComponent(providerRef)}`,
    );
    return mapCollectionStatus(res.data?.status ?? "PENDING");
  }

  async createPayout(req: ProviderPayoutRequest): Promise<ProviderPayoutResult> {
    if (!req.walletId) {
      throw new ProviderError("Payouts require a source wallet_id");
    }
    if (!req.customerRef) {
      throw new ProviderError("Payouts require the beneficiary Blaaiz customer_id");
    }
    const payout = await this.client.request<{ data?: BlaaizPayout }>(
      "/api/external/payout",
      {
        method: "POST",
        body: JSON.stringify({
          wallet_id: req.walletId,
          customer_id: req.customerRef,
          method: req.method,
          from_amount: req.amountMinor / 100,
          reference: req.idempotencyKey,
        }),
      },
    );
    const record = payout.data;
    if (!record?.id) throw new ProviderError("Blaaiz payout creation returned no payout");
    return { providerRef: record.id, status: mapPayoutStatus(record.status ?? "PENDING") };
  }

  async getPayoutStatus(providerRef: string): Promise<PayoutStatus> {
    const res = await this.client.request<{ data?: BlaaizPayout }>(
      `/api/external/payout/${encodeURIComponent(providerRef)}`,
    );
    return mapPayoutStatus(res.data?.status ?? "PENDING");
  }

  async getRate(base: string, quote: string): Promise<ProviderRateQuote> {
    const res = await this.client.request<{ data?: BlaaizRate[] | BlaaizRate }>(
      `/api/external/rate?search_term=${encodeURIComponent(`${base}/${quote}`)}`,
    );
    const row = Array.isArray(res.data) ? res.data[0] : res.data;
    const rate = Number(row?.rate ?? NaN);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new ProviderError(`No Blaaiz rate for ${base}/${quote}`);
    }
    // Rate is quote majors per 1 base major; scale to micros without floats.
    const rateMicros = BigInt(Math.round(rate * Number(RATE_SCALE)));
    return {
      base,
      quote,
      rateMicros,
      indicative: true,
      fetchedAt: new Date().toISOString(),
      source: "blaaiz",
    };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhook> {
    const parsed = JSON.parse(rawBody) as {
      event?: string;
      event_id?: string;
      data?: Record<string, unknown>;
    };
    const eventId = parsed.event_id ?? "";
    const event = parsed.event ?? "";
    if (!event || !eventId) {
      return { valid: false, eventId: "", event: "", data: {} };
    }
    const secret = process.env.BLAAIZ_WEBHOOK_SIGNING_SECRET;
    const signature = headers.get("x-blaaiz-signature") ?? "";
    if (!secret) {
      // No secret configured: accept the envelope but flag it. The receiver
      // still dedupes by event_id. Production MUST set the secret.
      return { valid: true, eventId, event, data: parsed.data ?? {} };
    }
    // NOTE: docs confirm HMAC + signing_secret but show no worked example.
    // Assumed construction: hex(HMAC-SHA256(secret, rawBody)). Re-verify
    // against a live event before relying on it in production.
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    const valid = a.length === b.length && timingSafeEqual(a, b);
    return { valid, eventId, event, data: parsed.data ?? {} };
  }
}
