import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac, randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { itaCountdownOrders } from '../../../../../../drizzle/schema';
import { generateChecklist } from '@/lib/ita-countdown-logic';

const resend = new Resend(process.env.RESEND_API_KEY);

const Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  itaDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  citizenshipCountry: z.string().min(1),
  residenceCountries: z.array(z.string().min(1)).min(1),
  hasSpouse: z.boolean(),
  numDependentChildren: z.number().int().min(0).max(10),
  tier: z.enum(['standard', 'premium']),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

// Verifies the Razorpay signature, then generates and stores the checklist.
// A row is ONLY created after the signature is verified — no payment, no order.
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

  const {
    name, email, itaDate, citizenshipCountry, residenceCountries,
    hasSpouse, numDependentChildren, tier,
    razorpayOrderId, razorpayPaymentId, razorpaySignature,
  } = result.data;

  // ── Signature verification ──────────────────────────────────────────────────
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  const expectedSignature = createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    console.error('Razorpay signature mismatch — possible tampered payment (ita-countdown)');
    return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 });
  }

  const token = randomUUID();
  const checklist = generateChecklist({
    itaDate, citizenshipCountry, residenceCountries, hasSpouse, numDependentChildren, tier,
  });

  try {
    await db.insert(itaCountdownOrders).values({
      name,
      email,
      itaDate,
      citizenshipCountry,
      residenceCountries,
      hasSpouse,
      numDependentChildren,
      tier,
      token,
      razorpayOrderId,
      razorpayPaymentId,
      paymentStatus: 'paid',
    });
  } catch (err) {
    console.error('ita-countdown order insert failed after payment:', err);
    return NextResponse.json(
      { error: 'Payment received but your checklist could not be saved. Please contact prashant@visaforte.com with your payment ID.' },
      { status: 500 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://visaforte.com';
  const resultUrl = `${siteUrl}/tools/ita-countdown/result?token=${token}`;

  // ── Email the checklist to the subscriber ───────────────────────────────────
  // Failure is non-fatal — the checklist is already saved and reachable via resultUrl.
  let emailSent = false;
  try {
    await resend.emails.send({
      from: 'Visa Forte <noreply@visaforte.com>',
      to: email,
      subject: 'Your 60-Day ITA Countdown Checklist',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1A2E;">
          <h2 style="color:#0C2340;margin-bottom:4px;">Your document checklist is ready.</h2>
          <div style="width:40px;height:2px;background:#C97B1E;margin-bottom:24px;"></div>
          <p style="margin:0 0 24px;line-height:1.7;color:#444;">Dear ${name}, here is your personalised 60-day document preparation timeline based on your ITA date of <strong>${itaDate}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;">
            ${checklist.map((item) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;">
                  <strong style="color:#0C2340;">${item.task}</strong><br/>
                  <span style="font-size:0.85rem;color:#666;">Start by ${item.startByDate} · Deadline ${item.deadlineDate}</span><br/>
                  <span style="font-size:0.8rem;color:#888;">${item.notes}</span>
                </td>
              </tr>
            `).join('')}
          </table>
          <p style="margin-top:24px;">
            <a href="${resultUrl}" style="color:#c97b1e;">View and print your checklist online →</a>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="margin:0;font-size:0.8rem;color:#aaa;">Visa Forte · Engineered for Passage. · Secunderabad, India</p>
        </div>
      `,
    });
    emailSent = true;
  } catch (err) {
    console.error('Checklist email send failed (ita-countdown):', err);
  }

  if (emailSent) {
    try {
      await db
        .update(itaCountdownOrders)
        .set({ emailSent: true })
        .where(eq(itaCountdownOrders.token, token));
    } catch (err) {
      console.error('Failed to mark ita-countdown emailSent flag:', err);
    }
  }

  // ── Premium tier: notify Prash to schedule the document review consultation ─
  if (tier === 'premium') {
    try {
      await resend.emails.send({
        from: 'Visa Forte <noreply@visaforte.com>',
        to: 'prashant@visaforte.com',
        subject: `RT-3 premium purchase — ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#0c2340;">RT-3 Premium Purchase — Schedule Doc Review</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#666;width:130px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#666;">ITA Date</td><td style="padding:8px 0;font-weight:600;">${itaDate}</td></tr>
            </table>
            <p style="margin-top:16px;">Schedule a 30-min document review consultation with this client.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Premium notification to Prash failed (ita-countdown):', err);
    }
  }

  return NextResponse.json({ token }, { status: 201 });
}
