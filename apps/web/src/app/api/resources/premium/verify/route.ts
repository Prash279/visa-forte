// Verifies a Razorpay payment for a premium resource, then mints a signed
// download link and emails it to the buyer.
//
// The payment signature is verified BEFORE anything else happens — no valid
// signature, no download link, no email. There is deliberately no database
// row: the Razorpay dashboard is the purchase ledger, and the signed link
// (see premium-download-token.ts) is the buyer's proof of purchase.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { Resend } from 'resend';
import { findPremiumResource } from '@/lib/resources';
import {
  createDownloadToken,
  DOWNLOAD_LINK_VALIDITY_DAYS,
} from '@/lib/premium-download-token';

const resend = new Resend(process.env.RESEND_API_KEY);

const Schema = z.object({
  resourceId: z.string().min(1),
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

  const {
    resourceId,
    name,
    email,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = result.data;

  const resource = findPremiumResource(resourceId);
  if (!resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  // ── Signature verification — nothing happens before this passes ──────────
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  const expectedSignature = createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    console.error(
      'Razorpay signature mismatch — possible tampered payment (premium resource)',
    );
    return NextResponse.json(
      { error: 'Payment verification failed.' },
      { status: 400 },
    );
  }

  // Payment is genuine — mint the signed download link.
  const token = createDownloadToken(resourceId, keySecret);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://visaforte.com';
  const downloadUrl = `${siteUrl}/api/resources/premium/download?id=${encodeURIComponent(resourceId)}&exp=${token.expiresAt}&sig=${token.signature}`;

  // ── Email the download link to the buyer ─────────────────────────────────
  // Failure is non-fatal — the link is returned in the response either way,
  // and the browser starts the download immediately.
  try {
    await resend.emails.send({
      from: 'Visa Forte <noreply@visaforte.com>',
      to: email,
      subject: `Your purchase: ${resource.title}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A2B3C;">
          <h2 style="color:#0C2340;margin-bottom:4px;">Your resource is ready.</h2>
          <div style="width:40px;height:2px;background:#C97B1E;margin-bottom:24px;"></div>
          <p style="margin:0 0 16px;line-height:1.7;color:#444;">Dear ${name}, thank you for your purchase. Your copy of <strong>${resource.title}</strong> is ready to download:</p>
          <p style="margin:0 0 24px;">
            <a href="${downloadUrl}" style="display:inline-block;background:#0C2340;color:#F8F4EE;padding:12px 24px;text-decoration:none;font-weight:600;">Download your PDF →</a>
          </p>
          <p style="margin:0 0 24px;font-size:0.85rem;line-height:1.6;color:#666;">This link works for ${DOWNLOAD_LINK_VALIDITY_DAYS} days — save the PDF to your computer. If the link expires, reply to this email and we will re-issue it.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="margin:0;font-size:0.8rem;color:#aaa;">Visa Forte · Engineered for Passage. · Secunderabad, India</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Purchase email send failed (premium resource):', err);
  }

  // ── Notify Prash of the sale ─────────────────────────────────────────────
  try {
    await resend.emails.send({
      from: 'Visa Forte <noreply@visaforte.com>',
      to: 'prashant@visaforte.com',
      subject: `Resource purchase — ${resource.title}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="color:#0c2340;">Premium Resource Sold</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;width:130px;">Resource</td><td style="padding:8px 0;font-weight:600;">${resource.title}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Price</td><td style="padding:8px 0;font-weight:600;">₹${resource.priceINR.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Buyer</td><td style="padding:8px 0;">${name} — <a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <p style="margin-top:16px;font-size:0.85rem;color:#666;">Full payment details are in the Razorpay dashboard.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Sale notification to Prash failed (premium resource):', err);
  }

  return NextResponse.json({ downloadUrl }, { status: 201 });
}
