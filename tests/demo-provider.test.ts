import { describe, expect, it } from "vitest";
import { DemoFinancialProvider } from "@/lib/blaaiz/demo-provider";

describe("DemoFinancialProvider", () => {
  it("is explicitly simulated", () => {
    const provider = new DemoFinancialProvider();
    expect(provider.kind).toBe("demo");
    expect(provider.simulated).toBe(true);
  });

  it("creates idempotent funding intents and confirms them", async () => {
    const provider = new DemoFinancialProvider();
    const req = {
      milestoneId: "m1",
      amountMinor: 150_000,
      currency: "USD",
      idempotencyKey: "idem-fund-1",
    };
    const first = await provider.createFundingIntent(req);
    const second = await provider.createFundingIntent(req);
    expect(first.status).toBe("pending");
    expect(second.providerRef).toBe(first.providerRef);
    expect(await provider.getFundingStatus(first.providerRef)).toBe("pending");
    expect(provider.confirmFunding(first.providerRef)).toBe("confirmed");
    expect(await provider.getFundingStatus(first.providerRef)).toBe("confirmed");
  });

  it("runs payouts through processing to completed", async () => {
    const provider = new DemoFinancialProvider();
    const payout = await provider.createPayout({
      payoutId: "p1",
      amountMinor: 150_000,
      currency: "USD",
      method: "bank_transfer",
      idempotencyKey: "idem-pay-1",
      beneficiary: { label: "Test", accountHint: "••11", currency: "USD" },
    });
    expect(payout.status).toBe("processing");
    expect(provider.settlePayout(payout.providerRef)).toBe("completed");
    expect(await provider.getPayoutStatus(payout.providerRef)).toBe("completed");
  });

  it("serves indicative rates and verifies demo webhooks", async () => {
    const provider = new DemoFinancialProvider();
    const quote = await provider.getRate("USD", "NGN");
    expect(quote.indicative).toBe(true);
    expect(quote.rateMicros).toBe(1_550_000_000n);

    const body = JSON.stringify({ event: "demo.funding.confirmed", event_id: "e1", data: {} });
    const valid = await provider.verifyWebhook(body, new Headers({ "x-demo-signature": "demo" }));
    expect(valid.valid).toBe(true);
    expect(valid.eventId).toBe("e1");
    const invalid = await provider.verifyWebhook(body, new Headers());
    expect(invalid.valid).toBe(false);
  });
});
