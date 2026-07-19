// Refusal Pattern Analyser — premium client tool (RT-5).
//
// Flow: free fictional example → Razorpay purchase (name + email) → access
// token (stateless HMAC, 30 days) → paste refusal letter → deterministic
// analysis on the server → results rendered on-page with Print / Save as PDF.
//
// Privacy by design: the letter is sent to the analyse endpoint only, where
// it is scored in memory and discarded. Results are never emailed — the
// receipt email carries a re-access link only.

'use client';

import '../../assessment/assessment.css';
import './refusal-analyser.css';

import { useState, useEffect } from 'react';
import type { JSX } from 'react';

// Same shape as the declaration in ItaCountdownTool.tsx — TypeScript merges
// identical global declarations; changing one requires changing both.
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, handler: () => void): void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface AccessToken {
  exp: number;
  sig: string;
}

interface GroundMatch {
  id: string;
  label: string;
  appliesTo: string;
  confidence: 'strong' | 'moderate' | 'possible';
  matchCount: number;
  rootCauses: string[];
  strategy: string[];
}

interface RefusalAnalysis {
  matches: GroundMatch[];
  generalGuidance: string[];
}

const STORAGE_KEY = 'vf-refusal-analyser-access';

const CONFIDENCE_LABELS: Record<GroundMatch['confidence'], string> = {
  strong: 'Strong signal',
  moderate: 'Moderate signal',
  possible: 'Possible signal',
};

// Fictional demonstration — every detail invented. Mirrors the standard
// template phrasing of a visitor-visa refusal letter.
const DEMO_LETTER =
  'I am not satisfied that you would leave Canada at the end of your stay. ' +
  'In reaching this decision I considered the purpose of your visit, your ' +
  'personal assets and financial status, and your family ties in Canada ' +
  'and in your country of residence. Your travel history was also considered.';

const DEMO_RESULT: { label: string; note: string }[] = [
  {
    label: 'Officer not satisfied you would leave Canada',
    note: 'Strong signal — 3 template phrases matched. Root causes and a 3-step reapplication strategy unlock with full access.',
  },
  {
    label: 'Financial resources insufficient or not credible',
    note: 'Moderate signal — matched on "personal assets and financial status".',
  },
  {
    label: 'Family or economic ties to home country judged weak',
    note: 'Moderate signal — matched on the family-ties template sentence.',
  },
  {
    label: 'Travel history considered insufficient',
    note: 'Possible signal — matched on "travel history".',
  },
];

type PurchaseState = 'idle' | 'processing' | 'error';
type AnalyseState = 'idle' | 'loading' | 'done' | 'error';

