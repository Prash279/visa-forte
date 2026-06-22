// PNP Pathway Assessment engine — deterministic, mirrors crs-calculator.ts.
//
// Every stream's facts live in pnp-streams.json. To update a stream (criteria,
// status, fee, processing time), edit that JSON only — no TypeScript changes.
// Each stream carries sourceUrl + lastVerified so the report's Source &
// Verification Log is always buildable and nothing is asserted without a source.
//
// This engine reads the curated criteria and scores an applicant profile against
// every stream. It NEVER reaches the network — freshness is a data-maintenance
// concern handled by re-verifying the JSON, exactly like crs-rules.json.

import { scoresToClb, type ApplicantProfile, type EducationLevel } from './crs-calculator'
import pnpData from './pnp-streams.json'

// ── Types ────────────────────────────────────────────────────────────────────

export type PnpCategory = 'ee-linked' | 'base'
export type PnpStatus = 'open' | 'closed' | 'intermittent'
export type PnpVerdict = 'confirmed' | 'likely' | 'marginal' | 'ineligible'

// A job offer / provincial connection / EOI invitation is province-specific and
// cannot be read off the generic applicant profile. These are treated as
// conditional requirements the applicant must satisfy — not hard disqualifiers.
export type RequirementMode = 'required' | 'optional' | 'not-required'

// Hard, profile-checkable gates use null to mean "this stream does not constrain it".
export interface PnpCriteria {
  allowedTeers: number[] | null          // e.g. [0,1,2,3] — TEER levels the stream accepts
  minClbOverall: number | null           // minimum CLB in EACH ability
  minEducation: EducationLevel | null    // minimum education level
  minTotalWorkExperienceYears: number | null  // foreign + Canadian
  minAge: number | null
  maxAge: number | null
  minSettlementFundsCad: number | null
  ecaRequired: boolean
  // Conditional (cannot be confirmed from the profile) — downgrade confidence, never hard-fail.
  jobOfferRequired: RequirementMode      // an in-province job offer
  provincialConnectionRequired: boolean  // study / work / family / prior ties
  eoiRegistrationRequired: boolean       // must register an EOI and be invited
  occupationListRestricted: boolean      // NOC must be on a stream-specific list
  // Free-text requirements the generic gates can't express (e.g. French at NCLC 7,
  // a degree from a named province, an EE profile). Each becomes a conditional
  // requirement so the engine never reports "confirmed" on something it can't verify.
  otherConditions?: string[]
}

export interface PnpRoadmapStep {
  step: number
  title: string
  detail: string
}

export interface PnpStream {
  id: string
  province: string
  programName: string
  streamName: string
  category: PnpCategory
  status: PnpStatus
  sourceUrl: string
  lastVerified: string                   // ISO date
  feeCad: number | null
  processingTimeNote: string
  indicativeProcessingMonths: number | null  // drives the deterministic speed score
  criteria: PnpCriteria
  roadmap: PnpRoadmapStep[]
  needsVerification?: boolean            // true → excluded from scoring, surfaced as [VERIFY]
}

interface PnpData {
  _meta: { lastVerified: string; note: string }
  streams: PnpStream[]
}

// One classified occupation, produced by /api/admin/pnp-noc (Claude) or entered manually.
export interface NocClassification {
  nocCode: string
  teer: number
  title: string
  citationUrl: string
  confidence: 'high' | 'medium' | 'low'
  ambiguity: {
    flag: boolean
    alternatives: { nocCode: string; teer: number; title: string }[]
  }
}

export interface PnpStreamMatch {
  stream: PnpStream
  verdict: PnpVerdict
  score: number                          // 0–100 ranking score (eligible verdicts only)
  reasons: string[]                      // why it landed at this verdict
  unmetHardGates: string[]               // disqualifying gaps (drive 'ineligible')
  conditionalRequirements: string[]      // must-secure items (job offer, connection, EOI, list)
}

export interface PnpSourceLogEntry {
  streamId: string
  province: string
  streamName: string
  sourceUrl: string
  lastVerified: string
}

export interface PnpAssessmentResult {
  noc: NocClassification
  eeLinked: PnpStreamMatch[]             // ranked; NEVER merged with base
  base: PnpStreamMatch[]                 // ranked; NEVER merged with eeLinked
  ineligible: PnpStreamMatch[]           // shown in the matrix, excluded from the shortlist
  sourceLog: PnpSourceLogEntry[]
  flags: string[]                        // [NOC AMBIGUITY], [VERIFY], closed-stream notes
  dataVersion: string                    // pnp-streams.json _meta.lastVerified
}

