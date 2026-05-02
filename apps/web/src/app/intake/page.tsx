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

export default function IntakePage() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consentGiven) return;
    setFormState('submitting');
    setErrorMessage('');

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem('email') as HTMLInputElement).value.trim(),
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value.trim() || undefined,
      serviceInterest: (form.elements.namedItem('serviceInterest') as HTMLSelectElement).value,
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
                  className="intake-input"
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
              <div className="intake-field">
                <label className="intake-label" htmlFor="email">
                  Email Address <span className="intake-required">*</span>
                </label>
                <input
                  className="intake-input"
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  disabled={formState === 'submitting'}
                />
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
                  className="intake-select"
                  id="serviceInterest"
                  name="serviceInterest"
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
