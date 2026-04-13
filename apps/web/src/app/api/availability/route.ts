import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { availability } from '../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';

const Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  isAvailable: z.boolean(),
});

// Admin-only endpoint. Upserts an availability row for a given date.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const authSession = await getCurrentAuthSession();
  if (authSession?.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = Schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { date, isAvailable } = result.data;

  try {
    // Insert on first toggle; update on subsequent toggles.
    await db
      .insert(availability)
      .values({ date, isAvailable })
      .onConflictDoUpdate({
        target: availability.date,
        set: { isAvailable },
      });
  } catch (err) {
    console.error('Availability update failed:', err);
    return NextResponse.json({ error: 'Could not update availability.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
