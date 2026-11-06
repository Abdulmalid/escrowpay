import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { milestoneCreateSchema } from "@/lib/validations";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;
    const store = getStore();
    const contract = store.getContract(id);
    if (!contract) throw new Error("Contract not found");
    if (user.role !== "admin" && contract.clientId !== user.id) {
      throw new ForbiddenError("Only the client can add milestones");
    }
    const input = milestoneCreateSchema.parse(await readJson(request));
    const milestone = store.addMilestone(contract.id, user.id, {
      title: input.title,
      description: input.description,
      requirements: input.requirements,
      amountMinor: input.amountMinor,
      dueAt: input.dueAt,
    });
    return ok({ milestone }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
