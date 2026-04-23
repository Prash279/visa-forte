import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { UpdateClientSchema } from '@/lib/crm-stages'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// PATCH /api/admin/clients/[id] — update stage and/or notes
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
    return NextResponse.json({ client: updated })
  } catch (err) {
    console.error('Client update failed:', err)
    return NextResponse.json({ error: 'Could not update client' }, { status: 500 })
  }
}
