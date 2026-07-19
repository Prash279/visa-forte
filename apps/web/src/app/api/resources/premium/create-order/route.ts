// Creates a Razorpay order for a premium resource purchase.
// The amount is looked up server-side from resources.json — the client only
// sends the resource id, so the price can never be tampered with.
// The key SECRET never leaves the server; only the public key id is returned.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Razorpay from 'razorpay';
import { findPremiumResource } from '@/lib/resources';

const Schema = z.object({
  resourceId: z.string().min(1),
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

  const resource = findPremiumResource(result.data.resourceId);
  if (!resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

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
      amount: resource.priceINR * 100, // Razorpay takes paise
      currency: 'INR',
      receipt: `vf_res_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay order creation failed (premium resource):', err);
    return NextResponse.json(
      { error: 'Could not initiate payment. Please try again.' },
      { status: 500 },
    );
  }
}
