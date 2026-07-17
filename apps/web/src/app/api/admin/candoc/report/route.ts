import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { candocReviews } from '../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { generateDownloadUrl } from '@/lib/storage';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// GET /api/admin/candoc/report?reviewId=<uuid>
// Returns a short-lived Vercel Blob download URL for the generated report.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const reviewId = req.nextUrl.searchParams.get('reviewId');
  if (!reviewId)
    return NextResponse.json(
      { error: 'reviewId is required' },
      { status: 400 },
    );

  try {
    const [review] = await db
      .select({
        reportBlobUrl: candocReviews.reportBlobUrl,
        status: candocReviews.status,
      })
      .from(candocReviews)
      .where(eq(candocReviews.id, reviewId));

    if (!review)
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    if (review.status !== 'complete' || !review.reportBlobUrl) {
      return NextResponse.json({ error: 'Report not ready' }, { status: 409 });
    }

    const downloadUrl = generateDownloadUrl(review.reportBlobUrl);
    return NextResponse.json({ downloadUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
