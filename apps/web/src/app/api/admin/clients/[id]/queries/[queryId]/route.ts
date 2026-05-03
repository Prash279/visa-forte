import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { irccQueries } from '../../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { UpdateQuerySchema } from '@/lib/monitoring-schemas';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// PATCH /api/admin/clients/[id]/queries/[queryId]
// Updates the status (and optionally responseSubmittedAt + notes) of an IRCC query.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; queryId: string }> }
): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { queryId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = UpdateQuerySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { status, responseSubmittedAt, notes } = result.data;

  try {
    const [query] = await db
      .update(irccQueries)
      .set({
        status,
        responseSubmittedAt: responseSubmittedAt || null,
        notes: notes ?? null,
      })
      .where(eq(irccQueries.id, queryId))
      .returning();

    if (!query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    return NextResponse.json({ query });
  } catch (err) {
    console.error('IRCC query update failed:', err);
    return NextResponse.json({ error: 'Could not update query' }, { status: 500 });
  }
}