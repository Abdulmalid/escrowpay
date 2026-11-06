import { describe, expect, it } from "vitest";
import {
  classifyEvent,
  mapProviderFundingStatus,
  mapProviderPayoutStatus,
  providerRefFrom,
  webhookEnvelopeSchema,
} from "@/lib/blaaiz/webhooks";

describe("webhook helpers", () => {
  it("classifies Blaaiz and demo events", () => {
    expect(classifyEvent("collection.succeeded")).toBe("funding");
    expect(classifyEvent("payout.completed")).toBe("payout");
    expect(classifyEvent("virtual_account.ready")).toBe("virtual_account");
    expect(classifyEvent("demo.funding.confirmed")).toBe("funding");
    expect(classifyEvent("demo.payout.completed")).toBe("payout");
    expect(classifyEvent("something.else")).toBe("unknown");
  });

  it("maps provider statuses to internal statuses", () => {
    expect(mapProviderFundingStatus("SUCCESSFUL")).toBe("confirmed");
    expect(mapProviderFundingStatus("PENDING")).toBe("pending");
    expect(mapProviderFundingStatus("FAILED")).toBe("failed");
    expect(mapProviderPayoutStatus("SETTLED")).toBe("completed");
    expect(mapProviderPayoutStatus("PROCESSING")).toBe("processing");
    expect(mapProviderPayoutStatus("CANCELLED")).toBe("cancelled");
  });

  it("extracts provider references and validates envelopes", () => {
    expect(providerRefFrom({ provider_ref: "abc" })).toBe("abc");
    expect(providerRefFrom({ id: "xyz" })).toBe("xyz");
    expect(providerRefFrom({})).toBe("");
    const envelope = webhookEnvelopeSchema.parse({
      event: "demo.funding.confirmed",
      event_id: "e1",
      data: { provider_ref: "abc" },
    });
    expect(envelope.event_id).toBe("e1");
    expect(() => webhookEnvelopeSchema.parse({ event: "x" })).toThrow();
  });
});
