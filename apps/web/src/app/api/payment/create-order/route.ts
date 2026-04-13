import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Razorpay from 'razorpay';
import { PRICING, getAmountInSmallestUnit } from '@/lib/pricing';

// Razorpay client — initialised with env vars (placeholders until real keys are added).
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID ?? '',
  key_secret: process.env.RAZORPAY_KEY_SECRET ?? '',
});

const Schema = z.object({
  serviceTier: z.string().min(1),
  currency: z.enum(['INR', 'USD']),
});

// Creates a Razorpay order server-side and returns the order ID + public key to the client.
// The key SECRET is never sent to the client — only the key ID (which is public).
export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const { serviceTier, currency } = result.data;

  // Guard: tier must exist in the approved pricing table.
  if (!PRICING[serviceTier]) {
    return NextResponse.json({ error: 'Invalid service tier.' }, { status: 400 });
  }

  const amount = getAmountInSmallestUnit(serviceTier, currency);

  // Guard: Razorpay keys must be configured before orders can be created.
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: 'Payment system is not configured yet. Please contact us directly.' },
      { status: 503 }
    );
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      // receipt is a short reference visible in the Razorpay dashboard.
      receipt: `vf_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      // Only the public key ID goes to the client — never the secret.
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    return NextResponse.json(
      { error: 'Could not initiate payment. Please try again.' },
      { status: 500 }
    );
  }
}
