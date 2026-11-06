import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError } from "@/lib/db/session";
import { getDemoProvider, getStore } from "@/lib/db/store";
import { canTransitionPayout } from "@/lib/fsm";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

const retrySchema = z.object({ payoutId: z.string().uuid() });

/** Retry a failed payout: failed -> processing, then re-poll the provider. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { payoutId } = retrySchema.parse(await readJson(request));
    const store = getStore();
    const payout = store.payouts.get(payoutId);
    if (!payout) throw new Error("Payout not found");
    const milestone = store.getMilestone(payout.milestoneId);
    const contract = milestone ? store.getContract(milestone.contractId) : undefined;
    if (!milestone || !contract) throw new Error("Contract not found");
    if (user.role !== "admin" && !store.isParticipant(contract, user.id)) {
      throw new ForbiddenError("Not a participant of this contract");
    }
    if (!canTransitionPayout(payout.status, "processing")) {
      throw new Error(`Cannot retry a payout in status ${payout.status}`);
    }
    payout.status = "processing";
    payout.updatedAt = new Date().toISOString();
    // Reconcile with the provider: demo settles, live reports truth.
    if (payout.provider === "demo" && payout.providerRef) {
      getDemoProvider().settlePayout(payout.providerRef);
      store.applyPayoutCompletion(payout);
    }
    store.log(user.id, "payout.retry", "payout", payout.id, { status: payout.status });
    return ok({ payout });
  } catch (error) {
    return handleError(error);
  }
}
