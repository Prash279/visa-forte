import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { Resend } from 'resend'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candocReviews, clients } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { parseFindings, type FindingsJson } from '@/lib/candoc-types'
import { buildCandocMarp, renderMarpToHtml } from '@/lib/candoc-marp'
import { uploadFile } from '@/lib/storage'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// POST /api/admin/candoc/signoff
// Body: { reviewId, clientId, signoffChecklist, annotatedFindings }
// Generates MARP HTML report, uploads to Vercel Blob, emails client JWT link, marks review complete.
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

    const marpMarkdown = buildCandocMarp(parsed, clientRow.name)
    const htmlBuffer = renderMarpToHtml(marpMarkdown, `CanDoc Review — ${clientRow.name}`)
    const { url: reportBlobUrl } = await uploadFile(
      `candoc/${clientId}/${reviewId}.html`,
      htmlBuffer,
      'text/html',
    )

    const jwtSecret = new TextEncoder().encode(process.env.CLIENT_PORTAL_SECRET!)
    const portalToken = await new SignJWT({ reviewId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(jwtSecret)

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/client/candoc/report?token=${portalToken}`

    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: 'Visa Forte Consulting <prashant@visaforte.com>',
      to: clientRow.email,
      subject: `Your Immigration Document Review — ${clientRow.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:2rem;border-radius:8px;">
          <h2 style="color:#f8a100;margin-top:0;">Your Document Review is Ready</h2>
          <p>Dear ${clientRow.name},</p>
          <p>Prashant Thirthingoth at Visa Forte Consulting has completed a review of your immigration documents against IRCC requirements.</p>
          <p>
            <a href="${portalUrl}" style="background:#f8a100;color:#0f172a;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block;margin:1rem 0;">
              Download Your Review Report
            </a>
          </p>
          <p style="color:#64748b;font-size:0.875rem;">This link expires in 7 days. If you have questions, reply to this email.</p>
          <hr style="border-color:#334155;margin:1.5rem 0;" />
          <p style="color:#64748b;font-size:0.75rem;">The information provided is for informational and guidance purposes only and does not constitute legal advice. Verify all information with official IRCC sources (www.canada.ca/immigration).</p>
          <p style="color:#94a3b8;font-size:0.75rem;">Visa Forte Consulting · visaforte.com · prashant@visaforte.com</p>
        </div>
      `,
    })

    await db
      .update(candocReviews)
      .set({
        status: 'complete',
        annotatedFindings: parsed,
        signoffChecklist,
        reportBlobUrl,
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
