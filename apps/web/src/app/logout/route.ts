import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResponse = await fetch(new URL("/api/auth/sign-out", request.url), {
    method: "POST",
    headers: request.headers,
    cache: "no-store",
  });

  const redirectUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(redirectUrl);
  const setCookie = authResponse.headers.get("set-cookie");

  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}
