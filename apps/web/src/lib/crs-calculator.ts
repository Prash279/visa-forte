// CRS calculation engine — post-March 2025 rules.
// Job offer points removed per IRCC update March 2025.
// Source: canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/
//   express-entry/eligibility/criteria-comprehensive-ranking-system/grid.html

// ── Types ────────────────────────────────────────────────────────────────────

export type EducationLevel =
  | 'less_than_secondary'
  | 'secondary'
  | 'one_year_post_secondary'
  | 'two_year_post_secondary'
  | 'bachelors'
  | 'two_or_more_degrees'
  | 'masters'
  | 'doctoral'

export type LanguageTestType = 'IELTS_GT' | 'IELTS_Academic' | 'CELPIP' | 'TEF' | 'TCF'

export interface LanguageScores {
  testType: LanguageTestType
  listening: number
  reading: number
  writing: number
  speaking: number
}

export interface LanguageBands {
  listening: number // CLB
  reading: number
  writing: number
  speaking: number
}

export interface ApplicantProfile {
  // Identity
  name: string
  age: number
  nocCode: string
  nocTeer: 0 | 1 | 2 | 3 | 4 | 5
  occupationTitle: string
  countryOfCitizenship: string
  countryOfResidence: string
  reportDate: string
  strategyTitle?: string
  currentEmployer?: string
  // Education
  education: EducationLevel
  hasEca: boolean
  // Language
  firstLanguageScores: LanguageScores
  hasSecondLanguage: boolean
  secondLanguageScores?: LanguageScores
  // Experience (actual years entered — scoring uses whole-year tiers)
  foreignWorkExperienceYears: number
  canadianWorkExperienceYears: number
  // Spouse
  hasSpouse: boolean
  spouseEducation?: EducationLevel
  spouseLanguageScores?: LanguageScores
  spouseCanadianExperience?: number
  // Additional
  hasProvincialNomination: boolean
  hasSiblingInCanada?: boolean       // CRS Section D: +15 pts
  hasJobOffer?: 'lmia' | 'exempt' | 'none'  // FSW adaptability: +5 pts (arranged employment)
  // Adaptability (FSW-specific)
  hasCanadianEducation: boolean
  hasFamilyInCanada: boolean
  // Finances
  settlementFunds: number // CAD
  familySize: number
  // Risk flags
  hasCriminalRecord: boolean
  hasMedicalCondition: boolean
  hasPriorRefusal: boolean
  refusalDetails?: string
  fundsSource?: string
}

export interface CrsBreakdown {
  // A: Core/human capital
  agePoints: number
  educationPoints: number
  firstLanguagePoints: number
  secondLanguagePoints: number
  canadianExpPoints: number
  spousePoints: number
  coreTotal: number
  // C: Transferability
  eduLanguageTransfer: number
  eduCanadianExpTransfer: number
  foreignExpLanguageTransfer: number
  foreignExpCanadianExpTransfer: number
  transferTotal: number
  // D: Additional
  provincialNomination: number
  siblingPoints: number
  additionalTotal: number
  // Grand total
  total: number
}

export interface FswGrid {
  language: number       // max 28
  education: number      // max 25
  workExperience: number // max 15
  age: number            // max 12
  adaptability: number   // max 10
  total: number
  eligible: boolean      // >= 67
}

export interface StreamEligibility {
  fsw: { eligible: boolean; likely: boolean; reason: string }
  cec: { eligible: boolean; likely: boolean; reason: string }
  fst: { eligible: boolean; likely: boolean; reason: string }
  expressEntryPool: { eligible: boolean; likely: boolean; reason: string }
}

export interface ScenarioProjection {
  name: string
  change: string
  currentCrs: number
  projectedCrs: number
  delta: number
  competitive: boolean // vs approximate general draw cutoff of 500+
}

// Used when the applicant is not yet Express Entry pool-eligible.
// Each entry describes one concrete FSW 67-point grid improvement.
export interface FswImprovementSuggestion {
  name: string
  action: string
  currentFswTotal: number
  projectedFswTotal: number
  pointsGained: number
  wouldQualify: boolean // projectedFswTotal >= 67
}

export interface CrsResult {
  firstLanguageBands: LanguageBands
  secondLanguageBands?: LanguageBands
  breakdown: CrsBreakdown
  fswGrid: FswGrid
  eligibility: StreamEligibility
  scenarios: ScenarioProjection[]
  // Populated only when applicant is NOT Express Entry pool-eligible.
  // Shows how to close the gap to the 67-point FSW minimum.
  fswImprovements: FswImprovementSuggestion[]
  proofOfFundsRequired: number // CAD
  proofOfFundsSufficient: boolean
}

// ── Language test → CLB conversion ──────────────────────────────────────────

