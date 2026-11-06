import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { fundMilestoneSchema } from "@/lib/validations";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

/** Client funds a milestone: creates a provider intent (idempotent). */
export async function POST(
  request: Request,
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
      throw new ForbiddenError("Only the client can fund milestones");
    }
    const { idempotencyKey } = fundMilestoneSchema.parse(await readJson(request));
    const { response, replayed } = await store.fundMilestone(
      milestone.id,
      user.id,
      idempotencyKey,
    );
    return ok({ funding: response, milestone: store.getMilestone(milestone.id) }, { replayed });
  } catch (error) {
    return handleError(error);
  }
}
