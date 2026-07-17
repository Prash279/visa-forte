import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { availability } from '../../../drizzle/schema';
import BookingForm from './BookingForm';
import './booking.css';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Book a Consultation — Visa Forte',
  description:
    'Book a one-on-one consultation with Prashant Thirthingoth — 20 years of Canadian immigration documentation experience. Live availability, instant confirmation.',
  path: '/booking',
});

// Force server-side rendering on every request so available dates are always live.
// Without this, Next.js statically caches the page at build time (when no slots exist).
export const dynamic = 'force-dynamic';

// Fetch all dates that are marked open by Prash, from today onwards.
async function getAvailableDates(): Promise<string[]> {
  // Compute today's date in IST (UTC+5:30) so the list is accurate for Prash's timezone.
  const todayIST = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
  );
  const y = todayIST.getFullYear();
  const m = String(todayIST.getMonth() + 1).padStart(2, '0');
  const d = String(todayIST.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const rows = await db
    .select({ date: availability.date })
    .from(availability)
    .where(
      and(eq(availability.isAvailable, true), gte(availability.date, todayStr)),
    );

  return rows.map((r) => r.date).sort();
}

export default async function BookingPage() {
  const availableDates = await getAvailableDates();

  return (
    <main className="booking-page">
      {/* ── Page header ── */}
      <section className="booking-header">
        <p className="booking-eyebrow">Get Reviewed</p>
        <h1 className="booking-title">Schedule Your Session</h1>
        <p className="booking-subtitle">
          Select an available date and your service of interest. Prashant will
          confirm the appointment details by email within 24 hours.
        </p>
      </section>

      {/* ── Form ── */}
      <section className="booking-body">
        <BookingForm availableDates={availableDates} />
      </section>

      {/* ── Legal disclaimer ── */}
      <section className="booking-disclaimer">
        <p>
          The information provided is for informational and guidance purposes
          only, based on publicly available Immigration, Refugees and
          Citizenship Canada (IRCC) regulations and policies. This does not
          constitute legal advice, and no solicitor-client or consultant-client
          relationship is created by accessing this content. Immigration
          regulations, program requirements, processing times, and CRS cutoff
          scores are subject to frequent change without notice. You are
          responsible for verifying all information with official IRCC sources
          (www.canada.ca/immigration) and confirming current eligibility
          requirements before taking any action.
        </p>
      </section>
    </main>
  );
}
