import { NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/lib/db/session";
import { ok } from "@/lib/api-helpers";

export async function POST(): Promise<NextResponse> {
  const res = ok({ loggedOut: true });
  res.cookies.delete(DEMO_SESSION_COOKIE);
  return res;
}
