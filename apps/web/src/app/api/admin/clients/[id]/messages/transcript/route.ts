import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages, clients, auditLog } from '../../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { uploadFile, generateDownloadUrl } from '@/lib/storage';
import { log } from '@/lib/logger';

const ADMIN_EMAIL = 'prashant@visaforte.com';

function formatTranscript(
  clientName: string,
  clientEmail: string,
  thread: Array<{ senderRole: string; body: string; createdAt: Date; attachmentUrl?: string | null }>
): string {
  const header = [
    `VISA FORTE — MESSAGE TRANSCRIPT`,
    `Client: ${clientName} <${clientEmail}>`,
    `Generated: ${new Date().toISOString()}`,
    `─────────────────────────────────────────`,
    '',
  ].join('\n');

  const body = thread
    .map((m) => {
      const sender = m.senderRole === 'admin' ? 'Prashant (Admin)' : 'Client';
      const ts = new Date(m.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const attachment = m.attachmentUrl ? `\n  [Attachment: ${m.attachmentUrl}]` : '';
      return `[${ts}] ${sender}:\n  ${m.body}${attachment}`;
    })
    .join('\n\n');

  return header + body;
}

// GET /api/admin/clients/[id]/messages/transcript
// Assembles the full message thread, writes a temporary text file to Vercel Blob,
// returns a download URL, and logs the event to auditLog per security.md §5.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: clientId } = await params;

  const [client] = await db
    .select({ name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.clientId, clientId))
    .orderBy(asc(messages.createdAt));

  const transcriptText = formatTranscript(client.name, client.email, thread);
  const pathname = `transcripts/temp/${clientId}-${Date.now()}.txt`;

  let downloadUrl: string;
  try {
    const { url: blobUrl } = await uploadFile(
      pathname,
      Buffer.from(transcriptText, 'utf-8'),
      'text/plain'
    );
    downloadUrl = generateDownloadUrl(blobUrl);
  } catch (err) {
    log({ level: 'error', service: 'transcript', action: 'upload_failed', result: 'failure',
          metadata: { clientId, error: String(err) } });
    return NextResponse.json({ error: 'Failed to generate transcript' }, { status: 500 });
  }

  await db.insert(auditLog).values({
    event: 'transcript_downloaded',
    actorId: ADMIN_EMAIL,
    targetClientId: clientId,
    metadata: { messageCount: thread.length },
  });

  log({ level: 'info', service: 'transcript', action: 'download_generated', result: 'success',
        metadata: { clientId, messageCount: thread.length } });

  return NextResponse.json({ url: downloadUrl });
}
