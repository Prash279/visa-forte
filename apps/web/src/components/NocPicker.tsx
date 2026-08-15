'use client';

// Two routes to one NOC code.
//
// Route 1 (title): fuzzy search over NOC 2021 titles — fast when the applicant's
// job title happens to match the official wording.
// Route 2 (duties): the applicant pastes what they actually do, and the server
// runs the same pipeline as the public NOC Verifier — a deterministic shortlist
// across all 516 official unit groups, then Claude ranks that shortlist against
// each group's REAL Statistics Canada lead statement and main duties (judging
// scope of work, never shared vocabulary), then the winning code is live-verified
// on the official ESDC NOC site.
//
// Duties are the route that matters: an officer maps the duties in an employment
// reference letter to the NOC's duties, not the job title on the business card.
//
// This component owns the single selected answer so the two routes can never
// disagree. Whichever route the applicant last picked from wins, and the chip
// says which one it was. Nothing is applied automatically — the applicant clicks.

import { useState } from 'react';
import NocSearch, { type NocEntry } from './NocSearch';
import './NocPicker.css';

const TEER_VALUES = [0, 1, 2, 3, 4, 5] as const;
type Teer = (typeof TEER_VALUES)[number];

// The API's own limits, mirrored here so the applicant is told before the round trip.
const DUTIES_MIN = 30;
const DUTIES_MAX = 3000;
const JOB_TITLE_MAX = 120;

// IRCC's own "Find your NOC" page — the authority chain an applicant's officer follows.
const IRCC_FIND_NOC_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/find-national-occupation-code.html';

interface NocPickerProps {
  onSelect: (code: string, teer: Teer, title: string) => void;
  onClear?: () => void;
  theme: 'light' | 'dark';
  // The Occupation / Job Title already captured on the form, passed to the matcher
  // as extra context so the applicant never retypes it.
  jobTitleContext?: string;
}

interface SelectedNoc {
  code: string;
  teer: Teer;
  title: string;
  source: 'title' | 'duties';
}

// Mirrors the /api/tools/noc-verifier response contract.
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
  verifiedSource?: 'esdc' | 'statcan' | null;
  matches: Match[];
}

type PanelState = 'idle' | 'loading' | 'done' | 'error';

const CONFIDENCE_LABELS: Record<'high' | 'medium' | 'low', string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

const VERIFIED_LABELS: Record<'esdc' | 'statcan', string> = {
  esdc: '✓ Live-verified just now on the official ESDC NOC site (noc.esdc.gc.ca)',
  statcan:
    '✓ Live-verified just now against Statistics Canada, co-publisher of NOC 2021',
};

// TEER arrives from the API as a plain number. The bundled dataset only ever holds
// 0–5, but the form's type demands proof rather than a cast — and a bad value must
// disable the button, never quietly become a valid-looking TEER on someone's file.
function asTeer(n: number): Teer | null {
  return (TEER_VALUES as readonly number[]).includes(n) ? (n as Teer) : null;
}

