import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { disputeResolveSchema } from "@/lib/validations";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

/** Client or admin resolves an open dispute: resume, refund, or release. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;
    const store = getStore();
    const dispute = store.disputes.get(id);
    if (!dispute) throw new Error("Dispute not found");
    const milestone = store.getMilestone(dispute.milestoneId);
    const contract = milestone ? store.getContract(milestone.contractId) : undefined;
    if (!milestone || !contract) throw new Error("Contract not found");
    if (user.role !== "admin" && contract.clientId !== user.id) {
      throw new ForbiddenError("Only the client or an admin can resolve disputes");
    }
    const input = disputeResolveSchema.parse(await readJson(request));
    const updated = store.resolveDispute(dispute.id, user.id, {
      decision: input.decision,
      resolution: input.resolution,
    });
    return ok({ dispute: updated });
  } catch (error) {
    return handleError(error);
  }
}
