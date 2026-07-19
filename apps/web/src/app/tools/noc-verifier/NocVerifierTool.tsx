// NOC Code Verifier — free client tool.
// Collects a job title + duty description, sends them to the deterministic
// server-side matcher, and renders the top candidate NOC 2021 unit groups
// with TEER level and official ESDC profile links. No login, no storage.

'use client';

import '../../assessment/assessment.css';
import './noc-verifier.css';

import { useState } from 'react';
import type { JSX } from 'react';

interface Match {
  code: string;
  title: string;
  teer: number;
  leadStatement: string;
  mainDuties: string[];
  esdcUrl: string;
  band: 'strongest' | 'review';
  rationale?: string;
  fitScore?: number;
}

interface VerifierResponse {
  method: 'ai' | 'lexical';
  confidence?: 'high' | 'medium' | 'low';
  verifiedLive?: boolean;
  matches: Match[];
}

type ToolState = 'idle' | 'loading' | 'done' | 'error';

const CONFIDENCE_LABELS: Record<'high' | 'medium' | 'low', string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export default function NocVerifierTool(): JSX.Element {
  const [jobTitle, setJobTitle] = useState('');
  const [duties, setDuties] = useState('');
  const [state, setState] = useState<ToolState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<VerifierResponse | null>(null);
  const matches = result?.matches ?? [];

  async function handleSubmit(): Promise<void> {
    if (duties.trim().length < 30) {
      setErrorMessage(
        'Describe your duties in at least a sentence or two — the matcher works on duties, not titles.',
      );
      setState('error');
      return;
    }
    setState('loading');
    setErrorMessage('');
    try {
      const res = await fetch('/api/tools/noc-verifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobTitle.trim() || undefined,
          duties: duties.trim(),
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErrorMessage(
          typeof json.error === 'string'
            ? json.error
            : 'Something went wrong. Please try again.',
        );
        setState('error');
        return;
      }
      setResult((await res.json()) as VerifierResponse);
      setState('done');
    } catch {
      setErrorMessage(
        'Could not reach the matcher. Check your connection and try again.',
      );
      setState('error');
    }
  }

  return (
    <div className="asx-wrap">
      <section className="asx-hero">
        <div className="asx-hero-inner">
          <p className="asx-eyebrow r">Free Tool · No Login Required</p>
          <h1 className="asx-hero-headline r d1">NOC Code Verifier</h1>
          <p className="nv-hero-sub r d2">
            Enter your job title and what you actually do all day. The tool
            shortlists candidates from all 516 official NOC 2021 unit groups,
            AI-ranks them against each group&apos;s real Statistics Canada
            duties — judging the scope of your work, not shared keywords — and
            live-verifies the winning code against the official StatCan page.
          </p>
        </div>
      </section>

      <section className="nv-body">
        <div className="nv-inner">
          <div className="asx-card">
            <div className="asx-field">
              <label className="asx-label" htmlFor="nv-title">
                Job title <span className="nv-optional">(optional)</span>
              </label>
              <input
                id="nv-title"
                className="asx-input"
                type="text"
                placeholder="e.g. Senior Data Analyst"
                value={jobTitle}
                maxLength={120}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="asx-field">
              <label className="asx-label" htmlFor="nv-duties">
                Your main duties — in your own words
              </label>
              <textarea
                id="nv-duties"
                className="nv-textarea"
                rows={6}
                maxLength={3000}
                placeholder="e.g. I collect and clean operational data, build dashboards in Power BI, prepare weekly reports for management, and coordinate with engineering on data pipelines…"
                value={duties}
                onChange={(e) => setDuties(e.target.value)}
              />
              <p className="nv-hint">
                Write duties, not titles — the officer reviewing your file maps
                your reference letter&apos;s duties to the NOC&apos;s duties,
                and so does this tool.
              </p>
            </div>
            <div className="asx-submit-row">
              <button
                className="asx-submit-btn"
                onClick={() => void handleSubmit()}
                disabled={state === 'loading'}
              >
                {state === 'loading' ? 'Matching…' : 'Find My NOC Code →'}
              </button>
            </div>
            {state === 'error' && (
              <p className="nv-error" role="alert">
                {errorMessage}
              </p>
            )}
          </div>

          {state === 'done' && matches.length === 0 && (
            <div className="asx-card nv-empty">
              <p>
                No confident match found. Try describing your duties in more
                detail — what you produce, who you report to, what tools you use
                — or <a href="/booking">book a document review</a> for a
                professional classification.
              </p>
            </div>
          )}

          {state === 'done' &&
            result?.method === 'lexical' &&
            matches.length > 0 && (
              <div className="nv-caution" role="status">
                <p>
                  <strong>AI ranking was unavailable for this request</strong> —
                  the results below are keyword matches only and can be wrong
                  for roles whose everyday vocabulary differs from the official
                  NOC wording. Try again in a minute for a full AI-ranked,
                  live-verified result.
                </p>
              </div>
            )}

          {matches.map((m) => (
            <div
              key={m.code}
              className={`nv-result${m.band === 'strongest' ? ' nv-result--top' : ''}`}
            >
              <div className="nv-result-head">
                <span className="nv-band">
                  {m.band === 'strongest' ? 'Strongest match' : 'Also review'}
                </span>
                <span className="nv-chips">
                  {m.band === 'strongest' &&
                    result?.method === 'ai' &&
                    result.confidence && (
                      <span className="nv-teer">
                        {CONFIDENCE_LABELS[result.confidence]}
                      </span>
                    )}
                  <span className="nv-teer">TEER {m.teer}</span>
                </span>
              </div>
              <h3 className="nv-result-title">
                NOC {m.code} — {m.title}
              </h3>
              {m.band === 'strongest' && result?.verifiedLive && (
                <p className="nv-verified">
                  ✓ Code live-verified against the official Statistics Canada
                  page just now
                </p>
              )}
              {m.rationale && (
                <p className="nv-rationale">
                  <strong>Why this code:</strong> {m.rationale}
                </p>
              )}
              <p className="nv-lead">{m.leadStatement}</p>
              <p className="nv-duties-label">Official main duties include:</p>
              <ul className="nv-duties">
                {m.mainDuties.map((duty) => (
                  <li key={duty}>{duty}</li>
                ))}
              </ul>
              <a
                className="nv-esdc-link"
                href={m.esdcUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Confirm on the official ESDC profile →
              </a>
            </div>
          ))}

          {state === 'done' && matches.length > 0 && (
            <div className="nv-callout">
              <p className="nv-callout-head">Before you use this code</p>
              <p>
                A wrong NOC code is among the most common Express Entry refusal
                triggers. The code you claim must match the duties written in
                your employment reference letters — not your job title. Read the
                ESDC profile&apos;s full duty list and confirm the majority of
                the lead statement and main duties describe your actual work.
                TEER 0–3 occupations qualify for Express Entry; TEER 4–5 do not.
              </p>
            </div>
          )}

          <div className="asx-disclaimer">
            <p className="asx-disclaimer-title">Disclaimer</p>
            <p className="asx-disclaimer-body">
              This tool ranks your duties against the official Statistics Canada
              NOC 2021 dataset and live-verifies the leading code against the
              official StatCan source. It is provided for informational and
              guidance purposes only, does not constitute legal advice, and no
              consultant-client relationship is created by using it. The final
              NOC determination for any application rests with you — verify
              against the official ESDC profile and IRCC requirements
              (www.canada.ca/immigration) before relying on any result.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
