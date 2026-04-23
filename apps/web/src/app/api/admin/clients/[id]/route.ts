import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '@/lib/db'
import { clients, clientDocuments } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { UpdateClientSchema } from '@/lib/crm-stages'
import { deleteFile } from '@/lib/storage'

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

  const updates: Record<string, unknown> = {
    updatedAt: sql`NOW()`,
  }
  if (result.data.stage !== undefined) updates.stage = result.data.stage
  if (result.data.notes !== undefined) updates.notes = result.data.notes

  try {
    const [updated] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Fire-and-forget stage-change audit email — does not block the response
    const newStage = result.data.stage
    if (newStage && newStage !== current.stage) {
      const nowIST = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
      resend.emails.send({
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
      }).catch((err) => console.error('Stage-change email failed:', err))
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

  const [deleted] = await db
    .delete(clients)
    .where(eq(clients.id, id))
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
