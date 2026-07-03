import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { itaCountdownOrders } from '../../../../../../drizzle/schema';
import { generateChecklist } from '@/lib/ita-countdown-logic';

// Regenerates the checklist from the stored profile — never stores the checklist itself,
// so a future logic change (e.g. a corrected lead-time) applies retroactively to old tokens.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(itaCountdownOrders)
    .where(eq(itaCountdownOrders.token, token));

  const order = rows[0];
  if (!order || order.paymentStatus !== 'paid') {
    return NextResponse.json({ error: 'Link expired or invalid.' }, { status: 404 });
  }

  const checklist = generateChecklist({
    itaDate: order.itaDate,
    citizenshipCountry: order.citizenshipCountry,
    residenceCountries: order.residenceCountries as string[],
    hasSpouse: order.hasSpouse,
    numDependentChildren: order.numDependentChildren,
    tier: order.tier as 'standard' | 'premium',
  });

  return NextResponse.json({
    checklist,
    name: order.name,
    itaDate: order.itaDate,
    tier: order.tier,
  });
}
