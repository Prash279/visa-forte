import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clientDocuments } from '../../../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { generateDownloadUrl } from '@/lib/storage';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// GET /api/admin/clients/[id]/documents/[docId]/download
// Returns a signed Vercel Blob download URL. The raw blobUrl is never sent to the browser.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { id, docId } = await params;

  const [doc] = await db
    .select()
    .from(clientDocuments)
    .where(and(eq(clientDocuments.id, docId), eq(clientDocuments.clientId, id)))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const downloadUrl = generateDownloadUrl(doc.blobUrl);
  return NextResponse.json({ url: downloadUrl, filename: doc.filename });
}
