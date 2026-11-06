"use client";

// Typed fetch wrapper for client components.

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "request_failed") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: { message?: string; code?: string };
  };
  if (!res.ok || body.ok === false) {
    throw new ApiError(
      body?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      body?.error?. code ?? "request_failed",
    );
  }
  return body.data as T;
}

export function idempotencyKey(): string {
  return crypto.randomUUID();
}
