import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages } from '../../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';

const ADMIN_EMAIL = 'prashant@visaforte.com';

// PATCH /api/admin/clients/[id]/messages/read — mark all client messages as read.
// Called when admin opens the message modal for a client.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: clientId } = await params;

  await db
    .update(messages)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(messages.clientId, clientId),
        eq(messages.senderRole, 'client'),
        eq(messages.isRead, false),
      )
    );

  return new NextResponse(null, { status: 204 });
}
