'use client'

import '../../assessment/assessment.css'
import './ita-countdown.css'

import { useState, useEffect, useCallback } from 'react'
import { ConsentCheckbox } from '@/components/ConsentCheckbox'
import { generateChecklist } from '@/lib/ita-countdown-logic'
import type { ChecklistItem } from '@/lib/ita-countdown-logic'

const CITIZENSHIP_OPTIONS = ['India', 'Pakistan', 'Philippines', 'Nigeria', 'UK', 'Other']

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

type ToolState = 'form' | 'sample' | 'processing' | 'result' | 'error'

interface FormValues {
  name: string
  email: string
  itaDate: string
  citizenshipCountry: string
  residenceCountries: string
  hasSpouse: boolean
  numDependentChildren: number
  tier: 'standard' | 'premium'
}

const DEFAULT_FORM: FormValues = {
  name: '',
  email: '',
  itaDate: '',
  citizenshipCountry: 'India',
  residenceCountries: '',
  hasSpouse: false,
  numDependentChildren: 0,
  tier: 'standard',
}

interface ResultData {
  checklist: ChecklistItem[]
  name: string
  itaDate: string
  tier: 'standard' | 'premium'
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void
      on(event: string, handler: () => void): void
    }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// Bands the deadline for CSS urgency accents: due within 10 days of the ITA
// date is urgent, everything else is standard.
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function parseResidenceCountries(form: FormValues): string[] {
  const countries = form.residenceCountries.split(',').map((c) => c.trim()).filter((c) => c.length > 0)
  return countries.length > 0 ? countries : [form.citizenshipCountry]
}

interface Props {
  // undefined: normal /tools/ita-countdown form flow.
  // null: /result page with no token in the URL — show the error state.
  // string: /result page with a token — fetch and render that checklist.
  initialToken?: string | null
}

