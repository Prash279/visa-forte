import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candocReviews, clients } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { parseFindings, type FindingsJson } from '@/lib/candoc-types'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// POST /api/admin/candoc/signoff
// Body: { reviewId, clientId, signoffChecklist, annotatedFindings }
// Stub — MARP + Blob + Resend wired in Tasks 5 and 6.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const body = await req.json() as {
      reviewId: string
      clientId: string
      signoffChecklist: Record<string, boolean>
      annotatedFindings: unknown
    }
    const { reviewId, clientId, signoffChecklist, annotatedFindings } = body
    if (!reviewId || !clientId) {
      return NextResponse.json({ error: 'reviewId and clientId are required' }, { status: 400 })
    }

    const parsed: FindingsJson = parseFindings(annotatedFindings)

    const [clientRow] = await db
      .select({ name: clients.name, email: clients.email })
      .from(clients)
      .where(eq(clients.id, clientId))
    if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    await db
      .update(candocReviews)
      .set({
        status: 'complete',
        annotatedFindings: parsed,
        signoffChecklist,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(candocReviews.id, reviewId))

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
