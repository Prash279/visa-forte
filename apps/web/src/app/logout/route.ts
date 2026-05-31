import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";

// Full-page GET to /logout.
// Calls Better Auth's signOut via the server API directly (no internal HTTP fetch),
// extracts the set-cookie header that clears the session cookie, and redirects to /login.
export async function GET(request: Request) {
  const redirectUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(redirectUrl);

  try {
    // asResponse: true makes Better Auth return a real Response with set-cookie headers.
    const signOutResponse = await auth.api.signOut({
      headers: new Headers(request.headers),
      asResponse: true,
    });

    // Forward every set-cookie header so the browser actually clears the session cookie.
    const setCookie = (signOutResponse as Response).headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }
  } catch (err: unknown) {
    log({ level: 'error', service: 'auth', action: 'sign_out', result: 'failure',
      metadata: { error: err instanceof Error ? err.message : String(err) } });
  }

  return response;
}