// IELTS General Training to CLB conversion.
// Verified against: canada.ca/en/immigration-refugees-citizenship/services/
//   immigrate-canada/express-entry/documents/language-requirements/language-testing.html
function ieltsGtToClb(ability: 'L' | 'R' | 'W' | 'S', score: number): number {
  if (ability === 'L') {
    if (score >= 8.5) return 10
    if (score >= 8.0) return 9
    if (score >= 7.5) return 8
    if (score >= 6.0) return 7
    if (score >= 5.5) return 6
    if (score >= 5.0) return 5
    if (score >= 4.5) return 4
    return 0
  }
  if (ability === 'R') {
    if (score >= 8.0) return 10
    if (score >= 7.0) return 9
    if (score >= 6.5) return 8
    if (score >= 6.0) return 7
    if (score >= 5.0) return 6
    if (score >= 4.0) return 5
    if (score >= 3.5) return 4
    return 0
  }
  if (ability === 'W') {
    if (score >= 7.5) return 10
    if (score >= 7.0) return 9
    if (score >= 6.5) return 8
    if (score >= 6.0) return 7
    if (score >= 5.5) return 6
    if (score >= 5.0) return 5
    if (score >= 4.0) return 4
    return 0
  }
  // Speaking — same thresholds as Writing
  if (score >= 7.5) return 10
  if (score >= 7.0) return 9
  if (score >= 6.5) return 8
  if (score >= 6.0) return 7
  if (score >= 5.5) return 6
  if (score >= 5.0) return 5
  if (score >= 4.0) return 4
  return 0
}

// IELTS Academic to CLB — same reading scale as GT, different listening/writing thresholds.
function ieltsAcToClb(ability: 'L' | 'R' | 'W' | 'S', score: number): number {
  // Academic has different writing scale; L/R/S same as GT for immigration purposes.
  // IRCC treats Academic and GT identically for Express Entry conversions.
  return ieltsGtToClb(ability, score)
}

// CELPIP-General to CLB — direct 1:1 mapping per IRCC table.
function celpipToClb(score: number): number {
  if (score >= 10) return 10
  if (score >= 9) return 9
  if (score >= 8) return 8
  if (score >= 7) return 7
  if (score >= 6) return 6
  if (score >= 5) return 5
  if (score >= 4) return 4
  return 0
}

// TEF Canada to CLB (approximate — verify against canada.ca for production use).
function tefToClb(ability: 'L' | 'R' | 'W' | 'S', score: number): number {
  if (ability === 'L') {
    if (score >= 316) return 10
    if (score >= 298) return 9
    if (score >= 280) return 8
    if (score >= 249) return 7
    if (score >= 217) return 6
    if (score >= 181) return 5
    if (score >= 145) return 4
    return 0
  }
  if (ability === 'R') {
    if (score >= 263) return 10
    if (score >= 248) return 9
    if (score >= 233) return 8
    if (score >= 207) return 7
    if (score >= 181) return 6
    if (score >= 151) return 5
    if (score >= 121) return 4
    return 0
  }
  if (ability === 'W') {
    if (score >= 393) return 10
    if (score >= 371) return 9
    if (score >= 349) return 8
    if (score >= 310) return 7
    if (score >= 271) return 6
    if (score >= 226) return 5
    if (score >= 181) return 4
    return 0
  }
  // Speaking
  if (score >= 393) return 10
  if (score >= 371) return 9
  if (score >= 349) return 8
  if (score >= 310) return 7
  if (score >= 271) return 6
  if (score >= 226) return 5
  if (score >= 181) return 4
  return 0
}

// TCF Canada to CLB/NCLC. Source: canada.ca language test equivalency charts (modified 2024-03-04).
// Listening/Reading scale: 100-699. Writing/Speaking scale: 0-20.
function tcfToClb(ability: 'L' | 'R' | 'W' | 'S', score: number): number {
  if (ability === 'L') {
    if (score >= 549) return 10
    if (score >= 523) return 9
    if (score >= 503) return 8
    if (score >= 458) return 7
    if (score >= 398) return 6
    if (score >= 369) return 5
    if (score >= 331) return 4
    return 0
  }
  if (ability === 'R') {
    if (score >= 549) return 10
    if (score >= 524) return 9
    if (score >= 499) return 8
    if (score >= 453) return 7
    if (score >= 406) return 6
    if (score >= 375) return 5
    if (score >= 342) return 4
    return 0
  }
  // Writing and Speaking share the same 0-20 scale thresholds.
  if (score >= 16) return 10
  if (score >= 14) return 9
  if (score >= 12) return 8
  if (score >= 10) return 7
  if (score >= 7) return 6
  if (score >= 6) return 5
  if (score >= 4) return 4
  return 0
}

export function scoresToClb(scores: LanguageScores): LanguageBands {
  const abilities = ['L', 'R', 'W', 'S'] as const
  const rawScores = [scores.listening, scores.reading, scores.writing, scores.speaking]

  const clb = abilities.map((a, i) => {
    const s = rawScores[i] ?? 0
    switch (scores.testType) {
      case 'IELTS_GT':
        return ieltsGtToClb(a, s)
      case 'IELTS_Academic':
        return ieltsAcToClb(a, s)
      case 'CELPIP':
        return celpipToClb(s)
      case 'TEF':
        return tefToClb(a, s)
      case 'TCF':
        return tcfToClb(a, s)
      default:
        return 0
    }
  })

  return {
    listening: clb[0] ?? 0,
    reading: clb[1] ?? 0,
    writing: clb[2] ?? 0,
    speaking: clb[3] ?? 0,
  }
}

// ── Section A: Core / Human Capital ─────────────────────────────────────────

