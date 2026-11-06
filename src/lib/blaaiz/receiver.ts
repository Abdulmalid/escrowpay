// Shared webhook receiver: verify -> dedupe -> apply. Both the Blaaiz and
// demo receivers run this exact path so the demo exercises production logic.

import type { FinancialProvider } from "@/lib/blaaiz/provider";
import {
  classifyEvent,
  mapProviderFundingStatus,
  mapProviderPayoutStatus,
  providerRefFrom,
  webhookEnvelopeSchema,
} from "@/lib/blaaiz/webhooks";
import { getDemoProvider, getStore } from "@/lib/db/store";
import { canTransitionFunding, canTransitionPayout } from "@/lib/fsm";

export interface ReceiverOutcome {
  applied: boolean;
  duplicate?: boolean;
  reason?: string;
}

export async function handleProviderWebhook(
  kind: "demo" | "blaaiz",
  provider: FinancialProvider,
  rawBody: string,
  headers: Headers,
): Promise<ReceiverOutcome> {
  const store = getStore();
  let verified;
  try {
    verified = await provider.verifyWebhook(rawBody, headers);
  } catch {
    verified = { valid: false, eventId: "", event: "", data: {} };
  }
  if (!verified.valid) {
    store.recordWebhookEvent({
      provider: kind,
      eventId: `invalid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event: "invalid",
      payload: { raw: rawBody.slice(0, 500) },
      status: "rejected",
    });
    return { applied: false, reason: "invalid_signature" };
  }
  const envelope = webhookEnvelopeSchema.parse({
    event: verified.event,
    event_id: verified.eventId,
    data: verified.data,
  });
  const { record, duplicate } = store.recordWebhookEvent({
    provider: kind,
    eventId: envelope.event_id,
    event: envelope.event,
    payload: envelope.data as Record<string, unknown>,
    status: "received",
  });
  if (duplicate) return { applied: false, duplicate: true };

  const data = envelope.data as Record<string, unknown>;
  const domain = classifyEvent(envelope.event);
  const ref = providerRefFrom(data);
  const stamp = () => {
    record.status = "applied";
    record.processedAt = new Date().toISOString();
  };

  if (domain === "funding" || domain === "virtual_account") {
    const funding = ref ? store.findFundingByProviderRef(ref) : undefined;
    if (!funding) {
      record.status = "ignored";
      return { applied: false, reason: "unknown_funding_ref" };
    }
    const next = mapProviderFundingStatus(data.status);
    if (next === "confirmed") {
      if (kind === "demo") getDemoProvider().confirmFunding(ref);
      store.applyFundingConfirmation(funding, null);
    } else if (next !== funding.status && canTransitionFunding(funding.status, next)) {
      funding.status = next;
      funding.updatedAt = new Date().toISOString();
    }
    stamp();
    return { applied: true };
  }

  if (domain === "payout") {
    const payout = ref ? store.findPayoutByProviderRef(ref) : undefined;
    if (!payout) {
      record.status = "ignored";
      return { applied: false, reason: "unknown_payout_ref" };
    }
    const next = mapProviderPayoutStatus(data.status);
    if (next === "completed") {
      if (kind === "demo") getDemoProvider().settlePayout(ref);
      store.applyPayoutCompletion(payout);
    } else if (next !== payout.status && canTransitionPayout(payout.status, next)) {
      payout.status = next;
      payout.updatedAt = new Date().toISOString();
    }
    stamp();
    return { applied: true };
  }

  record.status = "ignored";
  return { applied: false, reason: "unhandled_event" };
}
