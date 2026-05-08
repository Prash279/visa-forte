import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages } from '../../../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { generateDownloadUrl } from '@/lib/storage';

const ADMIN_EMAIL = 'prashant@visaforte.com';

// GET /api/admin/clients/[id]/messages/[msgId]/attachment
// Returns a download URL for a message attachment. Admin-only.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
): Promise<NextResponse> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: clientId, msgId } = await params;

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
