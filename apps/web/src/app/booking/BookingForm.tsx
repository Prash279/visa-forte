'use client';

import { useState } from 'react';

// The 8 Visa Forte service tiers — must match spec.md §2 exactly.
const SERVICE_TIERS = [
  'Pre-Application Eligibility Assessment',
  'PNP Stream Matching',
  'Document Review & Compliance Audit',
  'Refusal Analysis & Reapplication Strategy',
  'ITA Response Preparation',
  'Full Application File Management',
  'Post-Submission Monitoring',
  'Retainer-Based Ongoing Support',
];

interface Props {
  availableDates: string[]; // YYYY-MM-DD strings, already filtered to future + open
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

// Formats YYYY-MM-DD into a readable label, e.g. "Monday, 14 April 2026"
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BookingForm({ availableDates }: Props) {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (availableDates.length === 0) {
    return (
      <div className="booking-unavailable">
        <p className="booking-unavailable-heading">No slots available right now.</p>
        <p className="booking-unavailable-body">
          Prashant is currently fully booked. Please check back soon or{' '}
          <a href="/contact" className="booking-unavailable-link">contact us directly</a>.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState('submitting');
    setErrorMessage('');

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem('email') as HTMLInputElement).value.trim(),
      serviceTier: (form.elements.namedItem('serviceTier') as HTMLSelectElement).value,
      bookingDate: (form.elements.namedItem('bookingDate') as HTMLSelectElement).value,
    };

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setErrorMessage(typeof json.error === 'string' ? json.error : 'Booking failed. Please try again.');
        setFormState('error');
        return;
      }

      setFormState('success');
    } catch {
      setErrorMessage('A network error occurred. Please check your connection and try again.');
      setFormState('error');
    }
  }

  if (formState === 'success') {
    return (
      <div className="booking-success">
        <div className="booking-success-icon" aria-hidden="true">✓</div>
        <h2 className="booking-success-title">Booking Confirmed</h2>
        <p className="booking-success-body">
          Your consultation request has been received. Prashant will confirm the appointment
          details by email within 24 hours.
        </p>
        <a href="/services" className="booking-success-link">Explore our service tiers →</a>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>

      {/* Preferred date */}
      <div className="booking-field">
        <label className="booking-label" htmlFor="bookingDate">
          Preferred Date <span className="booking-required">*</span>
        </label>
        <select
          className="booking-select"
          id="bookingDate"
          name="bookingDate"
          required
          defaultValue=""
          disabled={formState === 'submitting'}
        >
          <option value="" disabled>Select an available date</option>
          {availableDates.map((d) => (
            <option key={d} value={d}>{formatDate(d)}</option>
          ))}
        </select>
      </div>

      {/* Service tier */}
      <div className="booking-field">
        <label className="booking-label" htmlFor="serviceTier">
          Service Required <span className="booking-required">*</span>
        </label>
        <select
          className="booking-select"
          id="serviceTier"
          name="serviceTier"
          required
          defaultValue=""
          disabled={formState === 'submitting'}
        >
          <option value="" disabled>Select a service tier</option>
          {SERVICE_TIERS.map((tier) => (
            <option key={tier} value={tier}>{tier}</option>
          ))}
        </select>
      </div>

      {/* Full name */}
      <div className="booking-field">
        <label className="booking-label" htmlFor="name">
          Full Name <span className="booking-required">*</span>
        </label>
        <input
          className="booking-input"
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Your full name"
          disabled={formState === 'submitting'}
        />
      </div>

      {/* Email */}
      <div className="booking-field">
        <label className="booking-label" htmlFor="email">
          Email Address <span className="booking-required">*</span>
        </label>
        <input
          className="booking-input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={formState === 'submitting'}
        />
      </div>

      {/* Error */}
      {formState === 'error' && (
        <p className="booking-error" role="alert">{errorMessage}</p>
      )}

      <button
        className="booking-submit"
        type="submit"
        disabled={formState === 'submitting'}
      >
        {formState === 'submitting' ? 'Confirming…' : 'Request Consultation →'}
      </button>

      <p className="booking-privacy">
        Your details are used solely to arrange your consultation and are never shared with third parties.
      </p>

    </form>
  );
}
