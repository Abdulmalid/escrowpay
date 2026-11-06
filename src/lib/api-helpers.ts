import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ProviderError,
  ProviderNotConfiguredError,
} from "@/lib/blaaiz/provider";
import {
  ForbiddenError,
  SessionRequiredError,
  getSessionUser,
} from "@/lib/db/session";
import type { User } from "@/lib/db/types";
import { TransitionError } from "@/lib/fsm";

export function ok<T>(data: T, init?: { replayed?: boolean; status?: number }): NextResponse {
  const headers: Record<string, string> = {};
  if (init?.replayed) headers["x-idempotent-replayed"] = "true";
  return NextResponse.json({ ok: true, data }, { status: init?.status ?? 200, headers });
}

export function fail(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return fail(400, "validation_error", first?.message ?? "Invalid request");
  }
  if (error instanceof SessionRequiredError) return fail(401, "unauthorized", error.message);
  if (error instanceof ForbiddenError) return fail(403, "forbidden", error.message);
  if (error instanceof TransitionError) return fail(409, "illegal_transition", error.message);
  if (error instanceof ProviderNotConfiguredError) {
    return fail(503, "provider_not_configured", error.message);
  }
  if (error instanceof ProviderError) {
    return fail(502, "provider_error", error.message);
  }
  if (error instanceof Error) {
    if (error.message.includes("not found")) return fail(404, "not_found", error.message);
    return fail(400, "bad_request", error.message);
  }
  return fail(500, "internal_error", "Something went wrong");
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new SessionRequiredError();
  return user;
}

/** Parse JSON safely; every POST route uses this. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new Error("Request body must be valid JSON");
  }
}
