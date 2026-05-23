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
  type StreamEligibility,
  type LanguageBands,
  type FswImprovementSuggestion,
} from '@/lib/crs-calculator'
import drawData from '@/lib/crs-draw-history.json'
import fundsData from '@/lib/proof-of-funds.json'
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
  if (/canadian experience class/i.test(type)) return 'CEC'
  if (/stem/i.test(type)) return 'STEM'
  if (/french/i.test(type)) return 'French'
  if (/health/i.test(type)) return 'Healthcare'
  if (/trade/i.test(type)) return 'Trades'
  if (/transport/i.test(type)) return 'Transport'
  if (/agri/i.test(type)) return 'Agriculture'
  if (/education/i.test(type)) return 'Education'
  if (/senior manager/i.test(type)) return 'Senior Mgr'
  if (/physician/i.test(type)) return 'Physicians'
  return type.length > 20 ? type.slice(0, 18) + '…' : type
}

// Which IRCC draw categories is this applicant eligible for, in priority order?
// CEC > French > Healthcare > Trades > Education > PNP (already nominated)
// Returns an array so the caller can pick the highest-priority match against actual draw data.
function getEligibleDrawCategories(
  profile: ApplicantProfile,
  elig: StreamEligibility,
  secondLangBands: LanguageBands | undefined
): string[] {
  const cats: string[] = []

  // CEC: ≥1 year of skilled Canadian work experience (uses pre-computed eligibility)
  if (elig.cec.eligible) cats.push('CEC')

  // French: took a French test (TEF or TCF) AND scored CLB ≥7 in all four abilities
  const isFrenchTest =
    profile.hasSecondLanguage &&
    (profile.secondLanguageScores?.testType === 'TEF' ||
      profile.secondLanguageScores?.testType === 'TCF')
  const frenchClbMet =
    secondLangBands != null &&
    secondLangBands.listening >= 7 && secondLangBands.reading >= 7 &&
    secondLangBands.writing >= 7 && secondLangBands.speaking >= 7
  if (isFrenchTest && frenchClbMet) cats.push('French')

  // Sector draws: detect by NOC 2021 5-digit code prefix (approved ranges)
  const nocNum = parseInt(profile.nocCode, 10)
  if (!isNaN(nocNum)) {
    if (nocNum >= 30010 && nocNum <= 35109) cats.push('Healthcare')  // Healthcare & Social Services
    if (
      (nocNum >= 72000 && nocNum <= 75199) ||  // Skilled trades
      (nocNum >= 82000 && nocNum <= 82099) ||  // Natural-resources trades
      (nocNum >= 92000 && nocNum <= 95199)     // Processing & utilities
    ) cats.push('Trades')
    if (nocNum >= 40000 && nocNum <= 41499) cats.push('Education')   // Education workers
  }

  // PNP: already holds a provincial nomination
  if (profile.hasProvincialNomination) cats.push('PNP')

  return cats
}

// ── Date-of-birth helpers ─────────────────────────────────────────────────────

function calcAgeFromDob(dob: string): number {
  const birth = new Date(dob + 'T00:00:00')
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return Math.max(0, age)
}

function getDobBounds(): { min: string; max: string } {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return {
    min: fmt(new Date(today.getFullYear() - 80, today.getMonth(), today.getDate())),
    max: fmt(new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())),
  }
}
const DOB_BOUNDS   = getDobBounds()
const DOB_YEAR_MAX = parseInt(DOB_BOUNDS.max.slice(0, 4))
const DOB_YEAR_MIN = parseInt(DOB_BOUNDS.min.slice(0, 4))
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function daysInMonth(month: string, year: string): number {
  if (!month || !year) return 31
  return new Date(parseInt(year), parseInt(month), 0).getDate()
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
  hasSiblingInCanada: false,
  hasJobOffer: 'none',
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: minSettlementFunds(1),
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
  refusalDetails: '',
  fundsSource: '',
}

// ── Family composition helpers ────────────────────────────────────────────────

