import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages, clients } from '../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';

const ADMIN_EMAIL = 'prashant@visaforte.com';

async function getClientForSession(): Promise<string | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || !session.user?.id) return null;
  if (session.user.email === ADMIN_EMAIL) return null;

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .limit(1);

  return client?.id ?? null;
}

// PATCH /api/portal/messages/read — mark all admin messages for this client as read.
// Called when the client's portal Messages card renders.
export async function PATCH(): Promise<NextResponse> {
  const clientId = await getClientForSession();
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db
    .update(messages)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(messages.clientId, clientId),
        eq(messages.senderRole, 'admin'),
        eq(messages.isRead, false),
      )
    );

  return new NextResponse(null, { status: 204 });
}
