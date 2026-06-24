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
import { streamRelevance, type StreamRelevance } from './noc-focus'
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
  occupationFocus?: string[]             // stable occupation-field tags (e.g. ['health']); absent = general/open
  needsVerification?: boolean            // true → excluded from scoring, surfaced as [VERIFY]
}

interface PnpData {
  _meta: { lastVerified: string; note: string }
  streams: PnpStream[]
}

// A ranked NOC match: one of the top candidates the classifier returns for the duties.
export interface NocCandidate {
  nocCode: string
  teer: number
  title: string
  rationale: string   // one sentence tying the code to the applicant's specific duties
  matchScore: number  // lexical-retrieval relevance (higher = stronger duty overlap)
}

// One classified occupation, produced by /api/admin/pnp-noc (Claude) or entered manually.
export interface NocClassification {
  nocCode: string
  teer: number
  title: string
  citationUrl: string
  confidence: 'high' | 'medium' | 'low'
  verified: boolean              // winning code confirmed live against the official StatCan source
  candidates: NocCandidate[]     // ranked best-first; [0] is the chosen code
  ambiguity: {
    flag: boolean
    alternatives: { nocCode: string; teer: number; title: string }[]
  }
}

export interface ScoreBreakdown {
  matchStrength: number    // 0–40: how cleanly the applicant qualifies (confirmed/likely/marginal)
  strategicValue: number   // 0–30: EE-linked (30) vs base (12)
  openStatus: number       // 0–20: open (20) / intermittent (10) / closed (2)
  processingSpeed: number  // 0–10: faster streams score higher
}

export type EligibilityCheckStatus = 'met' | 'conditional' | 'unmet'

// One profile-checkable eligibility criterion for a stream: what the stream requires,
// what the applicant brings, and whether it is satisfied. 'conditional' = a province-
// specific item (job offer, ECA still to obtain) that is securable, not a hard failure.
export interface EligibilityCheck {
  label: string
  requirement: string
  applicant: string
  status: EligibilityCheckStatus
}

export interface PnpStreamMatch {
  stream: PnpStream
  verdict: PnpVerdict
  score: number                          // 0–100 ranking score (eligible verdicts only)
  scoreBreakdown: ScoreBreakdown         // per-dimension score components
  reasons: string[]                      // why it landed at this verdict
  unmetHardGates: string[]               // disqualifying gaps (drive 'ineligible')
  conditionalRequirements: string[]      // must-secure items (job offer, connection, EOI, list)
  eligibilityChecks: EligibilityCheck[]  // per-criterion eligibility breakdown shown on the report
  relevance: StreamRelevance             // fit between the NOC's field and this stream's focus
  whyRelevant: string                    // plain-English reason shown on the shortlist
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
  shortlist: PnpStreamMatch[]            // primary recommendation: top NOC-relevant eligible streams
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

// The report leads with a tight shortlist instead of every eligible stream.
const SHORTLIST_MAX = 5
const RELEVANCE_BONUS = 12  // lifts a field-matched stream up the shortlist without overriding strategic value

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

// Short, report-friendly labels for the eligibility breakdown.
const EDUCATION_LABEL: Record<EducationLevel, string> = {
  less_than_secondary: 'Less than secondary',
  secondary: 'Secondary diploma',
  one_year_post_secondary: '1-yr post-secondary',
  two_year_post_secondary: '2-yr post-secondary',
  bachelors: "Bachelor's degree",
  two_or_more_degrees: 'Two or more credentials',
  masters: "Master's degree",
  doctoral: 'Doctoral degree',
}

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
  const clb = minClb(profile)
  const totalExp = profile.foreignWorkExperienceYears + profile.canadianWorkExperienceYears

  // ── Hard gates: concrete profile facts that disqualify if unmet ────────────
  if (c.allowedTeers !== null && !c.allowedTeers.includes(noc.teer)) {
    unmetHardGates.push(`Occupation TEER ${noc.teer} is outside this stream's accepted TEER levels (${c.allowedTeers.join(', ')}).`)
  } else if (c.allowedTeers !== null) {
    reasons.push(`Occupation TEER ${noc.teer} is accepted.`)
  }

  if (c.minClbOverall !== null) {
    if (clb < c.minClbOverall) {
      unmetHardGates.push(`Language is CLB ${clb}; stream requires CLB ${c.minClbOverall} in each ability.`)
    } else {
      reasons.push(`Language meets the CLB ${c.minClbOverall} minimum.`)
    }
  }

