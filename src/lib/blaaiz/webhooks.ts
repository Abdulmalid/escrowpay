// Webhook event parsing + status mapping shared by both receivers.

import { z } from "zod";
import type { FundingStatus, PayoutStatus } from "@/lib/fsm";

export const webhookEnvelopeSchema = z.object({
  event: z.string().min(1).max(128),
  event_id: z.string().min(1).max(128),
  timestamp: z.string().optional(),
  signature: z.string().optional(),
  data: z.record(z.unknown()).default({}),
});

export type WebhookEnvelope = z.infer<typeof webhookEnvelopeSchema>;

export type WebhookDomain = "funding" | "payout" | "virtual_account" | "unknown";

export function classifyEvent(event: string): WebhookDomain {
  if (event.startsWith("collection.")) return "funding";
  if (event.startsWith("payout.")) return "payout";
  if (event.startsWith("virtual_account.")) return "virtual_account";
  if (event.startsWith("demo.funding.")) return "funding";
  if (event.startsWith("demo.payout.")) return "payout";
  return "unknown";
}

export function mapProviderFundingStatus(status: unknown): FundingStatus {
  const s = String(status ?? "").toUpperCase();
  if (["SUCCESSFUL", "COMPLETED", "CONFIRMED", "PAID", "SETTLED"].includes(s)) {
    return "confirmed";
  }
  if (["FAILED", "REJECTED", "CANCELLED"].includes(s)) return "failed";
  if (["EXPIRED"].includes(s)) return "expired";
  return "pending";
}

export function mapProviderPayoutStatus(status: unknown): PayoutStatus {
  const s = String(status ?? "").toUpperCase();
  if (["SUCCESSFUL", "COMPLETED", "SETTLED", "PAID"].includes(s)) return "completed";
  if (["FAILED", "REJECTED"].includes(s)) return "failed";
  if (["CANCELLED"].includes(s)) return "cancelled";
  if (["REQUESTED", "PENDING"].includes(s)) return "requested";
  return "processing";
}

/** Pull the provider-side reference out of a webhook payload. */
export function providerRefFrom(data: Record<string, unknown>): string {
  for (const key of ["provider_ref", "reference", "id", "transaction_id", "payout_id"]) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
}
