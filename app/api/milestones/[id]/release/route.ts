import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

const releaseSchema = z.object({
  beneficiaryId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(8).max(128),
});

/** Client releases an approved milestone: ledger release + provider payout. */
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
      throw new ForbiddenError("Only the client can release milestones");
    }
    const input = releaseSchema.parse(await readJson(request));
    const { response, replayed } = await store.releaseMilestone(milestone.id, user.id, {
      beneficiaryId: input.beneficiaryId,
      idempotencyKey: input.idempotencyKey,
    });
    return ok(
      { payout: response, milestone: store.getMilestone(milestone.id) },
      { replayed },
    );
  } catch (error) {
    return handleError(error);
  }
}
