import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware runs on Vercel's Edge Runtime — Node.js-only packages (postgres.js, Drizzle)
// cannot run here. This middleware performs a lightweight cookie presence check only.
// Full session validity + account status are validated in server components (admin/page.tsx)
// which run in the Node.js runtime and have full DB access.

const SESSION_COOKIE = "better-auth.session_token";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // Redirect unauthenticated users away from protected routes.
  if (pathname.startsWith("/admin") && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect already-authenticated users away from auth pages.
  if ((pathname === "/login" || pathname === "/signup") && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/signup"],
};