// Age points without spouse (single applicant).
// Source: canada.ca CRS criteria grid
const AGE_SINGLE: Record<number, number> = {
  17: 0, 18: 99, 19: 105,
  20: 110, 21: 110, 22: 110, 23: 110, 24: 110, 25: 110,
  26: 110, 27: 110, 28: 110, 29: 110,
  30: 105, 31: 99, 32: 94, 33: 88, 34: 83,
  35: 77, 36: 72, 37: 66, 38: 61, 39: 55,
  40: 50, 41: 39, 42: 28, 43: 17, 44: 6,
}

function agePoints(age: number, hasSpouse: boolean): number {
  if (hasSpouse) {
    // Points are lower with spouse (different table — not needed for v1 scope).
    // TODO: add with-spouse age table.
    const WITH_SPOUSE: Record<number, number> = {
      18: 90, 19: 95, 20: 100, 21: 100, 22: 100, 23: 100, 24: 100, 25: 100,
      26: 100, 27: 100, 28: 100, 29: 100,
      30: 95, 31: 90, 32: 85, 33: 80, 34: 75,
      35: 70, 36: 65, 37: 60, 38: 55, 39: 50,
      40: 45, 41: 35, 42: 25, 43: 15, 44: 5,
    }
    if (age < 18 || age >= 45) return 0
    return WITH_SPOUSE[age] ?? 0
  }
  if (age < 18 || age >= 45) return 0
  return AGE_SINGLE[age] ?? 0
}

// Factor A — Education without spouse. Source: canada.ca CRS criteria grid.
const EDU_SINGLE: Record<EducationLevel, number> = {
  less_than_secondary: 0,
  secondary: 30,
  one_year_post_secondary: 90,
  two_year_post_secondary: 98,
  bachelors: 120,
  two_or_more_degrees: 128,
  masters: 135,
  doctoral: 150,
}

// Factor A — Education with spouse. Source: canada.ca CRS criteria grid.
const EDU_WITH_SPOUSE: Record<EducationLevel, number> = {
  less_than_secondary: 0,
  secondary: 28,
  one_year_post_secondary: 84,
  two_year_post_secondary: 91,
  bachelors: 112,
  two_or_more_degrees: 119,
  masters: 126,
  doctoral: 140,
}

function educationPoints(level: EducationLevel, hasSpouse: boolean): number {
  return hasSpouse ? (EDU_WITH_SPOUSE[level] ?? 0) : (EDU_SINGLE[level] ?? 0)
}

// First language points per CLB band (no spouse).
// Verified: CLB 9 → 31, CLB 10 → 34 (3×31 + 1×34 = 127 ✓ for CLB 9/10/9/9)
function firstLangPointsPerBand(clb: number, hasSpouse: boolean): number {
  // With-spouse scale — points are lower.
  if (hasSpouse) {
    if (clb >= 10) return 32
    if (clb === 9) return 29
    if (clb === 8) return 22
    if (clb === 7) return 16
    if (clb === 6) return 8
    if (clb === 5) return 6
    return 0
  }
  if (clb >= 10) return 34
  if (clb === 9) return 31
  if (clb === 8) return 23
  if (clb === 7) return 17
  if (clb === 6) return 9
  if (clb === 5) return 6
  return 0
}

function firstLanguagePoints(bands: LanguageBands, hasSpouse: boolean): number {
  return (
    firstLangPointsPerBand(bands.listening, hasSpouse) +
    firstLangPointsPerBand(bands.reading, hasSpouse) +
    firstLangPointsPerBand(bands.writing, hasSpouse) +
    firstLangPointsPerBand(bands.speaking, hasSpouse)
  )
}

// Second language points per CLB band (no spouse).
function secondLangPointsPerBand(clb: number): number {
  if (clb >= 9) return 6
  if (clb >= 7) return 3
  if (clb >= 5) return 1
  return 0
}

function secondLanguagePoints(bands: LanguageBands): number {
  return (
    secondLangPointsPerBand(bands.listening) +
    secondLangPointsPerBand(bands.reading) +
    secondLangPointsPerBand(bands.writing) +
    secondLangPointsPerBand(bands.speaking)
  )
}

// Canadian work experience points (no spouse).
function canadianExpPoints(years: number, hasSpouse: boolean): number {
  const wholeYears = Math.floor(years)
  if (hasSpouse) {
    if (wholeYears >= 5) return 70
    if (wholeYears === 4) return 63
    if (wholeYears === 3) return 56
    if (wholeYears === 2) return 46
    if (wholeYears === 1) return 35
    return 0
  }
  if (wholeYears >= 5) return 80
  if (wholeYears === 4) return 72
  if (wholeYears === 3) return 64
  if (wholeYears === 2) return 53
  if (wholeYears === 1) return 40
  return 0
}

// ── Section C: Skill Transferability ────────────────────────────────────────

// Min CLB across all four abilities.
function minClb(bands: LanguageBands): number {
  return Math.min(bands.listening, bands.reading, bands.writing, bands.speaking)
}

