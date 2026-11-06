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
    const contract = store.getContract(id);
    if (!contract) throw new Error("Contract not found");
    if (user.role !== "admin" && !store.isParticipant(contract, user.id)) {
      throw new ForbiddenError("Not a participant of this contract");
    }
    const milestones = store.listMilestones(contract.id);
    const ledger = store.ledgerForContract(contract.id);
    const client = store.getUser(contract.clientId);
    const freelancer = store.getUser(contract.freelancerId);
    return ok({ contract, milestones, ledger, client, freelancer });
  } catch (error) {
    return handleError(error);
  }
}