export default function ItaCountdownTool({ initialToken }: Props) {
  const [state, setState] = useState<ToolState>(
    initialToken ? 'processing' : initialToken === null ? 'error' : 'form'
  )
  const [form, setForm] = useState<FormValues>(DEFAULT_FORM)
  const [consentGiven, setConsentGiven] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialToken === null ? 'Link expired or invalid.' : '')
  const [result, setResult] = useState<ResultData | null>(null)

  const fetchResult = useCallback(async (token: string) => {
    try {
      const res = await fetch(`/api/tools/ita-countdown/result?token=${encodeURIComponent(token)}`)
      if (!res.ok) {
        setErrorMessage('Link expired or invalid.')
        setState('error')
        return
      }
      setResult(await res.json() as ResultData)
      setState('result')
    } catch {
      setErrorMessage('Could not load your checklist. Please try again.')
      setState('error')
    }
  }, [])

  // Result page usage: load an already-paid checklist directly from its token.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialToken) void fetchResult(initialToken)
  }, [initialToken, fetchResult])

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.itaDate || !form.name || !form.email || !consentGiven) return
    setState('sample')
  }

  async function handlePurchase() {
    setState('processing')
    setErrorMessage('')

    const scriptLoaded = await loadRazorpayScript()
    if (!scriptLoaded) {
      setErrorMessage('Could not load the payment system. Please check your connection and try again.')
      setState('error')
      return
    }

    let orderData: { orderId: string; amount: number; currency: string; keyId: string }
    try {
      const res = await fetch('/api/tools/ita-countdown/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: form.tier }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        setErrorMessage(typeof json.error === 'string' ? json.error : 'Could not initiate payment.')
        setState('error')
        return
      }
      orderData = await res.json() as typeof orderData
    } catch {
      setErrorMessage('A network error occurred. Please try again.')
      setState('error')
      return
    }

    const residenceCountries = parseResidenceCountries(form)

    await new Promise<void>((resolve) => {
      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'Visa Forte',
        description: '60-Day ITA Countdown Planner',
        prefill: { name: form.name, email: form.email },
        theme: { color: '#0c2340' },

        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) => {
          try {
            const verifyRes = await fetch('/api/tools/ita-countdown/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: form.name,
                email: form.email,
                itaDate: form.itaDate,
                citizenshipCountry: form.citizenshipCountry,
                residenceCountries,
                hasSpouse: form.hasSpouse,
                numDependentChildren: form.numDependentChildren,
                tier: form.tier,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            })
            if (!verifyRes.ok) {
              const json = await verifyRes.json() as { error?: string }
              setErrorMessage(typeof json.error === 'string' ? json.error : 'Payment verification failed.')
              setState('error')
            } else {
              const { token } = await verifyRes.json() as { token: string }
              await fetchResult(token)
            }
          } catch {
            setErrorMessage('Payment was received but we could not load your checklist. Please email prashant@visaforte.com with your payment ID.')
            setState('error')
          }
          resolve()
        },
      })

      rzp.on('payment.failed', () => {
        setErrorMessage('Payment failed. Please try again or use a different payment method.')
        setState('error')
        resolve()
      })

      rzp.open()
    })
  }

  // ── Result state ────────────────────────────────────────────────────────
  if (state === 'result' && result) {
    return (
      <div className="asx-wrap">
        <section className="asx-hero itc-no-print">
          <div className="asx-hero-inner">
            <p className="asx-eyebrow r">Checklist Ready</p>
            <h1 className="asx-hero-headline r d1">Your 60-Day Countdown</h1>
          </div>
        </section>
        <section className="asx-form-section">
          <div className="asx-form-inner itc-result">
            <p className="itc-result-intro">
              Dear {result.name}, here is your personalised document checklist based on an ITA date of{' '}
              <strong>{result.itaDate}</strong>.
            </p>
            <p className="itc-email-note itc-no-print">✓ A copy has also been emailed to you.</p>

            <div className="itc-checklist">
              {result.checklist.map((item) => {
                const daysToDeadline = daysBetween(result.itaDate, item.deadlineDate)
                return (
                  <div key={item.id} className={`itc-card${daysToDeadline <= 10 ? ' itc-card--urgent' : ''}`}>
                    <h3 className="itc-card-task">{item.task}</h3>
                    <div className="itc-card-dates">
                      <span>Start by <strong>{item.startByDate}</strong></span>
                      <span>Deadline <strong>{item.deadlineDate}</strong></span>
                    </div>
                    <p className="itc-card-notes">{item.notes}</p>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              className="asx-submit-btn itc-no-print"
              onClick={() => window.print()}
            >
              Print / Save as PDF
            </button>
          </div>
        </section>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="asx-wrap">
        <section className="asx-form-section">
          <div className="asx-form-inner">
            <p className="itc-error" role="alert">{errorMessage}</p>
            {initialToken === undefined ? (
              <button type="button" className="asx-submit-btn" onClick={() => setState('form')}>
                ← Start Over
              </button>
            ) : (
              <a href="/tools/ita-countdown" className="asx-submit-btn itc-link-btn">
                ← Back to Countdown Planner
              </a>
            )}
          </div>
        </section>
      </div>
    )
  }

  // ── Processing (initial token lookup / payment in flight) ──────────────
  if (state === 'processing') {
    return (
      <div className="asx-wrap">
        <section className="asx-form-section">
          <div className="asx-form-inner">
            <p className="itc-loading">Loading…</p>
          </div>
        </section>
      </div>
    )
  }

  // ── Sample preview state ─────────────────────────────────────────────────
  // Shows the applicant's REAL, personalised checklist (correct task count,
  // correct extra tasks for spouse/children) — only the exact dates are
  // locked. This replaced a generic 3-item hardcoded list that ignored the
  // applicant's actual profile.
  if (state === 'sample') {
    const previewChecklist = generateChecklist({
      itaDate: form.itaDate,
      citizenshipCountry: form.citizenshipCountry,
      residenceCountries: parseResidenceCountries(form),
      hasSpouse: form.hasSpouse,
      numDependentChildren: form.numDependentChildren,
      tier: form.tier,
    })

    const profileParts = ['citizenship']
    if (form.hasSpouse) profileParts.push('spouse')
    if (form.numDependentChildren > 0) {
      profileParts.push(`${form.numDependentChildren} dependent ${form.numDependentChildren > 1 ? 'children' : 'child'}`)
    }
    const profileDescription = profileParts.length > 1
      ? `${profileParts.slice(0, -1).join(', ')}, and ${profileParts[profileParts.length - 1]}`
      : profileParts[0]

    const tierLabel = form.tier === 'premium' ? 'Premium' : 'Standard'
    const priceLabel = form.tier === 'premium' ? '₹3,997' : '₹2,997'

    return (
      <div className="asx-wrap">
        <section className="asx-hero">
          <div className="asx-hero-inner">
            <p className="asx-eyebrow r">Preview</p>
            <h1 className="asx-hero-headline r d1">Your Checklist. Dates Locked.</h1>
            <div className="rule r d2" />
            <p className="asx-hero-lead r d2">
              All {previewChecklist.length} tasks below are generated from your profile
              ({profileDescription}) for an ITA date of {formatDate(form.itaDate)}. Purchase to unlock
              the exact start-by and deadline date for every task.
            </p>
          </div>
        </section>
        <section className="asx-form-section">
          <div className="asx-form-inner">
            <div className="itc-checklist">
              {previewChecklist.map((item) => (
                <div key={item.id} className="itc-card itc-card--sample">
                  <h3 className="itc-card-task">{item.task}</h3>
                  <div className="itc-card-dates">
                    <span>Start by <span className="itc-locked-value">•• •••, ••••</span></span>
                    <span>Deadline <span className="itc-locked-value">•• •••, ••••</span></span>
                    <span className="itc-locked-tag">Unlocks After Purchase</span>
                  </div>
                  <p className="itc-card-notes">{item.notes}</p>
                </div>
              ))}
            </div>
            {errorMessage && <p className="itc-error" role="alert">{errorMessage}</p>}
            <div className="asx-submit-row">
              <button type="button" className="asx-submit-btn" onClick={() => void handlePurchase()}>
                Get My Full Checklist — {tierLabel}, {priceLabel} →
              </button>
              <p className="asx-submit-note">
                Secure payment via Razorpay. Your personalised checklist is emailed to you instantly.
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // ── Form state ────────────────────────────────────────────────────────────
  return (
    <div className="asx-wrap">
      <section className="asx-hero">
        <div className="asx-hero-inner">
          <p className="asx-eyebrow r">Premium Tool</p>
          <h1 className="asx-hero-headline r d1">60-Day Countdown Planner</h1>
          <div className="rule r d2" />
          <p className="asx-hero-lead r d2">
            Enter your ITA date and get a personalised day-by-day document preparation timeline —
            printable and emailed to you.
          </p>
        </div>
      </section>

      <section className="asx-form-section">
        <div className="asx-form-inner">
          <form onSubmit={handleFormSubmit} noValidate>
            <div className="asx-grid-2">
              <div className="asx-field">
                <label className="asx-label" htmlFor="itc-name">Full Name</label>
                <input
                  className="asx-input" id="itc-name" type="text" required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="asx-field">
                <label className="asx-label" htmlFor="itc-email">Email</label>
                <input
                  className="asx-input" id="itc-email" type="email" required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="asx-grid-2">
              <div className="asx-field">
                <label className="asx-label" htmlFor="itc-ita-date">ITA Date</label>
                <input
                  className="asx-input" id="itc-ita-date" type="date" required
                  value={form.itaDate}
                  onChange={(e) => setForm({ ...form, itaDate: e.target.value })}
                />
              </div>
              <div className="asx-field">
                <label className="asx-label" htmlFor="itc-citizenship">Citizenship Country</label>
                <select
                  className="asx-select" id="itc-citizenship"
                  value={form.citizenshipCountry}
                  onChange={(e) => setForm({ ...form, citizenshipCountry: e.target.value })}
                >
                  {CITIZENSHIP_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="asx-field">
              <label className="asx-label" htmlFor="itc-residence">
                Countries Lived In (last 10 years, comma separated)
              </label>
              <input
                className="asx-input" id="itc-residence" type="text"
                placeholder={form.citizenshipCountry}
                value={form.residenceCountries}
                onChange={(e) => setForm({ ...form, residenceCountries: e.target.value })}
              />
            </div>

            <div className="asx-grid-2">
              <div className="asx-field">
                <span className="asx-label itc-label-spacer" aria-hidden="true">&nbsp;</span>
                <label className="asx-checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.hasSpouse}
                    onChange={(e) => setForm({ ...form, hasSpouse: e.target.checked })}
                  />
                  <span className="asx-checkbox-label">Applying with spouse</span>
                </label>
              </div>
              <div className="asx-field">
                <label className="asx-label" htmlFor="itc-children">Dependent Children</label>
                <select
                  className="asx-select" id="itc-children"
                  value={form.numDependentChildren}
                  onChange={(e) => setForm({ ...form, numDependentChildren: Number(e.target.value) })}
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="itc-tier-pills">
              <button
                type="button"
                className={`itc-tier-pill${form.tier === 'standard' ? ' itc-tier-pill--active' : ''}`}
                onClick={() => setForm({ ...form, tier: 'standard' })}
              >
                Standard — ₹2,997
              </button>
              <button
                type="button"
                className={`itc-tier-pill${form.tier === 'premium' ? ' itc-tier-pill--active' : ''}`}
                onClick={() => setForm({ ...form, tier: 'premium' })}
              >
                Premium — ₹3,997 <span className="itc-tier-pill-note">+ doc review call</span>
              </button>
            </div>

            <ConsentCheckbox checked={consentGiven} onConsent={setConsentGiven} />

            <div className="asx-submit-row">
              <button className="asx-submit-btn" type="submit" disabled={!consentGiven}>
                See Sample Checklist →
              </button>
              {!consentGiven && (
                <p className="asx-submit-note">Check the box above to continue.</p>
              )}
            </div>
          </form>

          <div className="asx-disclaimer">
            <p className="asx-disclaimer-title">Legal Disclaimer</p>
            <p className="asx-disclaimer-body">
              The information provided in this tool is for informational and guidance
              purposes only, based on publicly available Immigration, Refugees and
              Citizenship Canada (IRCC) regulations and policies. This does not constitute
              legal advice, and no solicitor-client or consultant-client relationship is
              created by using this tool. Document processing times vary by country and
              can change without notice — verify current timelines with the issuing
              authority and with official IRCC sources (www.canada.ca/immigration).
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