// Education + first language transferability (max 50).
function eduLanguageTransfer(edu: EducationLevel, langBands: LanguageBands): number {
  const min = minClb(langBands)
  const isPostSecondary12 =
    edu === 'one_year_post_secondary' || edu === 'two_year_post_secondary'
  const isBachelorsPlus =
    edu === 'bachelors' ||
    edu === 'two_or_more_degrees' ||
    edu === 'masters' ||
    edu === 'doctoral'

  if (isPostSecondary12) {
    if (min >= 9) return 25
    if (min >= 7) return 13
    return 0
  }
  if (isBachelorsPlus) {
    if (min >= 9) return 50
    if (min >= 7) return 25
    return 0
  }
  return 0
}

// Education + Canadian work experience transferability (max 50).
// Source: canada.ca CRS criteria — 1yr CWE and 2+yr CWE are separate tiers.
function eduCanadianExpTransfer(edu: EducationLevel, canadianYears: number): number {
  const cWhole = Math.floor(canadianYears)
  if (cWhole < 1) return 0
  const isBachelorsPlus =
    edu === 'bachelors' ||
    edu === 'two_or_more_degrees' ||
    edu === 'masters' ||
    edu === 'doctoral'
  const isPostSecondary12 =
    edu === 'one_year_post_secondary' || edu === 'two_year_post_secondary'
  if (isBachelorsPlus) return cWhole >= 2 ? 50 : 25
  if (isPostSecondary12) return cWhole >= 2 ? 25 : 13
  return 0
}

// Foreign work experience + first language transferability (max 50).
// Verified: 2.25yr FWE + min CLB 9 = 25 ✓
function foreignExpLanguageTransfer(foreignYears: number, langBands: LanguageBands): number {
  const wholeYears = Math.floor(foreignYears)
  const min = minClb(langBands)
  if (wholeYears >= 3) {
    if (min >= 9) return 50
    if (min >= 7) return 25
    return 0
  }
  if (wholeYears >= 1) {
    if (min >= 9) return 25
    if (min >= 7) return 13
    return 0
  }
  return 0
}

// Foreign work experience + Canadian work experience transferability (max 50).
// Source: canada.ca CRS criteria — 1yr CWE and 2+yr CWE are separate tiers.
function foreignExpCanadianExpTransfer(foreignYears: number, canadianYears: number): number {
  const fWhole = Math.floor(foreignYears)
  const cWhole = Math.floor(canadianYears)
  if (cWhole < 1) return 0
  if (fWhole >= 3) return cWhole >= 2 ? 50 : 25
  if (fWhole >= 1) return cWhole >= 2 ? 25 : 13
  return 0
}

// ── Section D: Additional ────────────────────────────────────────────────────

// Provincial nomination: +600 points.
const PROVINCIAL_NOMINATION = 600

// ── FSW 67-Point Grid ────────────────────────────────────────────────────────

// Language score for FSW grid — per ability, capped at 24 for CLB 9+.
// Verified: CLB 9/10/9/9 = 24 ✓ (CLB 9+ per ability = 6 pts, max 24 for first language in FSW)
// Second language adds up to 4 more pts → overall language max 28.
function fswLangPerBand(clb: number): number {
  if (clb >= 9) return 6
  if (clb >= 8) return 5
  if (clb >= 7) return 4
  return 0 // Below CLB 7 = FSW minimum language not met
}

function fswLanguagePoints(
  firstBands: LanguageBands,
  secondBands?: LanguageBands
): number {
  const first =
    fswLangPerBand(firstBands.listening) +
    fswLangPerBand(firstBands.reading) +
    fswLangPerBand(firstBands.writing) +
    fswLangPerBand(firstBands.speaking)

  let second = 0
  if (secondBands) {
    second = Math.min(4,
      [secondBands.listening, secondBands.reading, secondBands.writing, secondBands.speaking]
        .filter(clb => clb >= 5)
        .length
    )
  }

  return Math.min(28, first + second)
}

// FSW education points.
// Verified: Master's = 23 ✓
const FSW_EDU: Record<EducationLevel, number> = {
  less_than_secondary: 0,
  secondary: 5,
  one_year_post_secondary: 15,
  two_year_post_secondary: 19,
  bachelors: 21,
  two_or_more_degrees: 22,
  masters: 23,
  doctoral: 25,
}

// FSW work experience points (using whole years).
// Verified: 2yr = 11 ✓
function fswWorkExpPoints(years: number): number {
  const w = Math.floor(years)
  if (w >= 6) return 15
  if (w >= 4) return 13
  if (w >= 3) return 13
  if (w === 2) return 11
  if (w === 1) return 9
  return 0
}

// FSW age points (max 12).
// Verified: age 26 = 12 ✓
function fswAgePoints(age: number): number {
  if (age >= 18 && age <= 35) return 12
  if (age === 36) return 11
  if (age === 37) return 10
  if (age === 38) return 9
  if (age === 39) return 8
  if (age === 40) return 7
  if (age === 41) return 6
  if (age === 42) return 5
  return 0
}

// FSW adaptability: Canadian study (5), prior Canadian work (5), family in Canada (5), arranged employment (5), max 10.
function fswAdaptabilityPoints(
  hasCanadianEducation: boolean,
  hasFamilyInCanada: boolean,
  canadianWorkYears: number,
  hasJobOffer?: boolean
): number {
  let pts = 0
  if (hasCanadianEducation) pts += 5
  if (hasFamilyInCanada) pts += 5
  if (Math.floor(canadianWorkYears) >= 1) pts += 5
  if (hasJobOffer) pts += 5
  return Math.min(10, pts)
}

