import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { disputeOpenSchema } from "@/lib/validations";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const store = getStore();
    const disputes = store.listDisputesFor(user).map((dispute) => ({
      dispute,
      milestone: store.getMilestone(dispute.milestoneId),
    }));
    return ok({ disputes });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const input = disputeOpenSchema.parse(await readJson(request));
    const store = getStore();
    const milestone = store.getMilestone(input.milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    const contract = store.getContract(milestone.contractId);
    if (!contract) throw new Error("Contract not found");
    if (user.role !== "admin" && !store.isParticipant(contract, user.id)) {
      throw new ForbiddenError("Not a participant of this contract");
    }
    const { response, replayed } = await store.openDispute(milestone.id, user.id, {
      reason: `${input.reason}${input.evidenceText ? `\n\nEvidence: ${input.evidenceText}` : ""}${input.evidenceUrls.length > 0 ? `\nLinks: ${input.evidenceUrls.join(", ")}` : ""}`,
      idempotencyKey: input.idempotencyKey,
    });
    return ok({ dispute: response }, { replayed });
  } catch (error) {
    return handleError(error);
  }
}
