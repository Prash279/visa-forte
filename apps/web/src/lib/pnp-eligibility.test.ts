import { describe, it, expect } from 'vitest'
import {
  assessPnp,
  type PnpStream,
  type PnpCriteria,
  type NocClassification,
} from './pnp-eligibility'
import { type ApplicantProfile } from './crs-calculator'
import pnpData from './pnp-streams.json'

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Strong TEER-1 candidate: CLB 9 in every ability, masters + ECA, 5 yr experience,
// no job offer. Used as the baseline against synthetic streams.
const strongProfile: ApplicantProfile = {
  name: 'Test Applicant',
  age: 30,
  nocCode: '21211',
  nocTeer: 1,
  occupationTitle: 'Data Scientist',
  countryOfCitizenship: 'India',
  countryOfResidence: 'India',
  reportDate: '2026-06-22',
  education: 'masters',
  hasEca: true,
  firstLanguageScores: { testType: 'IELTS_GT', listening: 8.0, reading: 7.0, writing: 7.0, speaking: 7.0 },
  hasSecondLanguage: false,
  foreignWorkExperienceYears: 5,
  canadianWorkExperienceYears: 0,
  hasSpouse: false,
  hasJobOffer: 'none',
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 30000,
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
}

const baseCriteria: PnpCriteria = {
  allowedTeers: [0, 1, 2, 3],
  minClbOverall: 7,
  minEducation: 'bachelors',
  minTotalWorkExperienceYears: 1,
  minAge: null,
  maxAge: null,
  minSettlementFundsCad: null,
  ecaRequired: true,
  jobOfferRequired: 'not-required',
  provincialConnectionRequired: false,
  eoiRegistrationRequired: false,
  occupationListRestricted: false,
}

let seq = 0
function mkStream(over: Omit<Partial<PnpStream>, 'criteria'> & { criteria?: Partial<PnpCriteria> }): PnpStream {
  seq += 1
  const { criteria: critOver, ...rest } = over
  return {
    id: `s${seq}`,
    province: 'Testland',
    programName: 'TPNP',
    streamName: `Stream ${seq}`,
    category: 'ee-linked',
    status: 'open',
    sourceUrl: 'https://example.test/stream',
    lastVerified: '2026-06-22',
    feeCad: 1500,
    processingTimeNote: 'about 3 months',
    indicativeProcessingMonths: 3,
    criteria: { ...baseCriteria, ...critOver },
    roadmap: [{ step: 1, title: 'Register', detail: 'Register an EOI.' }],
    ...rest,
  }
}

function mkNoc(teer: number, ambiguity = false): NocClassification {
  return {
    nocCode: '21211',
    teer,
    title: 'Data Scientist',
    citationUrl: 'https://www.canada.ca/noc/21211',
    confidence: 'high',
    ambiguity: {
      flag: ambiguity,
      alternatives: ambiguity ? [{ nocCode: '22220', teer: 2, title: 'Tech support' }] : [],
    },
  }
}

// ── Verdict logic ────────────────────────────────────────────────────────────

describe('assessPnp — verdict logic', () => {
  it('all hard gates pass and no conditional requirements → confirmed', () => {
    const streams = [mkStream({ id: 'confirmed' })]
    const r = assessPnp(strongProfile, mkNoc(1), streams)
    expect(r.eeLinked[0]?.verdict).toBe('confirmed')
  })

  it('a conditional requirement (EOI) downgrades a passing stream to likely', () => {
    const streams = [mkStream({ id: 'eoi', criteria: { eoiRegistrationRequired: true } })]
    const r = assessPnp(strongProfile, mkNoc(1), streams)
    expect(r.eeLinked[0]?.verdict).toBe('likely')
    expect(r.eeLinked[0]?.conditionalRequirements.some(x => /Expression of Interest/i.test(x))).toBe(true)
  })

  it('a required in-province job offer the applicant lacks → marginal', () => {
    const streams = [mkStream({ id: 'jo', category: 'base', criteria: { jobOfferRequired: 'required' } })]
    const r = assessPnp(strongProfile, mkNoc(1), streams)
    expect(r.base[0]?.verdict).toBe('marginal')
  })

  it('a hard gate failure (TEER outside accepted set) → ineligible and excluded from the shortlist', () => {
    const streams = [mkStream({ id: 'teerfail', criteria: { allowedTeers: [0] } })]
    const r = assessPnp(strongProfile, mkNoc(1), streams)
    expect(r.eeLinked).toHaveLength(0)
    expect(r.ineligible[0]?.verdict).toBe('ineligible')
    expect(r.ineligible[0]?.unmetHardGates.length).toBeGreaterThan(0)
  })

  it('language below the stream minimum → ineligible', () => {
    const weak: ApplicantProfile = {
      ...strongProfile,
      firstLanguageScores: { testType: 'IELTS_GT', listening: 4.0, reading: 3.5, writing: 4.0, speaking: 4.0 },
    }
    const streams = [mkStream({ id: 'lang', criteria: { minClbOverall: 7 } })]
    const r = assessPnp(weak, mkNoc(1), streams)
    expect(r.ineligible).toHaveLength(1)
  })
})