// ── Proof of Funds ────────────────────────────────────────────────────────────
// Values live in proof-of-funds.json and are auto-updated weekly by GitHub Actions
// from canada.ca. Do not edit the numbers here — edit the JSON file.
import fundsData from './proof-of-funds.json'

function proofOfFundsRequired(familySize: number): number {
  const size = Math.max(1, familySize)
  const table = fundsData.byFamilySize as Record<string, number>
  if (size <= 7) return table[String(size)]
  return table['7'] + (size - 7) * fundsData.extraPerMember
}

// ── Stream Eligibility ───────────────────────────────────────────────────────

function assessStreamEligibility(
  profile: ApplicantProfile,
  fswGrid: FswGrid,
  firstBands: LanguageBands
): StreamEligibility {
  const minFirstLang = minClb(firstBands)
  const foreignWhole = Math.floor(profile.foreignWorkExperienceYears)
  const canadianWhole = Math.floor(profile.canadianWorkExperienceYears)
  const qualifyingTeer = profile.nocTeer <= 3

  // FSW: 67-point grid + CLB 7 minimum + qualifying NOC + 1yr foreign exp
  const fswLangOk = minFirstLang >= 7
  const fswExpOk = foreignWhole >= 1 || canadianWhole >= 1
  const fswEligible = fswGrid.eligible && fswLangOk && qualifyingTeer && fswExpOk

  let fswReason = ''
  if (!qualifyingTeer) fswReason = 'NOC TEER 4-5 does not qualify for FSW.'
  else if (!fswLangOk) fswReason = 'Minimum CLB 7 in all four abilities not met.'
  else if (!fswExpOk) fswReason = 'At least 1 year of qualifying work experience required.'
  else if (!fswGrid.eligible) fswReason = `FSW 67-point grid not met (scored ${fswGrid.total}/100).`
  else fswReason = `Scores ${fswGrid.total}/100 on FSW 67-point grid — clears the 67-point pass mark. Eligible to create profile.`

  // CEC: 1yr authorized Canadian work in TEER 0-3, CLB 7 minimum
  const cecEligible = canadianWhole >= 1 && qualifyingTeer && minFirstLang >= 7
  const cecReason = cecEligible
    ? 'Meets 1-year Canadian work experience requirement.'
    : canadianWhole < 1
    ? 'Requires at least 1 year of authorized Canadian work experience.'
    : 'NOC TEER or language requirement not met.'

  // FST: qualifying skilled trade occupation
  const fstEligible = false // NOC 21211 is not a skilled trade
  const fstReason = 'NOC TEER 1 professional occupation does not qualify as a skilled trade.'

  // Express Entry pool: eligible if eligible for any stream
  const poolEligible = fswEligible || cecEligible
  const poolReason = poolEligible
    ? 'Eligible to create and submit an Express Entry profile immediately.'
    : 'Must qualify for FSW, CEC, or FST to enter the pool.'

  return {
    fsw: { eligible: fswEligible, likely: fswEligible, reason: fswReason },
    cec: { eligible: cecEligible, likely: cecEligible, reason: cecReason },
    fst: { eligible: fstEligible, likely: false, reason: fstReason },
    expressEntryPool: { eligible: poolEligible, likely: poolEligible, reason: poolReason },
  }
}

// ── Scenario Projections ─────────────────────────────────────────────────────

