import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { crsAuditLog } from '../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';

const payloadSchema = z.object({
  rulesVersion: z.string().min(1),
  total: z.number().int().min(0).max(1800),
  sections: z.object({
    coreHuman: z.number().int().min(0),
    coreSpouse: z.number().int().min(0),
    transferability: z.number().int().min(0),
    additional: z.number().int().min(0),
  }),
  streamsEligible: z.array(z.string()),
  generatedAt: z.string().datetime(),
});

// POST /api/admin/crs-audit
// Called fire-and-forget by CanVisaProTool after each calculate() run.
// Stores a non-PII snapshot of the result for auditability.
export async function POST(req: Request): Promise<NextResponse> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { rulesVersion, total, sections, streamsEligible, generatedAt } =
    parsed.data;

  await db.insert(crsAuditLog).values({
    rulesVersion,
    total,
    sections,
    streamsEligible,
    generatedAt: new Date(generatedAt),
  });

  return new NextResponse(null, { status: 204 });
}
