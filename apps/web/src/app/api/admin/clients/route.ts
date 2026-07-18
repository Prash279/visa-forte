import { NextRequest, NextResponse } from 'next/server';
import { ilike, or, eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clients } from '../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { CreateClientSchema } from '@/lib/crm-stages';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// GET /api/admin/clients — returns all clients, optional ?search=&stage= filters
export async function GET(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const stage = searchParams.get('stage')?.trim() ?? '';

  let query = db
    .select()
    .from(clients)
    .orderBy(desc(clients.createdAt))
    .$dynamic();

  if (search) {
    query = query.where(
      or(
        ilike(clients.name, `%${search}%`),
        ilike(clients.email, `%${search}%`),
      ),
    );
  }

  if (stage && stage !== 'all') {
    query = query.where(eq(clients.stage, stage));
  }

  const rows = await query;
  return NextResponse.json({ clients: rows });
}

// POST /api/admin/clients — create a new client record
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const result = CreateClientSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, phone, serviceTier } = result.data;

  try {
    const [client] = await db
      .insert(clients)
      .values({ name, email, phone: phone ?? null, serviceTier })
      .returning();
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    console.error('Client insert failed:', err);
    return NextResponse.json(
      { error: 'Could not create client' },
      { status: 500 },
    );
  }
}
