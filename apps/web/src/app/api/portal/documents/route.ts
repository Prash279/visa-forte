import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clients, clientDocuments } from '../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { uploadFile } from '@/lib/storage';
import { getChecklist } from '@/lib/document-checklist';
import { log } from '@/lib/logger';

const ADMIN_EMAIL = 'prashant@visaforte.com';

// POST /api/portal/documents
// Accepts a multipart upload from a logged-in client.
// clientId is derived from the session — never from the request body (IDOR prevention).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getCurrentAuthSession();

  if (!session?.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin must not upload via the client portal route
  if (session.user?.email === ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Derive clientId from the session — prevents IDOR
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId))
    .limit(1);

  if (!client) {
    return NextResponse.json(
      { error: 'No linked client record found' },
      { status: 404 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'Invalid multipart body' },
      { status: 400 },
    );
  }

  const docType = (formData.get('docType') as string | null)?.trim();
  const file = formData.get('file') as File | null;

  if (!docType || !file) {
    return NextResponse.json(
      { error: 'docType and file are required' },
      { status: 400 },
    );
  }

  // Validate that docType is a valid checklist item for this client's service tier
  const checklist = getChecklist(client.serviceTier);
  const validIds = new Set(checklist.map((item) => item.id));
  if (!validIds.has(docType)) {
    return NextResponse.json(
      { error: 'Invalid document type for this service tier' },
      { status: 400 },
    );
  }

  // Enforce file size limit: 20 MB
  const MAX_BYTES = 20 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File exceeds the 20 MB limit' },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const blobPathname = `clients/${client.id}/${docType}/${file.name}`;

  let blobUrl: string;
  try {
    const result = await uploadFile(
      blobPathname,
      buffer,
      file.type || 'application/octet-stream',
    );
    blobUrl = result.url;
  } catch (err) {
    console.error('Vercel Blob upload failed:', err);
    return NextResponse.json(
      { error: 'File upload failed. Please try again.' },
      { status: 500 },
    );
  }

  let doc: typeof clientDocuments.$inferSelect;
  try {
    const [inserted] = await db
      .insert(clientDocuments)
      .values({
        clientId: client.id,
        filename: file.name,
        blobUrl,
        docType,
      })
      .returning();
    doc = inserted;
  } catch (err: unknown) {
    log({
      level: 'error',
      service: 'portal',
      action: 'upload_document',
      result: 'failure',
      metadata: {
        clientId: client.id,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return NextResponse.json(
      { error: 'Failed to save document record. Please try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    doc: {
      id: doc.id,
      filename: doc.filename,
      uploadedAt: doc.uploadedAt,
    },
  });
}