// IRCC counts all family members for settlement funds, including non-accompanying spouse.
// isMarried = maritalStatus is 'married'; separated/single do not have a spouse to count.
function computeFamilySize(children: number, isMarried: boolean): number {
  return Math.max(1, 1 + (isMarried ? 1 : 0) + children)
}

function minSettlementFunds(familySize: number): number {
  const size = Math.max(1, familySize)
  const table = fundsData.byFamilySize as Record<string, number>
  if (size <= 7) return table[String(size)] ?? 0
  return (table['7'] ?? 40392) + (size - 7) * fundsData.extraPerMember
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssessmentTool() {
  const [view, setView]       = useState<'form' | 'result'>('form')
  const [profile, setProfile] = useState<ApplicantProfile>(INITIAL)
  const [result, setResult]   = useState<CrsResult | null>(null)
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married' | 'separated'>('single')
  const [numberOfChildren, setNumberOfChildren] = useState(0)
  const [dobDay, setDobDay]     = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear]   = useState('')
  const dateOfBirth = dobDay && dobMonth && dobYear
    ? `${dobYear}-${dobMonth}-${dobDay}` : ''

  // Lead capture state — shown in the result view
  const [leadName, setLeadName]       = useState('')
  const [leadEmail, setLeadEmail]     = useState('')
  const [leadConsent, setLeadConsent] = useState(false)
  const [leadStatus, setLeadStatus]   = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [resumeFile, setResumeFile]   = useState<File | null>(null)

  const firstClb  = scoresToClb(profile.firstLanguageScores)
  const secondClb = profile.hasSecondLanguage && profile.secondLanguageScores
    ? scoresToClb(profile.secondLanguageScores)
    : null
  const spouseClb = profile.hasSpouse && profile.spouseLanguageScores
    ? scoresToClb(profile.spouseLanguageScores)
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

  const setSpouseLangScore = useCallback(
    (field: keyof LanguageScores, value: string | number) => {
      setProfile(prev => ({
        ...prev,
        spouseLanguageScores: { ...(prev.spouseLanguageScores ?? DEFAULT_LANG), [field]: value },
      }))
    },
    [],
  )

  async function submitLead() {
    if (!leadName.trim() || !leadEmail.trim() || !leadConsent || !result) return
    setLeadStatus('submitting')
    try {
      const fd = new FormData()
      fd.append('name', leadName.trim())
      fd.append('email', leadEmail.trim())
      fd.append('crsScore', String(result.breakdown.total))
      fd.append('consentGiven', 'true')
      if (resumeFile) fd.append('resume', resumeFile)
      const res = await fetch('/api/assessment-lead', { method: 'POST', body: fd })
      setLeadStatus(res.ok ? 'success' : 'error')
    } catch {
      setLeadStatus('error')
    }
  }

  function runAssessment() {
    const r = calculate(profile)
    setResult(r)
    setView('result')
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  function resetAssessment() {
    setProfile({ ...INITIAL, reportDate: new Date().toISOString().split('T')[0] ?? '' })
    setMaritalStatus('single')
    setNumberOfChildren(0)
    setResult(null)
    setView('form')
    setResumeFile(null)
    setDobDay('')
    setDobMonth('')
    setDobYear('')
    setTimeout(() => window.scrollTo({ top: 0 }), 50)
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
                <label className="asx-label">Date of Birth</label>
                <div className="asx-dob-selects">
                  <select
                    className="asx-select"
                    value={dobDay}
                    onChange={e => {
                      const day = e.target.value
                      setDobDay(day)
                      if (day && dobMonth && dobYear) {
                        const age = calcAgeFromDob(`${dobYear}-${dobMonth}-${day}`)
                        set('age', age > 0 ? age : 0)
                      } else { set('age', 0) }
                    }}
                  >
                    <option value="">DD</option>
                    {Array.from({ length: daysInMonth(dobMonth, dobYear) }, (_, i) => {
                      const d = String(i + 1).padStart(2, '0')
                      return <option key={d} value={d}>{d}</option>
                    })}
                  </select>
                  <select
                    className="asx-select"
                    value={dobMonth}
                    onChange={e => {
                      const month = e.target.value
                      setDobMonth(month)
                      if (dobDay && month && dobYear) {
                        const age = calcAgeFromDob(`${dobYear}-${month}-${dobDay}`)
                        set('age', age > 0 ? age : 0)
                      } else { set('age', 0) }
                    }}
                  >
                    <option value="">MMM</option>
                    {MONTH_LABELS.map((m, i) => {
                      const val = String(i + 1).padStart(2, '0')
                      return <option key={val} value={val}>{m}</option>
                    })}
                  </select>
                  <select
                    className="asx-select"
                    value={dobYear}
                    onChange={e => {
                      const year = e.target.value
                      setDobYear(year)
                      if (dobDay && dobMonth && year) {
                        const age = calcAgeFromDob(`${year}-${dobMonth}-${dobDay}`)
                        set('age', age > 0 ? age : 0)
                      } else { set('age', 0) }
                    }}
                  >
                    <option value="">YYYY</option>
                    {Array.from({ length: DOB_YEAR_MAX - DOB_YEAR_MIN + 1 }, (_, i) => {
                      const y = DOB_YEAR_MAX - i
                      return <option key={y} value={String(y)}>{y}</option>
                    })}
                  </select>
                </div>
              </div>
              <div className="asx-field">
                <label className="asx-label">Age</label>
                <input
                  className="asx-input asx-input-readonly"
                  type="text"
                  value={dateOfBirth && profile.age > 0 ? `${profile.age} years` : ''}
                  readOnly
                  placeholder="Auto-filled from date of birth"
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
              <div className="asx-field asx-full">
                <label className="asx-label">Occupation / Job Title</label>
                <input
                  className="asx-input"
                  value={profile.occupationTitle}
                  onChange={e => set('occupationTitle', e.target.value)}
                  placeholder="e.g. Software Engineer, Registered Nurse, Electrician"
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

            {/* Section 6: Partner / Spouse */}
            <p className="asx-section-label">6 — Partner / Spouse</p>
            <div className="asx-field" style={{ marginBottom: '1rem' }}>
              <label className="asx-label">What is your marital status?</label>
              <div className="asx-radio-group">
                {([
                  ['single', 'Single'],
                  ['married', 'Married or common-law partner'],
                  ['separated', 'Separated, divorced, or widowed'],
                ] as const).map(([value, label]) => (
                  <label key={value} className="asx-radio-row">
                    <input
                      type="radio"
                      name="maritalStatus"
                      checked={maritalStatus === value}
                      onChange={() => {
                        const newStatus = value
                        setMaritalStatus(newStatus)
                        const resetChildren = newStatus === 'single'
                        const newChildren = resetChildren ? 0 : numberOfChildren
                        if (resetChildren) setNumberOfChildren(0)
                        const size = computeFamilySize(newChildren, newStatus === 'married')
                        if (newStatus !== 'married') {
                          setProfile(prev => ({
                            ...prev,
                            hasSpouse: false,
                            spouseEducation: undefined,
                            spouseLanguageScores: undefined,
                            spouseCanadianExperience: undefined,
                            familySize: size,
                            settlementFunds: minSettlementFunds(size),
                          }))
                        } else {
                          setProfile(prev => ({
                            ...prev,
                            familySize: size,
                            settlementFunds: minSettlementFunds(size),
                          }))
                        }
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            {(maritalStatus === 'married' || maritalStatus === 'separated') && (
              <div className="asx-field" style={{ marginBottom: '1rem', maxWidth: '220px' }}>
                <label className="asx-label">Number of Children</label>
                <select
                  className="asx-select"
                  value={numberOfChildren}
                  onChange={e => {
                    const children = parseInt(e.target.value) || 0
                    setNumberOfChildren(children)
                    const size = computeFamilySize(children, maritalStatus === 'married')
                    setProfile(prev => ({
                      ...prev,
                      familySize: size,
                      settlementFunds: minSettlementFunds(size),
                    }))
                  }}
                >
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? 'No children' : i === 1 ? '1 child' : `${i} children`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {maritalStatus === 'married' && (
            <label className="asx-checkbox-row" style={{ marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={profile.hasSpouse}
                onChange={e => {
                  const spouseComing = e.target.checked
                  const size = computeFamilySize(numberOfChildren, maritalStatus === 'married')
                  setProfile(prev => ({
                    ...prev,
                    hasSpouse: spouseComing,
                    familySize: size,
                    settlementFunds: minSettlementFunds(size),
                    ...(!spouseComing ? {
                      spouseEducation: undefined,
                      spouseLanguageScores: undefined,
                      spouseCanadianExperience: undefined,
                    } : {}),
                  }))
                }}
              />
              <span className="asx-checkbox-label">
                My spouse or common-law partner and children will come with me to Canada
              </span>
            </label>
            )}

            {maritalStatus === 'married' && profile.hasSpouse && (
              <>
                <div className="asx-grid-2">
                  <div className="asx-field">
                    <label className="asx-label">Partner&apos;s Highest Education</label>
                    <select
                      className="asx-select"
                      value={profile.spouseEducation ?? 'secondary'}
                      onChange={e => set('spouseEducation', e.target.value as EducationLevel)}
                    >
                      {(Object.entries(EDU_LABELS) as [EducationLevel, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="asx-field">
                    <label className="asx-label">Partner&apos;s Canadian Work Experience (years)</label>
                    <input
                      className="asx-input"
                      type="number"
                      step="0.25"
                      min={0}
                      value={profile.spouseCanadianExperience || ''}
                      onChange={e => set('spouseCanadianExperience', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <p className="asx-section-label" style={{ marginTop: '1.25rem' }}>
                  Partner&apos;s Language Test (if available)
                </p>
                <label className="asx-checkbox-row" style={{ marginBottom: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={!!profile.spouseLanguageScores}
                    onChange={e => {
                      setProfile(prev => ({
                        ...prev,
                        spouseLanguageScores: e.target.checked ? { ...DEFAULT_LANG } : undefined,
                      }))
                    }}
                  />
                  <span className="asx-checkbox-label">
                    Partner has a language test result (English or French)
                  </span>
                </label>

                {profile.spouseLanguageScores && (
                  <>
                    <div className="asx-grid-2" style={{ marginBottom: '0.75rem' }}>
                      <div className="asx-field asx-full">
                        <label className="asx-label">Test Type</label>
                        <select
                          className="asx-select"
                          value={profile.spouseLanguageScores.testType}
                          onChange={e => setSpouseLangScore('testType', e.target.value as LanguageScores['testType'])}
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
                            value={profile.spouseLanguageScores?.[skill] || ''}
                            onChange={e => setSpouseLangScore(skill, parseFloat(e.target.value) || 0)}
                          />
                          {spouseClb && (
                            <span
                              className="asx-clb-tag"
                              data-level={spouseClb[skill] >= 9 ? 'high' : spouseClb[skill] >= 7 ? 'mid' : 'low'}
                            >
                              CLB {spouseClb[skill]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Section 7: Additional Factors */}
            <p className="asx-section-label">7 — Additional Factors</p>
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
                <span className="asx-checkbox-label">Has a relative in Canada (citizen or PR) — for FSW adaptability</span>
              </label>
              <label className="asx-checkbox-row">
                <input
                  type="checkbox"
                  checked={profile.hasSiblingInCanada ?? false}
                  onChange={e => set('hasSiblingInCanada', e.target.checked)}
                />
                <span className="asx-checkbox-label">Has a brother or sister (sibling) in Canada who is a citizen or PR (+15 CRS)</span>
              </label>
            </div>

            <div className="asx-field" style={{ marginTop: '1.25rem' }}>
              <label className="asx-label">Valid job offer in Canada?</label>
              <div className="asx-radio-group">
                <label className="asx-radio-row">
                  <input
                    type="radio"
                    name="jobOffer"
                    checked={(profile.hasJobOffer ?? 'none') === 'none'}
                    onChange={() => set('hasJobOffer', 'none')}
                  />
                  <span>No job offer</span>
                </label>
                <label className="asx-radio-row">
                  <input
                    type="radio"
                    name="jobOffer"
                    checked={profile.hasJobOffer === 'lmia'}
                    onChange={() => set('hasJobOffer', 'lmia')}
                  />
                  <span>Yes — supported by an LMIA</span>
                </label>
                <label className="asx-radio-row">
                  <input
                    type="radio"
                    name="jobOffer"
                    checked={profile.hasJobOffer === 'exempt'}
                    onChange={() => set('hasJobOffer', 'exempt')}
                  />
                  <span>Yes — LMIA-exempt (e.g. intra-company transfer, CUSMA/USMCA)</span>
                </label>
              </div>
              <span className="asx-hint">Counts toward FSW 67-point adaptability grid (+5 pts)</span>
            </div>

            {/* Section 8: Risk & Disclosure */}
            <p className="asx-section-label">8 — Disclosure</p>
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
  // IRCC now runs category-specific draws only — no General draws since 2023.
  // Find the highest-priority draw category this applicant qualifies for, then compare
  // their CRS against the most recent draw in that category. If no category matches,
  // show a PNP pathway message instead of a misleading score comparison.
  const allDraws = drawData.draws as Draw[]
  const eligibleCategories = getEligibleDrawCategories(profile, elig, result.secondLanguageBands)
  const topCategory = eligibleCategories[0] ?? null
  const relevantDraw = topCategory
    ? (allDraws.find(d => shortType(d.type) === topCategory) ?? null)
    : null
  const cutoff = relevantDraw?.cutoffScore ?? null
  const gap = cutoff !== null ? total - cutoff : null
  const hasDrawData = allDraws.length > 0
  const pnpScore = total + 600

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
        <button className="asx-back-btn" onClick={resetAssessment}>
          New Assessment
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

              {!poolEligible ? (
                // Not pool-eligible: draw cutoffs and CRS comparisons are meaningless.
                // Show the FSW gap instead and redirect attention to the improvement section.
                <>
                  <p className="asx-card-sub">
                    Draw cutoffs and CRS comparisons do not apply yet — you must first clear
                    the FSW 67-point minimum to enter the Express Entry pool.
                  </p>
                  <div className="asx-gap-row asx-gap-below">
                    <div className="asx-gap-score">
                      <span className="asx-gap-label">Your FSW Score</span>
                      <span className="asx-gap-val">{fsw.total}</span>
                      <span className="asx-gap-meta">out of 100</span>
                    </div>
                    <div className="asx-gap-vs">
                      <span className="asx-gap-your-label">Minimum Required</span>
                      <span className="asx-gap-your-val">67</span>
                      <span className="asx-gap-diff">{fsw.total - 67} pts below threshold</span>
                    </div>
                  </div>
                  <p className="asx-draws-source">
                    Once you reach 67 FSW points, your CRS score and draw cutoff comparisons
                    will appear here. See the <strong>How to Qualify for Express Entry</strong>{' '}
                    section below for the highest-impact steps to close this gap.
                  </p>
                </>
              ) : (
                // Pool-eligible: show normal draw cutoff comparison
                <>
                  <p className="asx-card-sub">
                    Your score compared to recent Express Entry draws from canada.ca.
                  </p>

                  {relevantDraw ? (
                    <div className={`asx-gap-row${gap !== null && gap >= 0 ? ' asx-gap-above' : ' asx-gap-below'}`}>
                      <div className="asx-gap-score">
                        <span className="asx-gap-label">Most Recent {topCategory} Draw</span>
                        <span className="asx-gap-val">{relevantDraw.cutoffScore}</span>
                        <span className="asx-gap-meta">{fmtDate(relevantDraw.date)}</span>
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
                  ) : (
                    <div className="asx-no-eligible-state">
                      <p className="asx-no-eligible-heading">No active draw category matched</p>
                      <p className="asx-no-eligible-body">
                        Your profile does not currently match an active draw category. Your primary
                        pathway to Canadian PR is the Provincial Nominee Program (PNP) — enter the
                        Express Entry pool and watch for Notifications of Interest from provinces like
                        OINP, AINP, and others. Once nominated, your effective CRS becomes{' '}
                        <strong>{pnpScore}</strong>, placing you well above PNP draw cutoffs.
                      </p>
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
                </>
              )}
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
            <p className="asx-fsw-verdict" data-pass={fsw.eligible ? 'yes' : 'no'}>
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

          {/* ── Improvement Guidance ─────────────────────────────── */}
          {/* Case A: Not pool-eligible — show how to reach the FSW 67-point minimum */}
          {!result.eligibility.expressEntryPool.eligible && result.fswImprovements.length > 0 && (
            <div className="asx-card">
              <h2 className="asx-card-title">How to Qualify for Express Entry</h2>
              <p className="asx-card-sub">
                Your FSW selection factor score is <strong>{result.fswGrid.total}/100</strong>.
                You need at least <strong>67 points</strong> to submit an Express Entry profile
                — your CRS score is not relevant until this threshold is cleared.
                The steps below show how to close the gap.
              </p>
              {result.fswImprovements.every((s: FswImprovementSuggestion) => !s.wouldQualify) && (
                <p className="asx-scenarios-note" style={{ marginBottom: '1rem' }}>
                  No single change below will reach 67 on its own — you will need to combine
                  two or more of these improvements.
                </p>
              )}
              <div className="asx-scenarios">
                {result.fswImprovements.map((s: FswImprovementSuggestion, i: number) => {
                  const label = String.fromCharCode(65 + i)
                  return (
                    <div key={i} className="asx-scenario-row">
                      <div className="asx-scenario-delta positive">+{s.pointsGained}</div>
                      <div className="asx-scenario-info">
                        <p className="asx-scenario-name">{label}: {s.name}</p>
                        <p className="asx-scenario-desc">{s.action}</p>
                      </div>
                      <div className="asx-scenario-projected">
                        <span className="asx-projected-label">FSW Score</span>
                        <span className="asx-projected-val">{s.projectedFswTotal}</span>
                        <span
                          className="asx-competitive-tag"
                          data-meets={s.wouldQualify ? 'yes' : 'no'}
                        >
                          {s.wouldQualify ? '▲ Qualifies' : '▼ Below 67'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="asx-scenarios-note">
                FSW scoring rules sourced from{' '}
                <a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers/six-selection-factors-federal-skilled-workers.html"
                  target="_blank" rel="noopener noreferrer">canada.ca</a>.
                Verify current requirements before acting on any scenario.
              </p>
            </div>
          )}

          {/* Case B: Pool-eligible — show CRS improvement scenarios */}
          {result.eligibility.expressEntryPool.eligible && scenarios.length > 0 && (
            <div className="asx-card">
              <h2 className="asx-card-title">How to Improve Your Score</h2>
              <p className="asx-card-sub">
                {relevantDraw !== null
                  ? `Projections compared against the most recent ${topCategory} draw cutoff of ${cutoff} pts (${fmtDate(relevantDraw.date)}).`
                  : 'The highest-impact changes you can make to your CRS score.'}
              </p>
              <div className="asx-scenarios">
                {scenarios.map((s, i) => {
                  const meetsReal = cutoff !== null
                    ? s.projectedCrs >= cutoff
                    : s.competitive
                  const label = String.fromCharCode(65 + i)
                  return (
                    <div key={i} className="asx-scenario-row">
                      <div className={`asx-scenario-delta${s.delta > 0 ? ' positive' : ''}`}>
                        {s.delta > 0 ? '+' : ''}{s.delta}
                      </div>
                      <div className="asx-scenario-info">
                        <p className="asx-scenario-name">{label}: {s.name}</p>
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
              Get Reviewed →
            </Link>
            <p className="asx-cta-sub">
              Pre-Application Eligibility Assessment · From $99 / ₹4,999
            </p>
          </div>

          {/* ── Lead Capture ─────────────────────────────────────── */}
          <div className="asx-lead-capture">
            {leadStatus === 'success' ? (
              <div className="asx-lead-success">
                <span className="asx-lead-success-icon">✓</span>
                <div>
                  <p className="asx-lead-success-title">We&apos;ll be in touch within 24 hours.</p>
                  <p className="asx-lead-success-sub">
                    Prash will review your CRS score and profile personally.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="asx-lead-eyebrow">Get a Personalised Roadmap</p>
                <h3 className="asx-lead-headline">
                  Leave your details — Prash will review your profile personally.
                </h3>
                <p className="asx-lead-sub">
                  No templates. No automated responses. Your CRS score and profile reviewed by
                  a consultant with 20+ years of Canadian immigration documentation experience.
                  Responds within 24 hours.
                </p>
                <div className="asx-lead-fields">
                  <div className="asx-field">
                    <label className="asx-label" htmlFor="lead-name">Your name</label>
                    <input
                      id="lead-name"
                      className="asx-input"
                      type="text"
                      placeholder="Full name"
                      value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                      disabled={leadStatus === 'submitting'}
                      autoComplete="name"
                    />
                  </div>
                  <div className="asx-field">
                    <label className="asx-label" htmlFor="lead-email">Email address</label>
                    <input
                      id="lead-email"
                      className="asx-input"
                      type="email"
                      placeholder="you@example.com"
                      value={leadEmail}
                      onChange={e => setLeadEmail(e.target.value)}
                      disabled={leadStatus === 'submitting'}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="asx-field" style={{ marginTop: '0.75rem' }}>
                  <label className="asx-label" htmlFor="lead-resume">Resume / CV (Optional)</label>
                  <label
                    htmlFor="lead-resume"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      border: '1.5px solid var(--sand)',
                      padding: '0.6rem 0.85rem',
                      background: 'var(--pearl)',
                      cursor: leadStatus === 'submitting' ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      opacity: leadStatus === 'submitting' ? 0.45 : 1,
                    }}
                  >
                    <span style={{
                      background: 'var(--prussian)',
                      color: 'var(--pearl)',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.76rem',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}>
                      Choose file
                    </span>
                    <span style={{
                      color: resumeFile ? 'var(--ink)' : '#999',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.88rem',
                    }}>
                      {resumeFile ? resumeFile.name : 'No file chosen'}
                    </span>
                    <input
                      id="lead-resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={e => setResumeFile(e.target.files?.[0] ?? null)}
                      disabled={leadStatus === 'submitting'}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span className="asx-hint">PDF or Word document · Max 5 MB</span>
                </div>
                <label className="asx-checkbox-row" style={{ marginTop: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={leadConsent}
                    onChange={e => setLeadConsent(e.target.checked)}
                    disabled={leadStatus === 'submitting'}
                  />
                  <span className="asx-checkbox-label">
                    I consent to Visa Forte contacting me about my immigration assessment.
                  </span>
                </label>
                {leadStatus === 'error' && (
                  <p className="asx-lead-error" role="alert">
                    Your details could not be submitted. Check your connection and try again, or
                    email <a href="mailto:prashant@visaforte.com" style={{ color: 'inherit', textDecoration: 'underline' }}>prashant@visaforte.com</a> directly with your results.
                  </p>
                )}
                <button
                  className="asx-lead-btn"
                  onClick={submitLead}
                  disabled={
                    !leadName.trim() || !leadEmail.trim() || !leadConsent ||
                    leadStatus === 'submitting'
                  }
                >
                  {leadStatus === 'submitting' ? 'Sending…' : 'Send My Results →'}
                </button>
              </>
            )}
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
              All CRS scoring reflects current IRCC rules as published at canada.ca. Visa Forte
              specialises in documentation consulting and eligibility guidance — helping applicants
              prepare complete, accurate profiles and understand their pathways with clarity.
              Scoring methodology is updated whenever IRCC announces regulatory changes; verify
              the latest rules before acting on any assessment.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
