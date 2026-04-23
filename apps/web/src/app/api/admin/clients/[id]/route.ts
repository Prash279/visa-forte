import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '@/lib/db'
import { clients } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { UpdateClientSchema } from '@/lib/crm-stages'

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
