import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac, randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { bookings, availability } from '../../../../../drizzle/schema';
import { PRICING, getAmountInSmallestUnit, formatPrice } from '@/lib/pricing';

const resend = new Resend(process.env.RESEND_API_KEY);

const Schema = z.object({
  // Booking fields
  name: z.string().min(1).max(100),
  email: z.string().email(),
  serviceTier: z.string().min(1),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  query: z.string().min(10).max(2000),
  // Razorpay payment tokens returned by their checkout modal
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

// Verifies Razorpay payment signature, then saves the booking and notifies Prash.
// A booking is ONLY created after the signature is verified — no payment = no booking.
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

  const {
    name,
    email,
    serviceTier,
    bookingDate,
    query,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = result.data;

  // Guard: tier must exist in the approved pricing table.
  if (!PRICING[serviceTier]) {
    return NextResponse.json(
      { error: 'Invalid service tier.' },
      { status: 400 },
    );
  }

  // ── Signature verification ──────────────────────────────────────────────────
  // Razorpay signs: HMAC-SHA256(orderId + "|" + paymentId, key_secret)
  // If the signature doesn't match, the payment was tampered with — reject it.
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  const expectedSignature = createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    console.error('Razorpay signature mismatch — possible tampered payment');
    return NextResponse.json(
      { error: 'Payment verification failed.' },
      { status: 400 },
    );
  }

  // ── Date availability guard ─────────────────────────────────────────────────
  const slots = await db
    .select()
    .from(availability)
    .where(eq(availability.date, bookingDate));

  if (slots.length === 0 || !slots[0].isAvailable) {
    return NextResponse.json(
      {
        error:
          'Selected date is no longer available. Please contact us to arrange a refund.',
      },
      { status: 409 },
    );
  }

  // ── Save booking (with portal activation token) ─────────────────────────────
  const amountPaid = getAmountInSmallestUnit(serviceTier);

  if (amountPaid === null) {
    return NextResponse.json(
      { error: 'Pricing not available for this tier.' },
      { status: 400 },
    );
  }

  // Generate a single-use token so the client can activate their portal account.
  // The token expires in 7 days and is cleared from the DB on first use.
  const portalToken = randomUUID();
  const portalTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    await db.insert(bookings).values({
      name,
      email,
      serviceTier,
      bookingDate,
      query,
      razorpayOrderId,
      razorpayPaymentId,
      // Stored per booking so historical records stay readable if USD returns.
      currency: 'INR',
      amountPaid,
      paymentStatus: 'paid',
      status: 'pending',
      portalToken,
      portalTokenExpiresAt,
    });
  } catch (err) {
    console.error('Booking insert failed after payment:', err);
    return NextResponse.json(
      {
        error:
          'Payment received but booking could not be saved. Please contact prashant@visaforte.com with your payment ID.',
      },
      { status: 500 },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://visaforte.com';
  const displayPrice = formatPrice(serviceTier);

  // ── Notify Prash via email ──────────────────────────────────────────────────
  // Email failure is non-fatal — booking is already in the DB.
  try {
    await resend.emails.send({
      from: 'Visa Forte <noreply@visaforte.com>',
      to: 'prashant@visaforte.com',
      subject: `New Paid Booking: ${name} — ${serviceTier}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="color:#0c2340;">New Consultation Booking — Payment Confirmed</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;width:130px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#666;">Service</td><td style="padding:8px 0;">${serviceTier}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Date</td><td style="padding:8px 0;font-weight:600;">${bookingDate}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Amount Paid</td><td style="padding:8px 0;font-weight:600;color:#1a7a4a;">${displayPrice}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Payment ID</td><td style="padding:8px 0;font-size:0.85em;color:#888;">${razorpayPaymentId}</td></tr>
            <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Query</td><td style="padding:8px 0;line-height:1.6;white-space:pre-wrap;">${query}</td></tr>
          </table>
          <p style="margin-top:24px;">
            <a href="${siteUrl}/admin" style="color:#c97b1e;">View all bookings in your dashboard →</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Resend notification to Prash failed:', err);
  }

  // ── Send portal activation email to client ──────────────────────────────────
  // Contains a single-use magic link — no credentials, no password in email.
  // The client sets their own password on the activation page.
  const activationUrl = `${siteUrl}/activate?token=${portalToken}`;
  try {
    await resend.emails.send({
      from: 'Visa Forte <noreply@visaforte.com>',
      to: email,
      subject:
        'Your Visa Forte consultation is confirmed — activate your client portal',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A2E;">
          <h2 style="color:#0C2340;margin-bottom:4px;">Your consultation is confirmed.</h2>
          <div style="width:40px;height:2px;background:#C97B1E;margin-bottom:24px;"></div>
          <p style="margin:0 0 8px;">Dear ${name},</p>
          <p style="margin:0 0 24px;line-height:1.7;color:#444;">
            Your payment for <strong>${serviceTier}</strong> on <strong>${bookingDate}</strong>
            has been received. Prashant will be in touch to confirm your consultation details.
          </p>
          <p style="margin:0 0 12px;line-height:1.7;color:#444;">
            You can now activate your Visa Forte client portal to track your case status
            and upload the required documents for your consultation:
          </p>
          <a href="${activationUrl}"
             style="display:inline-block;padding:14px 28px;background:#0C2340;color:#fff;
                    text-decoration:none;border-radius:4px;font-weight:600;
                    letter-spacing:0.04em;margin-bottom:24px;">
            Activate My Portal →
          </a>
          <p style="margin:0 0 24px;font-size:0.825rem;color:#999;line-height:1.6;">
            This link is valid for 7 days and can only be used once. If it expires,
            please contact <a href="mailto:prashant@visaforte.com" style="color:#C97B1E;">prashant@visaforte.com</a>.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="margin:0;font-size:0.8rem;color:#aaa;">
            Visa Forte · Engineered for Passage. · Secunderabad, India
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Portal activation email to client failed:', err);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
