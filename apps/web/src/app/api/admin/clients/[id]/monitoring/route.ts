import { NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  applicationMonitoring,
  irccQueries,
} from '../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { CreateMonitoringSchema } from '@/lib/monitoring-schemas';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// GET /api/admin/clients/[id]/monitoring
// Returns the monitoring record (or null) and all IRCC queries for the client.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { id } = await params;

  const [monitoring] = await db
    .select()
    .from(applicationMonitoring)
    .where(eq(applicationMonitoring.clientId, id))
    .limit(1);

  const queries = await db
    .select()
    .from(irccQueries)
    .where(eq(irccQueries.clientId, id))
    .orderBy(asc(irccQueries.receivedAt));

  return NextResponse.json({ monitoring: monitoring ?? null, queries });
}

// POST /api/admin/clients/[id]/monitoring
// Creates or updates (upserts) the monitoring record for this client.
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

  const result = CreateMonitoringSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 },
    );
  }

  const {
    submittedAt,
    aorNumber,
    expectedDecisionDate,
    lastStatusCheck,
    irccPortalStatus,
    monitoringNotes,
  } = result.data;

  // Upsert — update if a record exists for this client, insert if not.
  const values = {
    clientId: id,
    submittedAt,
    aorNumber: aorNumber ?? null,
    expectedDecisionDate: expectedDecisionDate || null,
    lastStatusCheck: lastStatusCheck || null,
    irccPortalStatus: irccPortalStatus ?? null,
    monitoringNotes: monitoringNotes ?? null,
  };

  try {
    const [record] = await db
      .insert(applicationMonitoring)
      .values(values)
      .onConflictDoUpdate({
        target: applicationMonitoring.clientId,
        set: {
          submittedAt: values.submittedAt,
          aorNumber: values.aorNumber,
          expectedDecisionDate: values.expectedDecisionDate,
          lastStatusCheck: values.lastStatusCheck,
          irccPortalStatus: values.irccPortalStatus,
          monitoringNotes: values.monitoringNotes,
        },
      })
      .returning();

    return NextResponse.json({ monitoring: record }, { status: 200 });
  } catch (err) {
    console.error('Monitoring upsert failed:', err);
    return NextResponse.json(
      { error: 'Could not save monitoring record' },
      { status: 500 },
    );
  }
}
