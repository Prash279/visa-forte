import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads } from '../../../../drizzle/schema';
import { AssessmentLeadSchema } from '@/lib/assessment-lead-schema';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = AssessmentLeadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { name, email, crsScore } = result.data;

  try {
    await db.insert(leads).values({
      name,
      email,
      serviceInterest: 'Pre-Application Eligibility Assessment',
      notes: `CRS Score: ${crsScore}. Captured from /assessment self-assessment tool.`,
    });
  } catch (err) {
    console.error('Assessment lead insert failed:', err);
    return NextResponse.json({ error: 'Could not save your submission. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}