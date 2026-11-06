import { NextResponse } from "next/server";
import {
  financialProviderKind,
  isBlaaizConfigured,
  isLlmConfigured,
  isSupabaseConfigured,
} from "@/lib/config";

export async function GET(): Promise<NextResponse> {
  const provider = financialProviderKind();
  return NextResponse.json({
    ok: true,
    data: {
      service: "escrowpay-global",
      time: new Date().toISOString(),
      provider,
      simulated: provider === "demo",
      blaaizConfigured: isBlaaizConfigured(),
      llmConfigured: isLlmConfigured(),
      supabaseConfigured: isSupabaseConfigured(),
    },
  });
}