// ── Ranking weights (sum = 100). No inline magic numbers elsewhere. ───────────

const WEIGHT_MATCH_STRENGTH = 40
const WEIGHT_STRATEGIC_VALUE = 30
const WEIGHT_OPEN_STATUS = 20
const WEIGHT_PROCESSING_SPEED = 10

const MATCH_SCORE: Record<Exclude<PnpVerdict, 'ineligible'>, number> = {
  confirmed: 1.0,
  likely: 0.66,
  marginal: 0.33,
}
const STRATEGIC_SCORE: Record<PnpCategory, number> = {
  'ee-linked': 1.0, // +600 CRS and a guaranteed ITA
  base: 0.4,
}
const STATUS_SCORE: Record<PnpStatus, number> = {
  open: 1.0,
  intermittent: 0.5,
  closed: 0.1,
}
// Indicative ceiling used to normalise processing speed (faster → higher score).
const PROCESSING_CEILING_MONTHS = 18

// Education levels in ascending order, for minimum-education comparisons.
const EDUCATION_ORDER: EducationLevel[] = [
  'less_than_secondary',
  'secondary',
  'one_year_post_secondary',
  'two_year_post_secondary',
  'bachelors',
  'two_or_more_degrees',
  'masters',
  'doctoral',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function minClb(profile: ApplicantProfile): number {
  const b = scoresToClb(profile.firstLanguageScores)
  return Math.min(b.listening, b.reading, b.writing, b.speaking)
}

function meetsEducation(actual: EducationLevel, min: EducationLevel): boolean {
  return EDUCATION_ORDER.indexOf(actual) >= EDUCATION_ORDER.indexOf(min)
}

function processingSpeedScore(months: number | null): number {
  if (months === null) return 0.5 // unknown → neutral
  const raw = (PROCESSING_CEILING_MONTHS - months) / PROCESSING_CEILING_MONTHS
  return Math.max(0.1, Math.min(1, raw))
}

// Evaluate one stream against the profile + classified NOC.
function evaluateStream(
  stream: PnpStream,
  profile: ApplicantProfile,
  noc: NocClassification
): PnpStreamMatch {
  const c = stream.criteria
  const unmetHardGates: string[] = []
  const conditionalRequirements: string[] = []
  const reasons: string[] = []

  // ── Hard gates: concrete profile facts that disqualify if unmet ────────────
  if (c.allowedTeers !== null && !c.allowedTeers.includes(noc.teer)) {
    unmetHardGates.push(`Occupation TEER ${noc.teer} is outside this stream's accepted TEER levels (${c.allowedTeers.join(', ')}).`)
  } else if (c.allowedTeers !== null) {
    reasons.push(`Occupation TEER ${noc.teer} is accepted.`)
  }

  if (c.minClbOverall !== null) {
    const clb = minClb(profile)
    if (clb < c.minClbOverall) {
      unmetHardGates.push(`Language is CLB ${clb}; stream requires CLB ${c.minClbOverall} in each ability.`)
    } else {
      reasons.push(`Language meets the CLB ${c.minClbOverall} minimum.`)
    }
  }

  if (c.minEducation !== null && !meetsEducation(profile.education, c.minEducation)) {
    unmetHardGates.push(`Education below the stream minimum.`)
  }

  const totalExp = profile.foreignWorkExperienceYears + profile.canadianWorkExperienceYears
  if (c.minTotalWorkExperienceYears !== null && totalExp < c.minTotalWorkExperienceYears) {
    unmetHardGates.push(`${totalExp} yr work experience; stream requires ${c.minTotalWorkExperienceYears}+ yr.`)
  }

  if (c.minAge !== null && profile.age < c.minAge) {
    unmetHardGates.push(`Applicant is below the stream's minimum age of ${c.minAge}.`)
  }
  if (c.maxAge !== null && profile.age > c.maxAge) {
    unmetHardGates.push(`Applicant is above the stream's maximum age of ${c.maxAge}.`)
  }

  if (c.minSettlementFundsCad !== null && profile.settlementFunds < c.minSettlementFundsCad) {
    unmetHardGates.push(`Settlement funds below the stream minimum of CAD $${c.minSettlementFundsCad.toLocaleString()}.`)
  }

  if (c.ecaRequired && !profile.hasEca) {
    conditionalRequirements.push('Obtain an Educational Credential Assessment (ECA) from a designated body.')
  }

  // ── Conditional requirements: province-specific items not in the profile ───
  if (c.jobOfferRequired === 'required') {
    if (profile.hasJobOffer === 'none') {
      conditionalRequirements.push(`Secure an eligible job offer in ${stream.province}.`)
    } else {
      reasons.push('A job offer is on file (verify it is from a qualifying in-province employer).')
    }
  } else if (c.jobOfferRequired === 'optional') {
    conditionalRequirements.push(`A job offer in ${stream.province} is not required but strengthens this application.`)
  }
  if (c.provincialConnectionRequired) {
    conditionalRequirements.push(`Demonstrate a connection to ${stream.province} (study, work, family, or prior ties).`)
  }
  if (c.eoiRegistrationRequired) {
    conditionalRequirements.push('Register an Expression of Interest and wait for an invitation (ranked selection).')
  }
  if (c.occupationListRestricted) {
    conditionalRequirements.push(`Confirm NOC ${noc.nocCode} is on this stream's current in-demand/priority occupation list.`)
  }
  if (c.otherConditions) {
    for (const cond of c.otherConditions) conditionalRequirements.push(cond)
  }

  // ── Verdict ────────────────────────────────────────────────────────────────
  let verdict: PnpVerdict
  if (unmetHardGates.length > 0) {
    verdict = 'ineligible'
  } else if (c.jobOfferRequired === 'required' && profile.hasJobOffer === 'none') {
    verdict = 'marginal'
  } else if (conditionalRequirements.length > 0) {
    verdict = 'likely'
  } else {
    verdict = 'confirmed'
  }

  const score = verdict === 'ineligible' ? 0 : rankScore(stream, verdict)

  return { stream, verdict, score, reasons, unmetHardGates, conditionalRequirements }
}

function rankScore(stream: PnpStream, verdict: PnpVerdict): number {
  if (verdict === 'ineligible') return 0
  const match = MATCH_SCORE[verdict]
  const strategic = STRATEGIC_SCORE[stream.category]
  const status = STATUS_SCORE[stream.status]
  const speed = processingSpeedScore(stream.indicativeProcessingMonths)
  return Math.round(
    WEIGHT_MATCH_STRENGTH * match +
    WEIGHT_STRATEGIC_VALUE * strategic +
    WEIGHT_OPEN_STATUS * status +
    WEIGHT_PROCESSING_SPEED * speed
  )
}

// ── Public API ───────────────────────────────────────────────────────────────

// Score the applicant against every curated stream, split EE-linked vs Base,
// rank each list independently, and assemble the Source & Verification Log.
// `streams` is injectable for tests; defaults to the curated JSON.
export function assessPnp(
  profile: ApplicantProfile,
  noc: NocClassification,
  streams: PnpStream[] = (pnpData as PnpData).streams
): PnpAssessmentResult {
  const flags: string[] = []
  if (noc.ambiguity.flag) {
    const alts = noc.ambiguity.alternatives
      .map(a => `${a.nocCode} (TEER ${a.teer})`)
      .join(', ')
    flags.push(`[NOC AMBIGUITY] Duties plausibly match more than one NOC at different TEER levels${alts ? `: ${alts}` : ''}. Confirm the correct code before relying on these results.`)
  }

  // Streams that could not be verified are surfaced, never scored.
  const scorable = streams.filter(s => {
    if (s.needsVerification) {
      flags.push(`[VERIFY] ${s.province} — ${s.streamName}: not verified this session; excluded from scoring.`)
      return false
    }
    return true
  })

  const matches = scorable.map(s => evaluateStream(s, profile, noc))

  for (const m of matches) {
    if (m.stream.status === 'closed' && m.verdict !== 'ineligible') {
      flags.push(`${m.stream.province} — ${m.stream.streamName} is currently CLOSED; ranked low. Re-check the provincial site for the next intake.`)
    }
  }

  const byScore = (a: PnpStreamMatch, b: PnpStreamMatch): number => b.score - a.score
  const eligible = matches.filter(m => m.verdict !== 'ineligible')

  return {
    noc,
    eeLinked: eligible.filter(m => m.stream.category === 'ee-linked').sort(byScore),
    base: eligible.filter(m => m.stream.category === 'base').sort(byScore),
    ineligible: matches.filter(m => m.verdict === 'ineligible'),
    sourceLog: scorable.map(s => ({
      streamId: s.id,
      province: s.province,
      streamName: s.streamName,
      sourceUrl: s.sourceUrl,
      lastVerified: s.lastVerified,
    })),
    flags,
    dataVersion: (pnpData as PnpData)._meta.lastVerified,
  }
}
