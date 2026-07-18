import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { candocReviews, clients } from '../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// POST /api/admin/candoc/trigger
// Body: { clientId: string }
// Creates a new candoc_reviews row. Version auto-increments from the latest existing version.
// Returns: { reviewId: string, version: number }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  try {
    const { clientId } = (await req.json()) as { clientId: string };
    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 },
      );
    }

    const [clientRow] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId));
    if (!clientRow) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const existing = await db
      .select({ version: candocReviews.version })
      .from(candocReviews)
      .where(eq(candocReviews.clientId, clientId))
      .orderBy(desc(candocReviews.version))
      .limit(1);

    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    const [created] = await db
      .insert(candocReviews)
      .values({ clientId, version: nextVersion, status: 'pending' })
      .returning({ id: candocReviews.id, version: candocReviews.version });

    return NextResponse.json({
      reviewId: created.id,
      version: created.version,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
