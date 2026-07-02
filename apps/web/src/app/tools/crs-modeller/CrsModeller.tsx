'use client'

import '../../assessment/assessment.css'
import './crs-modeller.css'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  calculate,
  type ApplicantProfile,
  type EducationLevel,
} from '@/lib/crs-calculator'
import drawData from '@/lib/crs-draw-history.json'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModState {
  age: number
  hasSpouse: boolean
  education: EducationLevel
  langL: number
  langR: number
  langW: number
  langS: number
  canadianWE: number
  foreignWE: number
}

interface DrawEntry {
  date: string
  type: string
  cutoffScore: number
  invitationsIssued: number
}

interface DeltaRow {
  key: string
  name: string
  current: string
  max: string
  projected: number
  gain: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULTS: ModState = {
  age: 30,
  hasSpouse: false,
  education: 'bachelors',
  langL: 7,
  langR: 7,
  langW: 7,
  langS: 7,
  canadianWE: 0,
  foreignWE: 0,
}

const EDU_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: 'less_than_secondary', label: 'Less than high school' },
  { value: 'secondary', label: 'High school diploma' },
  { value: 'one_year_post_secondary', label: '1-year post-secondary' },
  { value: 'two_year_post_secondary', label: '2-year post-secondary' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'two_or_more_degrees', label: 'Two or more degrees' },
  { value: 'masters', label: "Master's degree" },
  { value: 'doctoral', label: 'Doctoral degree (PhD)' },
]

const VALID_EDU = new Set<string>(EDU_OPTIONS.map(o => o.value))
const draws = drawData.draws as DrawEntry[]

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildProfile(s: ModState): ApplicantProfile {
  return {
    name: '', nocCode: '', nocTeer: 1, occupationTitle: '',
    countryOfCitizenship: '', countryOfResidence: '',
    reportDate: new Date().toISOString().split('T')[0] ?? '',
    age: s.age, education: s.education, hasEca: true,
    firstLanguageScores: {
      testType: 'CELPIP',
      listening: s.langL,
      reading: s.langR,
      writing: s.langW,
      speaking: s.langS,
    },
    hasSecondLanguage: false,
    foreignWorkExperienceYears: s.foreignWE,
    canadianWorkExperienceYears: s.canadianWE,
    hasSpouse: s.hasSpouse,
    hasProvincialNomination: false,
    hasSiblingInCanada: false,
    hasJobOffer: 'none',
    hasCanadianEducation: false,
    hasFamilyInCanada: false,
    settlementFunds: 15263,
    familySize: 1,
    hasCriminalRecord: false,
    hasMedicalCondition: false,
    hasPriorRefusal: false,
  }
}

function getRelevantDraw(canadianWE: number): DrawEntry | null {
  if (canadianWE >= 1)
    return draws.find(d => /canadian experience class/i.test(d.type)) ?? null
  return draws.find(d => /all.programs|general/i.test(d.type)) ?? draws[0] ?? null
}

function fmtEdu(val: EducationLevel): string {
  return EDU_OPTIONS.find(o => o.value === val)?.label ?? val
}

function maxGain(
  s: ModState,
  key: keyof ModState,
  maxVal: ModState[keyof ModState],
  base: number,
): { projected: number; gain: number } {
  if (s[key] === maxVal) return { projected: base, gain: 0 }
  const projected = calculate(buildProfile({ ...s, [key]: maxVal })).breakdown.total
  return { projected, gain: projected - base }
}

