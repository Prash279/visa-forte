import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages, clients } from '../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { generateDownloadUrl } from '@/lib/storage';

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

// GET /api/portal/messages/[msgId]/attachment
// Returns a download URL for a message attachment.
// IDOR prevention: clientId derived from session, not request params.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ msgId: string }> }
): Promise<NextResponse> {
  const clientId = await getClientForSession();
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { msgId } = await params;

  const [message] = await db
    .select({ attachmentUrl: messages.attachmentUrl })
    .from(messages)
    .where(and(eq(messages.id, msgId), eq(messages.clientId, clientId)))
    .limit(1);

  if (!message?.attachmentUrl) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  return NextResponse.json({ url: generateDownloadUrl(message.attachmentUrl) });
}
