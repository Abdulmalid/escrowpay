import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { handleError, ok, requireUser } from "@/lib/api-helpers";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const store = getStore();
    const payouts = store.listPayoutsFor(user).map((payout) => ({
      payout,
      milestone: store.getMilestone(payout.milestoneId),
      beneficiary: store.beneficiaries.get(payout.beneficiaryId),
    }));
    return ok({ payouts });
  } catch (error) {
    return handleError(error);
  }
}
