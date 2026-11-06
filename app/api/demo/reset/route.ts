import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { seedStore } from "@/lib/db/seed";
import { DemoStore } from "@/lib/db/store";
import { handleError, ok } from "@/lib/api-helpers";

/** Reset demo data to the seed state. Demo mode only. */
export async function POST(): Promise<NextResponse> {
  try {
    if (process.env.FINANCIAL_PROVIDER === "blaaiz") {
      return NextResponse.json(
        { ok: false, error: { code: "forbidden", message: "Reset is disabled on the live provider" } },
        { status: 403 },
      );
    }
    const globalForStore = globalThis as unknown as { __epgStore?: DemoStore };
    globalForStore.__epgStore = new DemoStore();
    await seedStore(getStore());
    return ok({ reset: true });
  } catch (error) {
    return handleError(error);
  }
}
