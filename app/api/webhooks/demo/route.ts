import { NextResponse } from "next/server";
import { handleProviderWebhook } from "@/lib/blaaiz/receiver";
import { getDemoProvider } from "@/lib/db/store";

/**
 * Demo webhook receiver. Exercises the same verify -> dedupe -> apply path
 * as the Blaaiz receiver, with the demo signature scheme.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.FINANCIAL_PROVIDER === "blaaiz") {
    return NextResponse.json(
      { ok: false, error: { code: "forbidden", message: "Demo webhooks are disabled on the live provider" } },
      { status: 403 },
    );
  }
  const rawBody = await request.text();
  const outcome = await handleProviderWebhook(
    "demo",
    getDemoProvider(),
    rawBody,
    request.headers,
  );
  return NextResponse.json({ ok: true, ...outcome });
}
