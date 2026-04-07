import { auth } from "./auth";
import { cookies } from "next/headers";

export async function getCurrentAuthSession() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const request = new Request(new URL("/api/auth/get-session", baseUrl), {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  const response = await auth.handler(request);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return typeof data === "object" && data !== null && "session" in data ? data : null;
}
