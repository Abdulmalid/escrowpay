import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { handleError, ok, requireUser } from "@/lib/api-helpers";

/** Client cancels a pre-release milestone. */
export async function POST(
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
    if (user.role !== "admin" && contract.clientId !== user.id) {
      throw new ForbiddenError("Only the client can cancel milestones");
    }
    const updated = store.cancelMilestone(milestone.id, user.id);
    return ok({ milestone: updated });
  } catch (error) {
    return handleError(error);
  }
}