function computeDeltas(s: ModState, baseScore: number): DeltaRow[] {
  return [
    { key: 'langL', name: 'Listening (CLB)', current: `CLB ${s.langL}`, max: 'CLB 12',
      ...maxGain(s, 'langL', 12, baseScore) },
    { key: 'langR', name: 'Reading (CLB)', current: `CLB ${s.langR}`, max: 'CLB 12',
      ...maxGain(s, 'langR', 12, baseScore) },
    { key: 'langW', name: 'Writing (CLB)', current: `CLB ${s.langW}`, max: 'CLB 12',
      ...maxGain(s, 'langW', 12, baseScore) },
    { key: 'langS', name: 'Speaking (CLB)', current: `CLB ${s.langS}`, max: 'CLB 12',
      ...maxGain(s, 'langS', 12, baseScore) },
    { key: 'education', name: 'Education', current: fmtEdu(s.education), max: 'Doctoral',
      ...maxGain(s, 'education', 'doctoral', baseScore) },
    { key: 'canadianWE', name: 'Canadian WE',
      current: `${s.canadianWE} yr${s.canadianWE !== 1 ? 's' : ''}`, max: '5 yrs',
      ...maxGain(s, 'canadianWE', 5, baseScore) },
    { key: 'foreignWE', name: 'Foreign WE',
      current: `${s.foreignWE} yr${s.foreignWE !== 1 ? 's' : ''}`, max: '5 yrs',
      ...maxGain(s, 'foreignWE', 5, baseScore) },
  ].sort((a, b) => b.gain - a.gain)
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CrsModeller(): React.JSX.Element {
  const [state, setState] = useState<ModState>(DEFAULTS)
  const [initScore, setInitScore] = useState<number | null>(null)
  const [leadName, setLeadName] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [wantsAlert, setWantsAlert] = useState(true)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  // Parse URL params on mount — pre-fills from /assessment handoff
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const parsed: Partial<ModState> = {}

    const age = parseInt(p.get('age') ?? '', 10)
    if (!isNaN(age) && age >= 18 && age <= 90) parsed.age = age

    const spouse = p.get('spouse')
    if (spouse === 'true') parsed.hasSpouse = true
    else if (spouse === 'false') parsed.hasSpouse = false

    const edu = p.get('edu')
    if (edu && VALID_EDU.has(edu)) parsed.education = edu as EducationLevel

    const l = parseInt(p.get('l') ?? '', 10)
    if (!isNaN(l) && l >= 4 && l <= 12) parsed.langL = l
    const r = parseInt(p.get('r') ?? '', 10)
    if (!isNaN(r) && r >= 4 && r <= 12) parsed.langR = r
    const w = parseInt(p.get('w') ?? '', 10)
    if (!isNaN(w) && w >= 4 && w <= 12) parsed.langW = w
    const sp = parseInt(p.get('s') ?? '', 10)
    if (!isNaN(sp) && sp >= 4 && sp <= 12) parsed.langS = sp

    const cwe = parseInt(p.get('cwe') ?? '', 10)
    if (!isNaN(cwe) && cwe >= 0 && cwe <= 5) parsed.canadianWE = cwe
    const fwe = parseInt(p.get('fwe') ?? '', 10)
    if (!isNaN(fwe) && fwe >= 0 && fwe <= 5) parsed.foreignWE = fwe

    const merged = { ...DEFAULTS, ...parsed }
    setState(merged)
    setInitScore(calculate(buildProfile(merged)).breakdown.total)
  }, [])

  const patch = useCallback(<K extends keyof ModState>(key: K, value: ModState[K]): void => {
    setState(prev => ({ ...prev, [key]: value }))
  }, [])

  // ── Derived values ─────────────────────────────────────────────────────────

  const currentScore = calculate(buildProfile(state)).breakdown.total
  const draw = getRelevantDraw(state.canadianWE)
  const gap = draw !== null ? draw.cutoffScore - currentScore : null
  const gapPct = draw !== null ? Math.min(100, (currentScore / draw.cutoffScore) * 100) : 50
  const fillClass =
    gap !== null
      ? gap <= 0
        ? 'mod-fill-above'
        : gap <= 20
          ? 'mod-fill-close'
          : 'mod-fill-below'
      : 'mod-fill-below'

  const deltas = computeDeltas(state, currentScore)

  // Greedy path-to-cutoff sentences
  const pathSentences: string[] = []
  if (draw !== null && gap !== null && gap > 0) {
    let remaining = gap
    for (const row of deltas) {
      if (row.gain <= 0 || remaining <= 0) break
      remaining = draw.cutoffScore - row.projected
      pathSentences.push(
        remaining <= 0
          ? `${row.name} to ${row.max} (+${row.gain} pts) → ${row.projected} — cutoff cleared ✓`
          : `${row.name} to ${row.max} (+${row.gain} pts) → ${row.projected} — ${remaining} pts short`,
      )
    }
    if (remaining > 0) {
      pathSentences.push('A Provincial Nomination (+600 pts) would clear any remaining gap.')
    }
  }

  // ── Lead capture ────────────────────────────────────────────────────────────

  async function handleSendResults(): Promise<void> {
    setEmailSending(true)
    try {
      await fetch('/api/tools/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          crsScore: currentScore,
          toolName: 'crs-modeller',
          wantsDrawAlert: wantsAlert,
        }),
      })
      setEmailSent(true)
    } catch {
      // non-critical — result is on screen
    } finally {
      setEmailSending(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const langKeys = ['langL', 'langR', 'langW', 'langS'] as const
  const langLabels: Record<string, string> = {
    langL: 'Listening', langR: 'Reading', langW: 'Writing', langS: 'Speaking',
  }

  return (
    <div className="asx-wrap">

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="asx-hero">
        <div className="asx-hero-inner">
          <p className="asx-eyebrow r">Free · No Login Required</p>
          <h1 className="asx-hero-headline r d1">CRS What-If Modeller</h1>
          <div className="rule r d2" />
          <p className="asx-hero-lead r d2">
            Move one lever — language, education, or Canadian experience — and see exactly
            how many CRS points you gain. Find the fastest path to the Express Entry cutoff.
          </p>
        </div>
      </section>

      {/* ── Tool body ───────────────────────────────────────────── */}
      <section className="asx-form-section">
        <div className="asx-form-inner">

          {/* Score hero */}
          <p className="asx-section-label">Your CRS Score</p>
          <div className="mod-score-row">
            <div className="mod-score-block">
              <span className="mod-score-label">Current</span>
              <span className="mod-score-num">{currentScore}</span>
              {initScore !== null && initScore !== currentScore && (
                <span className={`mod-delta ${currentScore > initScore ? 'pos' : 'neg'}`}>
                  {currentScore > initScore ? '+' : ''}{currentScore - initScore}
                </span>
              )}
            </div>
            {draw !== null && (
              <>
                <span className="mod-arrow">→</span>
                <div className="mod-cutoff-info">
                  <span className="mod-cutoff-label">Cutoff ({draw.type.split(',')[0]})</span>
                  <span className="mod-cutoff-val">{draw.cutoffScore}</span>
                  {gap !== null && (
                    <span className={`mod-gap ${gap <= 0 ? 'above' : 'below'}`}>
                      {gap <= 0
                        ? `+${Math.abs(gap)} above cutoff ✓`
                        : `${gap} pts short`}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Cutoff progress bar */}
          {draw !== null && (
            <div className="mod-cutoff-bar">
              <div
                className={`mod-cutoff-fill ${fillClass}`}
                style={{ width: `${gapPct}%` }}
              />
            </div>
          )}

          {/* Draw context row */}
          {draw !== null && (
            <p className="mod-context-bar">
              <span className="mod-context-item">Draw: {draw.date}</span>
              <span className="mod-context-divider">·</span>
              <span className="mod-context-item">
                {draw.invitationsIssued.toLocaleString()} invitations
              </span>
              <span className="mod-context-divider">·</span>
              <a
                href={drawData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mod-context-link"
              >
                Verify at canada.ca →
              </a>
            </p>
          )}

          {/* ── Levers ────────────────────────────────────────────── */}
          <p className="asx-section-label" style={{ marginTop: '2.5rem' }}>
            Adjust Your Profile
          </p>

          <div className="asx-grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="asx-field">
              <label className="asx-label">Age (read-only)</label>
              <input
                className="asx-input"
                type="number"
                value={state.age}
                readOnly
                aria-label="Age — edit on the full assessment tool"
              />
            </div>
            <div className="asx-field">
              <label className="asx-label">Marital Status</label>
              <select
                className="asx-select"
                value={state.hasSpouse ? 'yes' : 'no'}
                onChange={e => patch('hasSpouse', e.target.value === 'yes')}
              >
                <option value="no">Single / Not Married</option>
                <option value="yes">Married / Common-Law</option>
              </select>
            </div>
            <div className="asx-field asx-full">
              <label className="asx-label">Education</label>
              <select
                className="asx-select"
                value={state.education}
                onChange={e => patch('education', e.target.value as EducationLevel)}
              >
                {EDU_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mod-levers">
            {langKeys.map(key => (
              <div key={key} className="mod-lever-row">
                <span className="mod-lever-label">{langLabels[key]}</span>
                <input
                  type="range"
                  className="mod-range"
                  min={4} max={12} step={1}
                  value={state[key]}
                  onChange={e => patch(key, parseInt(e.target.value, 10))}
                  aria-label={`${langLabels[key]} CLB band`}
                />
                <span className="mod-lever-val">CLB {state[key]}</span>
              </div>
            ))}

            <div className="mod-lever-row">
              <span className="mod-lever-label">Canadian WE</span>
              <input
                type="range"
                className="mod-range"
                min={0} max={5} step={1}
                value={state.canadianWE}
                onChange={e => patch('canadianWE', parseInt(e.target.value, 10))}
                aria-label="Canadian Work Experience years"
              />
              <span className="mod-lever-val">
                {state.canadianWE} yr{state.canadianWE !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="mod-lever-row">
              <span className="mod-lever-label">Foreign WE</span>
              <input
                type="range"
                className="mod-range"
                min={0} max={5} step={1}
                value={state.foreignWE}
                onChange={e => patch('foreignWE', parseInt(e.target.value, 10))}
                aria-label="Foreign Work Experience years"
              />
              <span className="mod-lever-val">
                {state.foreignWE} yr{state.foreignWE !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* ── Delta table ───────────────────────────────────────── */}
          <p className="asx-section-label" style={{ marginTop: '2.5rem' }}>
            Maximum Gain Per Lever
          </p>
          <div className="mod-delta-table">
            <div className="mod-delta-head">
              <span className="mod-delta-name">Lever</span>
              <span className="mod-delta-current">Current</span>
              <span className="mod-delta-projected">If Maxed</span>
              <span className="mod-delta-gain">Max Gain</span>
            </div>
            {deltas.map(row => (
              <div
                key={row.key}
                className={`mod-delta-row${row.gain > 0 ? ' has-gain' : ''}`}
              >
                <span className="mod-delta-name">{row.name}</span>
                <span className="mod-delta-current">{row.current}</span>
                <span className="mod-delta-projected">{row.projected}</span>
                <span className={`mod-delta-gain${row.gain > 0 ? ' positive' : ''}`}>
                  {row.gain > 0 ? `+${row.gain}` : '—'}
                </span>
              </div>
            ))}
          </div>

          {/* ── Path to cutoff ────────────────────────────────────── */}
          {pathSentences.length > 0 && (
            <>
              <p className="asx-section-label" style={{ marginTop: '2.5rem' }}>
                Fastest Path to the Cutoff
              </p>
              <div className="asx-card">
                {pathSentences.map((sentence, i) => (
                  <p key={i} className="mod-path-blurb">{sentence}</p>
                ))}
              </div>
            </>
          )}

          {/* ── Scenarios note ────────────────────────────────────── */}
          <p className="asx-scenarios-note" style={{ marginTop: '2rem' }}>
            All projections use current IRCC scoring rules. Verify live draw cutoffs at{' '}
            <a
              href={drawData.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              canada.ca
            </a>
            {' · '}
            <Link href="/assessment">Run a full assessment →</Link>
          </p>

          {/* ── Lead capture ──────────────────────────────────────── */}
          <div className="asx-email-card">
            {emailSent ? (
              <p className="asx-email-success">Check your inbox ✓</p>
            ) : (
              <>
                <h3 className="asx-email-heading">Want a copy in your inbox?</h3>
                <div className="asx-grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="asx-field">
                    <label className="asx-label" htmlFor="mod-name">Your Name</label>
                    <input
                      id="mod-name"
                      className="asx-input"
                      type="text"
                      placeholder="Full name"
                      value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                  <div className="asx-field">
                    <label className="asx-label" htmlFor="mod-email">Email Address</label>
                    <input
                      id="mod-email"
                      className="asx-input"
                      type="email"
                      placeholder="you@example.com"
                      value={leadEmail}
                      onChange={e => setLeadEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <label className="asx-checkbox-row" style={{ marginBottom: '0.5rem' }}>
                  <input type="checkbox" checked readOnly />
                  <span className="asx-checkbox-label">
                    Email me my modeller results and improvement plan
                  </span>
                </label>
                <label className="asx-checkbox-row" style={{ marginBottom: '1.25rem' }}>
                  <input
                    type="checkbox"
                    checked={wantsAlert}
                    onChange={e => setWantsAlert(e.target.checked)}
                  />
                  <span className="asx-checkbox-label">
                    Alert me when a relevant Express Entry draw opens
                  </span>
                </label>
                <button
                  className="asx-submit-btn"
                  onClick={handleSendResults}
                  disabled={
                    emailSending ||
                    !leadName.trim() ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim())
                  }
                >
                  {emailSending ? 'Sending…' : 'Send My Results →'}
                </button>
              </>
            )}
          </div>

          {/* ── Legal Disclaimer ──────────────────────────────────── */}
          <div className="asx-disclaimer">
            <p className="asx-disclaimer-title">Legal Disclaimer &amp; Data Sources</p>
            <p className="asx-disclaimer-body">
              The information provided in this tool is for informational and guidance
              purposes only, based on publicly available Immigration, Refugees and
              Citizenship Canada (IRCC) regulations and policies. This does not constitute
              legal advice, and no solicitor-client or consultant-client relationship is
              created by using this tool. Immigration regulations, program requirements,
              processing times, and CRS cutoff scores are subject to frequent change without
              notice. Verify all information with official IRCC sources
              (www.canada.ca/immigration) before taking any action.
            </p>
            <p className="asx-disclaimer-body">
              Draw data sourced from{' '}
              <a href={drawData.url} target="_blank" rel="noopener noreferrer">
                canada.ca
              </a>{' '}
              — last updated {drawData.lastUpdated}.
            </p>
          </div>

        </div>
      </section>
    </div>
  )
}
