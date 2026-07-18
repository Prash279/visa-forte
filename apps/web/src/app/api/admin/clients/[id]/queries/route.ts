import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { irccQueries } from '../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { CreateQuerySchema } from '@/lib/monitoring-schemas';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// POST /api/admin/clients/[id]/queries
// Logs a new IRCC query for this client.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const result = CreateQuerySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 },
    );
  }

  const { queryType, receivedAt, responseDeadline, notes } = result.data;

  try {
    const [query] = await db
      .insert(irccQueries)
      .values({
        clientId: id,
        queryType,
        receivedAt,
        responseDeadline,
        notes: notes ?? null,
      })
      .returning();

    return NextResponse.json({ query }, { status: 201 });
  } catch (err) {
    console.error('IRCC query insert failed:', err);
    return NextResponse.json(
      { error: 'Could not create query' },
      { status: 500 },
    );
  }
}
