import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import {
  clients,
  deletionRequests,
  auditLog,
} from '../../../../../drizzle/schema';

// GET /api/portal/deletion-request
// Returns whether the authenticated client has a pending deletion request.
export async function GET(): Promise<NextResponse> {
  const authSession = await getCurrentAuthSession();
  if (!authSession?.session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.userId, authSession.user.id))
    .limit(1);

  if (!client) return NextResponse.json({ hasPending: false });

  const [existing] = await db
    .select({ id: deletionRequests.id })
    .from(deletionRequests)
    .where(
      and(
        eq(deletionRequests.clientId, client.id),
        eq(deletionRequests.status, 'pending'),
      ),
    )
    .limit(1);

  return NextResponse.json({ hasPending: !!existing });
}

// POST /api/portal/deletion-request
// Submits a data deletion request for the authenticated client.
// Rejects if a pending request already exists (one at a time).
export async function POST(): Promise<NextResponse> {
  const authSession = await getCurrentAuthSession();
  if (!authSession?.session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Derive clientId from session — never from the request body (prevents IDOR).
  const [client] = await db
    .select({ id: clients.id, name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.userId, authSession.user.id))
    .limit(1);

  if (!client) {
    return NextResponse.json(
      { error: 'No client record found for your account.' },
      { status: 404 },
    );
  }

  // Enforce one pending request at a time.
  const [existing] = await db
    .select({ id: deletionRequests.id })
    .from(deletionRequests)
    .where(
      and(
        eq(deletionRequests.clientId, client.id),
        eq(deletionRequests.status, 'pending'),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: 'A deletion request is already pending for your account.' },
      { status: 409 },
    );
  }

  const [newRequest] = await db
    .insert(deletionRequests)
    .values({ clientId: client.id })
    .returning({ id: deletionRequests.id });

  await db.insert(auditLog).values({
    event: 'deletion_requested',
    actorId: authSession.user.id,
    targetClientId: client.id,
    metadata: { requestId: newRequest.id, clientEmail: client.email },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
