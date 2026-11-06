import { NextResponse } from "next/server";
import { BlaaizProvider } from "@/lib/blaaiz/blaaiz-provider";
import { handleProviderWebhook } from "@/lib/blaaiz/receiver";

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const outcome = await handleProviderWebhook(
    "blaaiz",
    new BlaaizProvider(),
    rawBody,
    request.headers,
  );
  // Always 2xx after receipt: Blaaiz retries non-2xx. Invalid signatures are
  // recorded as rejected, never applied.
  const status = outcome.applied || outcome.duplicate ? 200 : 200;
  return NextResponse.json({ ok: true, ...outcome }, { status });
}
