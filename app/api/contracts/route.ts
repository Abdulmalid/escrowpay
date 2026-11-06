import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { contractCreateSchema } from "@/lib/validations";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const store = getStore();
    const contracts = store.listContractsFor(user).map((contract) => ({
      contract,
      milestones: store.listMilestones(contract.id),
    }));
    return ok({ contracts });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    if (user.role !== "client" && user.role !== "admin") {
      throw new ForbiddenError("Only clients can create contracts");
    }
    const input = contractCreateSchema.parse(await readJson(request));
    const store = getStore();
    const freelancer = store.getUserByEmail(input.freelancerEmail);
    if (!freelancer || freelancer.role !== "freelancer") {
      throw new Error("Freelancer not found for that email");
    }
    const { contract, milestones } = store.createContract({
      clientId: user.id,
      freelancerId: freelancer.id,
      title: input.title,
      description: input.description,
      currency: input.currency,
      milestones: input.milestones.map((m) => ({
        title: m.title,
        description: m.description,
        requirements: m.requirements,
        amountMinor: m.amountMinor,
        dueAt: m.dueAt,
      })),
    });
    return ok({ contract, milestones }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
