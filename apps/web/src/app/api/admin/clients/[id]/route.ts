import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '@/lib/db'
import { clients, clientDocuments, leads } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { UpdateClientSchema } from '@/lib/crm-stages'
import { deleteFile } from '@/lib/storage'
import { log } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// PATCH /api/admin/clients/[id] — update stage and/or notes.
// If stage changes, sends an internal audit email to Prash via Resend.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = UpdateClientSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // Fetch current record so we can detect a stage change
  const [current] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  if (!current) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const updates = {
    updatedAt: sql`NOW()`,
    ...(result.data.stage !== undefined && { stage: result.data.stage }),
    ...(result.data.notes !== undefined && { notes: result.data.notes }),
  }

  try {
    const [updated] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Stage-change audit email — awaited in its own try/catch so email failures
    // are logged without rolling back the successful client update.
    const newStage = result.data.stage
    if (newStage && newStage !== current.stage) {
      const nowIST = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
      try {
        await resend.emails.send({
          from: 'Visa Forte CRM <noreply@visaforte.com>',
          to: 'prashant@visaforte.com',
          subject: `[Stage Change] ${current.name}: ${current.stage} → ${newStage}`,
          text: [
            `Client stage updated — ${nowIST} IST`,
            '',
            `Name:         ${current.name}`,
            `Email:        ${current.email}`,
            `Service Tier: ${current.serviceTier}`,
            `Old Stage:    ${current.stage}`,
            `New Stage:    ${newStage}`,
            '',
            'This is an internal audit notification. It was not sent to the client.',
            '',
            'Visa Forte · Engineered for Passage.',
          ].join('\n'),
        })
      } catch (err: unknown) {
        log({ level: 'error', service: 'crm', action: 'stage_change_email', result: 'failure',
          metadata: { clientId: id, error: err instanceof Error ? err.message : String(err) } })
      }
    }

    return NextResponse.json({ client: updated })
  } catch (err) {
    console.error('Client update failed:', err)
    return NextResponse.json({ error: 'Could not update client' }, { status: 500 })
  }
}

// DELETE /api/admin/clients/[id] — permanently removes the client and all their documents.
// Requires x-admin-delete-password header matching ADMIN_DELETE_PASSWORD env var.
// Blobs are cleaned up first; DB cascade handles the clientDocuments rows.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  const adminDeletePassword = process.env.ADMIN_DELETE_PASSWORD ?? ''
  const providedPassword = req.headers.get('x-admin-delete-password') ?? ''
  if (!adminDeletePassword || providedPassword !== adminDeletePassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const { id } = await params

  // Fetch all stored blobs for this client so we can clean up Vercel Blob storage.
  const docs = await db
    .select()
    .from(clientDocuments)
    .where(eq(clientDocuments.clientId, id))

  // Delete blobs — failures are logged but do not block the client deletion.
  await Promise.allSettled(
    docs.map((doc) => deleteFile(doc.blobUrl).catch((err) =>
      console.error(`Blob delete failed for ${doc.blobUrl}:`, err)
    ))
  )

  let deleted: typeof clients.$inferSelect

  try {
    deleted = await db.transaction(async (tx) => {
      const [row] = await tx
        .delete(clients)
        .where(eq(clients.id, id))
        .returning()

      if (!row) throw new Error('CLIENT_NOT_FOUND')

      // Delete matching leads in the same transaction so both succeed or both roll back.
      await tx.delete(leads).where(eq(leads.email, row.email))

      return row
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CLIENT_NOT_FOUND') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    log({ level: 'error', service: 'crm', action: 'delete_client', result: 'failure',
      metadata: { clientId: id, error: err instanceof Error ? err.message : String(err) } })
    return NextResponse.json({ error: 'Could not delete client' }, { status: 500 })
  }

  return NextResponse.json({ success: true, deletedEmail: deleted.email })
}
