import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { handleError, ok, requireUser } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;
    const store = getStore();
    const milestone = store.getMilestone(id);
    if (!milestone) throw new Error("Milestone not found");
    const contract = store.getContract(milestone.contractId);
    if (!contract) throw new Error("Contract not found");
    if (user.role !== "admin" && !store.isParticipant(contract, user.id)) {
      throw new ForbiddenError("Not a participant of this contract");
    }
    const funding = [...store.funding.values()].filter(
      (f) => f.milestoneId === milestone.id,
    );
    const payouts = [...store.payouts.values()].filter(
      (p) => p.milestoneId === milestone.id,
    );
    const verifications = store.verificationsFor(milestone.id);
    const disputes = [...store.disputes.values()].filter(
      (d) => d.milestoneId === milestone.id,
    );
    return ok({ milestone, contract, funding, payouts, verifications, disputes });
  } catch (error) {
    return handleError(error);
  }
}