export default function RefusalAnalyserTool(): JSX.Element {
  const [access, setAccess] = useState<AccessToken | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [purchaseError, setPurchaseError] = useState('');

  const [letterText, setLetterText] = useState('');
  const [analyseState, setAnalyseState] = useState<AnalyseState>('idle');
  const [analyseError, setAnalyseError] = useState('');
  const [analysis, setAnalysis] = useState<RefusalAnalysis | null>(null);

  // Restore access from the emailed link (?exp=…&sig=…) or a previous
  // session on this device. URL/storage are external systems only readable
  // after mount, so this must be an effect (same pattern as ItaCountdownTool).
  // The server re-validates the token on every analyse call — this only
  // decides which UI to show first.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const exp = Number(params.get('exp'));
    const sig = params.get('sig');
    if (Number.isFinite(exp) && exp > Date.now() && sig) {
      const token = { exp, sig };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccess(token);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
      return;
    }
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const token = JSON.parse(stored) as AccessToken;
        if (Number.isFinite(token.exp) && token.exp > Date.now() && token.sig) {
          setAccess(token);
        }
      }
    } catch {
      // Corrupt storage — ignore; the user can restore via the emailed link.
    }
  }, []);

  async function handlePurchase(): Promise<void> {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setPurchaseError(
        'Enter your name and a valid email — your access link is emailed to you.',
      );
      setPurchaseState('error');
      return;
    }
    setPurchaseState('processing');
    setPurchaseError('');

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPurchaseError(
        'Could not load the payment system. Please check your connection and try again.',
      );
      setPurchaseState('error');
      return;
    }

    let orderData: {
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
    };
    try {
      const res = await fetch('/api/tools/refusal-analyser/create-order', {
        method: 'POST',
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setPurchaseError(
          typeof json.error === 'string'
            ? json.error
            : 'Could not initiate payment. Please try again.',
        );
        setPurchaseState('error');
        return;
      }
      orderData = (await res.json()) as typeof orderData;
    } catch {
      setPurchaseError('Could not initiate payment. Please try again.');
      setPurchaseState('error');
      return;
    }

    const rzp = new window.Razorpay({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: 'Visa Forte',
      description: 'Refusal Pattern Analyser',
      prefill: { name, email },
      theme: { color: '#0c2340' },

      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verifyRes = await fetch('/api/tools/refusal-analyser/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              email,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          if (!verifyRes.ok) {
            const json = (await verifyRes.json()) as { error?: string };
            setPurchaseError(
              typeof json.error === 'string'
                ? json.error
                : 'Payment verification failed.',
            );
            setPurchaseState('error');
            return;
          }
          const token = (await verifyRes.json()) as AccessToken;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
          setAccess(token);
          setPurchaseState('idle');
        } catch {
          setPurchaseError(
            'Payment was received but access could not be activated here. Use the access link in your email, or contact prashant@visaforte.com with your payment ID.',
          );
          setPurchaseState('error');
        }
      },

      modal: {
        ondismiss: () => {
          setPurchaseState((s) => (s === 'processing' ? 'idle' : s));
        },
      },
    });
    rzp.open();
  }

  async function handleAnalyse(): Promise<void> {
    if (!access) return;
    if (letterText.trim().length < 100) {
      setAnalyseError(
        'Paste the full text of the refusal letter — the analysis works on the officer’s template sentences.',
      );
      setAnalyseState('error');
      return;
    }
    setAnalyseState('loading');
    setAnalyseError('');
    try {
      const res = await fetch('/api/tools/refusal-analyser/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letterText: letterText.trim(),
          exp: access.exp,
          sig: access.sig,
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setAnalyseError(
          typeof json.error === 'string'
            ? json.error
            : 'Analysis failed. Please try again.',
        );
        setAnalyseState('error');
        return;
      }
      setAnalysis((await res.json()) as RefusalAnalysis);
      setAnalyseState('done');
    } catch {
      setAnalyseError(
        'Could not reach the analyser. Check your connection and try again.',
      );
      setAnalyseState('error');
    }
  }

  return (
    <div className="asx-wrap">
      <section className="asx-hero ra-no-print">
        <div className="asx-hero-inner">
          <p className="asx-eyebrow r">Premium Tool · ₹2,497 · One-Time</p>
          <h1 className="asx-hero-headline r d1">Refusal Pattern Analyser</h1>
          <p className="ra-hero-sub r d2">
            Paste your refusal letter. The analyser matches it against the
            standard template sentences IRCC refusal letters are built from,
            identifies the grounds behind your refusal, and gives you the
            documentation strategy that answers each one — before you reapply.
          </p>
        </div>
      </section>

      <section className="ra-body">
        <div className="ra-inner">
          {!access && (
            <>
              {/* Free fictional example */}
              <div className="asx-card ra-no-print">
                <p className="ra-demo-label">
                  Free example — a fictional refusal letter
                </p>
                <blockquote className="ra-demo-letter">
                  &ldquo;{DEMO_LETTER}&rdquo;
                </blockquote>
                <p className="ra-demo-label">What the analyser finds:</p>
                <ul className="ra-demo-results">
                  {DEMO_RESULT.map((r) => (
                    <li key={r.label}>
                      <strong>{r.label}</strong>
                      <span>{r.note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Paywall */}
              <div className="asx-card ra-paywall ra-no-print">
                <h2 className="ra-paywall-title">
                  Analyse your own refusal letter
                </h2>
                <ul className="ra-paywall-points">
                  <li>
                    14 refusal-ground patterns — visitor, study, work, and
                    Express Entry refusals
                  </li>
                  <li>
                    Root causes and a reapplication strategy for every ground
                    detected
                  </li>
                  <li>30 days of access, unlimited analyses</li>
                  <li>
                    Private by design: your letter is analysed in memory and
                    never stored, logged, or emailed
                  </li>
                </ul>
                <div className="asx-field">
                  <label className="asx-label" htmlFor="ra-name">
                    Your name
                  </label>
                  <input
                    id="ra-name"
                    className="asx-input"
                    type="text"
                    value={name}
                    maxLength={100}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="asx-field">
                  <label className="asx-label" htmlFor="ra-email">
                    Email for your access link
                  </label>
                  <input
                    id="ra-email"
                    className="asx-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="asx-submit-row">
                  <button
                    className="asx-submit-btn"
                    onClick={() => void handlePurchase()}
                    disabled={purchaseState === 'processing'}
                  >
                    {purchaseState === 'processing'
                      ? 'Processing…'
                      : 'Unlock the Analyser — ₹2,497 →'}
                  </button>
                </div>
                {purchaseState === 'error' && (
                  <p className="ra-error" role="alert">
                    {purchaseError}
                  </p>
                )}
                <p className="asx-submit-note">
                  Secure payment via Razorpay. Access activates instantly and a
                  re-access link is emailed to you.
                </p>
              </div>
            </>
          )}

          {access && (
            <>
              <div className="asx-card ra-no-print">
                <p className="ra-access-note">
                  Access active. Paste the full text of your refusal letter — it
                  is analysed in memory and never stored.
                </p>
                <div className="asx-field">
                  <label className="asx-label" htmlFor="ra-letter">
                    Refusal letter text
                  </label>
                  <textarea
                    id="ra-letter"
                    className="ra-textarea"
                    rows={10}
                    maxLength={30000}
                    placeholder="Paste the complete refusal letter here, including the list of factors the officer considered…"
                    value={letterText}
                    onChange={(e) => setLetterText(e.target.value)}
                  />
                </div>
                <div className="asx-submit-row">
                  <button
                    className="asx-submit-btn"
                    onClick={() => void handleAnalyse()}
                    disabled={analyseState === 'loading'}
                  >
                    {analyseState === 'loading'
                      ? 'Analysing…'
                      : 'Analyse My Refusal →'}
                  </button>
                </div>
                {analyseState === 'error' && (
                  <p className="ra-error" role="alert">
                    {analyseError}
                  </p>
                )}
              </div>

              {analyseState === 'done' && analysis && (
                <div className="ra-results">
                  <div className="ra-results-toolbar ra-no-print">
                    <button
                      className="ra-print-btn"
                      onClick={() => window.print()}
                    >
                      Print / Save as PDF
                    </button>
                  </div>

                  {analysis.matches.length === 0 && (
                    <div className="asx-card">
                      <p className="ra-none-found">
                        No standard template phrases were detected. This usually
                        means the pasted text is not the refusal letter itself
                        (check you pasted the letter, not the portal message),
                        or the refusal uses non-standard wording — in which case
                        a professional review is the right next step.
                      </p>
                    </div>
                  )}

                  {analysis.matches.map((m, i) => (
                    <div
                      key={m.id}
                      className={`ra-ground${i === 0 ? ' ra-ground--top' : ''}`}
                    >
                      <div className="ra-ground-head">
                        <span className="ra-chip">
                          {CONFIDENCE_LABELS[m.confidence]}
                        </span>
                        <span className="ra-applies">{m.appliesTo}</span>
                      </div>
                      <h3 className="ra-ground-title">{m.label}</h3>
                      <p className="ra-section-label">Likely root causes</p>
                      <ul className="ra-list">
                        {m.rootCauses.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                      <p className="ra-section-label">Reapplication strategy</p>
                      <ul className="ra-list">
                        {m.strategy.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {analysis.matches.length > 0 && (
                    <div className="ra-callout">
                      <p className="ra-callout-head">Before you reapply</p>
                      <ul className="ra-list">
                        {analysis.generalGuidance.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="asx-disclaimer">
            <p className="asx-disclaimer-title">Disclaimer</p>
            <p className="asx-disclaimer-body">
              This tool performs a deterministic text-pattern analysis for
              informational and documentation-education purposes only, based on
              publicly available IRCC regulations and policies. It does not
              constitute legal advice, and no consultant-client relationship is
              created by using it. Refusal reasons recorded in your GCMS file
              notes are authoritative over any pattern inference. Verify all
              requirements with official IRCC sources
              (www.canada.ca/immigration) before taking any action, and consult
              a licensed representative for misrepresentation or inadmissibility
              matters.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