function buildScenarios(
  profile: ApplicantProfile,
  currentCrs: number,
  firstBands: LanguageBands
): ScenarioProjection[] {
  const scenarios: ScenarioProjection[] = []
  const foreignWhole = Math.floor(profile.foreignWorkExperienceYears)
  const canadianWhole = Math.floor(profile.canadianWorkExperienceYears)

  // Scenario: next 1yr milestone — only when it targets below the 3yr cap (avoids duplicating the 3yr scenario)
  if (foreignWhole < 2) {
    const delta = foreignExpLanguageTransfer(foreignWhole + 1, firstBands) -
                  foreignExpLanguageTransfer(profile.foreignWorkExperienceYears, firstBands)
    if (delta > 0) {
      scenarios.push({
        name: `Wait to Hit ${foreignWhole + 1}-Year Work Mark`,
        change: `Accrue ${foreignWhole + 1} full years of foreign work experience`,
        currentCrs,
        projectedCrs: currentCrs + delta,
        delta,
        competitive: currentCrs + delta >= 480,
      })
    }
  }

  // Scenario: Hit 3yr FWE threshold (if not already there)
  if (foreignWhole < 3) {
    const delta3 = foreignExpLanguageTransfer(3, firstBands) -
                   foreignExpLanguageTransfer(profile.foreignWorkExperienceYears, firstBands)
    if (delta3 > 0) {
      scenarios.push({
        name: 'Hit 3-Year Foreign Work Mark',
        change: 'Reach 3 full years of foreign work experience',
        currentCrs,
        projectedCrs: currentCrs + delta3,
        delta: delta3,
        competitive: currentCrs + delta3 >= 480,
      })
    }
  }

  // Scenario: Language improvement — bring all CLBs to 10+
  const currentLangPts = firstLanguagePoints(firstBands, profile.hasSpouse)
  const improvedBands: LanguageBands = { listening: 10, reading: 10, writing: 10, speaking: 10 }
  const improvedLangPts = firstLanguagePoints(improvedBands, profile.hasSpouse)
  const langDelta = improvedLangPts - currentLangPts
  if (langDelta > 0) {
    scenarios.push({
      name: 'Maximize Language (CLB 10 All Abilities)',
      change: 'Achieve CLB 10 in all four language abilities',
      currentCrs,
      projectedCrs: currentCrs + langDelta,
      delta: langDelta,
      competitive: currentCrs + langDelta >= 480,
    })
  }

  // Scenario: Provincial nomination (+600)
  if (!profile.hasProvincialNomination) {
    scenarios.push({
      name: 'Provincial Nomination (PNP)',
      change: 'Receive Enhanced PNP nomination',
      currentCrs,
      projectedCrs: currentCrs + PROVINCIAL_NOMINATION,
      delta: PROVINCIAL_NOMINATION,
      competitive: true,
    })
  }

  // Scenario: 1yr Canadian work experience (if no CWE currently)
  if (canadianWhole === 0) {
    const cweDelta =
      canadianExpPoints(1, profile.hasSpouse) +
      eduCanadianExpTransfer(profile.education, 1) +
      foreignExpCanadianExpTransfer(profile.foreignWorkExperienceYears, 1)
    scenarios.push({
      name: 'Obtain 1 Year of Canadian Work Experience',
      change: '1 year of authorized Canadian work in qualifying NOC',
      currentCrs,
      projectedCrs: currentCrs + cweDelta,
      delta: cweDelta,
      competitive: currentCrs + cweDelta >= 480,
    })
  }

  return scenarios
}

// ── FSW Improvement Suggestions (for non-pool-eligible applicants) ────────────
// Tells the applicant how to improve their FSW 67-point selection factor score,
// NOT their CRS. Showing CRS scenarios when the applicant can't enter the pool
// is misleading — they must first clear 67 pts before CRS is relevant.

