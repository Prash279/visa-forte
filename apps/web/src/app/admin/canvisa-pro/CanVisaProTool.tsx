'use client'

import { useState, useRef, useCallback } from 'react'
import {
  calculate,
  scoresToClb,
  type ApplicantProfile,
  type LanguageScores,
  type LanguageBands,
  type CrsResult,
  type EducationLevel,
} from '@/lib/crs-calculator'
import './canvisa-pro.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const CLB_COLOR = (clb: number) =>
  clb >= 9 ? '#2DD4BF' : clb >= 7 ? '#FDE047' : '#FCA5A5'

function clbDisplay(bands: LanguageBands) {
  return `L:${bands.listening} · R:${bands.reading} · W:${bands.writing} · S:${bands.speaking}`
}

function todayStr() {
  return new Date().toISOString().split('T')[0] ?? ''
}

function reportId(name: string, date: string) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
  const d = date.replace(/-/g, '')
  return `CVP-${d}-${initials}-001`
}

// Gauge arc path — score out of 1200 mapped to 0-315 degrees of arc.
function gaugeOffset(score: number, max = 1200): number {
  const pathLength = 314.16
  const pct = Math.min(score / max, 1)
  return pathLength * (1 - pct)
}

function dotPosition(score: number, max = 1200): { x: number; y: number } {
  const pct = Math.min(score / max, 1)
  const angle = Math.PI - pct * Math.PI
  return { x: 130 + 100 * Math.cos(angle), y: 180 - 100 * Math.sin(angle) }
}

// ── Initial form state ────────────────────────────────────────────────────────

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
  reportDate: todayStr(),
  strategyTitle: '',
  currentEmployer: '',
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

