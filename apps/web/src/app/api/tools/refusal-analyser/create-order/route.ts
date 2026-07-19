// Creates a Razorpay order for the Refusal Pattern Analyser (RT-5).
// The amount comes from the server-side pricing constant — the client sends
// nothing that could influence it. The key SECRET never leaves the server.

import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { REFUSAL_ANALYSER_PAISE } from '@/lib/pricing';

export async function POST(): Promise<NextResponse> {
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
      amount: REFUSAL_ANALYSER_PAISE,
      currency: 'INR',
      receipt: `vf_ra_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay order creation failed (refusal-analyser):', err);
    return NextResponse.json(
      { error: 'Could not initiate payment. Please try again.' },
      { status: 500 },
    );
  }
}