  if (c.minEducation !== null && !meetsEducation(profile.education, c.minEducation)) {
    unmetHardGates.push(`Education below the stream minimum.`)
  }

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

  // ── Eligibility breakdown: profile-checkable criteria, requirement vs applicant ──
  const eligibilityChecks: EligibilityCheck[] = []
  if (c.allowedTeers !== null) {
    eligibilityChecks.push({
      label: 'Occupation level (TEER)',
      requirement: `TEER ${c.allowedTeers.join(', ')}`,
      applicant: `TEER ${noc.teer}`,
      status: c.allowedTeers.includes(noc.teer) ? 'met' : 'unmet',
    })
  }
  if (c.minClbOverall !== null) {
    eligibilityChecks.push({
      label: 'Language (CLB)',
      requirement: `CLB ${c.minClbOverall}+ each ability`,
      applicant: `CLB ${clb}`,
      status: clb >= c.minClbOverall ? 'met' : 'unmet',
    })
  }
  if (c.minEducation !== null) {
    eligibilityChecks.push({
      label: 'Education',
      requirement: `${EDUCATION_LABEL[c.minEducation]} or higher`,
      applicant: EDUCATION_LABEL[profile.education],
      status: meetsEducation(profile.education, c.minEducation) ? 'met' : 'unmet',
    })
  }
  if (c.minTotalWorkExperienceYears !== null) {
    eligibilityChecks.push({
      label: 'Work experience',
      requirement: `${c.minTotalWorkExperienceYears}+ yr`,
      applicant: `${totalExp} yr`,
      status: totalExp >= c.minTotalWorkExperienceYears ? 'met' : 'unmet',
    })
  }
  if (c.minAge !== null || c.maxAge !== null) {
    const req =
      c.minAge !== null && c.maxAge !== null ? `${c.minAge}–${c.maxAge} yr`
      : c.minAge !== null ? `${c.minAge}+ yr`
      : `up to ${c.maxAge} yr`
    const ageOk = (c.minAge === null || profile.age >= c.minAge) && (c.maxAge === null || profile.age <= c.maxAge)
    eligibilityChecks.push({
      label: 'Age',
      requirement: req,
      applicant: `${profile.age} yr`,
      status: ageOk ? 'met' : 'unmet',
    })
  }
  if (c.minSettlementFundsCad !== null) {
    eligibilityChecks.push({
      label: 'Settlement funds',
      requirement: `CAD $${c.minSettlementFundsCad.toLocaleString()}`,
      applicant: `CAD $${profile.settlementFunds.toLocaleString()}`,
      status: profile.settlementFunds >= c.minSettlementFundsCad ? 'met' : 'unmet',
    })
  }
  if (c.ecaRequired) {
    eligibilityChecks.push({
      label: 'Credential assessment (ECA)',
      requirement: 'Required',
      applicant: profile.hasEca ? 'On file' : 'Not yet obtained',
      status: profile.hasEca ? 'met' : 'conditional',
    })
  }
  if (c.jobOfferRequired === 'required') {
    const noOffer = profile.hasJobOffer === 'none'
    eligibilityChecks.push({
      label: 'In-province job offer',
      requirement: 'Required',
      applicant: noOffer ? 'None on file' : 'On file',
      status: noOffer ? 'conditional' : 'met',
    })
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

  const { total: score, breakdown: scoreBreakdown } = rankScore(stream, verdict)

  // Field fit between the NOC and this stream — drives the shortlist, not the verdict.
  const relevance = streamRelevance(stream.occupationFocus, noc.nocCode)
  const focus = stream.occupationFocus?.join(', ')
  const whyRelevant =
    relevance === 'targeted'
      ? `Targets your occupation field${focus ? ` (${focus})` : ''}.`
      : relevance === 'mismatch'
        ? `Restricted to ${focus} occupations — outside your NOC's field.`
        : 'Open to your occupation — no field restriction on this stream.'

  return { stream, verdict, score, scoreBreakdown, reasons, unmetHardGates, conditionalRequirements, eligibilityChecks, relevance, whyRelevant }
}

const ZERO_BREAKDOWN: ScoreBreakdown = { matchStrength: 0, strategicValue: 0, openStatus: 0, processingSpeed: 0 }

function rankScore(stream: PnpStream, verdict: PnpVerdict): { total: number; breakdown: ScoreBreakdown } {
  if (verdict === 'ineligible') return { total: 0, breakdown: ZERO_BREAKDOWN }
  const match = MATCH_SCORE[verdict]
  const strategic = STRATEGIC_SCORE[stream.category]
  const status = STATUS_SCORE[stream.status]
  const speed = processingSpeedScore(stream.indicativeProcessingMonths)
  const breakdown: ScoreBreakdown = {
    matchStrength: Math.round(WEIGHT_MATCH_STRENGTH * match),
    strategicValue: Math.round(WEIGHT_STRATEGIC_VALUE * strategic),
    openStatus: Math.round(WEIGHT_OPEN_STATUS * status),
    processingSpeed: Math.round(WEIGHT_PROCESSING_SPEED * speed),
  }
  return {
    total: breakdown.matchStrength + breakdown.strategicValue + breakdown.openStatus + breakdown.processingSpeed,
    breakdown,
  }
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

  // Shortlist: drop streams locked to a different occupation field, then rank by
  // qualification score with a boost for field-matched streams — capped to a tight set.
  const shortlistScore = (m: PnpStreamMatch): number =>
    m.score + (m.relevance === 'targeted' ? RELEVANCE_BONUS : 0)
  const shortlist = eligible
    .filter(m => m.relevance !== 'mismatch')
    .sort((a, b) => shortlistScore(b) - shortlistScore(a))
    .slice(0, SHORTLIST_MAX)

  return {
    noc,
    shortlist,
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

export interface PnpInsight {
  label: string
  body: string
}

// Deterministic, data-driven decision support built from the assessment itself —
// what to prioritise, what is fastest, and the single change with the widest impact.
// Shared by the on-screen report and the PowerPoint export so both stay in sync.
export function buildPnpInsights(pnp: PnpAssessmentResult): PnpInsight[] {
  const out: PnpInsight[] = []
  const shortlist = pnp.shortlist
  const topEe = pnp.eeLinked[0]

  if (topEe) {
    out.push({
      label: 'Highest-leverage route',
      body: `${topEe.stream.province} — ${topEe.stream.streamName} is Express Entry-linked. A nomination here adds 600 CRS points, which in practice guarantees an Invitation to Apply. Prioritise it wherever its conditions can be met.`,
    })
  } else if (shortlist.length > 0) {
    out.push({
      label: 'Highest-leverage route',
      body: `No Express Entry-linked stream fits this profile yet, so the base pathways are the route to PR. Raising language to CLB 9 or securing an in-province job offer is what typically unlocks the faster Express Entry-linked streams.`,
    })
  }

  const withSpeed = shortlist.filter((m) => m.stream.indicativeProcessingMonths != null)
  if (withSpeed.length > 0) {
    const fastest = withSpeed.reduce((a, b) =>
      a.stream.indicativeProcessingMonths! <= b.stream.indicativeProcessingMonths! ? a : b
    )
    out.push({
      label: 'Fastest pathway',
      body: `${fastest.stream.province} — ${fastest.stream.streamName} carries the shortest indicative processing on your shortlist (about ${fastest.stream.indicativeProcessingMonths} months after nomination). Where speed matters most, start here.`,
    })
  }

  const buckets: { test: RegExp; advice: string }[] = [
    { test: /job offer/i, advice: 'an eligible in-province job offer' },
    { test: /Expression of Interest|EOI/i, advice: 'registering an Expression of Interest and competing in the ranked draws' },
    { test: /connection/i, advice: 'a demonstrable connection to the province (study, work, or family)' },
    { test: /Educational Credential|ECA/i, advice: 'an Educational Credential Assessment' },
    { test: /occupation list/i, advice: "confirming your NOC is on the stream's current in-demand list" },
  ]
  let best: { count: number; advice: string } | null = null
  for (const b of buckets) {
    const count = shortlist.filter((m) => m.conditionalRequirements.some((c) => b.test.test(c))).length
    if (count > 0 && (!best || count > best.count)) best = { count, advice: b.advice }
  }
  if (best) {
    out.push({
      label: 'Highest-impact next step',
      body: `${best.count} of your ${shortlist.length} shortlisted streams hinge on ${best.advice}. Securing it is the single change that improves your odds across multiple provinces at once.`,
    })
  }

  const targeted = shortlist.filter((m) => m.relevance === 'targeted').length
  if (targeted > 0) {
    out.push({
      label: 'Strongest occupation fit',
      body: `${targeted} of your shortlisted streams specifically target your occupation field, not just your general eligibility. These carry the lowest documentation risk because your NOC duties align with what the province is actively selecting.`,
    })
  }

  out.push({
    label: 'Apply in parallel',
    body: `A nomination from any single province is enough for permanent residence. Where you qualify for more than one stream, pursuing them in parallel raises your overall probability without added risk — PNP streams open and close on short notice.`,
  })

  return out
}
