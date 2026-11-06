import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_SESSION_COOKIE } from "@/lib/db/session";
import { seedStore } from "@/lib/db/seed";
import { getStore } from "@/lib/db/store";
import { handleError, ok, readJson } from "@/lib/api-helpers";

const loginSchema = z.object({ email: z.string().email().max(254) });

/** Demo login: pick a seeded persona. Auto-seeds on first use. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const store = getStore();
    if (store.users.size === 0) await seedStore(store);
    const { email } = loginSchema.parse(await readJson(request));
    const user = store.getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "unknown_user", message: "Unknown demo user" } },
        { status: 404 },
      );
    }
    const res = ok({ user });
    res.cookies.set(DEMO_SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (error) {
    return handleError(error);
  }
}