export default function NocPicker({
  onSelect,
  onClear,
  theme,
  jobTitleContext,
}: NocPickerProps): React.JSX.Element {
  const [selected, setSelected] = useState<SelectedNoc | null>(null);
  const [duties, setDuties] = useState('');
  const [state, setState] = useState<PanelState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<VerifierResponse | null>(null);

  const matches = result?.matches ?? [];
  const tooShort = duties.trim().length < DUTIES_MIN;

  // Both routes land here. Setting the selection replaces whatever the other
  // route had chosen — last one wins, and the chip records which route it was.
  function choose(next: SelectedNoc): void {
    setSelected(next);
    onSelect(next.code, next.teer, next.title);
  }

  function handleTitleSelect(entry: NocEntry): void {
    choose({
      code: entry.code,
      teer: entry.teer,
      title: entry.title,
      source: 'title',
    });
  }

  function handleClear(): void {
    setSelected(null);
    if (onClear) onClear();
    else onSelect('', 1, '');
  }

  async function handleMatch(): Promise<void> {
    if (tooShort) {
      setErrorMessage(
        `Describe your duties in at least ${DUTIES_MIN} characters — a sentence or two of what you actually do.`,
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
          jobTitle:
            jobTitleContext?.trim().slice(0, JOB_TITLE_MAX) || undefined,
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
    <div className={`nocp nocp-${theme}`}>
      {selected && (
        <div className="nocp-chosen">
          <span className="nocp-chosen-text">
            {selected.title} — {selected.code} · TEER {selected.teer}
          </span>
          <span className="nocp-source">
            {selected.source === 'duties'
              ? 'Matched from duties'
              : 'Matched from job title'}
          </span>
          <button type="button" className="nocp-clear" onClick={handleClear}>
            Clear
          </button>
          {/* Kept from the old title-only search: whichever route found the code,
              the applicant always has a route back to IRCC's own NOC page. */}
          <a
            className="nocp-verify"
            href={IRCC_FIND_NOC_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Verify on canada.ca ↗
          </a>
        </div>
      )}

      <NocSearch theme={theme} onSelect={handleTitleSelect} />

      <div className="nocp-duties">
        <label className="nocp-label" htmlFor="nocp-duties-input">
          Search by Job Duties / Responsibilities (optional)
        </label>
        <textarea
          id="nocp-duties-input"
          className="nocp-textarea"
          rows={5}
          maxLength={DUTIES_MAX}
          value={duties}
          onChange={(e) => setDuties(e.target.value)}
          placeholder="Paste the duties from your employment reference letter, or describe them in your own words — e.g. I collect and clean operational data, build dashboards in Power BI, prepare weekly reports for management, and coordinate with engineering on data pipelines…"
        />
        <div className="nocp-meta">
          <p className="nocp-hint">
            Write duties, not titles. The officer reviewing your file maps the
            duties in your reference letters to the NOC&apos;s official duties —
            and so does this matcher.
          </p>
          <span className="nocp-count">
            {tooShort
              ? `${duties.trim().length} / ${DUTIES_MIN} min`
              : `${duties.length} / ${DUTIES_MAX}`}
          </span>
        </div>
        <button
          type="button"
          className="nocp-btn"
          onClick={() => void handleMatch()}
          disabled={state === 'loading' || tooShort}
        >
          {state === 'loading'
            ? 'Cross-checking official NOC duties…'
            : 'Find Matching NOC →'}
        </button>

        {state === 'error' && (
          <p className="nocp-error" role="alert">
            {errorMessage}
          </p>
        )}

        {/* Degraded mode must never be presented with AI-result confidence. */}
        {state === 'done' &&
          result?.method === 'lexical' &&
          matches.length > 0 && (
            <div className="nocp-caution" role="status">
              <strong>AI ranking was unavailable for this request.</strong> The
              results below are keyword matches only and can be wrong for roles
              whose everyday vocabulary differs from the official NOC wording.
              Try again in a minute for a full AI-ranked, live-verified result.
            </div>
          )}

        {state === 'done' && matches.length === 0 && (
          <p className="nocp-empty">
            No confident match found. Try describing your duties in more detail
            — what you produce, who you report to, what you are accountable for.
          </p>
        )}

        {matches.map((m) => {
          const teer = asTeer(m.teer);
          const inUse =
            selected?.source === 'duties' && selected.code === m.code;
          return (
            <div
              key={m.code}
              className={`nocp-card${m.band === 'strongest' ? ' nocp-card--top' : ''}`}
            >
              <div className="nocp-card-head">
                <span className="nocp-tag">
                  {m.band === 'strongest' ? 'Strongest match' : 'Also review'}
                </span>
                <span className="nocp-tags">
                  {m.band === 'strongest' &&
                    result?.method === 'ai' &&
                    result.confidence && (
                      <span className="nocp-tag">
                        {CONFIDENCE_LABELS[result.confidence]}
                      </span>
                    )}
                  {m.fitScore !== undefined && (
                    <span className="nocp-tag">Fit {m.fitScore}/100</span>
                  )}
                  <span className="nocp-tag">TEER {m.teer}</span>
                </span>
              </div>

              <p className="nocp-card-title">
                NOC {m.code} — {m.title}
              </p>

              {m.band === 'strongest' && result?.verifiedSource && (
                <p className="nocp-verified">
                  {VERIFIED_LABELS[result.verifiedSource]}
                </p>
              )}

              {m.rationale && (
                <p className="nocp-rationale">
                  <strong>Why this code:</strong> {m.rationale}
                </p>
              )}

              <details className="nocp-official">
                <summary>Read the official NOC duties for this code</summary>
                <p className="nocp-lead">{m.leadStatement}</p>
                <ul className="nocp-duty-list">
                  {m.mainDuties.map((duty) => (
                    <li key={duty}>{duty}</li>
                  ))}
                </ul>
              </details>

              <div className="nocp-card-foot">
                <button
                  type="button"
                  className={`nocp-use${inUse ? ' nocp-use--active' : ''}`}
                  disabled={teer === null || inUse}
                  onClick={() => {
                    if (teer === null) return;
                    choose({
                      code: m.code,
                      teer,
                      title: m.title,
                      source: 'duties',
                    });
                  }}
                >
                  {inUse ? '✓ In use' : 'Use this code'}
                </button>
                <a
                  className="nocp-esdc"
                  href={m.esdcUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Confirm on the official ESDC profile ↗
                </a>
              </div>
            </div>
          );
        })}

        {state === 'done' && matches.length > 0 && (
          <p className="nocp-note">
            A wrong NOC code is among the most common Express Entry refusal
            triggers. Before you rely on any code here, open its ESDC profile
            and confirm that its lead statement and the majority of its main
            duties genuinely describe the work written in your employment
            reference letters.
          </p>
        )}
      </div>
    </div>
  );
}
