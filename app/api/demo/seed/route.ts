import { NextResponse } from "next/server";
import { seedStore } from "@/lib/db/seed";
import { getStore } from "@/lib/db/store";
import { handleError, ok } from "@/lib/api-helpers";

/** Seed the demo dataset. No-op when data already exists. */
export async function POST(): Promise<NextResponse> {
  try {
    const store = getStore();
    if (store.users.size > 0) return ok({ seeded: false, reason: "store_not_empty" });
    await seedStore(store);
    return ok({ seeded: true });
  } catch (error) {
    return handleError(error);
  }
}
