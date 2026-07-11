import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { leads } from '../../../../drizzle/schema';
import { log } from '@/lib/logger';
import { REFERRAL_SOURCES } from '@/lib/referral-sources';

// Validates the intake form payload before anything touches the database.
const IntakeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('A valid email address is required'),
  phone: z.string().max(20).optional(),
  serviceInterest: z.string().min(1, 'Please select a service'),
  notes: z.string().max(2000).optional(),
  referralSource: z.enum(REFERRAL_SOURCES).optional(),
  // DPDP: consent must be explicitly given — server rejects any submission without it
  consentGiven: z.literal(true, { errorMap: () => ({ message: 'Consent is required to proceed' }) }),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = IntakeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { name, email, phone, serviceInterest, notes, referralSource } = result.data;

  try {
    await db.insert(leads).values({
      name,
      email,
      phone: phone ?? null,
      serviceInterest,
      notes: notes ?? null,
      referralSource: referralSource ?? null,
    });
  } catch (err: unknown) {
    log({ level: 'error', service: 'intake', action: 'insert_lead', result: 'failure',
      metadata: { error: err instanceof Error ? err.message : String(err) } });
    return NextResponse.json({ error: 'Could not save your submission. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
