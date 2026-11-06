import { NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/lib/db/session";
import { seedStore } from "@/lib/db/seed";
import { getStore } from "@/lib/db/store";
import { z } from "zod";
import { handleError, ok, readJson } from "@/lib/api-helpers";

const signupSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  // Public signup never grants admin.
  role: z.enum(["client", "freelancer"]),
});

/** Demo signup: creates a local demo user and starts a session. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const store = getStore();
    if (store.users.size === 0) await seedStore(store);
    const input = signupSchema.parse(await readJson(request));
    const user = store.createUser({
      email: input.email,
      name: input.name,
      role: input.role,
    });
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
