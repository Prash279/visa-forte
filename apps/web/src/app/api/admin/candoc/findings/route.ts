import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { candocReviews } from '../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { parseFindings } from '@/lib/candoc-types';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// PATCH /api/admin/candoc/findings
// Body: { reviewId: string, annotatedFindings: FindingsJson }
// Validates via Zod then saves annotatedFindings, sets status to 'annotating'.
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  try {
    const { reviewId, annotatedFindings } = (await req.json()) as {
      reviewId: string;
      annotatedFindings: unknown;
    };
    if (!reviewId)
      return NextResponse.json(
        { error: 'reviewId is required' },
        { status: 400 },
      );

    const parsed = parseFindings(annotatedFindings);
    await db
      .update(candocReviews)
      .set({
        annotatedFindings: parsed,
        status: 'annotating',
        updatedAt: new Date(),
      })
      .where(eq(candocReviews.id, reviewId));

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
