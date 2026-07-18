import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages, clients } from '../../../../../../../drizzle/schema';
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

// GET /api/portal/messages/[msgId]/attachment
// Streams the private blob through the server — IDOR: clientId derived from session.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ msgId: string }> },
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
    return NextResponse.json(
      { error: 'Attachment not found' },
      { status: 404 },
    );
  }

  const blobRes = await fetch(message.attachmentUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!blobRes.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch attachment' },
      { status: 502 },
    );
  }

  const contentType =
    blobRes.headers.get('content-type') ?? 'application/octet-stream';
  const filename = decodeURIComponent(
    message.attachmentUrl.split('/').pop() ?? 'attachment',
  );

  return new NextResponse(blobRes.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