export default function CanVisaProTool() {
  const [view, setView] = useState<'form' | 'report'>('form')
  const [profile, setProfile] = useState<ApplicantProfile>(INITIAL)
  const [result, setResult] = useState<CrsResult | null>(null)

  // Live CLB preview while filling the form
  const firstClb = scoresToClb(profile.firstLanguageScores)
  const secondClb = profile.hasSecondLanguage && profile.secondLanguageScores
    ? scoresToClb(profile.secondLanguageScores)
    : null

  const reportRef = useRef<HTMLDivElement>(null)

  const set = useCallback(<K extends keyof ApplicantProfile>(
    key: K,
    value: ApplicantProfile[K]
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
    []
  )

  function generate() {
    const r = calculate(profile)
    setResult(r)
    setView('report')
    setTimeout(() => window.scrollTo({ top: 0 }), 50)
  }

  // ── FORM ──────────────────────────────────────────────────────────────────

  if (view === 'form') {
    return (
      <div className="cvp-wrap">
        <div className="cvp-form-wrap">
          <div className="cvp-form-header">
            <p className="cvp-form-eyebrow">Consultant Tool · Confidential</p>
            <h1 className="cvp-form-title">CanVisa Pro</h1>
            <p className="cvp-form-subtitle">
              Enter applicant data to generate a full PR eligibility assessment report.
            </p>
          </div>

          {/* Section 1: Applicant Info */}
          <p className="cvp-section-label">1 — Applicant Identity</p>
          <div className="cvp-grid-2">
            <div className="cvp-field full">
              <label className="cvp-label">Full Name</label>
              <input className="cvp-input" value={profile.name}
                onChange={e => set('name', e.target.value)} placeholder="e.g. Kishore Sai" />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Age</label>
              <input className="cvp-input" type="number" min={18} max={80}
                value={profile.age} onChange={e => set('age', parseInt(e.target.value) || 0)} />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Report Date</label>
              <input className="cvp-input" type="date" value={profile.reportDate}
                onChange={e => set('reportDate', e.target.value)} />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">NOC Code</label>
              <input className="cvp-input" value={profile.nocCode}
                onChange={e => set('nocCode', e.target.value)} placeholder="e.g. 21211" />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">NOC TEER</label>
              <select className="cvp-select" value={profile.nocTeer}
                onChange={e => set('nocTeer', parseInt(e.target.value) as ApplicantProfile['nocTeer'])}>
                {[0, 1, 2, 3, 4, 5].map(t => (
                  <option key={t} value={t}>TEER {t}</option>
                ))}
              </select>
            </div>
            <div className="cvp-field full">
              <label className="cvp-label">Occupation Title</label>
              <input className="cvp-input" value={profile.occupationTitle}
                onChange={e => set('occupationTitle', e.target.value)} placeholder="e.g. Data Scientist" />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Country of Citizenship</label>
              <input className="cvp-input" value={profile.countryOfCitizenship}
                onChange={e => set('countryOfCitizenship', e.target.value)} placeholder="India" />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Country of Residence</label>
              <input className="cvp-input" value={profile.countryOfResidence}
                onChange={e => set('countryOfResidence', e.target.value)} placeholder="USA" />
            </div>
            <div className="cvp-field full">
              <label className="cvp-label">Current Employer (optional)</label>
              <input className="cvp-input" value={profile.currentEmployer ?? ''}
                onChange={e => set('currentEmployer', e.target.value)} />
            </div>
            <div className="cvp-field full">
              <label className="cvp-label">Strategy / Report Subtitle (optional)</label>
              <input className="cvp-input" value={profile.strategyTitle ?? ''}
                onChange={e => set('strategyTitle', e.target.value)}
                placeholder='e.g. The "Enter Now" Deployment' />
            </div>
          </div>

          {/* Section 2: Education */}
          <p className="cvp-section-label">2 — Education</p>
          <div className="cvp-grid-2">
            <div className="cvp-field">
              <label className="cvp-label">Highest Level of Education</label>
              <select className="cvp-select" value={profile.education}
                onChange={e => set('education', e.target.value as EducationLevel)}>
                {(Object.entries(EDU_LABELS) as [EducationLevel, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="cvp-field" style={{ justifyContent: 'flex-end' }}>
              <label className="cvp-checkbox-row">
                <input type="checkbox" checked={profile.hasEca}
                  onChange={e => set('hasEca', e.target.checked)} />
                <span className="cvp-checkbox-label">Educational Credential Assessment (ECA) completed</span>
              </label>
            </div>
          </div>

          {/* Section 3: First Language */}
          <p className="cvp-section-label">3 — First Official Language</p>
          <div className="cvp-grid-2" style={{ marginBottom: '0.75rem' }}>
            <div className="cvp-field full">
              <label className="cvp-label">Test Type</label>
              <select className="cvp-select" value={profile.firstLanguageScores.testType}
                onChange={e => setLangScore('first', 'testType', e.target.value as LanguageScores['testType'])}>
                <option value="IELTS_GT">IELTS General Training</option>
                <option value="IELTS_Academic">IELTS Academic</option>
                <option value="CELPIP">CELPIP-General</option>
                <option value="TEF">TEF Canada</option>
              </select>
            </div>
          </div>
          <div className="cvp-grid-4">
            {(['listening', 'reading', 'writing', 'speaking'] as const).map(a => (
              <div className="cvp-field" key={a}>
                <label className="cvp-label">{a.charAt(0).toUpperCase() + a.slice(1)}</label>
                <input className="cvp-input" type="number" step="0.5" min={0} max={9}
                  value={profile.firstLanguageScores[a] || ''}
                  onChange={e => setLangScore('first', a, parseFloat(e.target.value) || 0)} />
                <span className="cvp-clb-preview" style={{ color: CLB_COLOR(firstClb[a]) }}>
                  CLB {firstClb[a]}
                </span>
              </div>
            ))}
          </div>

          {/* Section 4: Second Language (optional) */}
          <p className="cvp-section-label">4 — Second Official Language (Optional)</p>
          <label className="cvp-checkbox-row" style={{ marginBottom: '1rem' }}>
            <input type="checkbox" checked={profile.hasSecondLanguage}
              onChange={e => set('hasSecondLanguage', e.target.checked)} />
            <span className="cvp-checkbox-label">Applicant has a second official language test result</span>
          </label>

          {profile.hasSecondLanguage && (
            <>
              <div className="cvp-grid-2" style={{ marginBottom: '0.75rem' }}>
                <div className="cvp-field full">
                  <label className="cvp-label">Test Type</label>
                  <select className="cvp-select" value={profile.secondLanguageScores?.testType ?? 'IELTS_GT'}
                    onChange={e => setLangScore('second', 'testType', e.target.value as LanguageScores['testType'])}>
                    <option value="IELTS_GT">IELTS General Training</option>
                    <option value="IELTS_Academic">IELTS Academic</option>
                    <option value="CELPIP">CELPIP-General</option>
                    <option value="TEF">TEF Canada</option>
                    <option value="TCF">TCF Canada</option>
                  </select>
                </div>
              </div>
              <div className="cvp-grid-4">
                {(['listening', 'reading', 'writing', 'speaking'] as const).map(a => (
                  <div className="cvp-field" key={a}>
                    <label className="cvp-label">{a.charAt(0).toUpperCase() + a.slice(1)}</label>
                    <input className="cvp-input" type="number" step="0.5" min={0} max={9}
                      value={profile.secondLanguageScores?.[a] || ''}
                      onChange={e => setLangScore('second', a, parseFloat(e.target.value) || 0)} />
                    {secondClb && (
                      <span className="cvp-clb-preview" style={{ color: CLB_COLOR(secondClb[a]) }}>
                        CLB {secondClb[a]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Section 5: Work Experience */}
          <p className="cvp-section-label">5 — Work Experience</p>
          <div className="cvp-grid-2">
            <div className="cvp-field">
              <label className="cvp-label">Foreign Work Experience (years)</label>
              <input className="cvp-input" type="number" step="0.25" min={0}
                value={profile.foreignWorkExperienceYears || ''}
                onChange={e => set('foreignWorkExperienceYears', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Canadian Work Experience (years)</label>
              <input className="cvp-input" type="number" step="0.25" min={0}
                value={profile.canadianWorkExperienceYears || ''}
                onChange={e => set('canadianWorkExperienceYears', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Section 6: Additional */}
          <p className="cvp-section-label">6 — Additional Factors</p>
          <div className="cvp-grid-2">
            <div className="cvp-field">
              <label className="cvp-label">Settlement Funds Available (CAD)</label>
              <input className="cvp-input" type="number" min={0}
                value={profile.settlementFunds || ''}
                onChange={e => set('settlementFunds', parseInt(e.target.value) || 0)} />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Family Size (including applicant)</label>
              <input className="cvp-input" type="number" min={1} max={10}
                value={profile.familySize}
                onChange={e => set('familySize', parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '1.25rem' }}>
            <label className="cvp-checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={profile.hasSpouse}
                onChange={e => set('hasSpouse', e.target.checked)} />
              <span className="cvp-checkbox-label">Has spouse / common-law partner</span>
            </label>
            <label className="cvp-checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={profile.hasProvincialNomination}
                onChange={e => set('hasProvincialNomination', e.target.checked)} />
              <span className="cvp-checkbox-label">Has provincial nomination (+600)</span>
            </label>
            <label className="cvp-checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={profile.hasCanadianEducation}
                onChange={e => set('hasCanadianEducation', e.target.checked)} />
              <span className="cvp-checkbox-label">Studied in Canada (2+ yr post-secondary)</span>
            </label>
            <label className="cvp-checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={profile.hasFamilyInCanada}
                onChange={e => set('hasFamilyInCanada', e.target.checked)} />
              <span className="cvp-checkbox-label">Has family in Canada (citizen or PR)</span>
            </label>
          </div>

          {/* Section 7: Risk */}
          <p className="cvp-section-label">7 — Risk & Disclosure</p>
          <div className="cvp-grid-3">
            <div className="cvp-field">
              <label className="cvp-label">Criminal Record</label>
              <div className="cvp-radio-group">
                <label className="cvp-radio-row">
                  <input type="radio" name="criminal" checked={!profile.hasCriminalRecord}
                    onChange={() => set('hasCriminalRecord', false)} />
                  <span className="cvp-radio-label">None</span>
                </label>
                <label className="cvp-radio-row">
                  <input type="radio" name="criminal" checked={profile.hasCriminalRecord}
                    onChange={() => set('hasCriminalRecord', true)} />
                  <span className="cvp-radio-label">Yes</span>
                </label>
              </div>
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Medical Conditions</label>
              <div className="cvp-radio-group">
                <label className="cvp-radio-row">
                  <input type="radio" name="medical" checked={!profile.hasMedicalCondition}
                    onChange={() => set('hasMedicalCondition', false)} />
                  <span className="cvp-radio-label">None</span>
                </label>
                <label className="cvp-radio-row">
                  <input type="radio" name="medical" checked={profile.hasMedicalCondition}
                    onChange={() => set('hasMedicalCondition', true)} />
                  <span className="cvp-radio-label">Yes</span>
                </label>
              </div>
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Prior Visa Refusals</label>
              <div className="cvp-radio-group">
                <label className="cvp-radio-row">
                  <input type="radio" name="refusal" checked={!profile.hasPriorRefusal}
                    onChange={() => set('hasPriorRefusal', false)} />
                  <span className="cvp-radio-label">None</span>
                </label>
                <label className="cvp-radio-row">
                  <input type="radio" name="refusal" checked={profile.hasPriorRefusal}
                    onChange={() => set('hasPriorRefusal', true)} />
                  <span className="cvp-radio-label">Yes</span>
                </label>
              </div>
            </div>
          </div>

          {profile.hasPriorRefusal && (
            <div className="cvp-field" style={{ marginTop: '1rem' }}>
              <label className="cvp-label">Refusal Details</label>
              <input className="cvp-input" value={profile.refusalDetails ?? ''}
                onChange={e => set('refusalDetails', e.target.value)}
                placeholder="Country, visa type, approximate date" />
            </div>
          )}

          <button className="cvp-generate-btn" onClick={generate}>
            Generate Assessment Report →
          </button>
        </div>
      </div>
    )
  }

  // ── REPORT ────────────────────────────────────────────────────────────────

  if (!result) return null
  const { breakdown: bd, fswGrid: fsw, eligibility: elig, scenarios } = result
  const total = bd.total
  const generalCutoff = 500 // approximate recent general draw cutoff [VERIFY at canada.ca]
  const scoreDelta = generalCutoff - total
  const fwYears = profile.foreignWorkExperienceYears

  const eligPills = [
    {
      pathway: 'Federal Skilled Worker (FSW)',
      ...elig.fsw,
      reason: elig.fsw.reason,
    },
    {
      pathway: 'Express Entry Pool',
      ...elig.expressEntryPool,
      reason: elig.expressEntryPool.reason,
    },
    {
      pathway: 'Canadian Experience Class (CEC)',
      ...elig.cec,
      reason: elig.cec.reason,
    },
    {
      pathway: 'Federal Skilled Trades (FST)',
      ...elig.fst,
      reason: elig.fst.reason,
    },
  ]

  const gaugeOffset_ = gaugeOffset(total)
  const dot_ = dotPosition(generalCutoff)

  return (
    <div className="cvp-wrap" ref={reportRef}>
      {/* Toolbar */}
      <div className="cvp-toolbar">
        <button className="cvp-back-btn" onClick={() => setView('form')}>
          ← Back to Form
        </button>
        <button className="cvp-print-btn" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="cvp-report">
        {/* ── Report Header ──────────────────────────────────────────── */}
        <div className="cvp-rpt-header">
          <div className="cvp-rpt-top-row">
            <div className="cvp-brand">
              <h1>CanVisa Pro</h1>
              <p>Precision Canadian Permanent Residency Assessment</p>
            </div>
            <div className="cvp-data-badge">
              All data sourced from canada.ca · {profile.reportDate}
            </div>
          </div>

          <p className="cvp-rpt-name">Applicant: {profile.name || '—'}</p>
          <h2 className="cvp-rpt-title">
            {profile.strategyTitle || 'PR Eligibility Assessment'}
          </h2>
          <p className="cvp-rpt-sub">
            {profile.occupationTitle || '—'} (TEER {profile.nocTeer}) ·{' '}
            {profile.countryOfCitizenship || '—'} National ·{' '}
            Resident of {profile.countryOfResidence || '—'}
          </p>

          <div className="cvp-meta-row">
            <div className="cvp-meta-item">
              <span className="label">Report Date</span>
              <span className="value">{profile.reportDate}</span>
            </div>
            <div className="cvp-meta-item">
              <span className="label">NOC Code</span>
              <span className="value">{profile.nocCode || '—'}</span>
            </div>
            <div className="cvp-meta-item">
              <span className="label">Current CRS</span>
              <span className="value">{total} (Calculated)</span>
            </div>
            <div className="cvp-meta-item">
              <span className="label">Mode</span>
              <span className="value">Deep Analysis Mode</span>
            </div>
          </div>

          <p className="cvp-report-id">
            Report ID: {reportId(profile.name, profile.reportDate)} · Generated {profile.reportDate}
          </p>
        </div>

        <div className="cvp-rpt-body">

          {/* ── Section 1: Applicant Profile ──────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Applicant Data Profile</h2></div>
            <p className="cvp-section-sub">Intake data mapped against IRCC validation requirements.</p>
            <div className="cvp-profile-grid">
              <div className="cvp-profile-card">
                <p className="cvp-profile-head">Principal Applicant</p>
                <div className="cvp-data-row"><span className="label">Age</span><span className="value">{profile.age} Years</span></div>
                <div className="cvp-data-row"><span className="label">Education</span>
                  <span className="value">{EDU_LABELS[profile.education]}{profile.hasEca ? ' (ECA Confirmed)' : ''}</span></div>
                <div className="cvp-data-row"><span className="label">First Language</span>
                  <span className="value" style={{ fontSize: '0.82rem' }}>{clbDisplay(result.firstLanguageBands)}</span></div>
                <div className="cvp-data-row"><span className="label">Foreign Work Exp</span>
                  <span className="value">{fwYears} Years {fwYears > 0 && fwYears < 1 ? '(partial)' : fwYears >= 1 ? '(Eligible)' : '(None)'}</span></div>
                <div className="cvp-data-row"><span className="label">Canadian Work Exp</span>
                  <span className="value">{profile.canadianWorkExperienceYears > 0 ? `${profile.canadianWorkExperienceYears} Years` : 'None'}</span></div>
                <div className="cvp-data-row"><span className="label">Settlement Funds</span>
                  <span className={result.proofOfFundsSufficient ? 'value cvp-funds-ok' : 'value cvp-funds-fail'}>
                    CAD ${profile.settlementFunds.toLocaleString()}
                    {result.proofOfFundsSufficient ? ' ✓' : ' — BELOW THRESHOLD'}
                  </span>
                </div>
                {profile.currentEmployer && (
                  <div className="cvp-data-row"><span className="label">Current Employer</span>
                    <span className="value">{profile.currentEmployer}</span></div>
                )}
              </div>
              {profile.hasSpouse && (
                <div className="cvp-profile-card">
                  <p className="cvp-profile-head">Spouse / Common-Law Partner</p>
                  <div className="cvp-data-row"><span className="label">Status</span>
                    <span className="value">Present (affects scoring)</span></div>
                </div>
              )}
            </div>
            {profile.firstLanguageScores.testType && (
              <p style={{ fontSize: '0.82rem', color: 'var(--cvp-muted)', marginTop: '14px' }}>
                <strong style={{ color: 'var(--cvp-text)' }}>Language Test:</strong>{' '}
                {profile.firstLanguageScores.testType === 'IELTS_GT' ? 'IELTS General Training' :
                  profile.firstLanguageScores.testType === 'IELTS_Academic' ? 'IELTS Academic' :
                  profile.firstLanguageScores.testType} — L:{profile.firstLanguageScores.listening}{' '}
                R:{profile.firstLanguageScores.reading} W:{profile.firstLanguageScores.writing}{' '}
                S:{profile.firstLanguageScores.speaking} → CLB {clbDisplay(result.firstLanguageBands)}
              </p>
            )}
          </div>

          {/* ── Section 2: Stream Eligibility Matrix ──────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Stream Eligibility Matrix</h2></div>
            <p className="cvp-section-sub">Hard-gate assessment against active IRCC pathways.</p>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>PR Pathway</th>
                  <th>Status</th>
                  <th>Requirement Analysis</th>
                </tr>
              </thead>
              <tbody>
                {eligPills.map(row => (
                  <tr key={row.pathway}>
                    <td><strong>{row.pathway}</strong></td>
                    <td>
                      <span className={`cvp-pill ${row.eligible ? 'eligible' : row.likely ? 'likely' : 'not-eligible'}`}>
                        {row.eligible ? 'ELIGIBLE' : row.likely ? 'LIKELY ELIGIBLE' : 'NOT ELIGIBLE'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Section 3: FSW 67-Point Grid ──────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>FSW 67-Point Selection Grid</h2></div>
            <p className="cvp-section-sub">Statutory threshold assessment for Federal Skilled Worker program entry.</p>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>Selection Factor</th>
                  <th>Applicant Profile</th>
                  <th style={{ textAlign: 'right' }}>Points</th>
                  <th style={{ textAlign: 'right' }}>Max</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Language Skills</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    CLB {clbDisplay(result.firstLanguageBands)}{profile.hasSecondLanguage ? ' + 2nd lang' : ''}
                  </td>
                  <td className={fsw.language >= 24 ? 'pts' : 'pts-muted'}>{fsw.language}</td>
                  <td className="max-pts">28</td>
                </tr>
                <tr>
                  <td><strong>Education</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    {EDU_LABELS[profile.education]}{profile.hasEca ? ' (ECA Confirmed)' : ''}
                  </td>
                  <td className={fsw.education >= 20 ? 'pts' : 'pts-muted'}>{fsw.education}</td>
                  <td className="max-pts">25</td>
                </tr>
                <tr>
                  <td><strong>Work Experience</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    {fwYears} Years (NOC {profile.nocCode || '—'})
                  </td>
                  <td className={fsw.workExperience >= 9 ? 'pts' : 'pts-muted'}>{fsw.workExperience}</td>
                  <td className="max-pts">15</td>
                </tr>
                <tr>
                  <td><strong>Age</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>{profile.age} Years Old</td>
                  <td className={fsw.age >= 10 ? 'pts' : 'pts-muted'}>{fsw.age}</td>
                  <td className="max-pts">12</td>
                </tr>
                <tr>
                  <td><strong>Arranged Employment</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    Job offer factor removed post-March 2025 (IRCC update)
                  </td>
                  <td className="pts-muted">0</td>
                  <td className="max-pts">0</td>
                </tr>
                <tr>
                  <td><strong>Adaptability</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    {fsw.adaptability > 0
                      ? [
                          profile.hasCanadianEducation && 'Canadian education',
                          profile.hasFamilyInCanada && 'Family in Canada',
                          profile.canadianWorkExperienceYears >= 1 && 'Prior Canadian work',
                        ].filter(Boolean).join(', ')
                      : 'No Canadian ties declared'}
                  </td>
                  <td className={fsw.adaptability > 0 ? 'pts' : 'pts-muted'}>{fsw.adaptability}</td>
                  <td className="max-pts">10</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="grand-total">
                  <td colSpan={2}><strong>Total FSW Points (Pass Mark: 67)</strong></td>
                  <td className="pts-total">{fsw.total}</td>
                  <td className="max-pts">100</td>
                </tr>
              </tfoot>
            </table>
            <div className="cvp-verify">
              <strong>Verdict:</strong> Applicant scores{' '}
              <strong>{fsw.total}/100</strong> and{' '}
              {fsw.eligible
                ? 'successfully clears the 67-point FSW statutory threshold. Profile is legally eligible for Express Entry profile creation.'
                : 'does NOT clear the 67-point FSW statutory threshold. FSW pathway unavailable at this time.'}
            </div>
          </div>

          {/* ── Section 4: CRS Score ──────────────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Comprehensive Ranking System (CRS)</h2></div>
            <p className="cvp-section-sub">Mathematical baseline generated from verified human capital factors.</p>

            <div className="cvp-gauge-wrap">
              {/* Gauge */}
              <div className="cvp-gauge-box">
                <svg className="cvp-gauge-svg" viewBox="0 0 260 210">
                  <defs>
                    <linearGradient id="cvpArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#E63946" />
                      <stop offset="40%" stopColor="#F4A261" />
                      <stop offset="100%" stopColor="#00A896" />
                    </linearGradient>
                  </defs>
                  <path d="M 30 180 A 100 100 0 1 1 230 180"
                    fill="none" stroke="#334155" strokeWidth="18" strokeLinecap="round" />
                  <path d="M 30 180 A 100 100 0 1 1 230 180"
                    fill="none" stroke="url(#cvpArcGrad)" strokeWidth="18" strokeLinecap="round"
                    style={{
                      strokeDasharray: 314.16,
                      strokeDashoffset: gaugeOffset_,
                      transition: 'stroke-dashoffset 1.5s ease',
                    }} />
                  {/* Cutoff dot at general draw level */}
                  <circle r="6" fill="#E63946" stroke="white" strokeWidth="2"
                    cx={dot_.x} cy={dot_.y} />
                </svg>
                <div className="cvp-gauge-overlay">
                  <div className="cvp-gauge-score">{total}</div>
                  <div className="cvp-gauge-label">CRS Score</div>
                </div>
              </div>

              {/* Breakdown list */}
              <div className="cvp-bd-wrap">
                <div className="cvp-bd-row"><span className="cvp-bd-label">Age ({profile.age})</span><span className="cvp-bd-pts">{bd.agePoints}</span></div>
                <div className="cvp-bd-row"><span className="cvp-bd-label">Education</span><span className="cvp-bd-pts">{bd.educationPoints}</span></div>
                <div className="cvp-bd-row"><span className="cvp-bd-label">First Language</span><span className="cvp-bd-pts">{bd.firstLanguagePoints}</span></div>
                {bd.secondLanguagePoints > 0 && (
                  <div className="cvp-bd-row"><span className="cvp-bd-label">Second Language</span><span className="cvp-bd-pts">{bd.secondLanguagePoints}</span></div>
                )}
                <div className="cvp-bd-row"><span className="cvp-bd-label">Canadian Experience</span><span className="cvp-bd-pts">{bd.canadianExpPoints}</span></div>
                {bd.spousePoints > 0 && (
                  <div className="cvp-bd-row"><span className="cvp-bd-label">Spouse Factors</span><span className="cvp-bd-pts">{bd.spousePoints}</span></div>
                )}
                <div className="cvp-bd-row sub-total"><span className="cvp-bd-label strong">Core / Human Capital (A)</span><span className="cvp-bd-pts">{bd.coreTotal}</span></div>

                <div className="cvp-bd-row" style={{ marginTop: '10px' }}><span className="cvp-bd-label">Education + Language</span><span className="cvp-bd-pts">{bd.eduLanguageTransfer}</span></div>
                <div className="cvp-bd-row"><span className="cvp-bd-label">Foreign Exp + Language</span><span className="cvp-bd-pts">{bd.foreignExpLanguageTransfer}</span></div>
                {bd.eduCanadianExpTransfer > 0 && (
                  <div className="cvp-bd-row"><span className="cvp-bd-label">Education + Canadian Exp</span><span className="cvp-bd-pts">{bd.eduCanadianExpTransfer}</span></div>
                )}
                {bd.foreignExpCanadianExpTransfer > 0 && (
                  <div className="cvp-bd-row"><span className="cvp-bd-label">Foreign Exp + Canadian Exp</span><span className="cvp-bd-pts">{bd.foreignExpCanadianExpTransfer}</span></div>
                )}
                <div className="cvp-bd-row sub-total"><span className="cvp-bd-label strong">Skill Transferability (C)</span><span className="cvp-bd-pts">{bd.transferTotal}</span></div>

                {bd.additionalTotal > 0 && (
                  <div className="cvp-bd-row sub-total"><span className="cvp-bd-label strong">Additional (D)</span><span className="cvp-bd-pts">{bd.additionalTotal}</span></div>
                )}

                <div className="cvp-bd-row grand">
                  <span className="cvp-bd-label strong">Grand Total CRS</span>
                  <span className="cvp-bd-pts teal">{total}</span>
                </div>
              </div>
            </div>

            {/* Stacked bar */}
            <div className="cvp-bar" style={{ marginTop: '24px' }}>
              <div className="cvp-bar-core" style={{ flex: bd.coreTotal }} />
              <div className="cvp-bar-transfer" style={{ flex: bd.transferTotal }} />
              {bd.additionalTotal > 0 && (
                <div className="cvp-bar-extra" style={{ flex: Math.min(bd.additionalTotal, 200) }} />
              )}
            </div>
            <div className="cvp-legend">
              <div className="cvp-legend-item"><div className="cvp-legend-dot cvp-bar-core" /><span>Core Factors (A)</span></div>
              <div className="cvp-legend-item"><div className="cvp-legend-dot cvp-bar-transfer" style={{ background: '#6C63FF' }} /><span>Transferability (C)</span></div>
              {bd.additionalTotal > 0 && (
                <div className="cvp-legend-item"><div className="cvp-legend-dot" style={{ background: 'var(--cvp-amber2)' }} /><span>Additional (D)</span></div>
              )}
            </div>

            <div className="cvp-verify">
              CRS Total verified: A[{bd.coreTotal}] + C[{bd.transferTotal}] + D[{bd.additionalTotal}] ={' '}
              <strong style={{ color: 'var(--cvp-teal)' }}>{total}</strong> · Cross-check complete.
            </div>
          </div>

          {/* ── Section 5: Pathway Ranking ─────────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Pathway Optimization Ranking</h2></div>
            <p className="cvp-section-sub">Composite evaluation combining nomination probability, CRS alignment, and execution speed.</p>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Pathway</th>
                  <th>Eligibility</th>
                  <th>CRS Requirement</th>
                  <th>Est. Processing</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {elig.fsw.eligible && (
                  <tr style={{ borderLeft: '3px solid var(--cvp-teal)', background: 'rgba(0,168,150,0.03)' }}>
                    <td><strong style={{ color: 'var(--cvp-teal)', fontSize: '1.05rem' }}>1</strong></td>
                    <td>Express Entry — Category-Based Selection</td>
                    <td><span className="cvp-pill eligible">ELIGIBLE</span></td>
                    <td>Live draws — see canada.ca</td>
                    <td>5–8 Months</td>
                    <td><span className="cvp-badge critical">CRITICAL PATH</span></td>
                  </tr>
                )}
                <tr>
                  <td><strong style={{ color: 'var(--cvp-teal)', fontSize: '1.05rem' }}>{elig.fsw.eligible ? 2 : 1}</strong></td>
                  <td>OINP Human Capital Priorities (Tech)</td>
                  <td><span className="cvp-pill likely">LIKELY ELIGIBLE</span></td>
                  <td>460+ (EE-Linked)</td>
                  <td>11–14 Months</td>
                  <td><span className="cvp-badge high">HIGH</span></td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--cvp-teal)', fontSize: '1.05rem' }}>{elig.fsw.eligible ? 3 : 2}</strong></td>
                  <td>BCPNP Tech (Enhanced)</td>
                  <td><span className="cvp-pill likely">LIKELY ELIGIBLE</span></td>
                  <td>90–115 SIRS</td>
                  <td>12–15 Months</td>
                  <td><span className="cvp-badge high">HIGH</span></td>
                </tr>
                {elig.cec.eligible && (
                  <tr>
                    <td><strong style={{ color: 'var(--cvp-teal)', fontSize: '1.05rem' }}>*</strong></td>
                    <td>Canadian Experience Class (CEC)</td>
                    <td><span className="cvp-pill eligible">ELIGIBLE</span></td>
                    <td>Live draws — see canada.ca</td>
                    <td>6–8 Months</td>
                    <td><span className="cvp-badge critical">CRITICAL PATH</span></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Section 6: Gap Analysis ────────────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Profile Deficit Mapping</h2></div>
            <p className="cvp-section-sub">Direct interventions required to clear programmatic thresholds.</p>
            <div className="cvp-gap-grid">
              {/* Gap: Foreign work experience vs 3yr threshold */}
              {Math.floor(fwYears) < 3 && (
                <div className="cvp-gap-card high">
                  <span className="cvp-badge high" style={{ marginBottom: '8px', display: 'inline-block' }}>HIGH PRIORITY</span>
                  <h4>Foreign Work Exp Maturity</h4>
                  <div className="cvp-gap-metric"><strong>Current:</strong> {fwYears} Years Eligible</div>
                  <div className="cvp-gap-metric"><strong>Impact:</strong> Missing transferability points unlocked at 3-year threshold (up to +25 pts).</div>
                  <div className="cvp-gap-action">
                    <strong>Remediation:</strong> Continue full-time employment in qualifying role for{' '}
                    {(3 - fwYears).toFixed(2)} more years to trigger CRS increase.
                  </div>
                </div>
              )}

              {/* Gap: Language improvement */}
              {(() => {
                const bands = result.firstLanguageBands
                const hasRoom = bands.listening < 10 || bands.reading < 10 || bands.writing < 10 || bands.speaking < 10
                if (!hasRoom) return null
                return (
                  <div className="cvp-gap-card medium">
                    <span className="cvp-badge medium" style={{ marginBottom: '8px', display: 'inline-block' }}>MEDIUM STRATEGIC</span>
                    <h4>Language Score Optimization</h4>
                    <div className="cvp-gap-metric"><strong>Current:</strong> CLB {clbDisplay(bands)}</div>
                    <div className="cvp-gap-metric"><strong>Impact:</strong> Improving all bands to CLB 10 adds up to {result.scenarios.find(s => s.name.includes('Language'))?.delta ?? 0} CRS points.</div>
                    <div className="cvp-gap-action">
                      <strong>Remediation:</strong> Retake test targeting CLB 10 in weaker bands (Writing, Speaking typically most improvable).
                    </div>
                  </div>
                )
              })()}

              {/* Gap: Draw cutoff context */}
              <div className="cvp-gap-card medium">
                <span className="cvp-badge medium" style={{ marginBottom: '8px', display: 'inline-block' }}>DRAW CONTEXT</span>
                <h4>General Draw Cutoff Delta</h4>
                <div className="cvp-gap-metric"><strong>Current CRS:</strong> {total}</div>
                <div className="cvp-gap-metric">
                  <strong>Gap to General Cutoff (~{generalCutoff}):</strong>{' '}
                  {scoreDelta > 0 ? `-${scoreDelta} points` : 'At or above cutoff'}
                </div>
                <div className="cvp-gap-action">
                  <strong>Note:</strong> Category-based draws (healthcare, STEM, trades, French) and PNP draws
                  operate at significantly lower cutoffs. Verify live draw history at canada.ca.
                </div>
              </div>
            </div>

            {/* Scenario Model */}
            <h3 className="cvp-h3" style={{ marginTop: '28px' }}>Scenario Model</h3>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Change Required</th>
                  <th className="right">Current CRS</th>
                  <th className="right">Projected CRS</th>
                  <th className="right">Delta</th>
                  <th>Competitive?</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map(s => (
                  <tr key={s.name}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>{s.change}</td>
                    <td className="right">{s.currentCrs}</td>
                    <td className="right" style={{ fontWeight: 700, color: 'var(--cvp-text)', background: 'rgba(0,168,150,0.04)' }}>
                      {s.projectedCrs}
                    </td>
                    <td className="right">
                      <span className={s.delta >= 600 ? 'cvp-delta-large' : 'cvp-delta-positive'}>+{s.delta}</span>
                    </td>
                    <td>
                      <span className="cvp-check">{s.competitive ? '✓' : '–'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Section 7: Strategic Recommendation (AI placeholder) ────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Strategic Recommendation</h2></div>
            <p className="cvp-section-sub">Tactical execution plan modeled against live draw patterns.</p>
            <div className="cvp-ai-placeholder">
              <strong>Claude AI narrative generation not yet connected.</strong><br />
              Add <code>ANTHROPIC_API_KEY</code> to your environment variables to unlock personalized strategic
              recommendations, action timelines, and executive summary narratives for this profile.
            </div>
          </div>

          {/* ── Section 8: Risk Assessment ─────────────────────────────── */}
          <div className="cvp-risk-panel">
            <h3>Risk and Disclosure Assessment</h3>
            <p className="cvp-risk-sub">Evaluated against IRPA inadmissibility parameters.</p>

            {/* Proof of funds */}
            <div className={`cvp-risk-card ${result.proofOfFundsSufficient ? 'green' : 'red'}`}>
              <h4>{result.proofOfFundsSufficient ? '✓ Funds Sufficiency' : '✗ Funds Insufficiency'}</h4>
              <p>
                {result.proofOfFundsSufficient
                  ? `Cleared. Applicant confirmed CAD $${profile.settlementFunds.toLocaleString()} available, exceeding the IRCC minimum of CAD $${result.proofOfFundsRequired.toLocaleString()} for a family of ${profile.familySize}.`
                  : `WARNING: CAD $${profile.settlementFunds.toLocaleString()} is below the IRCC minimum of CAD $${result.proofOfFundsRequired.toLocaleString()} for a family of ${profile.familySize}. Application cannot proceed without meeting this threshold. [VERIFY at canada.ca — proof of funds amounts are updated annually]`}
              </p>
            </div>

            {/* Criminal record */}
            <div className={`cvp-risk-card ${profile.hasCriminalRecord ? 'red' : 'green'}`}>
              <h4>{profile.hasCriminalRecord ? '⚠ Criminal Inadmissibility Risk (IRPA s.36)' : '✓ Criminal Inadmissibility (IRPA s.36)'}</h4>
              <p>
                {profile.hasCriminalRecord
                  ? 'WARNING: Criminal record declared. Admissibility analysis required — depending on the offence, nature, and elapsed time, rehabilitation or record suspension may be required. Seek legal opinion before proceeding.'
                  : 'Cleared. No criminal records declared.'}
              </p>
            </div>

            {/* Medical */}
            <div className={`cvp-risk-card ${profile.hasMedicalCondition ? 'amber' : 'green'}`}>
              <h4>{profile.hasMedicalCondition ? '⚠ Medical Inadmissibility (IRPA s.38)' : '✓ Medical Inadmissibility (IRPA s.38)'}</h4>
              <p>
                {profile.hasMedicalCondition
                  ? 'Medical conditions declared. IRCC will assess whether the condition might cause excessive demand on health or social services. Obtain a formal medical inadmissibility opinion from a qualified representative.'
                  : 'Cleared. No known medical conditions disclosed that would trigger excessive demand.'}
              </p>
            </div>

            {/* Prior refusals */}
            <div className={`cvp-risk-card ${profile.hasPriorRefusal ? 'amber' : 'green'}`}>
              <h4>{profile.hasPriorRefusal ? '⚠ Prior Refusal Implications' : '✓ Prior Refusal Implications'}</h4>
              <p>
                {profile.hasPriorRefusal
                  ? `Prior refusal(s) declared${profile.refusalDetails ? `: ${profile.refusalDetails}` : ''}. Must be disclosed on all IRCC applications. Refusal reason analysis required to ensure circumstances have changed materially.`
                  : 'Cleared. No visa refusals disclosed.'}
              </p>
            </div>
          </div>

          {/* ── Section 9: Cost Breakdown ───────────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>PR Process Cost Breakdown</h2></div>
            <p className="cvp-section-sub">Financial staging required (CAD). [VERIFY all fees at ircc.canada.ca before filing — fees updated without notice]</p>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>Category 1 — IRCC Government Fees</th>
                  <th style={{ textAlign: 'right' }}>Amount (CAD)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Express Entry Processing Fee — Principal Applicant</td><td className="pts">$950</td></tr>
                {profile.hasSpouse && <tr><td>Express Entry Processing Fee — Spouse</td><td className="pts">$950</td></tr>}
                <tr><td>Right of Permanent Residence Fee (RPRF)</td><td className="pts">$575</td></tr>
                {profile.hasSpouse && <tr><td>RPRF — Spouse</td><td className="pts">$575</td></tr>}
                <tr><td>Biometrics — Principal Applicant</td><td className="pts">$85</td></tr>
                {profile.hasSpouse && <tr><td>Biometrics — Spouse</td><td className="pts">$85</td></tr>}
              </tbody>
              <tfoot>
                <tr className="grand-total">
                  <td><strong>IRCC Fees Sub-total</strong></td>
                  <td className="pts-total">
                    ${(950 + 575 + 85 + (profile.hasSpouse ? 950 + 575 + 85 : 0)).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="cvp-cost-cats">
              <div className="cvp-cost-card gov">
                <div className="cvp-cost-cat-label">Gov Fees</div>
                <div className="cvp-cost-total">
                  CAD ${(1610 + (profile.hasSpouse ? 1610 : 0)).toLocaleString()}
                </div>
              </div>
              <div className="cvp-cost-card third">
                <div className="cvp-cost-cat-label">Third-Party (Med / Police)</div>
                <div className="cvp-cost-total">~CAD 400–600</div>
              </div>
              <div className="cvp-cost-card prof">
                <div className="cvp-cost-cat-label">Consultation Fees</div>
                <div className="cvp-cost-total">Assessed Post-Consultation</div>
              </div>
            </div>
            <div className="cvp-cost-notice">
              All IRCC government fees sourced from ircc.canada.ca and subject to change without notice.
              Third-party costs are approximate market-rate estimates only. Re-verify all fees immediately before filing.
            </div>
          </div>

          {/* ── Section 10: Provincial Nomination ──────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Provincial Nomination Alignment</h2></div>
            <p className="cvp-section-sub">Target jurisdictions evaluated against NOC {profile.nocCode} labour market demand.</p>
            <div className="cvp-prov-grid">
              <div className="cvp-prov-card rank1">
                <h4>Ontario (ON)</h4>
                <p className="cvp-prov-stream">OINP Human Capital Priorities</p>
                <span className="cvp-pill eligible">Enhanced (EE-Linked)</span>
                <div className="cvp-prov-divider" />
                <p className="cvp-prov-body">
                  Ontario's tech sector selects directly from the Express Entry pool. OINP regularly
                  draws at significantly lower CRS cutoffs for in-demand NOCs. Zero job offer required.
                </p>
                <div className="cvp-prov-condition">
                  <strong>Key Condition:</strong> Active Express Entry profile with Ontario as province of interest.
                </div>
              </div>
              <div className="cvp-prov-card rank2">
                <h4>British Columbia (BC)</h4>
                <p className="cvp-prov-stream">BCPNP Tech</p>
                <span className="cvp-pill likely">Enhanced (EE-Linked)</span>
                <div className="cvp-prov-divider" />
                <p className="cvp-prov-body">
                  BC PNP Tech conducts predictable weekly targeted draws for tech talent. Efficient
                  processing once invited. Among the fastest provincial routes for NOC TEER 0-1.
                </p>
                <div className="cvp-prov-condition">
                  <strong>Key Condition:</strong> Valid job offer from a BC-registered employer required.
                </div>
              </div>
              <div className="cvp-prov-card rank3">
                <h4>Alberta (AB)</h4>
                <p className="cvp-prov-stream">Alberta Express Entry Stream</p>
                <span className="cvp-pill borderline">Enhanced (EE-Linked)</span>
                <div className="cvp-prov-divider" />
                <p className="cvp-prov-body">
                  Alberta's Accelerated Tech Pathway directly selects from the Express Entry pool,
                  frequently below standard CRS cutoffs. High disposable income; zero provincial sales tax.
                </p>
                <div className="cvp-prov-condition">
                  <strong>Key Condition:</strong> Preference given to Alberta job offer or immediate family ties.
                </div>
              </div>
            </div>
            <div className="cvp-strategy primary" style={{ borderRadius: '8px' }}>
              <h4>Province Recommendation Summary</h4>
              <p>
                Ontario represents the highest-probability nomination pathway for qualifying tech profiles.
                OINP Human Capital Priorities requires zero job offer and systematically selects from the pool.
                Establish the Express Entry profile immediately to expose the applicant to OINP radar.
                Verify active OINP streams at ontario.ca/oinp before advising.
              </p>
            </div>
          </div>

          {/* ── Disclaimer ─────────────────────────────────────────────── */}
          <div className="cvp-disclaimer">
            <h4>Professional Disclaimer</h4>
            <p>
              This assessment has been prepared by Prashant Thirthingoth, a Visa Documentation Consultant
              with over 20 years of practitioner experience in the Canadian immigration documentation domain.
              It is provided for informational and documentation reference purposes only. Prashant Thirthingoth
              is not a Regulated Canadian Immigration Consultant (RCIC), lawyer, or authorized representative
              as defined under the Immigration and Refugee Protection Act (IRPA). Accordingly, nothing
              contained in this report constitutes immigration advice, legal advice, or representation of any kind.
            </p>
            <p style={{ marginTop: '10px' }}>
              All eligibility assessments, CRS score calculations, and program pathway observations are based
              on information retrieved exclusively from canada.ca as of {profile.reportDate} and are intended
              solely to assist the reader in understanding their documentation position. They do not represent
              a guaranteed outcome, a formal eligibility determination, or a strategic recommendation on which
              any application decision should be based.
            </p>
            <h4 style={{ marginTop: '16px' }}>Data Sources</h4>
            <div className="cvp-source-list">
              <div>CRS Grid: canada.ca/.../criteria-comprehensive-ranking-system/grid.html</div>
              <div>Express Entry Rounds: canada.ca/.../ministerial-instructions/express-entry-rounds.html</div>
              <div>Proof of Funds: canada.ca/.../express-entry/documents/proof-funds.html</div>
              <div>Government Fees: ircc.canada.ca/english/information/fees/fees.asp</div>
            </div>
            <div className="cvp-data-freshness">
              Data currency: {profile.reportDate}. Re-verify all figures if referenced more than 30 days after the above date.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
