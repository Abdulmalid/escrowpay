// Demo sessions (P0): an httpOnly cookie holds the demo user id.
// Supabase Auth is the production path (see supabase.ts, P1 wiring).

import { cookies } from "next/headers";
import { getStore } from "./store";
import type { User } from "./types";

export const DEMO_SESSION_COOKIE = "epg_demo";

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const id = jar.get(DEMO_SESSION_COOKIE)?.value;
  if (!id) return null;
  return getStore().getUser(id) ?? null;
}

export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new SessionRequiredError();
  return user;
}

export class SessionRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "SessionRequiredError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
