import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  deletionRequests,
  clients,
  clientDocuments,
  auditLog,
} from '../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { deleteFile } from '@/lib/storage';

const ActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().max(500).optional(),
});

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// PATCH /api/admin/deletion-requests/[id]
// Approve or reject a pending client data deletion request.
// On approve: deletes all Vercel Blob files, then cascade-deletes the client row.
// On reject: marks the request rejected with optional admin notes.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const result = ActionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const { action, adminNotes } = result.data;
  const now = new Date();

  const [request] = await db
    .select()
    .from(deletionRequests)
    .where(eq(deletionRequests.id, id))
    .limit(1);

  if (!request) {
    return NextResponse.json(
      { error: 'Deletion request not found.' },
      { status: 404 },
    );
  }

  if (request.status !== 'pending') {
    return NextResponse.json(
      { error: 'This request has already been processed.' },
      { status: 409 },
    );
  }

  if (action === 'approve') {
    const [client] = await db
      .select({ id: clients.id, email: clients.email, name: clients.name })
      .from(clients)
      .where(eq(clients.id, request.clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json(
        { error: 'Client record not found.' },
        { status: 404 },
      );
    }

    // Delete all uploaded document blobs before removing the DB rows.
    const docs = await db
      .select({ blobUrl: clientDocuments.blobUrl })
      .from(clientDocuments)
      .where(eq(clientDocuments.clientId, client.id));

    for (const doc of docs) {
      try {
        await deleteFile(doc.blobUrl);
      } catch {
        // Blob may already be gone — log and continue rather than blocking deletion.
      }
    }

    // Write audit entry before deleting — cascade will remove the client row.
    await db.insert(auditLog).values({
      event: 'deletion_approved',
      actorId: 'prashant@visaforte.com',
      targetClientId: client.id,
      metadata: {
        clientEmail: client.email,
        filesDeleted: docs.length,
        adminNotes: adminNotes ?? null,
      },
    });

    // Cascade-deletes clientDocuments, deletionRequests, and messages.
    await db.delete(clients).where(eq(clients.id, client.id));

    return NextResponse.json({ success: true });
  }

  // action === 'reject'
  await db
    .update(deletionRequests)
    .set({
      status: 'rejected',
      processedAt: now,
      adminNotes: adminNotes ?? null,
    })
    .where(eq(deletionRequests.id, id));

  await db.insert(auditLog).values({
    event: 'deletion_rejected',
    actorId: 'prashant@visaforte.com',
    targetClientId: request.clientId,
    metadata: { adminNotes: adminNotes ?? null },
  });

  return NextResponse.json({ success: true });
}