// ── Structural separation (EE-linked vs Base never merge) ────────────────────

describe('assessPnp — EE-linked and Base are structurally separate', () => {
  it('returns disjoint eeLinked and base arrays; ineligible is in neither', () => {
    const streams = [
      mkStream({ id: 'ee', category: 'ee-linked' }),
      mkStream({ id: 'base', category: 'base' }),
      mkStream({ id: 'dead', category: 'ee-linked', criteria: { allowedTeers: [0] } }),
    ]
    const r = assessPnp(strongProfile, mkNoc(1), streams)
    const eeIds = r.eeLinked.map(m => m.stream.id)
    const baseIds = r.base.map(m => m.stream.id)
    expect(eeIds).toContain('ee')
    expect(baseIds).toContain('base')
    expect(eeIds.filter(id => baseIds.includes(id))).toHaveLength(0)
    expect([...eeIds, ...baseIds]).not.toContain('dead')
    expect(r.eeLinked.every(m => m.stream.category === 'ee-linked')).toBe(true)
    expect(r.base.every(m => m.stream.category === 'base')).toBe(true)
  })
})

// ── Ranking model ────────────────────────────────────────────────────────────

describe('assessPnp — weighted ranking', () => {
  it('within a category, an open fast stream outranks a closed slow one', () => {
    const streams = [
      mkStream({ id: 'slow-closed', status: 'closed', indicativeProcessingMonths: 15 }),
      mkStream({ id: 'fast-open', status: 'open', indicativeProcessingMonths: 3 }),
    ]
    const r = assessPnp(strongProfile, mkNoc(1), streams)
    expect(r.eeLinked[0]?.stream.id).toBe('fast-open')
    expect(r.eeLinked[0]!.score).toBeGreaterThan(r.eeLinked[1]!.score)
  })

  it('a confirmed EE-linked stream scores higher than the same stream as Base (strategic value)', () => {
    const ee = assessPnp(strongProfile, mkNoc(1), [mkStream({ id: 'x', category: 'ee-linked' })])
    const base = assessPnp(strongProfile, mkNoc(1), [mkStream({ id: 'y', category: 'base' })])
    expect(ee.eeLinked[0]!.score).toBeGreaterThan(base.base[0]!.score)
  })
})

// ── Flags ────────────────────────────────────────────────────────────────────

describe('assessPnp — flags', () => {
  it('raises [NOC AMBIGUITY] when the classification is ambiguous', () => {
    const r = assessPnp(strongProfile, mkNoc(1, true), [mkStream({})])
    expect(r.flags.some(f => f.startsWith('[NOC AMBIGUITY]'))).toBe(true)
  })

  it('excludes needsVerification streams from scoring and raises [VERIFY]', () => {
    const streams = [mkStream({ id: 'unverified', needsVerification: true })]
    const r = assessPnp(strongProfile, mkNoc(1), streams)
    expect(r.eeLinked).toHaveLength(0)
    expect(r.ineligible).toHaveLength(0)
    expect(r.flags.some(f => f.startsWith('[VERIFY]'))).toBe(true)
  })

  it('flags an otherwise-eligible CLOSED stream', () => {
    const streams = [mkStream({ id: 'closed', status: 'closed' })]
    const r = assessPnp(strongProfile, mkNoc(1), streams)
    expect(r.flags.some(f => /CLOSED/.test(f))).toBe(true)
  })
})

// ── Source & Verification Log ────────────────────────────────────────────────

describe('assessPnp — source log', () => {
  it('emits one source-log entry per scorable stream', () => {
    const streams = [mkStream({ id: 'a' }), mkStream({ id: 'b' })]
    const r = assessPnp(strongProfile, mkNoc(1), streams)
    expect(r.sourceLog).toHaveLength(2)
    expect(r.sourceLog.every(e => e.sourceUrl.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.lastVerified))).toBe(true)
  })
})

// ── Provenance guard over the REAL curated data ──────────────────────────────
// Strengthens automatically as streams are added: every curated stream must
// carry a source and a verification date, so the report's log is never uncited.

describe('pnp-streams.json — provenance & schema guard', () => {
  const streams = (pnpData as { streams: PnpStream[] }).streams
  const CATEGORIES = ['ee-linked', 'base']
  const STATUSES = ['open', 'closed', 'intermittent']

  it('every stream has a non-empty sourceUrl and an ISO lastVerified date', () => {
    for (const s of streams) {
      expect(s.sourceUrl, `${s.id} sourceUrl`).toMatch(/^https?:\/\//)
      expect(s.lastVerified, `${s.id} lastVerified`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('every stream has a valid category, status, and criteria object', () => {
    for (const s of streams) {
      expect(CATEGORIES, `${s.id} category`).toContain(s.category)
      expect(STATUSES, `${s.id} status`).toContain(s.status)
      expect(s.criteria, `${s.id} criteria`).toBeTypeOf('object')
      expect(Array.isArray(s.roadmap), `${s.id} roadmap`).toBe(true)
    }
  })

  it('stream ids are unique', () => {
    const ids = streams.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