function buildFswImprovementSuggestions(
  profile: ApplicantProfile,
  fswGrid: FswGrid,
  firstBands: LanguageBands,
  secondBands?: LanguageBands
): FswImprovementSuggestion[] {
  const suggestions: FswImprovementSuggestion[] = []
  const current = fswGrid.total

  // Language: improve all abilities to CLB 9 (IELTS GT L8.5/R8.0/W7.5/S7.5)
  if (fswGrid.language < 24) {
    const targetBands: LanguageBands = { listening: 9, reading: 9, writing: 9, speaking: 9 }
    const improvedLang = fswLanguagePoints(targetBands, secondBands)
    const gain = improvedLang - fswGrid.language
    if (gain > 0) {
      suggestions.push({
        name: 'Improve Language to CLB 9 (All Abilities)',
        action:
          'Retake your language test targeting CLB 9 across all four abilities ' +
          '(IELTS GT: L 8.5 / R 8.0 / W 7.5 / S 7.5 or equivalent CELPIP / TEF / TCF)',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= 67,
      })
    }
  }

  // Adaptability: gain Canadian work experience (+5 pts, capped at 10 total)
  const currentHasJobOffer = profile.hasJobOffer === 'lmia' || profile.hasJobOffer === 'exempt'
  if (Math.floor(profile.canadianWorkExperienceYears) === 0 && fswGrid.adaptability < 10) {
    const newAdapt = fswAdaptabilityPoints(
      profile.hasCanadianEducation,
      profile.hasFamilyInCanada,
      1,
      currentHasJobOffer
    )
    const gain = newAdapt - fswGrid.adaptability
    if (gain > 0) {
      suggestions.push({
        name: 'Gain Canadian Work Experience',
        action:
          'Obtain at least 1 year of authorized work in Canada in a NOC TEER 0–3 occupation ' +
          '— adds 5 FSW adaptability points',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= 67,
      })
    }
  }

  // Adaptability: secure a valid job offer (+5 pts, capped at 10 total)
  if (!currentHasJobOffer && fswGrid.adaptability < 10) {
    const newAdapt = fswAdaptabilityPoints(
      profile.hasCanadianEducation,
      profile.hasFamilyInCanada,
      profile.canadianWorkExperienceYears,
      true
    )
    const gain = newAdapt - fswGrid.adaptability
    if (gain > 0) {
      suggestions.push({
        name: 'Secure a Valid Job Offer in Canada',
        action:
          'Obtain a qualifying arranged employment offer (LMIA-supported or LMIA-exempt) ' +
          'from a Canadian employer — adds 5 FSW adaptability points',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= 67,
      })
    }
  }

  // Adaptability: Canadian post-secondary education (+5 pts, capped at 10 total)
  if (!profile.hasCanadianEducation && fswGrid.adaptability < 10) {
    const newAdapt = fswAdaptabilityPoints(
      true,
      profile.hasFamilyInCanada,
      profile.canadianWorkExperienceYears,
      currentHasJobOffer
    )
    const gain = newAdapt - fswGrid.adaptability
    if (gain > 0) {
      suggestions.push({
        name: 'Complete a Canadian Study Program',
        action:
          'Study full-time in Canada in a post-secondary program of at least 2 academic years ' +
          '— adds 5 FSW adaptability points',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= 67,
      })
    }
  }

  // Adaptability: spouse/partner language CLB 4+ in all four abilities (+5 pts, capped at 10)
  // Source: canada.ca FSW adaptability — "spouse or common-law partner's language level"
  if (profile.hasSpouse && fswGrid.adaptability < 10) {
    const spouseLang = profile.spouseLanguageScores
    const spouseAlreadyHasCLB4 = spouseLang !== undefined && (() => {
      const b = scoresToClb(spouseLang)
      return Math.min(b.listening, b.reading, b.writing, b.speaking) >= 4
    })()
    if (!spouseAlreadyHasCLB4) {
      const newAdapt = Math.min(10, fswGrid.adaptability + 5)
      const gain = newAdapt - fswGrid.adaptability
      if (gain > 0) {
        suggestions.push({
          name: "Spouse/Partner Language Test (CLB 4+ in All Four Abilities)",
          action:
            'Have your accompanying spouse or partner take an approved language test ' +
            '(IELTS GT, CELPIP, TEF Canada, or TCF Canada) and achieve CLB 4 in ' +
            'Listening, Reading, Writing, and Speaking — adds 5 FSW adaptability points',
          currentFswTotal: current,
          projectedFswTotal: current + gain,
          pointsGained: gain,
          wouldQualify: current + gain >= 67,
        })
      }
    }
  }

  // Adaptability: spouse/partner's past work in Canada (1+ year) (+5 pts, capped at 10)
  // Source: canada.ca FSW adaptability — "spouse or common-law partner's past work in Canada"
  if (profile.hasSpouse && fswGrid.adaptability < 10) {
    const spouseCwe = Math.floor(profile.spouseCanadianExperience ?? 0)
    if (spouseCwe < 1) {
      const newAdapt = Math.min(10, fswGrid.adaptability + 5)
      const gain = newAdapt - fswGrid.adaptability
      if (gain > 0) {
        suggestions.push({
          name: "Spouse/Partner Canadian Work Experience (1+ Year)",
          action:
            'Your accompanying spouse or partner can earn 5 FSW adaptability points by ' +
            'completing at least 1 year of full-time authorized work in Canada on a valid ' +
            'work permit',
          currentFswTotal: current,
          projectedFswTotal: current + gain,
          pointsGained: gain,
          wouldQualify: current + gain >= 67,
        })
      }
    }
  }

  // Adaptability: spouse/partner's past studies in Canada (2+ years) (+5 pts, capped at 10)
  // Source: canada.ca FSW adaptability — "spouse or common-law partner's past studies in Canada"
  // No profile field captures this — always surface for married applicants with room in adaptability.
  if (profile.hasSpouse && fswGrid.adaptability < 10) {
    const newAdapt = Math.min(10, fswGrid.adaptability + 5)
    const gain = newAdapt - fswGrid.adaptability
    if (gain > 0) {
      suggestions.push({
        name: "Spouse/Partner Past Studies in Canada (2+ Years)",
        action:
          'Your accompanying spouse or partner can earn 5 FSW adaptability points by ' +
          'completing at least 2 academic years of full-time study at a secondary or ' +
          'post-secondary school in Canada',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= 67,
      })
    }
  }

  // Work experience: more years toward the 6-year cap (if not already at max 15 pts)
  if (fswGrid.workExperience < 15) {
    const targetExp = fswWorkExpPoints(6)
    const gain = targetExp - fswGrid.workExperience
    if (gain > 0) {
      suggestions.push({
        name: 'Accumulate More Foreign Work Experience',
        action:
          'Continue accruing qualifying work experience to reach the 6-year tier ' +
          '(maximum 15 FSW work experience points)',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= 67,
      })
    }
  }

  // Sort by impact descending so the highest-gain action appears first
  suggestions.sort((a, b) => b.pointsGained - a.pointsGained)

  return suggestions
}

// ── Section B: Spouse / Common-Law Partner Factors ──────────────────────────

// Factor B — Spouse education (max 10 pts). Source: canada.ca CRS criteria grid.
const SPOUSE_EDU: Record<EducationLevel, number> = {
  less_than_secondary: 0,
  secondary: 2,
  one_year_post_secondary: 6,
  two_year_post_secondary: 7,
  bachelors: 8,
  two_or_more_degrees: 9,
  masters: 10,
  doctoral: 10,
}

// Factor B — Spouse language points per CLB band (max 5 per ability = 20 pts total).
// Source: canada.ca CRS criteria grid.
function spouseLangPointsPerBand(clb: number): number {
  if (clb >= 9) return 5
  if (clb >= 7) return 3
  if (clb >= 5) return 1
  return 0
}

// Factor B — Spouse Canadian work experience (max 10 pts).
// Source: canada.ca CRS criteria grid.
function spouseCwePoints(years: number): number {
  const w = Math.floor(years)
  if (w >= 5) return 10
  if (w === 4) return 9
  if (w === 3) return 8
  if (w === 2) return 7
  if (w === 1) return 5
  return 0
}

