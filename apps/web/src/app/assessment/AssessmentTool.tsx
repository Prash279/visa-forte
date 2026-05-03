'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  calculate,
  scoresToClb,
  type ApplicantProfile,
  type LanguageScores,
  type CrsResult,
  type EducationLevel,
} from '@/lib/crs-calculator'
import drawData from '@/lib/crs-draw-history.json'
import './assessment.css'

// ── Draw history helpers ───────────────────────────────────────────────────────

type Draw = { date: string; type: string; cutoffScore: number; invitationsIssued: number }

function fmtDate(iso: string): string {
  // "2025-04-30" → "Apr 30, 2025"
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortType(type: string): string {
  if (/^general$/i.test(type)) return 'General'
  if (/pnp|provincial nominee/i.test(type)) return 'PNP'
  if (/stem/i.test(type)) return 'STEM'
  if (/french/i.test(type)) return 'French'
  if (/health/i.test(type)) return 'Healthcare'
  if (/trade/i.test(type)) return 'Trades'
  if (/transport/i.test(type)) return 'Transport'
  if (/agri/i.test(type)) return 'Agriculture'
  return type.length > 20 ? type.slice(0, 18) + '…' : type
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EDU_LABELS: Record<EducationLevel, string> = {
  less_than_secondary: 'Less than Secondary School',
  secondary: 'Secondary School Diploma',
  one_year_post_secondary: '1-Year Post-Secondary',
  two_year_post_secondary: '2-Year Post-Secondary',
  bachelors: "Bachelor's Degree",
  two_or_more_degrees: '2+ Post-Secondary (one 3+ yr)',
  masters: "Master's Degree / Professional",
  doctoral: 'Doctoral Degree (PhD)',
}

const DEFAULT_LANG: LanguageScores = {
  testType: 'IELTS_GT',
  listening: 0,
  reading: 0,
  writing: 0,
  speaking: 0,
}

const INITIAL: ApplicantProfile = {
  name: '',
  age: 30,
  nocCode: '',
  nocTeer: 1,
  occupationTitle: '',
  countryOfCitizenship: '',
  countryOfResidence: '',
  reportDate: new Date().toISOString().split('T')[0] ?? '',
  education: 'bachelors',
  hasEca: true,
  firstLanguageScores: { ...DEFAULT_LANG },
  hasSecondLanguage: false,
  secondLanguageScores: { ...DEFAULT_LANG },
  foreignWorkExperienceYears: 0,
  canadianWorkExperienceYears: 0,
  hasSpouse: false,
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 0,
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
  refusalDetails: '',
  fundsSource: '',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssessmentTool() {
  const [view, setView]       = useState<'form' | 'result'>('form')
  const [profile, setProfile] = useState<ApplicantProfile>(INITIAL)
  const [result, setResult]   = useState<CrsResult | null>(null)

  const firstClb  = scoresToClb(profile.firstLanguageScores)
  const secondClb = profile.hasSecondLanguage && profile.secondLanguageScores
    ? scoresToClb(profile.secondLanguageScores)
    : null

  const set = useCallback(<K extends keyof ApplicantProfile>(
    key: K, value: ApplicantProfile[K],
  ) => {
    setProfile(prev => ({ ...prev, [key]: value }))
  }, [])

  const setLangScore = useCallback(
    (which: 'first' | 'second', field: keyof LanguageScores, value: string | number) => {
      const key = which === 'first' ? 'firstLanguageScores' : 'secondLanguageScores'
      setProfile(prev => ({
        ...prev,
        [key]: { ...(prev[key] ?? DEFAULT_LANG), [field]: value },
      }))
    },
    [],
  )

  function runAssessment() {
    const r = calculate(profile)
    setResult(r)
    setView('result')
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  // ── FORM ───────────────────────────────────────────────────────────────────

  if (view === 'form') {
    return (
      <div className="asx-wrap">
        {/* Hero */}
        <section className="asx-hero">
          <div className="asx-hero-inner">
            <p className="asx-eyebrow">Free Eligibility Check</p>
            <h1 className="asx-hero-headline">
              Is Canada PR within reach?
            </h1>
            <p className="asx-hero-lead">
              Enter your profile below for an instant CRS score, stream eligibility
              analysis, and your top improvement scenarios — powered by the same
              engine Prash uses for paid assessments.
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="asx-form-section">
          <div className="asx-form-inner">

            {/* Section 1: Identity */}
            <p className="asx-section-label">1 — Your Identity</p>
            <div className="asx-grid-2">
              <div className="asx-field asx-full">
                <label className="asx-label">Your Full Name</label>
                <input
                  className="asx-input"
                  value={profile.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Kishore Sai"
                />
              </div>
              <div className="asx-field">
                <label className="asx-label">Age</label>
                <input
                  className="asx-input"
                  type="number"
                  min={18}
                  max={80}
                  value={profile.age}
                  onChange={e => set('age', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="asx-field">
                <label className="asx-label">Country of Citizenship</label>
                <input
                  className="asx-input"
                  value={profile.countryOfCitizenship}
                  onChange={e => set('countryOfCitizenship', e.target.value)}
                  placeholder="India"
                />
              </div>
              <div className="asx-field">
                <label className="asx-label">Country of Residence</label>
                <input
                  className="asx-input"
                  value={profile.countryOfResidence}
                  onChange={e => set('countryOfResidence', e.target.value)}
                  placeholder="India / USA / etc."
                />
              </div>
              <div className="asx-field">
                <label className="asx-label">NOC Code</label>
                <input
                  className="asx-input"
                  value={profile.nocCode}
                  onChange={e => set('nocCode', e.target.value)}
                  placeholder="e.g. 21211"
                />
              </div>
              <div className="asx-field">
                <label className="asx-label">NOC TEER</label>
                <select
                  className="asx-select"
                  value={profile.nocTeer}
                  onChange={e => set('nocTeer', parseInt(e.target.value) as ApplicantProfile['nocTeer'])}
                >
                  {[0, 1, 2, 3, 4, 5].map(t => (
                    <option key={t} value={t}>TEER {t}</option>
                  ))}
                </select>
              </div>
              <div className="asx-field asx-full">
                <label className="asx-label">Occupation Title</label>
                <input
                  className="asx-input"
                  value={profile.occupationTitle}
                  onChange={e => set('occupationTitle', e.target.value)}
                  placeholder="e.g. Software Engineer"
                />
              </div>
            </div>

            {/* Section 2: Education */}
            <p className="asx-section-label">2 — Education</p>
            <div className="asx-grid-2">
              <div className="asx-field">
                <label className="asx-label">Highest Level of Education</label>
                <select
                  className="asx-select"
                  value={profile.education}
                  onChange={e => set('education', e.target.value as EducationLevel)}
                >
                  {(Object.entries(EDU_LABELS) as [EducationLevel, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="asx-field asx-align-end">
                <label className="asx-checkbox-row">
                  <input
                    type="checkbox"
                    checked={profile.hasEca}
                    onChange={e => set('hasEca', e.target.checked)}
                  />
                  <span className="asx-checkbox-label">
                    Educational Credential Assessment (ECA) completed
                  </span>
                </label>
              </div>
            </div>

            {/* Section 3: First Language */}
            <p className="asx-section-label">3 — First Official Language</p>
            <div className="asx-grid-2" style={{ marginBottom: '0.75rem' }}>
              <div className="asx-field asx-full">
                <label className="asx-label">Language Test</label>
                <select
                  className="asx-select"
                  value={profile.firstLanguageScores.testType}
                  onChange={e => setLangScore('first', 'testType', e.target.value as LanguageScores['testType'])}
                >
                  <option value="IELTS_GT">IELTS General Training</option>
                  <option value="IELTS_Academic">IELTS Academic</option>
                  <option value="CELPIP">CELPIP-General</option>
                  <option value="TEF">TEF Canada</option>
                </select>
              </div>
            </div>
            <div className="asx-grid-4">
              {(['listening', 'reading', 'writing', 'speaking'] as const).map(skill => (
                <div className="asx-field" key={skill}>
                  <label className="asx-label">{skill.charAt(0).toUpperCase() + skill.slice(1)}</label>
                  <input
                    className="asx-input"
                    type="number"
                    step="0.5"
                    min={0}
                    max={9}
                    value={profile.firstLanguageScores[skill] || ''}
                    onChange={e => setLangScore('first', skill, parseFloat(e.target.value) || 0)}
                  />
                  <span
                    className="asx-clb-tag"
                    data-level={firstClb[skill] >= 9 ? 'high' : firstClb[skill] >= 7 ? 'mid' : 'low'}
                  >
                    CLB {firstClb[skill]}
                  </span>
                </div>
              ))}
            </div>

            {/* Section 4: Second Language */}
            <p className="asx-section-label">4 — Second Official Language (Optional)</p>
            <label className="asx-checkbox-row" style={{ marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={profile.hasSecondLanguage}
                onChange={e => set('hasSecondLanguage', e.target.checked)}
              />
              <span className="asx-checkbox-label">
                I have a second official language test result (English or French)
              </span>
            </label>

            {profile.hasSecondLanguage && (
              <>
                <div className="asx-grid-2" style={{ marginBottom: '0.75rem' }}>
                  <div className="asx-field asx-full">
                    <label className="asx-label">Test Type</label>
                    <select
                      className="asx-select"
                      value={profile.secondLanguageScores?.testType ?? 'IELTS_GT'}
                      onChange={e => setLangScore('second', 'testType', e.target.value as LanguageScores['testType'])}
                    >
                      <option value="IELTS_GT">IELTS General Training</option>
                      <option value="IELTS_Academic">IELTS Academic</option>
                      <option value="CELPIP">CELPIP-General</option>
                      <option value="TEF">TEF Canada</option>
                      <option value="TCF">TCF Canada</option>
                    </select>
                  </div>
                </div>
                <div className="asx-grid-4">
                  {(['listening', 'reading', 'writing', 'speaking'] as const).map(skill => (
                    <div className="asx-field" key={skill}>
                      <label className="asx-label">{skill.charAt(0).toUpperCase() + skill.slice(1)}</label>
                      <input
                        className="asx-input"
                        type="number"
                        step="0.5"
                        min={0}
                        max={9}
                        value={profile.secondLanguageScores?.[skill] || ''}
                        onChange={e => setLangScore('second', skill, parseFloat(e.target.value) || 0)}
                      />
                      {secondClb && (
                        <span
                          className="asx-clb-tag"
                          data-level={secondClb[skill] >= 9 ? 'high' : secondClb[skill] >= 7 ? 'mid' : 'low'}
                        >
                          CLB {secondClb[skill]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Section 5: Work Experience */}
            <p className="asx-section-label">5 — Work Experience</p>
            <div className="asx-grid-2">
              <div className="asx-field">
                <label className="asx-label">Foreign Work Experience (years)</label>
                <input
                  className="asx-input"
                  type="number"
                  step="0.25"
                  min={0}
                  value={profile.foreignWorkExperienceYears || ''}
                  onChange={e => set('foreignWorkExperienceYears', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="asx-field">
                <label className="asx-label">Canadian Work Experience (years)</label>
                <input
                  className="asx-input"
                  type="number"
                  step="0.25"
                  min={0}
                  value={profile.canadianWorkExperienceYears || ''}
                  onChange={e => set('canadianWorkExperienceYears', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Section 6: Additional Factors */}
            <p className="asx-section-label">6 — Additional Factors</p>
            <div className="asx-grid-2">
              <div className="asx-field">
                <label className="asx-label">Settlement Funds Available (CAD)</label>
                <input
                  className="asx-input"
                  type="number"
                  min={0}
                  value={profile.settlementFunds || ''}
                  onChange={e => set('settlementFunds', parseInt(e.target.value) || 0)}
                />
                <span className="asx-hint">Required minimum varies by family size</span>
              </div>
              <div className="asx-field">
                <label className="asx-label">Family Size (including you)</label>
                <input
                  className="asx-input"
                  type="number"
                  min={1}
                  max={10}
                  value={profile.familySize}
                  onChange={e => set('familySize', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="asx-checkbox-group">
              <label className="asx-checkbox-row">
                <input
                  type="checkbox"
                  checked={profile.hasSpouse}
                  onChange={e => set('hasSpouse', e.target.checked)}
                />
                <span className="asx-checkbox-label">Has spouse or common-law partner</span>
              </label>
              <label className="asx-checkbox-row">
                <input
                  type="checkbox"
                  checked={profile.hasProvincialNomination}
                  onChange={e => set('hasProvincialNomination', e.target.checked)}
                />
                <span className="asx-checkbox-label">Has provincial nomination (+600 CRS)</span>
              </label>
              <label className="asx-checkbox-row">
                <input
                  type="checkbox"
                  checked={profile.hasCanadianEducation}
                  onChange={e => set('hasCanadianEducation', e.target.checked)}
                />
                <span className="asx-checkbox-label">Studied in Canada (2+ yr post-secondary)</span>
              </label>
              <label className="asx-checkbox-row">
                <input
                  type="checkbox"
                  checked={profile.hasFamilyInCanada}
                  onChange={e => set('hasFamilyInCanada', e.target.checked)}
                />
                <span className="asx-checkbox-label">Has family in Canada (citizen or PR)</span>
              </label>
            </div>

            {/* Section 7: Risk & Disclosure */}
            <p className="asx-section-label">7 — Disclosure</p>
            <div className="asx-grid-3">
              <div className="asx-field">
                <label className="asx-label">Criminal Record</label>
                <div className="asx-radio-group">
                  <label className="asx-radio-row">
                    <input type="radio" name="criminal" checked={!profile.hasCriminalRecord}
                      onChange={() => set('hasCriminalRecord', false)} />
                    <span>None</span>
                  </label>
                  <label className="asx-radio-row">
                    <input type="radio" name="criminal" checked={profile.hasCriminalRecord}
                      onChange={() => set('hasCriminalRecord', true)} />
                    <span>Yes</span>
                  </label>
                </div>
              </div>
              <div className="asx-field">
                <label className="asx-label">Medical Conditions</label>
                <div className="asx-radio-group">
                  <label className="asx-radio-row">
                    <input type="radio" name="medical" checked={!profile.hasMedicalCondition}
                      onChange={() => set('hasMedicalCondition', false)} />
                    <span>None</span>
                  </label>
                  <label className="asx-radio-row">
                    <input type="radio" name="medical" checked={profile.hasMedicalCondition}
                      onChange={() => set('hasMedicalCondition', true)} />
                    <span>Yes</span>
                  </label>
                </div>
              </div>
              <div className="asx-field">
                <label className="asx-label">Prior Visa Refusals</label>
                <div className="asx-radio-group">
                  <label className="asx-radio-row">
                    <input type="radio" name="refusal" checked={!profile.hasPriorRefusal}
                      onChange={() => set('hasPriorRefusal', false)} />
                    <span>None</span>
                  </label>
                  <label className="asx-radio-row">
                    <input type="radio" name="refusal" checked={profile.hasPriorRefusal}
                      onChange={() => set('hasPriorRefusal', true)} />
                    <span>Yes</span>
                  </label>
                </div>
              </div>
            </div>

            {profile.hasPriorRefusal && (
              <div className="asx-field" style={{ marginTop: '1rem' }}>
                <label className="asx-label">Refusal Details</label>
                <input
                  className="asx-input"
                  value={profile.refusalDetails ?? ''}
                  onChange={e => set('refusalDetails', e.target.value)}
                  placeholder="Country, visa type, approximate date"
                />
              </div>
            )}

            <div className="asx-submit-row">
              <button className="asx-submit-btn" onClick={runAssessment}>
                Check My Eligibility →
              </button>
              <p className="asx-submit-note">
                Instant result. No account required. No data stored.
              </p>
            </div>

          </div>
        </section>
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────

  if (!result) return null
  const { breakdown: bd, fswGrid: fsw, eligibility: elig, scenarios } = result
  const total = bd.total
  const poolEligible = elig.expressEntryPool.eligible

  // Draw history context
  const allDraws = drawData.draws as Draw[]
  const recentGeneral = allDraws.filter(d => /^general$/i.test(d.type)).slice(0, 3)
  const lastGeneral = recentGeneral[0] ?? null
  const cutoff = lastGeneral?.cutoffScore ?? null
  const gap = cutoff !== null ? total - cutoff : null
  const hasDrawData = allDraws.length > 0

  const programs = [
    { name: 'Express Entry Pool', eligible: elig.expressEntryPool.eligible, likely: false, reason: elig.expressEntryPool.reason },
    { name: 'Federal Skilled Worker (FSW)', eligible: elig.fsw.eligible, likely: elig.fsw.likely ?? false, reason: elig.fsw.reason },
    { name: 'Canadian Experience Class (CEC)', eligible: elig.cec.eligible, likely: elig.cec.likely ?? false, reason: elig.cec.reason },
    { name: 'Federal Skilled Trades (FST)', eligible: elig.fst.eligible, likely: elig.fst.likely ?? false, reason: elig.fst.reason },
  ]

  const scoreColor = total >= 500 ? 'high' : total >= 400 ? 'mid' : 'low'

  return (
    <div className="asx-wrap">
      {/* Result toolbar */}
      <div className="asx-toolbar">
        <button className="asx-back-btn" onClick={() => setView('form')}>
          ← Edit Profile
        </button>
        <button className="asx-print-btn" onClick={() => window.print()}>
          Save / Print
        </button>
      </div>

      <div className="asx-result">

        {/* ── Hero Score Card ─────────────────────────────────────── */}
        <section className="asx-score-hero">
          <div className="asx-score-hero-inner">
            <div className="asx-score-block" data-level={scoreColor}>
              <p className="asx-score-label">Your CRS Score</p>
              <p className="asx-score-value">{total}</p>
              <p className="asx-score-max">out of 1200</p>
            </div>

            <div className="asx-score-meta">
              <p className="asx-score-name">{profile.name || 'Your Assessment'}</p>
              <p className="asx-score-occ">
                {profile.occupationTitle || '—'} (TEER {profile.nocTeer})
                {profile.countryOfCitizenship ? ` · ${profile.countryOfCitizenship}` : ''}
              </p>
              <div
                className="asx-pool-badge"
                data-eligible={poolEligible ? 'yes' : 'no'}
              >
                {poolEligible
                  ? '✓ Express Entry Pool: ELIGIBLE'
                  : '✗ Express Entry Pool: NOT ELIGIBLE'}
              </div>
              <p className="asx-score-date">
                Assessment generated {profile.reportDate} · All scoring per IRCC rules
              </p>
            </div>
          </div>
        </section>

        <div className="asx-result-body">

          {/* ── Recent Draw Context ──────────────────────────────── */}
          {hasDrawData && (
            <div className="asx-card asx-draws-card">
              <h2 className="asx-card-title">Pool Draw Context</h2>
              <p className="asx-card-sub">
                Your score compared to recent Express Entry general draws from canada.ca.
              </p>

              {lastGeneral && (
                <div className={`asx-gap-row${gap !== null && gap >= 0 ? ' asx-gap-above' : ' asx-gap-below'}`}>
                  <div className="asx-gap-score">
                    <span className="asx-gap-label">Last General Draw</span>
                    <span className="asx-gap-val">{lastGeneral.cutoffScore}</span>
                    <span className="asx-gap-meta">{fmtDate(lastGeneral.date)}</span>
                  </div>
                  <div className="asx-gap-vs">
                    <span className="asx-gap-your-label">Your Score</span>
                    <span className="asx-gap-your-val">{total}</span>
                    {gap !== null && (
                      <span className="asx-gap-diff">
                        {gap >= 0
                          ? `+${gap} pts above cutoff`
                          : `${gap} pts below cutoff`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="asx-draws-table">
                <div className="asx-draws-header">
                  <span>Date</span><span>Type</span><span>Cutoff</span><span>ITAs</span>
                </div>
                {allDraws.slice(0, 5).map((d, i) => (
                  <div key={i} className="asx-draw-row">
                    <span className="asx-draw-date">{fmtDate(d.date)}</span>
                    <span className="asx-draw-type">{shortType(d.type)}</span>
                    <span className="asx-draw-score">{d.cutoffScore}</span>
                    <span className="asx-draw-itas">{d.invitationsIssued.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="asx-draws-source">
                Data synced from{' '}
                <a href={drawData.url} target="_blank" rel="noopener noreferrer">canada.ca rounds of invitations</a>
                {drawData.lastUpdated ? ` · ${fmtDate(drawData.lastUpdated)}` : ''}.
              </p>
            </div>
          )}

          {/* ── Program Eligibility ──────────────────────────────── */}
          <div className="asx-card">
            <h2 className="asx-card-title">Program Eligibility</h2>
            <p className="asx-card-sub">Hard-gate assessment across active Express Entry streams.</p>
            <div className="asx-elig-table">
              {programs.map(prog => (
                <div key={prog.name} className="asx-elig-row">
                  <span className="asx-elig-name">{prog.name}</span>
                  <span
                    className="asx-elig-badge"
                    data-status={prog.eligible ? 'eligible' : prog.likely ? 'likely' : 'no'}
                  >
                    {prog.eligible ? 'ELIGIBLE' : prog.likely ? 'LIKELY' : 'NOT ELIGIBLE'}
                  </span>
                  <span className="asx-elig-reason">{prog.reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── CRS Breakdown ────────────────────────────────────── */}
          <div className="asx-card">
            <h2 className="asx-card-title">Score Breakdown</h2>
            <p className="asx-card-sub">
              CRS points across all four factors (post-March 2025 rules — job offer points removed).
            </p>
            <div className="asx-breakdown-grid">
              <div className="asx-breakdown-item">
                <span className="asx-bd-label">Human Capital (A+B)</span>
                <span className="asx-bd-value">{bd.coreTotal}</span>
              </div>
              <div className="asx-breakdown-item">
                <span className="asx-bd-label">Skill Transferability (C)</span>
                <span className="asx-bd-value">{bd.transferTotal}</span>
              </div>
              <div className="asx-breakdown-item">
                <span className="asx-bd-label">Additional Points (D)</span>
                <span className="asx-bd-value">{bd.additionalTotal}</span>
              </div>
              <div className="asx-breakdown-total">
                <span className="asx-bd-label">Total CRS</span>
                <span className="asx-bd-total-value">{total}</span>
              </div>
            </div>

            {/* FSW 67-point grid */}
            <h3 className="asx-sub-heading">FSW 67-Point Selection Grid</h3>
            <div className="asx-fsw-table">
              {[
                { factor: 'Language Skills', value: `${fsw.language}/28`, pass: fsw.language >= 24 },
                { factor: 'Education', value: `${fsw.education}/25`, pass: fsw.education >= 20 },
                { factor: 'Work Experience', value: `${fsw.workExperience}/15`, pass: fsw.workExperience >= 9 },
                { factor: 'Age', value: `${fsw.age}/12`, pass: fsw.age >= 10 },
                { factor: 'Adaptability', value: `${fsw.adaptability}/10`, pass: fsw.adaptability > 0 },
                { factor: 'Total', value: `${fsw.total}/100`, pass: fsw.total >= 67 },
              ].map(row => (
                <div key={row.factor} className={`asx-fsw-row${row.factor === 'Total' ? ' asx-fsw-total' : ''}`}>
                  <span className="asx-fsw-factor">{row.factor}</span>
                  <span className="asx-fsw-pts" data-pass={row.pass ? 'yes' : 'no'}>{row.value}</span>
                </div>
              ))}
            </div>
            <p className="asx-fsw-verdict">
              {fsw.eligible
                ? `FSW pass mark reached (${fsw.total}/100). Profile qualifies for the Federal Skilled Worker stream.`
                : `FSW pass mark not reached (${fsw.total}/100 — 67 required). FSW pathway currently unavailable.`}
            </p>
          </div>

          {/* ── Settlement Funds ─────────────────────────────────── */}
          <div className={`asx-card asx-funds-card${result.proofOfFundsSufficient ? '' : ' asx-funds-warn'}`}>
            <h2 className="asx-card-title">Settlement Funds</h2>
            <div className="asx-funds-row">
              <span className="asx-funds-label">Declared</span>
              <span className="asx-funds-value">CAD ${profile.settlementFunds.toLocaleString()}</span>
            </div>
            <div className="asx-funds-row">
              <span className="asx-funds-label">Minimum Required (family of {profile.familySize})</span>
              <span className="asx-funds-value">CAD ${result.proofOfFundsRequired.toLocaleString()}</span>
            </div>
            <div className={`asx-funds-status ${result.proofOfFundsSufficient ? 'ok' : 'fail'}`}>
              {result.proofOfFundsSufficient
                ? '✓ Funds sufficient'
                : '✗ Below required threshold — must address before applying'}
            </div>
          </div>

          {/* ── Improvement Scenarios ────────────────────────────── */}
          {scenarios.length > 0 && (
            <div className="asx-card">
              <h2 className="asx-card-title">How to Improve Your Score</h2>
              <p className="asx-card-sub">
                {cutoff !== null
                  ? `Projected scores are compared against the last general draw cutoff of ${cutoff} pts (${fmtDate(lastGeneral!.date)}).`
                  : 'The highest-impact changes you can make to your CRS score.'}
              </p>
              <div className="asx-scenarios">
                {scenarios.map((s, i) => {
                  const meetsReal = cutoff !== null
                    ? s.projectedCrs >= cutoff
                    : s.competitive
                  return (
                    <div key={i} className="asx-scenario-row">
                      <div className={`asx-scenario-delta${s.delta > 0 ? ' positive' : ''}`}>
                        {s.delta > 0 ? '+' : ''}{s.delta}
                      </div>
                      <div className="asx-scenario-info">
                        <p className="asx-scenario-name">{s.name}</p>
                        <p className="asx-scenario-desc">{s.change}</p>
                      </div>
                      <div className="asx-scenario-projected">
                        <span className="asx-projected-label">Projected</span>
                        <span className="asx-projected-val">{s.projectedCrs}</span>
                        <span
                          className="asx-competitive-tag"
                          data-meets={meetsReal ? 'yes' : 'no'}
                        >
                          {meetsReal ? '▲ Cutoff met' : '▼ Below cutoff'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="asx-scenarios-note">
                All projections assume current IRCC scoring rules. Verify live draw cutoffs at{' '}
                <a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html"
                  target="_blank" rel="noopener noreferrer">canada.ca</a>{' '}
                before acting on any scenario.
              </p>
            </div>
          )}

          {/* ── CTA ──────────────────────────────────────────────── */}
          <div className="asx-cta-card">
            <p className="asx-cta-eyebrow">What Happens Next</p>
            <h2 className="asx-cta-headline">
              Your score is calculated. Your strategy is the next step.
            </h2>
            <p className="asx-cta-body">
              A Visa Forte consultation maps exactly which program, which draw cycle,
              and which documentation gaps stand between your current profile and an ITA.
              No templates. One consultant. Your file, personally reviewed.
            </p>
            <Link href="/booking" className="asx-cta-btn">
              Book a Consultation →
            </Link>
            <p className="asx-cta-sub">
              Pre-Application Eligibility Assessment · From $99 / ₹4,999
            </p>
          </div>

          {/* ── Legal Disclaimer ─────────────────────────────────── */}
          <div className="asx-disclaimer">
            <p className="asx-disclaimer-title">Legal Disclaimer &amp; Data Sources</p>
            <p className="asx-disclaimer-body">
              The information provided in this assessment is for informational and guidance purposes
              only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC)
              regulations and policies. This does not constitute legal advice, and no
              solicitor-client or consultant-client relationship is created by using this tool.
            </p>
            <p className="asx-disclaimer-body">
              Immigration regulations, program requirements, processing times, and CRS cutoff scores
              are subject to frequent change without notice. You are responsible for verifying all
              information with official IRCC sources at{' '}
              <a
                href="https://www.canada.ca/immigration"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.canada.ca/immigration
              </a>{' '}
              and confirming current eligibility requirements before taking any action.
            </p>
            <p className="asx-disclaimer-body">
              Visa Forte provides documentation consulting services only. Prashant Thirthingoth
              is not a Registered Canadian Immigration Consultant (RCIC) and does not provide
              legal immigration representation. All CRS scoring follows IRCC rules as of
              March 2025 (arranged employment points removed per IRCC update).
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
