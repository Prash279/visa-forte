import { redirect } from 'next/navigation';
import { gte } from 'drizzle-orm';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { availability } from '../../../../drizzle/schema';
import AvailabilityToggle from './AvailabilityToggle';
import '../admin.css';
import './availability.css';

// Generates the next 30 calendar dates starting from today, in YYYY-MM-DD format (IST-aware).
function getNext30Days(): string[] {
  const dates: string[] = [];
  // Use IST (UTC+5:30) to determine "today" for Prash.
  const todayIST = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  for (let i = 0; i < 30; i++) {
    const d = new Date(todayIST);
    d.setDate(todayIST.getDate() + i);
    // Format as YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

// Formats YYYY-MM-DD into a human label, e.g. "Mon 14 Apr".
function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default async function AvailabilityPage() {
  const authSession = await getCurrentAuthSession();

  if (!authSession?.session) redirect('/login');
  if (authSession.user?.email !== 'prashant@visaforte.com') redirect('/');

  const dates = getNext30Days();
  const todayStr = dates[0];

  // Fetch all existing availability rows for the upcoming 30 days.
  const rows = await db
    .select()
    .from(availability)
    .where(gte(availability.date, todayStr));

  // Build a lookup map: date → isAvailable
  const availMap = new Map<string, boolean>();
  for (const row of rows) {
    availMap.set(row.date, row.isAvailable);
  }

  return (
    <div className="avail-wrap">

      {/* ── Header ── */}
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-header-wordmark">Visa Forte</span>
          <span className="admin-header-divider" />
          <span className="admin-header-label">Availability</span>
        </div>
        <div className="admin-header-right">
          <a href="/admin" className="avail-back-link">← Dashboard</a>
        </div>
      </header>

      <div className="admin-accent" />

      {/* ── Main ── */}
      <main className="avail-main">

        <div className="avail-heading-block">
          <p className="avail-eyebrow">Booking Management</p>
          <h1 className="avail-heading">Set Your Availability</h1>
          <p className="avail-sub">
            Toggle the dates below to open or close consultation slots.
            Clients only see dates marked <strong>Open</strong>.
          </p>
        </div>

        {/* 30-day grid */}
        <div className="avail-grid">
          {dates.map((date) => (
            <AvailabilityToggle
              key={date}
              date={date}
              label={formatDateLabel(date)}
              initialIsAvailable={availMap.get(date) ?? false}
            />
          ))}
        </div>

        <div className="avail-footer">
          <a href="/booking" className="avail-footer-link" target="_blank" rel="noopener noreferrer">
            Preview booking page →
          </a>
        </div>

      </main>
    </div>
  );
}
