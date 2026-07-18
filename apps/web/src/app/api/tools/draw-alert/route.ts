import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  drawAlertSubscribers,
  toolEvents,
} from '../../../../../drizzle/schema';

const Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  crsScore: z.number().int().min(0).max(1200),
  eeCategory: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const result = Schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, crsScore, eeCategory } = result.data;

  // Check if already subscribed before upsert.
  const existing = await db
    .select({ id: drawAlertSubscribers.id })
    .from(drawAlertSubscribers)
    .where(eq(drawAlertSubscribers.email, email));

  const alreadySubscribed = existing.length > 0;

  try {
    await db
      .insert(drawAlertSubscribers)
      .values({ name, email, crsScore, eeCategory })
      .onConflictDoUpdate({
        target: drawAlertSubscribers.email,
        set: { name, crsScore, eeCategory },
      });
  } catch (err) {
    console.error('draw_alert_subscribers upsert failed:', err);
    return NextResponse.json(
      { error: 'Could not save your subscription. Please try again.' },
      { status: 500 },
    );
  }

  try {
    await db.insert(toolEvents).values({
      toolName: 'canvisa-lite',
      eventType: 'draw_alert_subscribed',
      crsScore,
      eeCategory,
    });
  } catch (err) {
    console.error('tool_events insert failed:', err);
  }

  return NextResponse.json({ success: true, alreadySubscribed });
}
