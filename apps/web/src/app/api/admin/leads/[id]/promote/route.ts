import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, clients } from '../../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// POST /api/admin/leads/[id]/promote
// Creates a CRM client record from the lead and marks the lead as 'converted'.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await params

  const [lead] = await db.select().from(leads).where(eq(leads.id, id))
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }
  if (lead.status === 'converted') {
    return NextResponse.json({ error: 'Lead already promoted' }, { status: 409 })
  }

  try {
    const [client] = await db
      .insert(clients)
      .values({
        name: lead.name,
        email: lead.email,
        phone: lead.phone ?? null,
        serviceTier: lead.serviceInterest,
        stage: 'Lead',
        notes: lead.notes ?? null,
      })
      .returning()

    await db.update(leads).set({ status: 'converted' }).where(eq(leads.id, id))

    return NextResponse.json({ client }, { status: 201 })
  } catch (err) {
    console.error('Promote lead failed:', err)
    return NextResponse.json({ error: 'Could not promote lead' }, { status: 500 })
  }
}
