import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clientDocuments } from '../../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { deleteFile } from '@/lib/storage';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// DELETE /api/admin/clients/[id]/documents/[docId] — remove blob + DB record
export async function DELETE(
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

  try {
    await deleteFile(doc.blobUrl);
  } catch (err) {
    // Log but continue — we still want to remove the DB record
    console.error('Blob delete failed (continuing with DB delete):', err);
  }

  await db
    .delete(clientDocuments)
    .where(
      and(eq(clientDocuments.id, docId), eq(clientDocuments.clientId, id)),
    );

  return NextResponse.json({ success: true });
}
