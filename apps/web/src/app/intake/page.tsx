'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import './intake.css';

// The 7 Visa Forte service tiers.
const SERVICE_TIERS = [
  'Pre-Application Eligibility Assessment',
  'PNP Stream Matching',
  'Document Review & Compliance Audit',
  'Refusal Analysis & Reapplication Strategy',
  'ITA Response Preparation',
  'Full Application File Management',
  'Post-Submission Monitoring',
];

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface FieldErrors {
  name?: string;
  email?: string;
  serviceInterest?: string;
}

export default function IntakePage() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consentGiven) return;

    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const serviceInterest = (form.elements.namedItem('serviceInterest') as HTMLSelectElement).value;

    const errors: FieldErrors = {};
    if (!name) errors.name = 'Full name is required.';
    if (!email) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address (e.g. you@example.com).';
    }
    if (!serviceInterest) errors.serviceInterest = 'Please select a service tier.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormState('submitting');
    setErrorMessage('');

    const data = {
      name,
      email,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value.trim() || undefined,
      serviceInterest,
      notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value.trim() || undefined,
      consentGiven: true,
    };

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setErrorMessage(typeof json.error === 'string' ? json.error : 'Submission failed. Please try again.');
        setFormState('error');
        return;
      }

      setFormState('success');
    } catch {
      setErrorMessage('A network error occurred. Please check your connection and try again.');
      setFormState('error');
    }
  }

  return (
    <main className="intake-page">

        {/* ── Page header ── */}
        <section className="intake-header">
          <p className="intake-eyebrow">Client Intake</p>
          <h1 className="intake-title">Begin Your Assessment</h1>
          <p className="intake-subtitle">
            Tell us about your situation. Prashant reviews every submission personally
            and responds within 24 hours.
          </p>
        </section>

        {/* ── Form or success state ── */}
        <section className="intake-body">

          {formState === 'success' ? (
            // Success screen — shown after a valid submission
            <div className="intake-success">
              <div className="intake-success-icon" aria-hidden="true">✓</div>
              <h2 className="intake-success-title">Submission Received</h2>
              <p className="intake-success-body">
                Thank you. Prashant will review your profile and respond to{' '}
                <strong>your email</strong> within 24 hours with a personalised assessment.
              </p>
              <Link href="/services" className="intake-success-link">
                View our service tiers →
              </Link>
            </div>
          ) : (
            <form className="intake-form" onSubmit={handleSubmit} noValidate>

              {/* Full name */}
              <div className="intake-field">
                <label className="intake-label" htmlFor="name">
                  Full Name <span className="intake-required">*</span>
                </label>
                <input
                  className={`intake-input${fieldErrors.name ? ' intake-input--error' : ''}`}
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  aria-describedby={fieldErrors.name ? 'error-name' : undefined}
                  aria-invalid={!!fieldErrors.name}
                  disabled={formState === 'submitting'}
                />
                {fieldErrors.name && (
                  <span id="error-name" className="intake-field-error" role="alert">
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="intake-field">
                <label className="intake-label" htmlFor="email">
                  Email Address <span className="intake-required">*</span>
                </label>
                <input
                  className={`intake-input${fieldErrors.email ? ' intake-input--error' : ''}`}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-describedby={fieldErrors.email ? 'error-email' : undefined}
                  aria-invalid={!!fieldErrors.email}
                  disabled={formState === 'submitting'}
                />
                {fieldErrors.email && (
                  <span id="error-email" className="intake-field-error" role="alert">
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Phone (optional) */}
              <div className="intake-field">
                <label className="intake-label" htmlFor="phone">
                  Phone Number <span className="intake-optional">(optional)</span>
                </label>
                <input
                  className="intake-input"
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  disabled={formState === 'submitting'}
                />
              </div>

              {/* Service interest */}
              <div className="intake-field">
                <label className="intake-label" htmlFor="serviceInterest">
                  Service of Interest <span className="intake-required">*</span>
                </label>
                <select
                  className={`intake-select${fieldErrors.serviceInterest ? ' intake-input--error' : ''}`}
                  id="serviceInterest"
                  name="serviceInterest"
                  defaultValue=""
                  aria-describedby={fieldErrors.serviceInterest ? 'error-service' : undefined}
                  aria-invalid={!!fieldErrors.serviceInterest}
                  disabled={formState === 'submitting'}
                >
                  <option value="" disabled>Select a service tier</option>
                  {SERVICE_TIERS.map((tier) => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
                {fieldErrors.serviceInterest && (
                  <span id="error-service" className="intake-field-error" role="alert">
                    {fieldErrors.serviceInterest}
                  </span>
                )}
              </div>

              {/* Notes (optional) */}
              <div className="intake-field">
                <label className="intake-label" htmlFor="notes">
                  Your Situation <span className="intake-optional">(optional)</span>
                </label>
                <textarea
                  className="intake-textarea"
                  id="notes"
                  name="notes"
                  rows={5}
                  placeholder="Briefly describe your current immigration status, goals, or any previous applications..."
                  disabled={formState === 'submitting'}
                />
              </div>

              {/* DPDP consent — must be checked before submission */}
              <ConsentCheckbox checked={consentGiven} onConsent={setConsentGiven} />

              {/* Error message */}
              {formState === 'error' && (
                <p className="intake-error" role="alert">{errorMessage}</p>
              )}

              {/* Submit */}
              <button
                className="intake-submit"
                type="submit"
                disabled={formState === 'submitting' || !consentGiven}
              >
                {formState === 'submitting' ? 'Submitting…' : 'Submit Intake Form →'}
              </button>

              <p className="intake-privacy">
                Your information is used solely to assess your eligibility and will never be
                shared with third parties.
              </p>

            </form>
          )}

        </section>

        {/* ── Legal disclaimer ── */}
        <section className="intake-disclaimer">
          <p>
            The information provided is for informational and guidance purposes only, based on
            publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations
            and policies. This does not constitute legal advice, and no solicitor-client or
            consultant-client relationship is created by accessing this content. Immigration
            regulations, program requirements, processing times, and CRS cutoff scores are
            subject to frequent change without notice. You are responsible for verifying all
            information with official IRCC sources (www.canada.ca/immigration) and confirming
            current eligibility requirements before taking any action.
          </p>
        </section>

    </main>
  );
}
