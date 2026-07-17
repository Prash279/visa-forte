import { auth } from './auth';
import { headers } from 'next/headers';
import { log } from './logger';

// Uses Better Auth's built-in server API — no manual HTTP request needed.
export async function getCurrentAuthSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (err: unknown) {
    log({
      level: 'error',
      service: 'auth',
      action: 'get_session',
      result: 'failure',
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return null;
  }
}
