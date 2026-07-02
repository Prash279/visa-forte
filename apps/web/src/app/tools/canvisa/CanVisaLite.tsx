'use client'

import { useState } from 'react'
import {
  calculate,
  scoresToClb,
  type ApplicantProfile,
  type LanguageScores,
  type CrsResult,
  type EducationLevel,
} from '@/lib/crs-calculator'
import {
  getWeaknesses,
  getEligibleDrawCategories,
  getBestPathway,
  type WeaknessChip,
  type BestPathway,
} from '@/lib/canvisa-lite-logic'
import fundsData from '@/lib/proof-of-funds.json'
import './canvisa-lite.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const EDU_LABELS: Record<EducationLevel, string> = {
  less_than_secondary:      'Less than Secondary School',
  secondary:                'Secondary School Diploma',
  one_year_post_secondary:  '1-Year Post-Secondary',
  two_year_post_secondary:  '2-Year Post-Secondary',
  bachelors:                "Bachelor's Degree",
  two_or_more_degrees:      '2+ Post-Secondary (one 3+ yr)',
  masters:                  "Master's Degree / Professional",
  doctoral:                 'Doctoral Degree (PhD)',
}

const DEFAULT_LANG: LanguageScores = { testType: 'IELTS_GT', listening: 0, reading: 0, writing: 0, speaking: 0 }

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function minFunds(familySize: number): number {
  const table = fundsData.byFamilySize as Record<string, number>
  if (familySize <= 7) return table[String(familySize)] ?? 0
  return (table['7'] ?? 0) + (familySize - 7) * fundsData.extraPerMember
}

function computeFamilySize(children: number, hasSpouse: boolean): number {
  return Math.max(1, 1 + (hasSpouse ? 1 : 0) + children)
}