// ── Main calculate function ──────────────────────────────────────────────────

export function calculate(profile: ApplicantProfile): CrsResult {
  const firstBands = scoresToClb(profile.firstLanguageScores)
  const secondBands = profile.hasSecondLanguage && profile.secondLanguageScores
    ? scoresToClb(profile.secondLanguageScores)
    : undefined

  // Section A — Core
  const agePoints_ = agePoints(profile.age, profile.hasSpouse)
  const educationPoints_ = educationPoints(profile.education, profile.hasSpouse)
  const firstLangPoints = firstLanguagePoints(firstBands, profile.hasSpouse)
  const secondLangPoints = secondBands ? secondLanguagePoints(secondBands) : 0
  const canadianExp = canadianExpPoints(profile.canadianWorkExperienceYears, profile.hasSpouse)

  // Factor B — Spouse/partner contribution using correct IRCC Factor B tables (max 40 pts).
  // These are NOT the same as the applicant's Factor A tables — spouse points are much lower.
  let spousePoints = 0
  if (profile.hasSpouse) {
    if (profile.spouseEducation) {
      spousePoints += SPOUSE_EDU[profile.spouseEducation] ?? 0
    }
    if (profile.spouseLanguageScores) {
      const spBands = scoresToClb(profile.spouseLanguageScores)
      spousePoints += spouseLangPointsPerBand(spBands.listening)
        + spouseLangPointsPerBand(spBands.reading)
        + spouseLangPointsPerBand(spBands.writing)
        + spouseLangPointsPerBand(spBands.speaking)
    }
    if (profile.spouseCanadianExperience) {
      spousePoints += spouseCwePoints(profile.spouseCanadianExperience)
    }
  }

  const coreTotal = agePoints_ + educationPoints_ + firstLangPoints + secondLangPoints + canadianExp + spousePoints

  // Section C — Transferability
  const eduLangTr = eduLanguageTransfer(profile.education, firstBands)
  const eduCanTr = eduCanadianExpTransfer(profile.education, profile.canadianWorkExperienceYears)
  const foreignLangTr = foreignExpLanguageTransfer(profile.foreignWorkExperienceYears, firstBands)
  const foreignCanTr = foreignExpCanadianExpTransfer(
    profile.foreignWorkExperienceYears,
    profile.canadianWorkExperienceYears
  )
  const transferTotal = Math.min(100, eduLangTr + eduCanTr + foreignLangTr + foreignCanTr)

  // Section D — Additional
  const provinceNom = profile.hasProvincialNomination ? PROVINCIAL_NOMINATION : 0
  const siblingPts = profile.hasSiblingInCanada ? 15 : 0
  const additionalTotal = provinceNom + siblingPts

  const total = coreTotal + transferTotal + additionalTotal

  const breakdown: CrsBreakdown = {
    agePoints: agePoints_,
    educationPoints: educationPoints_,
    firstLanguagePoints: firstLangPoints,
    secondLanguagePoints: secondLangPoints,
    canadianExpPoints: canadianExp,
    spousePoints,
    coreTotal,
    eduLanguageTransfer: eduLangTr,
    eduCanadianExpTransfer: eduCanTr,
    foreignExpLanguageTransfer: foreignLangTr,
    foreignExpCanadianExpTransfer: foreignCanTr,
    transferTotal,
    provincialNomination: provinceNom,
    siblingPoints: siblingPts,
    additionalTotal,
    total,
  }

  // FSW grid
  const fswLang = fswLanguagePoints(firstBands, secondBands)
  const fswEdu = FSW_EDU[profile.education] ?? 0
  const fswExp = fswWorkExpPoints(profile.foreignWorkExperienceYears)
  const fswAge = fswAgePoints(profile.age)
  const fswAdapt = fswAdaptabilityPoints(
    profile.hasCanadianEducation,
    profile.hasFamilyInCanada,
    profile.canadianWorkExperienceYears,
    profile.hasJobOffer === 'lmia' || profile.hasJobOffer === 'exempt'
  )
  const fswTotal = fswLang + fswEdu + fswExp + fswAge + fswAdapt
  const fswGrid: FswGrid = {
    language: fswLang,
    education: fswEdu,
    workExperience: fswExp,
    age: fswAge,
    adaptability: fswAdapt,
    total: fswTotal,
    eligible: fswTotal >= 67,
  }

  const eligibility = assessStreamEligibility(profile, fswGrid, firstBands)
  const scenarios = buildScenarios(profile, total, firstBands)

  // Only compute FSW improvement suggestions when the applicant cannot enter the pool.
  // When pool-eligible, CRS scenarios are what matter — not the 67-point grid.
  const fswImprovements = !eligibility.expressEntryPool.eligible
    ? buildFswImprovementSuggestions(profile, fswGrid, firstBands, secondBands)
    : []

  const fundsRequired = proofOfFundsRequired(profile.familySize)

  return {
    firstLanguageBands: firstBands,
    secondLanguageBands: secondBands,
    breakdown,
    fswGrid,
    eligibility,
    scenarios,
    fswImprovements,
    proofOfFundsRequired: fundsRequired,
    proofOfFundsSufficient: profile.settlementFunds >= fundsRequired,
  }
}
