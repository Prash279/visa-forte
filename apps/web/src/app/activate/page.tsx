import { and, eq, gt, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bookings } from '../../../drizzle/schema';
import ActivateForm from './ActivateForm';
import '../auth.css';

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ActivatePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token || typeof token !== 'string') {
    return <ErrorState message="This activation link is invalid. Please contact prashant@visaforte.com." />;
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.portalToken, token),
        isNotNull(bookings.portalToken),
        gt(bookings.portalTokenExpiresAt, new Date())
      )
    )
    .limit(1);

  if (!booking) {
    return (
      <ErrorState message="This activation link has expired or has already been used. Please contact prashant@visaforte.com to request a new one." />
    );
  }

  return (
    <ActivateForm
      token={token}
      name={booking.name}
      email={booking.email}
      serviceTier={booking.serviceTier}
      bookingDate={booking.bookingDate}
    />
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div>
          <p className="auth-brand-wordmark">Visa Forte</p>
          <div className="auth-brand-rule" />
          <h1 className="auth-brand-headline">Engineered<br />for Passage.</h1>
          <p className="auth-brand-body">
            Expert immigration documentation, prepared with precision.
          </p>
        </div>
        <p className="auth-brand-footer">visaforte.com · Secunderabad, India</p>
      </div>
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <h2 className="auth-heading">Link Unavailable</h2>
          <div className="auth-rule" />
          <p style={{ color: '#666', lineHeight: '1.7', marginTop: '1.25rem', fontSize: '0.95rem' }}>
            {message}
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              marginTop: '1.75rem',
              color: '#C97B1E',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              letterSpacing: '0.03em',
            }}
          >
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}