function calcAgeFromDob(dob: string): number {
  const birth = new Date(dob + 'T00:00:00')
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return Math.max(0, age)
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const INITIAL: ApplicantProfile = {
  name: '', age: 30, nocCode: '', nocTeer: 1, occupationTitle: '',
  countryOfCitizenship: '', countryOfResidence: '',
  reportDate: new Date().toISOString().split('T')[0] ?? '',
  education: 'bachelors', hasEca: true,
  firstLanguageScores: { ...DEFAULT_LANG },
  hasSecondLanguage: false, secondLanguageScores: { ...DEFAULT_LANG },
  foreignWorkExperienceYears: 0, canadianWorkExperienceYears: 0,
  hasSpouse: false, hasProvincialNomination: false, hasSiblingInCanada: false,
  hasJobOffer: 'none', hasCanadianEducation: false, hasFamilyInCanada: false,
  settlementFunds: minFunds(1), familySize: 1,
  hasCriminalRecord: false, hasMedicalCondition: false, hasPriorRefusal: false,
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LangScoreInputs({
  scores,
  onChange,
  prefix,
}: {
  scores: LanguageScores
  onChange: (s: LanguageScores) => void
  prefix: string
}) {
  function setScore(key: keyof Omit<LanguageScores, 'testType'>, val: string) {
    onChange({ ...scores, [key]: parseFloat(val) || 0 })
  }
  return (
    <div className="cvl-lang-block">
      <div className="cvl-field-row">
        <label htmlFor={`${prefix}-type`} className="cvl-label">Test Type</label>
        <select
          id={`${prefix}-type`}
          className="cvl-select"
          value={scores.testType}
          onChange={e => onChange({ ...scores, testType: e.target.value as LanguageScores['testType'] })}
        >
          <option value="IELTS_GT">IELTS (General Training)</option>
          <option value="IELTS_Academic">IELTS (Academic)</option>
          <option value="CELPIP">CELPIP-General</option>
          <option value="TEF">TEF Canada</option>
          <option value="TCF">TCF Canada</option>
        </select>
      </div>
      <div className="cvl-lang-scores">
        {(['listening','reading','writing','speaking'] as const).map(ab => (
          <div key={ab} className="cvl-lang-score-field">
            <label htmlFor={`${prefix}-${ab}`} className="cvl-label cvl-label-sm">
              {ab.charAt(0).toUpperCase() + ab.slice(1)}
            </label>
            <input
              id={`${prefix}-${ab}`}
              className="cvl-input cvl-input-sm"
              type="number"
              min="0"
              step="0.5"
              value={scores[ab] || ''}
              placeholder="0"
              onChange={e => setScore(ab, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Result sub-components ─────────────────────────────────────────────────────

function ScoreHero({ score, eligible }: { score: number; eligible: boolean }) {
  return (
    <div className="cvl-score-hero">
      <div className="cvl-score-number">{score}</div>
      <div className="cvl-score-label">CRS Score</div>
      <div className={`cvl-pool-badge ${eligible ? 'eligible' : 'not-eligible'}`}>
        {eligible ? 'Pool Eligible' : 'Not Yet Pool Eligible'}
      </div>
    </div>
  )
}

function WeaknessChips({ chips }: { chips: WeaknessChip[] }) {
  if (chips.length === 0) return null
  return (
    <div className="cvl-weaknesses">
      <p className="cvl-section-eyebrow">Top Improvement Opportunities</p>
      <div className="cvl-chips">
        {chips.map((c, i) => (
          <div key={i} className={`cvl-chip ${i === 0 ? 'cvl-chip-primary' : 'cvl-chip-secondary'}`}>
            <span className="cvl-chip-label">{c.label}</span>
            <span className="cvl-chip-gain">+{c.pointGain} pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PathwayCard({ pathway }: { pathway: BestPathway }) {
  const gapText = pathway.gap >= 0
    ? `You are ${pathway.gap} pts above the last cutoff`
    : `You are ${Math.abs(pathway.gap)} pts below the last cutoff`

  return (
    <div className="cvl-pathway-card">
      <p className="cvl-section-eyebrow">Best Pathway</p>
      <div className="cvl-pathway-name">{pathway.category}</div>
      <div className="cvl-pathway-row">
        <span className="cvl-pathway-key">Last cutoff</span>
        <span className="cvl-pathway-val">{pathway.cutoffScore}</span>
      </div>
      <div className="cvl-pathway-row">
        <span className="cvl-pathway-key">Draw date</span>
        <span className="cvl-pathway-val">{fmtDate(pathway.drawDate)}</span>
      </div>
      <div className={`cvl-pathway-gap ${pathway.gap >= 0 ? 'above' : 'below'}`}>
        {gapText}
      </div>
    </div>
  )
}

function HandoffCopy({ pathway }: { pathway: BestPathway }) {
  if (pathway.gap >= 0) return null
  return (
    <p className="cvl-handoff">
      Your score is {Math.abs(pathway.gap)} pts below the last {pathway.category} draw cutoff.{' '}
      <a href="/tools/crs-modeller" className="cvl-handoff-link">
        See what moves your score fastest →
      </a>
    </p>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CanVisaLite() {
  const [view, setView] = useState<'form' | 'result'>('form')
  const [profile, setProfile] = useState<ApplicantProfile>(INITIAL)
  const [result, setResult] = useState<CrsResult | null>(null)
  const [weaknesses, setWeaknesses] = useState<WeaknessChip[]>([])
  const [pathway, setPathway] = useState<BestPathway | null>(null)
  const [eligibleCategories, setEligibleCategories] = useState<string[]>([])

  // DOB fields
  const [dobDay, setDobDay]     = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear]   = useState('')
  const dateOfBirth = dobDay && dobMonth && dobYear ? `${dobYear}-${dobMonth.padStart(2,'0')}-${dobDay.padStart(2,'0')}` : ''

  // Spouse language
  const [spouseLang, setSpouseLang] = useState<LanguageScores>({ ...DEFAULT_LANG })

  // Marital + children
  const [numberOfChildren, setNumberOfChildren] = useState(0)

  // Lead capture
  const [leadName, setLeadName]           = useState('')
  const [leadEmail, setLeadEmail]         = useState('')
  const [wantsEmail, setWantsEmail]       = useState(true)
  const [wantsAlert, setWantsAlert]       = useState(true)
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadSuccess, setLeadSuccess]     = useState(false)
  const [leadError, setLeadError]         = useState('')

  function setP<K extends keyof ApplicantProfile>(key: K, val: ApplicantProfile[K]) {
    setProfile(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const profileToCalc: ApplicantProfile = {
      ...profile,
      age: dateOfBirth ? calcAgeFromDob(dateOfBirth) : profile.age,
      spouseLanguageScores: profile.hasSpouse ? spouseLang : undefined,
    }

    const res = calculate(profileToCalc)
    const secondClb = profile.hasSecondLanguage && profile.secondLanguageScores
      ? scoresToClb(profile.secondLanguageScores)
      : undefined
    const cats = getEligibleDrawCategories(profileToCalc, res.eligibility, secondClb)
    const pw   = getBestPathway(res.breakdown.total, cats)
    const wk   = getWeaknesses(res)

    setResult(res)
    setWeaknesses(wk)
    setPathway(pw)
    setEligibleCategories(cats)
    setLeadName(profileToCalc.name)
    setView('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleLeadCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!result) return
    if (!wantsEmail && !wantsAlert) return

    setLeadSubmitting(true)
    setLeadError('')

    try {
      const res = await fetch('/api/tools/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          crsScore: result.breakdown.total,
          eeCategory: eligibleCategories[0] ?? 'General EE Pool',
          toolName: 'canvisa-lite',
          wantsDrawAlert: wantsAlert,
          weaknesses,
          bestPathway: pathway ? {
            category: pathway.category,
            cutoffScore: pathway.cutoffScore,
            gap: pathway.gap,
          } : undefined,
        }),
      })
      if (res.ok) {
        setLeadSuccess(true)
      } else {
        setLeadError('Something went wrong. Please try again.')
      }
    } catch {
      setLeadError('Something went wrong. Please try again.')
    } finally {
      setLeadSubmitting(false)
    }
  }

  // ── Form view ───────────────────────────────────────────────────────────────

  if (view === 'form') {
    const spouseChecked = profile.hasSpouse
    const familySize = computeFamilySize(numberOfChildren, spouseChecked)

    return (
      <form className="cvl-form" onSubmit={handleSubmit} noValidate>

        {/* Section: Personal */}
        <div className="cvl-section">
          <h2 className="cvl-section-title">Your Profile</h2>
          <div className="cvl-grid-2">
            <div className="cvl-field">
              <label className="cvl-label" htmlFor="name">Full Name</label>
              <input id="name" className="cvl-input" type="text" value={profile.name}
                onChange={e => setP('name', e.target.value)} placeholder="Your name" />
            </div>
            <div className="cvl-field">
              <label className="cvl-label">Date of Birth</label>
              <div className="cvl-dob-row">
                <select className="cvl-select" value={dobDay} onChange={e => setDobDay(e.target.value)}>
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
                <select className="cvl-select" value={dobMonth} onChange={e => setDobMonth(e.target.value)}>
                  <option value="">Month</option>
                  {MONTH_LABELS.map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                  ))}
                </select>
                <input className="cvl-input cvl-input-year" type="number" placeholder="Year"
                  min={1944} max={2006} value={dobYear} onChange={e => setDobYear(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="cvl-grid-2">
            <div className="cvl-field">
              <label className="cvl-label" htmlFor="country-citizenship">Country of Citizenship</label>
              <input id="country-citizenship" className="cvl-input" type="text"
                value={profile.countryOfCitizenship} onChange={e => setP('countryOfCitizenship', e.target.value)}
                placeholder="e.g. India" />
            </div>
            <div className="cvl-field">
              <label className="cvl-label" htmlFor="country-residence">Country of Residence</label>
              <input id="country-residence" className="cvl-input" type="text"
                value={profile.countryOfResidence} onChange={e => setP('countryOfResidence', e.target.value)}
                placeholder="e.g. India" />
            </div>
          </div>
          <div className="cvl-grid-2">
            <div className="cvl-field">
              <label className="cvl-label" htmlFor="noc">NOC Code (2021 5-digit)</label>
              <input id="noc" className="cvl-input" type="text" maxLength={5}
                value={profile.nocCode} onChange={e => setP('nocCode', e.target.value)}
                placeholder="e.g. 21232" />
            </div>
            <div className="cvl-field">
              <label className="cvl-label" htmlFor="teer">NOC TEER Level</label>
              <select id="teer" className="cvl-select" value={profile.nocTeer}
                onChange={e => setP('nocTeer', Number(e.target.value) as ApplicantProfile['nocTeer'])}>
                <option value={0}>TEER 0 — Management</option>
                <option value={1}>TEER 1 — University degree</option>
                <option value={2}>TEER 2 — College / apprenticeship 2+ yr</option>
                <option value={3}>TEER 3 — College / apprenticeship &lt; 2 yr</option>
                <option value={4}>TEER 4 — High school</option>
                <option value={5}>TEER 5 — Short-term training</option>
              </select>
            </div>
          </div>
          <div className="cvl-field">
            <label className="cvl-label" htmlFor="occ-title">Occupation Title</label>
            <input id="occ-title" className="cvl-input" type="text"
              value={profile.occupationTitle} onChange={e => setP('occupationTitle', e.target.value)}
              placeholder="e.g. Software Developer" />
          </div>
        </div>

        {/* Section: Education */}
        <div className="cvl-section">
          <h2 className="cvl-section-title">Education</h2>
          <div className="cvl-field">
            <label className="cvl-label" htmlFor="education">Highest Level of Education</label>
            <select id="education" className="cvl-select"
              value={profile.education}
              onChange={e => setP('education', e.target.value as EducationLevel)}>
              {(Object.entries(EDU_LABELS) as [EducationLevel, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <label className="cvl-checkbox-row">
            <input type="checkbox" checked={profile.hasEca}
              onChange={e => setP('hasEca', e.target.checked)} />
            <span>Educational Credential Assessment (ECA) completed</span>
          </label>
        </div>

        {/* Section: First Language */}
        <div className="cvl-section">
          <h2 className="cvl-section-title">First Official Language</h2>
          <LangScoreInputs scores={profile.firstLanguageScores} prefix="first"
            onChange={s => setP('firstLanguageScores', s)} />
        </div>

        {/* Section: Second Language */}
        <div className="cvl-section">
          <h2 className="cvl-section-title">Second Official Language</h2>
          <label className="cvl-checkbox-row">
            <input type="checkbox" checked={profile.hasSecondLanguage}
              onChange={e => setP('hasSecondLanguage', e.target.checked)} />
            <span>I have taken a second language test (TEF/TCF for French or IELTS/CELPIP for English)</span>
          </label>
          {profile.hasSecondLanguage && (
            <div className="cvl-indent">
              <LangScoreInputs scores={profile.secondLanguageScores ?? DEFAULT_LANG} prefix="second"
                onChange={s => setP('secondLanguageScores', s)} />
            </div>
          )}
        </div>

        {/* Section: Work Experience */}
        <div className="cvl-section">
          <h2 className="cvl-section-title">Work Experience</h2>
          <div className="cvl-grid-2">
            <div className="cvl-field">
              <label className="cvl-label" htmlFor="cwe">Canadian Work Experience (years)</label>
              <select id="cwe" className="cvl-select"
                value={profile.canadianWorkExperienceYears}
                onChange={e => {
                  const v = Number(e.target.value)
                  setP('canadianWorkExperienceYears', v)
                  const fs = computeFamilySize(numberOfChildren, profile.hasSpouse)
                  setP('settlementFunds', minFunds(fs))
                }}>
                <option value={0}>None</option>
                <option value={1}>1 year</option>
                <option value={2}>2 years</option>
                <option value={3}>3 years</option>
                <option value={4}>4 years</option>
                <option value={5}>5+ years</option>
              </select>
            </div>
            <div className="cvl-field">
              <label className="cvl-label" htmlFor="fwe">Foreign Work Experience (years)</label>
              <select id="fwe" className="cvl-select"
                value={profile.foreignWorkExperienceYears}
                onChange={e => setP('foreignWorkExperienceYears', Number(e.target.value))}>
                <option value={0}>None</option>
                <option value={1}>1 year</option>
                <option value={2}>2 years</option>
                <option value={3}>3 years</option>
                <option value={4}>4 years</option>
                <option value={5}>5+ years</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section: Personal Situation */}
        <div className="cvl-section">
          <h2 className="cvl-section-title">Personal Situation</h2>
          <label className="cvl-checkbox-row">
            <input type="checkbox" checked={spouseChecked}
              onChange={e => {
                setP('hasSpouse', e.target.checked)
                const fs = computeFamilySize(numberOfChildren, e.target.checked)
                setP('familySize', fs)
                setP('settlementFunds', minFunds(fs))
              }} />
            <span>I have a spouse or common-law partner who will accompany me to Canada</span>
          </label>

          {spouseChecked && (
            <div className="cvl-indent cvl-spouse-block">
              <div className="cvl-field">
                <label className="cvl-label" htmlFor="spouse-edu">Spouse's Highest Education</label>
                <select id="spouse-edu" className="cvl-select"
                  value={profile.spouseEducation ?? 'secondary'}
                  onChange={e => setP('spouseEducation', e.target.value as EducationLevel)}>
                  {(Object.entries(EDU_LABELS) as [EducationLevel, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="cvl-field">
                <label className="cvl-label">Spouse's Language Test</label>
                <LangScoreInputs scores={spouseLang} prefix="spouse" onChange={setSpouseLang} />
              </div>
              <div className="cvl-field">
                <label className="cvl-label" htmlFor="spouse-cwe">Spouse's Canadian Work Experience (years)</label>
                <select id="spouse-cwe" className="cvl-select"
                  value={profile.spouseCanadianExperience ?? 0}
                  onChange={e => setP('spouseCanadianExperience', Number(e.target.value))}>
                  <option value={0}>None</option>
                  <option value={1}>1 year</option>
                  <option value={2}>2 years</option>
                  <option value={3}>3 years</option>
                  <option value={4}>4 years</option>
                  <option value={5}>5+ years</option>
                </select>
              </div>
            </div>
          )}

          <div className="cvl-field">
            <label className="cvl-label" htmlFor="children">Number of Dependent Children</label>
            <select id="children" className="cvl-select" value={numberOfChildren}
              onChange={e => {
                const n = Number(e.target.value)
                setNumberOfChildren(n)
                const fs = computeFamilySize(n, spouseChecked)
                setP('familySize', fs)
                setP('settlementFunds', minFunds(fs))
              }}>
              {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <label className="cvl-checkbox-row">
            <input type="checkbox" checked={profile.hasProvincialNomination}
              onChange={e => setP('hasProvincialNomination', e.target.checked)} />
            <span>I have a valid Provincial Nomination Certificate (PNP)</span>
          </label>
          <label className="cvl-checkbox-row">
            <input type="checkbox" checked={profile.hasSiblingInCanada ?? false}
              onChange={e => setP('hasSiblingInCanada', e.target.checked)} />
            <span>I have a Canadian citizen or PR sibling in Canada</span>
          </label>
          <label className="cvl-checkbox-row">
            <input type="checkbox" checked={profile.hasCanadianEducation}
              onChange={e => setP('hasCanadianEducation', e.target.checked)} />
            <span>I completed a post-secondary credential in Canada</span>
          </label>
        </div>

        {/* Section: Settlement Funds */}
        <div className="cvl-section">
          <h2 className="cvl-section-title">Settlement Funds</h2>
          <p className="cvl-section-sub">
            Family size: {familySize} person{familySize !== 1 ? 's' : ''}.
            Minimum required: CAD {minFunds(familySize).toLocaleString()}.
          </p>
          <div className="cvl-field">
            <label className="cvl-label" htmlFor="funds">Available Funds (CAD)</label>
            <input id="funds" className="cvl-input" type="number" min={0}
              value={profile.settlementFunds || ''}
              onChange={e => setP('settlementFunds', Number(e.target.value))}
              placeholder={String(minFunds(familySize))} />
          </div>
        </div>

        <div className="cvl-submit-row">
          <button type="submit" className="cvl-btn-primary">
            Check My Score →
          </button>
        </div>
      </form>
    )
  }

  // ── Result view ─────────────────────────────────────────────────────────────

  if (!result) return null

  const eligible = result.eligibility.expressEntryPool.eligible
  const category = eligibleCategories[0] ?? 'Express Entry Pool'

  return (
    <div className="cvl-result">

      <ScoreHero score={result.breakdown.total} eligible={eligible} />

      {weaknesses.length > 0 && <WeaknessChips chips={weaknesses} />}

      {pathway && <PathwayCard pathway={pathway} />}

      {pathway && <HandoffCopy pathway={pathway} />}

      {/* Lead capture */}
      <div className="cvl-lead-card">
        {leadSuccess ? (
          <p className="cvl-lead-success">Check your inbox ✓</p>
        ) : (
          <>
            <h3 className="cvl-lead-heading">Want a copy in your inbox?</h3>
            <form className="cvl-lead-form" onSubmit={handleLeadCapture} noValidate>
              <div className="cvl-grid-2">
                <div className="cvl-field">
                  <label className="cvl-label" htmlFor="lead-name">Your Name</label>
                  <input id="lead-name" className="cvl-input" type="text" required
                    value={leadName} onChange={e => setLeadName(e.target.value)}
                    placeholder="Full name" />
                </div>
                <div className="cvl-field">
                  <label className="cvl-label" htmlFor="lead-email">Email Address</label>
                  <input id="lead-email" className="cvl-input" type="email" required
                    value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                    placeholder="you@example.com" />
                </div>
              </div>
              <label className="cvl-checkbox-row">
                <input type="checkbox" checked={wantsEmail} onChange={e => setWantsEmail(e.target.checked)} />
                <span>Email me my CRS score and top improvement tips</span>
              </label>
              <label className="cvl-checkbox-row">
                <input type="checkbox" checked={wantsAlert} onChange={e => setWantsAlert(e.target.checked)} />
                <span>Alert me when a {category} draw opens</span>
              </label>
              {leadError && <p className="cvl-lead-error">{leadError}</p>}
              <button type="submit" className="cvl-btn-primary" disabled={leadSubmitting}>
                {leadSubmitting ? 'Sending…' : 'Send My Results →'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Start over */}
      <div className="cvl-restart-row">
        <button
          className="cvl-btn-ghost"
          onClick={() => { setView('form'); setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        >
          ← Start Over
        </button>
      </div>

      {/* Legal disclaimer */}
      <p className="cvl-disclaimer">
        The information provided is for informational and guidance purposes only, based on publicly available
        Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute
        legal advice, and no solicitor-client or consultant-client relationship is created by accessing this
        content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are
        subject to frequent change without notice. You are responsible for verifying all information with
        official IRCC sources (canada.ca/immigration) and confirming current eligibility requirements before
        taking any action.
      </p>
    </div>
  )
}
