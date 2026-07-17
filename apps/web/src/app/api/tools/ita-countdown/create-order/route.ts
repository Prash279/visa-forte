import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Razorpay from 'razorpay';
import {
  ITA_COUNTDOWN_STANDARD_PAISE,
  ITA_COUNTDOWN_PREMIUM_PAISE,
} from '@/lib/pricing';

const Schema = z.object({
  tier: z.enum(['standard', 'premium']),
});

// Creates a Razorpay order server-side for the RT-3 countdown planner and
// returns the order ID + public key to the client. The key SECRET never leaves the server.
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

  const { tier } = result.data;
  const amount =
    tier === 'standard'
      ? ITA_COUNTDOWN_STANDARD_PAISE
      : ITA_COUNTDOWN_PREMIUM_PAISE;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      {
        error:
          'Payment system is not configured yet. Please contact us directly.',
      },
      { status: 503 },
    );
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `vf_ita_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay order creation failed (ita-countdown):', err);
    return NextResponse.json(
      { error: 'Could not initiate payment. Please try again.' },
      { status: 500 },
    );
  }
}
