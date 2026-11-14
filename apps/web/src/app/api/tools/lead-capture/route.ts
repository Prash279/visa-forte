import { CRS_MAX_TOTAL } from '@/lib/crs-calculator';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';
import {
  drawAlertSubscribers,
  toolEvents,
} from '../../../../../drizzle/schema';

const Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  crsScore: z.number().int().min(0).max(CRS_MAX_TOTAL),
  eeCategory: z.string().min(1),
  toolName: z.string().min(1),
  wantsDrawAlert: z.boolean().optional().default(false),
  weaknesses: z
    .array(z.object({ label: z.string(), pointGain: z.number() }))
    .optional(),
  bestPathway: z
    .object({ category: z.string(), cutoffScore: z.number(), gap: z.number() })
    .optional(),
  ecaPending: z.boolean().optional().default(false),
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
    name,
    email,
    crsScore,
    eeCategory,
    toolName,
    wantsDrawAlert,
    weaknesses,
    bestPathway,
    ecaPending,
  } = result.data;

  // Subscribe to draw alerts if requested.
  if (wantsDrawAlert) {
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
    }
  }

  // Record the lead event.
  try {
    await db
      .insert(toolEvents)
      .values({ toolName, eventType: 'lead_captured', crsScore, eeCategory });
  } catch (err) {
    console.error('tool_events insert failed:', err);
  }

  // Email the subscriber their results.
  const weaknessList =
    weaknesses && weaknesses.length > 0
      ? weaknesses.map((w) => `• ${w.label}: +${w.pointGain} pts`).join('\n')
      : 'Run the tool for your full breakdown.';

  const pathwayLine = bestPathway
    ? `Best pathway: ${bestPathway.category} (cutoff ${bestPathway.cutoffScore}, you are ${bestPathway.gap >= 0 ? `+${bestPathway.gap} above` : `${Math.abs(bestPathway.gap)} below`} cutoff)`
    : '';

  const ecaCaveatHtml = ecaPending
    ? `<p style="font-size:13px;color:#92400E;background:#FFFBEB;border:1px solid #FDE68A;border-radius:4px;padding:10px 14px;line-height:1.6;">
         <strong>Provisional score:</strong> this assumes your declared education confirms on an
         Educational Credential Assessment (ECA) — required by IRCC to actually count toward your CRS score.
       </p>`
    : '';

  try {
    await sendEmail({
      fromName: 'Visa Forte',
      to: email,
      subject: `Your CanVisa Pro Results — CRS ${crsScore}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a2b3c;">
          <h2 style="color:#0c2340;margin-bottom:4px;">Your CRS Score: ${crsScore}</h2>
          <p style="color:#888;font-size:14px;margin-top:0;">Express Entry pool eligibility category: ${eeCategory}</p>
          ${ecaCaveatHtml}
          <hr style="border:none;border-top:1px solid #e5e0d8;margin:20px 0;" />
          <h3 style="color:#0c2340;">Top Improvement Opportunities</h3>
          <pre style="font-family:sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;">${weaknessList}</pre>
          ${pathwayLine ? `<p style="font-size:14px;">${pathwayLine}</p>` : ''}
          <hr style="border:none;border-top:1px solid #e5e0d8;margin:20px 0;" />
          <p style="font-size:12px;color:#888;line-height:1.6;">
            This information is for educational purposes only and does not constitute immigration advice.
            Verify all information at canada.ca before taking any action.
          </p>
          <p style="font-size:12px;color:#888;">
            <a href="https://visaforte.com" style="color:#c97b1e;">visaforte.com</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Subscriber email failed:', err);
  }

  // Notify Prash.
  try {
    await sendEmail({
      fromName: 'Visa Forte',
      to: 'prashant@visaforte.com',
      subject: `New Tool Lead: ${name} — CRS ${crsScore} (${eeCategory})`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#0c2340;">New Lead from ${toolName}</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#666;width:120px;">Name</td><td style="padding:6px 0;font-weight:600;">${name}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:6px 0;color:#666;">CRS Score</td><td style="padding:6px 0;font-weight:600;">${crsScore}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Category</td><td style="padding:6px 0;">${eeCategory}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Draw Alert</td><td style="padding:6px 0;">${wantsDrawAlert ? 'Yes' : 'No'}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">ECA Pending</td><td style="padding:6px 0;${ecaPending ? 'font-weight:600;color:#92400E;' : ''}">${ecaPending ? 'Yes — score is provisional' : 'No'}</td></tr>
          </table>
        </div>
      `,
    });
  } catch (err) {
    console.error('Admin notification email failed:', err);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
