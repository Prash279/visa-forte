import { auth } from "./auth";
import { headers } from "next/headers";

// Uses Better Auth's built-in server API — no manual HTTP request needed.
export async function getCurrentAuthSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    return null;
  }
}
