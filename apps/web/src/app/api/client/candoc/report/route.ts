import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candocReviews } from '../../../../../../drizzle/schema'
import { generateDownloadUrl } from '@/lib/storage'

// GET /api/client/candoc/report?token=<jwt>
// JWT payload: { reviewId: string }. No admin session — validated via JWT.
// Redirects to signed Blob download URL.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  try {
    const secret = new TextEncoder().encode(process.env.CLIENT_PORTAL_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    const reviewId = payload.reviewId as string
    if (!reviewId) return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 })

    const [review] = await db
      .select({ reportBlobUrl: candocReviews.reportBlobUrl })
      .from(candocReviews)
      .where(eq(candocReviews.id, reviewId))

    if (!review?.reportBlobUrl) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.redirect(generateDownloadUrl(review.reportBlobUrl))
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
}
