import { describe, it, expect } from 'vitest'
import {
  assessPnp,
  type PnpStream,
  type PnpCriteria,
  type NocClassification,
  type PnpAssessmentResult,
  type PnpVerdict,
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
    verified: true,
    candidates: [
      { nocCode: '21211', teer, title: 'Data Scientist', rationale: 'Builds ML models.', matchScore: 100, fitScore: 90 },
    ],
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

// ── Eligibility breakdown (per-criterion) ────────────────────────────────────

describe('assessPnp — eligibility breakdown', () => {
  it('emits a check per constrained criterion with the applicant value and met status', () => {
    const streams = [mkStream({ id: 'b' })]
    const checks = assessPnp(strongProfile, mkNoc(1), streams).eeLinked[0]!.eligibilityChecks
    const teer = checks.find(c => c.label === 'Occupation level (TEER)')
    const lang = checks.find(c => c.label === 'Language (CLB)')
    expect(teer?.applicant).toBe('TEER 1')
    expect(teer?.status).toBe('met')
    expect(lang?.status).toBe('met') // CLB derived from IELTS 8/7/7/7 → min 7, stream needs 7
  })

  it('marks an unsatisfied hard gate as unmet', () => {
    const streams = [mkStream({ id: 't', criteria: { allowedTeers: [0] } })]
    const checks = assessPnp(strongProfile, mkNoc(1), streams).ineligible[0]!.eligibilityChecks
    expect(checks.find(c => c.label === 'Occupation level (TEER)')?.status).toBe('unmet')
  })

  it('marks a securable item (ECA not yet obtained) as conditional, not unmet', () => {
    const noEca: ApplicantProfile = { ...strongProfile, hasEca: false }
    const streams = [mkStream({ id: 'e', criteria: { ecaRequired: true } })]
    const checks = assessPnp(noEca, mkNoc(1), streams).eeLinked[0]!.eligibilityChecks
    expect(checks.find(c => c.label === 'Credential assessment (ECA)')?.status).toBe('conditional')
  })

  it('tags threshold criteria as threshold and yes/no gates as binary (so the report never prints "requires Required")', () => {
    const streams = [mkStream({ id: 'k', category: 'base', criteria: { ecaRequired: true, jobOfferRequired: 'required' } })]
    const checks = assessPnp(strongProfile, mkNoc(1), streams).base[0]!.eligibilityChecks
    expect(checks.find(c => c.label === 'Language (CLB)')?.requirementKind).toBe('threshold')
    expect(checks.find(c => c.label === 'Occupation level (TEER)')?.requirementKind).toBe('threshold')
    expect(checks.find(c => c.label === 'Credential assessment (ECA)')?.requirementKind).toBe('binary')
    expect(checks.find(c => c.label === 'In-province job offer')?.requirementKind).toBe('binary')
  })
})

// ── NOC-targeted shortlist (over the REAL curated data) ──────────────────────

describe('assessPnp — NOC-targeted shortlist', () => {
  const healthNoc: NocClassification = {
    nocCode: '41404',
    teer: 1,
    title: 'Health policy researchers, consultants and program officers',
    citationUrl: 'https://noc.esdc.gc.ca',
    confidence: 'high',
    verified: true,
    candidates: [
      { nocCode: '41404', teer: 1, title: 'Health policy researchers', rationale: 'health policy + databases', matchScore: 134, fitScore: 92 },
    ],
    ambiguity: { flag: false, alternatives: [] },
  }

  it('caps the shortlist and excludes streams locked to a different occupation field', () => {
    const r = assessPnp(strongProfile, healthNoc)
    expect(r.shortlist.length).toBeGreaterThan(0)
    expect(r.shortlist.length).toBeLessThanOrEqual(5)
    const ids = r.shortlist.map(m => m.stream.id)
    expect(ids).not.toContain('sk-tech')
    expect(ids).not.toContain('ab-tourism')
    expect(ids).not.toContain('ns-ccw')
    expect(ids).not.toContain('on-trades')
  })

  it('marks the health stream targeted and an off-field stream mismatch', () => {
    const all = (() => {
      const r = assessPnp(strongProfile, healthNoc)
      return [...r.eeLinked, ...r.base, ...r.ineligible]
    })()
    expect(all.find(m => m.stream.id === 'bc-health')?.relevance).toBe('targeted')
    expect(all.find(m => m.stream.id === 'sk-tech')?.relevance).toBe('mismatch')
  })

  it('leaves the full matrix unfiltered — the shortlist is a view, not a filter', () => {
    const r = assessPnp(strongProfile, healthNoc)
    expect(r.eeLinked.length + r.base.length).toBeGreaterThan(r.shortlist.length)
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

  // Guardrail: a stream can no longer ASSERT an occupation restriction without proof.
  // Every stream must declare occupationEligibility, and any restrictive mode must carry
  // its list/rule plus a source — so the engine never silently scores an uncited restriction.
  it('every stream declares a well-formed, sourced occupationEligibility', () => {
    const MODES = ['unrestricted', 'teer-only', 'include-list', 'include-rule', 'exclude-list', 'sinp-excluded', 'employer-driven', 'unknown']
    for (const s of streams) {
      const e = s.occupationEligibility as { mode: string; [k: string]: unknown } | undefined
      expect(e, `${s.id} occupationEligibility`).toBeTypeOf('object')
      expect(MODES, `${s.id} mode`).toContain(e!.mode)
      if (e!.mode === 'include-list' || e!.mode === 'exclude-list') {
        expect(Array.isArray(e!.nocs) && (e!.nocs as string[]).length > 0, `${s.id} nocs`).toBe(true)
        expect(e!.source, `${s.id} source`).toMatch(/^https?:\/\//)
        expect(e!.lastVerified, `${s.id} lastVerified`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
      if (e!.mode === 'include-rule') {
        expect(Array.isArray(e!.includeGroups) && (e!.includeGroups as string[]).length > 0, `${s.id} includeGroups`).toBe(true)
        expect(e!.source, `${s.id} source`).toMatch(/^https?:\/\//)
        expect(e!.lastVerified, `${s.id} lastVerified`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
      if (e!.mode === 'sinp-excluded' || e!.mode === 'employer-driven') {
        expect(e!.source, `${s.id} source`).toMatch(/^https?:\/\//)
        expect(e!.lastVerified, `${s.id} lastVerified`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
      if (e!.mode === 'unknown') {
        expect(e!.source, `${s.id} source`).toMatch(/^https?:\/\//)
        expect(typeof e!.note === 'string' && (e!.note as string).length > 0, `${s.id} note`).toBe(true)
      }
    }
  })
})

// ── SINP Excluded Occupation List gate ───────────────────────────────────────
// The SINP Express Entry / Occupations In-Demand sub-categories hard-exclude NOCs on
// the published Excluded Occupation List (verified in sinp-2026.json). Other streams
// must be unaffected. NOC 73300 (Transport truck drivers, TEER 3) is on that list.
describe('assessPnp — SINP Excluded Occupation List gate', () => {
  function excludedNoc(): NocClassification {
    return { ...mkNoc(3), nocCode: '73300', title: 'Transport truck drivers' }
  }
  function verdictFor(r: PnpAssessmentResult, id: string): PnpVerdict | undefined {
    return [...r.eeLinked, ...r.base, ...r.ineligible].find(m => m.stream.id === id)?.verdict
  }

  const sinpElig = { mode: 'sinp-excluded', source: 'https://www.saskatchewan.ca/sinp', lastVerified: '2026-06-26' } as const

  it('marks a SINP points stream ineligible for an excluded NOC', () => {
    const stream = mkStream({ id: 'sk-pts', occupationEligibility: sinpElig })
    const r = assessPnp(strongProfile, excludedNoc(), [stream])
    expect(verdictFor(r, 'sk-pts')).toBe('ineligible')
    const m = r.ineligible.find(x => x.stream.id === 'sk-pts')
    expect(m?.unmetHardGates.some(g => /Excluded Occupation List/.test(g))).toBe(true)
  })

  it('keeps a SINP points stream eligible for a TEER 0-3 NOC that is not excluded', () => {
    const stream = mkStream({ id: 'sk-pts2', occupationEligibility: sinpElig })
    const r = assessPnp(strongProfile, mkNoc(1), [stream]) // 21211 — not on the list
    expect(verdictFor(r, 'sk-pts2')).not.toBe('ineligible')
  })

  it('does not apply the exclusion to streams without a SINP rule', () => {
    const stream = mkStream({ id: 'sk-offer', occupationEligibility: { mode: 'unrestricted' } })
    const r = assessPnp(strongProfile, excludedNoc(), [stream])
    expect(verdictFor(r, 'sk-offer')).not.toBe('ineligible')
  })
})

// ── End-to-end: Transport truck driver over the REAL curated data ─────────────
// The scenario that drove the occupation-eligibility work. Encodes the Prashant Proof:
// SINP points sub-categories exclude 73300; Ontario Skilled Trades affirmatively lists it;
// Alberta does not exclude it; and the genuine occupation match leads the shortlist.
describe('assessPnp — truck driver (NOC 73300) over real curated data', () => {
  const truckerProfile: ApplicantProfile = {
    ...strongProfile,
    nocCode: '73300',
    nocTeer: 3,
    occupationTitle: 'Transport truck driver',
    education: 'secondary',
  }
  const truckerNoc: NocClassification = {
    nocCode: '73300',
    teer: 3,
    title: 'Transport truck drivers',
    citationUrl: 'https://noc.esdc.gc.ca',
    confidence: 'high',
    verified: true,
    candidates: [
      { nocCode: '73300', teer: 3, title: 'Transport truck drivers', rationale: 'Operates heavy trucks.', matchScore: 100, fitScore: 90 },
    ],
    ambiguity: { flag: false, alternatives: [] },
  }
  const r = assessPnp(truckerProfile, truckerNoc)
  const matchFor = (id: string) =>
    [...r.eeLinked, ...r.base, ...r.ineligible].find(m => m.stream.id === id)

  it('excludes 73300 from the SINP points sub-categories (on the Excluded Occupation List)', () => {
    expect(matchFor('sk-isw-ee')?.verdict).toBe('ineligible')
    expect(matchFor('sk-isw-oid')?.verdict).toBe('ineligible')
    expect(matchFor('sk-isw-ee')?.occupationEligibility).toBe('ineligible-listed')
  })

  it('affirmatively lists 73300 on Ontario Skilled Trades', () => {
    const on = matchFor('on-trades')
    expect(on?.occupationEligibility).toBe('eligible-listed')
    expect(on?.verdict).not.toBe('ineligible')
  })

  it('does not exclude 73300 from Alberta (not on the AOS ineligible list)', () => {
    expect(matchFor('ab-aos')?.occupationEligibility).toBe('unrestricted')
    expect(matchFor('ab-aos')?.verdict).not.toBe('ineligible')
  })

  it('leads the shortlist with the genuine occupation match (Ontario Skilled Trades)', () => {
    expect(r.shortlist.some(m => m.stream.id === 'on-trades')).toBe(true)
    expect(r.shortlist[0]?.occupationEligibility).toBe('eligible-listed')
  })
})
