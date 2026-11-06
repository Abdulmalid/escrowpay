// DemoFinancialProvider: explicit simulation. Never moves real money.
// Powers the hackathon demo and all local development without credentials.

import type { FundingStatus, PayoutStatus } from "@/lib/fsm";
import { RATE_SCALE } from "@/lib/money";
import type {
  FinancialProvider,
  FundingIntentRequest,
  FundingIntentResult,
  ProviderPayoutRequest,
  ProviderPayoutResult,
  ProviderRateQuote,
  VerifiedWebhook,
} from "./provider";

interface DemoFunding {
  ref: string;
  status: FundingStatus;
  amountMinor: number;
  currency: string;
}

interface DemoPayout {
  ref: string;
  status: PayoutStatus;
  amountMinor: number;
  currency: string;
}

// Indicative static rates, quote majors per 1 base major (micros scaled).
const DEMO_RATES: Record<string, bigint> = {
  "USD/NGN": 1_550_000_000n,
  "USD/GHS": 15_800_000n,
  "USD/KES": 129_200_000n,
  "USD/GBP": 790_000n,
  "USD/EUR": 920_000n,
  "USD/USD": 1_000_000n,
  "GBP/NGN": 1_962_000_000n,
  "EUR/NGN": 1_684_800_000n,
};

function demoId(prefix: string): string {
  return `${prefix}_demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class DemoFinancialProvider implements FinancialProvider {
  readonly kind = "demo" as const;
  readonly simulated = true;

  private funding = new Map<string, DemoFunding>();
  private payouts = new Map<string, DemoPayout>();
  private idem = new Map<string, string>(); // idempotency key -> provider ref

  async createFundingIntent(req: FundingIntentRequest): Promise<FundingIntentResult> {
    const prior = this.idem.get(`fund:${req.idempotencyKey}`);
    if (prior) {
      const found = this.funding.get(prior);
      if (found) {
        return {
          intentId: found.ref,
          providerRef: found.ref,
          status: found.status,
          accountNumber: "0123456789",
          bankName: "Demo Settlement Bank (SIMULATED)",
        };
      }
    }
    const ref = demoId("fund");
    this.funding.set(ref, {
      ref,
      status: "pending",
      amountMinor: req.amountMinor,
      currency: req.currency,
    });
    this.idem.set(`fund:${req.idempotencyKey}`, ref);
    return {
      intentId: ref,
      providerRef: ref,
      status: "pending",
      accountNumber: "0123456789",
      bankName: "Demo Settlement Bank (SIMULATED)",
    };
  }

  async getFundingStatus(providerRef: string): Promise<FundingStatus> {
    return this.funding.get(providerRef)?.status ?? "expired";
  }

  /** Simulates the async provider confirmation (called by the demo webhook). */
  confirmFunding(providerRef: string): FundingStatus {
    const record = this.funding.get(providerRef);
    if (!record || record.status !== "pending") return record?.status ?? "expired";
    record.status = "confirmed";
    return record.status;
  }

  async createPayout(req: ProviderPayoutRequest): Promise<ProviderPayoutResult> {
    const prior = this.idem.get(`pay:${req.idempotencyKey}`);
    if (prior) {
      const found = this.payouts.get(prior);
      if (found) return { providerRef: found.ref, status: found.status };
    }
    const ref = demoId("pay");
    this.payouts.set(ref, {
      ref,
      status: "processing",
      amountMinor: req.amountMinor,
      currency: req.currency,
    });
    this.idem.set(`pay:${req.idempotencyKey}`, ref);
    return { providerRef: ref, status: "processing", eta: "simulated ~2 min" };
  }

  async getPayoutStatus(providerRef: string): Promise<PayoutStatus> {
    return this.payouts.get(providerRef)?.status ?? "cancelled";
  }

  /** Simulates provider settlement. */
  settlePayout(providerRef: string): PayoutStatus {
    const record = this.payouts.get(providerRef);
    if (!record || record.status !== "processing") {
      return record?.status ?? "cancelled";
    }
    record.status = "completed";
    return record.status;
  }

  async getRate(base: string, quote: string): Promise<ProviderRateQuote> {
    const direct = DEMO_RATES[`${base}/${quote}`];
    const rateMicros = direct ?? RATE_SCALE; // unknown pair: parity, still indicative
    return {
      base,
      quote,
      rateMicros,
      feeBps: 150n, // simulated 1.5% all-in fee assumption
      indicative: true,
      fetchedAt: new Date().toISOString(),
      source: "demo",
    };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhook> {
    // Demo webhooks are trusted local simulation traffic, but they must still
    // carry an event envelope so the receiver exercises the real code path.
    const marker = headers.get("x-demo-signature");
    if (marker !== "demo") return { valid: false, eventId: "", event: "", data: {} };
    const parsed = JSON.parse(rawBody) as {
      event?: string;
      event_id?: string;
      data?: Record<string, unknown>;
    };
    if (!parsed.event || !parsed.event_id) {
      return { valid: false, eventId: "", event: "", data: {} };
    }
    return {
      valid: true,
      eventId: parsed.event_id,
      event: parsed.event,
      data: parsed.data ?? {},
    };
  }
}
