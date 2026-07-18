import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { bookings, availability } from '../../../../drizzle/schema';

const resend = new Resend(process.env.RESEND_API_KEY);

const BookingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('A valid email address is required'),
  serviceTier: z.string().min(1, 'Please select a service'),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  query: z
    .string()
    .min(
      10,
      'Please describe your question or issue in detail (minimum 10 characters)',
    )
    .max(2000),
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

  const result = BookingSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, serviceTier, bookingDate, query } = result.data;

  // Guard: the requested date must be marked available by Prash.
  const slots = await db
    .select()
    .from(availability)
    .where(eq(availability.date, bookingDate));

  if (slots.length === 0 || !slots[0].isAvailable) {
    return NextResponse.json(
      {
        error:
          'Selected date is no longer available. Please choose another date.',
      },
      { status: 409 },
    );
  }

  // Save the booking first — email is non-fatal.
  try {
    await db
      .insert(bookings)
      .values({ name, email, serviceTier, bookingDate, query });
  } catch (err) {
    console.error('Booking insert failed:', err);
    return NextResponse.json(
      { error: 'Could not save your booking. Please try again.' },
      { status: 500 },
    );
  }

  // Notify Prash. If Resend fails the booking is already persisted — no rollback.
  try {
    await resend.emails.send({
      from: 'Visa Forte <noreply@visaforte.com>',
      to: 'prashant@visaforte.com',
      subject: `New Booking: ${name} — ${serviceTier}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#0c2340;">New Consultation Booking</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#666;">Service</td><td style="padding:8px 0;">${serviceTier}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Date</td><td style="padding:8px 0;font-weight:600;">${bookingDate}</td></tr>
            <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Query</td><td style="padding:8px 0;line-height:1.6;white-space:pre-wrap;">${query}</td></tr>
          </table>
          <p style="margin-top:24px;">
            <a href="https://visaforte.com/admin" style="color:#c97b1e;">View all bookings in your dashboard →</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Resend notification failed:', err);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
