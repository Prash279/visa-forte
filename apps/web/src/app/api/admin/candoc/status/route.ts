import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { candocReviews } from '../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// GET /api/admin/candoc/status?clientId=<uuid>
// Returns latest review for the client. Polled every 3s by the UI.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json(
      { error: 'clientId is required' },
      { status: 400 },
    );
  }

  try {
    const [review] = await db
      .select({
        id: candocReviews.id,
        status: candocReviews.status,
        version: candocReviews.version,
        rawFindings: candocReviews.rawFindings,
        annotatedFindings: candocReviews.annotatedFindings,
        signoffChecklist: candocReviews.signoffChecklist,
        errorMessage: candocReviews.errorMessage,
        analyzedAt: candocReviews.analyzedAt,
        completedAt: candocReviews.completedAt,
      })
      .from(candocReviews)
      .where(eq(candocReviews.clientId, clientId))
      .orderBy(desc(candocReviews.version))
      .limit(1);

    if (!review) return NextResponse.json({ status: 'none' });
    return NextResponse.json(review);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
