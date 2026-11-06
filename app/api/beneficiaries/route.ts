import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { beneficiarySchema } from "@/lib/validations";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    return ok({ beneficiaries: getStore().listBeneficiaries(user.id) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const input = beneficiarySchema.parse(await readJson(request));
    const beneficiary = getStore().createBeneficiary({
      userId: user.id,
      label: input.label,
      rail: input.rail,
      currency: input.currency,
      accountHint: input.accountHint,
    });
    return ok({ beneficiary }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
