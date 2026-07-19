// Verifies a Razorpay payment for the Refusal Pattern Analyser and mints a
// 30-day access token (same stateless HMAC scheme as premium resources —
// see premium-download-token.ts). The signature is verified BEFORE anything
// else. No database row: the Razorpay dashboard is the purchase ledger.
//
// The receipt email contains a re-access LINK only — never any case detail.
// The refusal letter itself is analysed in a separate request and is never
// stored, logged, or emailed (client-privacy rule in security.md).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { Resend } from 'resend';
import {
  createDownloadToken,
  DOWNLOAD_LINK_VALIDITY_DAYS,
} from '@/lib/premium-download-token';

// The token "resource id" for this tool — must match the analyse route.
const ANALYSER_TOKEN_ID = 'refusal-analyser';

const resend = new Resend(process.env.RESEND_API_KEY);

const Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
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

  const { name, email, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    result.data;

  // ── Signature verification — nothing happens before this passes ──────────
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  const expectedSignature = createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    console.error(
      'Razorpay signature mismatch — possible tampered payment (refusal-analyser)',
    );
    return NextResponse.json(
      { error: 'Payment verification failed.' },
      { status: 400 },
    );
  }

  const token = createDownloadToken(ANALYSER_TOKEN_ID, keySecret);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://visaforte.com';
  const accessUrl = `${siteUrl}/tools/refusal-analyser?exp=${token.expiresAt}&sig=${token.signature}`;

  // ── Receipt email: re-access link only, no case detail ───────────────────
  try {
    await resend.emails.send({
      from: 'Visa Forte <noreply@visaforte.com>',
      to: email,
      subject: 'Your Refusal Pattern Analyser access',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A2B3C;">
          <h2 style="color:#0C2340;margin-bottom:4px;">Your analyser access is active.</h2>
          <div style="width:40px;height:2px;background:#C97B1E;margin-bottom:24px;"></div>
          <p style="margin:0 0 16px;line-height:1.7;color:#444;">Dear ${name}, thank you for your purchase. Use the link below to open the Refusal Pattern Analyser with your access unlocked — it works for ${DOWNLOAD_LINK_VALIDITY_DAYS} days and for as many analyses as you need.</p>
          <p style="margin:0 0 24px;">
            <a href="${accessUrl}" style="display:inline-block;background:#0C2340;color:#F8F4EE;padding:12px 24px;text-decoration:none;font-weight:600;">Open the analyser →</a>
          </p>
          <p style="margin:0 0 24px;font-size:0.85rem;line-height:1.6;color:#666;">Privacy note: your refusal letter is analysed in memory and never stored, logged, or emailed — which is why this email contains your access link and nothing else.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="margin:0;font-size:0.8rem;color:#aaa;">Visa Forte · Engineered for Passage. · Secunderabad, India</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Access email send failed (refusal-analyser):', err);
  }

  // ── Notify Prash of the sale (no case detail exists at this point) ───────
  try {
    await resend.emails.send({
      from: 'Visa Forte <noreply@visaforte.com>',
      to: 'prashant@visaforte.com',
      subject: 'RT-5 purchase — Refusal Pattern Analyser',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="color:#0c2340;">Refusal Pattern Analyser Sold</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;width:130px;">Buyer</td><td style="padding:8px 0;">${name} — <a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <p style="margin-top:16px;font-size:0.85rem;color:#666;">Full payment details are in the Razorpay dashboard. A refusal-analysis buyer is a strong candidate for the Refusal Analysis &amp; Reapplication Strategy consultation — consider a follow-up.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Sale notification to Prash failed (refusal-analyser):', err);
  }

  return NextResponse.json(
    { exp: token.expiresAt, sig: token.signature },
    { status: 201 },
  );
}
