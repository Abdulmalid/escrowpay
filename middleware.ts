import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Inlined (must match DEMO_SESSION_COOKIE in src/lib/db/session.ts).
// Middleware runs on the Edge runtime and must not import the server store.
const DEMO_SESSION_COOKIE = "epg_demo";

const GATED = [
  "/dashboard",
  "/contracts",
  "/milestones",
  "/payouts",
  "/fx",
  "/guardian",
  "/disputes",
  "/history",
  "/settings",
  "/admin",
];

export function middleware(request: NextRequest): NextResponse {
  const session = request.cookies.get(DEMO_SESSION_COOKIE)?.value;
  if (!session && GATED.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/contracts/:path*",
    "/milestones/:path*",
    "/payouts/:path*",
    "/fx/:path*",
    "/guardian/:path*",
    "/disputes/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
