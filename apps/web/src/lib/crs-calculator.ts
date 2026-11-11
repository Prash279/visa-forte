// CRS calculation engine — rules in force since 3 November 2026.
// All point tables live in crs-rules.json. To update any value (e.g. when IRCC
// changes the CRS grid), edit that JSON file only.
//
// What changed on 3 November 2026 (canada.ca crs-criteria.html, modified 2026-11-03):
// the old "Canadian work experience" line became the Labour Market Integration
// (LMI) factor. It awards the HIGHER of
//   (a) Canadian work-length points + extra points for 12+ months in a
//       high-wage occupation (70 / 40 / 20), or
//   (b) a valid job offer in a high-wage occupation (100 / 70 / 50),
// never both. No LMIA is needed for any Express Entry job offer, and the CRS
// maximum is now 1,270 (core 570 single / 530 with a spouse).
//
// Source: canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/
//   express-entry/check-score/crs-criteria.html

import rules from './crs-rules.json';
import fundsData from './proof-of-funds.json';
import { CRS_RULES_VERSION } from './crs-rules.version';

// ── Types ────────────────────────────────────────────────────────────────────

export type EducationLevel =
  | 'less_than_secondary'
  | 'secondary'
  | 'one_year_post_secondary'
  | 'two_year_post_secondary'
  | 'bachelors'
  | 'two_or_more_degrees'
  | 'masters'
  | 'doctoral';

// CRS Section D Canadian-education bonus tier. Distinct from the FSW adaptability
// `hasCanadianEducation` flag — different grid, different threshold.
export type CanadianEducationLevel =
  'none' | 'one_or_two_year' | 'three_year_plus';

export type LanguageTestType =
  'IELTS_GT' | 'IELTS_Academic' | 'CELPIP' | 'TEF' | 'TCF';

export interface LanguageScores {
  testType: LanguageTestType;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

export interface LanguageBands {
  listening: number; // CLB
  reading: number;
  writing: number;
  speaking: number;
}

// One Canadian job, for the high-wage part of the LMI factor. `months` is
// full-time-equivalent months (30 h/week; part-time converted pro rata; jobs
// held at the same time count only up to 30 h/week) within the last 10 years.
export interface CanadianJob {
  nocCode: string;
  months: number;
}

export interface ApplicantProfile {
  // Identity
  name: string;
  age: number;
  nocCode: string;
  nocTeer: 0 | 1 | 2 | 3 | 4 | 5;
  occupationTitle: string;
  jobDuties?: string; // free-text duties; powers the PNP duties→NOC classifier (ignored by CRS scoring)
  countryOfCitizenship: string;
  countryOfResidence: string;
  reportDate: string;
  strategyTitle?: string;
  currentEmployer?: string;
  // Education
  education: EducationLevel;
  hasEca: boolean;
  // Language
  firstLanguageScores: LanguageScores;
  hasSecondLanguage: boolean;
  secondLanguageScores?: LanguageScores;
  // Experience (actual years entered — scoring uses whole-year tiers)
  foreignWorkExperienceYears: number;
  canadianWorkExperienceYears: number;
  // Spouse
  hasSpouse: boolean;
  spouseEducation?: EducationLevel;
  spouseLanguageScores?: LanguageScores;
  spouseCanadianExperience?: number;
  // Additional
  hasProvincialNomination: boolean;
  hasSiblingInCanada?: boolean; // CRS Section D: see crs-rules.json sectionD.sibling
  canadianEducationLevel?: CanadianEducationLevel; // CRS Section D bonus (15/30); see crs-rules.json sectionD.canadianEducation
  // Valid job offer (LMIA no longer needed since 2026-11-03). Drives FSW
  // arranged employment (10) and adaptability (5), FST eligibility, the
  // proof-of-funds exemption and, when jobOfferNocCode is a high-wage
  // occupation, CRS job-offer points.
  hasJobOffer?: 'valid' | 'none';
  jobOfferNocCode?: string;
  // Canadian work by NOC for high-wage experience points (see CanadianJob).
  canadianJobs?: CanadianJob[];
  // Two high-wage Canadian jobs held at the same time: the high-wage tier is
  // held for Prash's review rather than awarded (Visa Forte ruling D1).
  canadianJobsOverlap?: boolean;
  // Canadian certificate of qualification in a skilled trade (CRS Section C, FST).
  hasCertificateOfQualification?: boolean;
  // Accompanying spouse completed 2+ years of full-time study in Canada (FSW adaptability).
  spouseHasCanadianStudy?: boolean;
  // Adaptability (FSW-specific)
  hasCanadianEducation: boolean;
  hasFamilyInCanada: boolean;
  // Finances
  settlementFunds: number; // CAD
  familySize: number;
  // Risk flags
  hasCriminalRecord: boolean;
  hasMedicalCondition: boolean;
  hasPriorRefusal: boolean;
  refusalDetails?: string;
  fundsSource?: string;
}

export interface CrsBreakdown {
  // A: Core/human capital
  agePoints: number;
  educationPoints: number;
  firstLanguagePoints: number;
  secondLanguagePoints: number;
  // Labour Market Integration points actually awarded (the higher option).
  // Kept under its historical name so every consumer that sums the
  // breakdown stays correct; see `lmi` for the parts.
  canadianExpPoints: number;
  lmi: LmiDetail;
  spousePoints: number;
  coreTotal: number;
  // C: Transferability
  eduLanguageTransfer: number;
  eduCanadianExpTransfer: number;
  foreignExpLanguageTransfer: number;
  foreignExpCanadianExpTransfer: number;
  certificateTransfer: number;
  transferTotal: number;
  // D: Additional
  provincialNomination: number;
  siblingPoints: number;
  frenchBonusPoints: number;
  canadianEducationPoints: number;
  additionalTotal: number;
  // Grand total
  total: number;
}

// The two LMI options and which one counted.
export interface LmiDetail {
  workLengthPoints: number;
  highWagePoints: number;
  highWageLevel: 0 | 1 | 2 | 3; // 0 = no high-wage tier reached
  jobOfferPoints: number;
  jobOfferLevel: 0 | 1 | 2 | 3; // 0 = no offer, or offer not in a high-wage occupation
  option: 'work' | 'offer';
  awarded: number;
  highWageHeldForReview: boolean; // overlapping high-wage jobs (ruling D1)
}

export interface FswGrid {
  language: number; // max 28
  education: number; // max 25
  workExperience: number; // max 15
  age: number; // max 12
  arrangedEmployment: number; // max 10
  adaptability: number; // max 10
  total: number;
  eligible: boolean; // >= passmark in crs-rules.json
}

export interface StreamEligibility {
  fsw: { eligible: boolean; likely: boolean; reason: string };
  cec: { eligible: boolean; likely: boolean; reason: string };
  fst: { eligible: boolean; likely: boolean; reason: string };
  expressEntryPool: { eligible: boolean; likely: boolean; reason: string };
}

export interface ScenarioProjection {
  name: string;
  change: string;
  currentCrs: number;
  projectedCrs: number;
  delta: number;
  competitive: boolean; // vs approximate general draw cutoff of 500+
}

// Used when the applicant is not yet Express Entry pool-eligible.
// Each entry describes one concrete FSW 67-point grid improvement.
export interface FswImprovementSuggestion {
  name: string;
  action: string;
  currentFswTotal: number;
  projectedFswTotal: number;
  pointsGained: number;
  wouldQualify: boolean; // projectedFswTotal >= passmark
}

export interface CrsResult {
  firstLanguageBands: LanguageBands;
  secondLanguageBands?: LanguageBands;
  breakdown: CrsBreakdown;
  fswGrid: FswGrid;
  eligibility: StreamEligibility;
  scenarios: ScenarioProjection[];
  // Populated only when applicant is NOT Express Entry pool-eligible.
  fswImprovements: FswImprovementSuggestion[];
  // Applicant claimed foreign education but has not confirmed an ECA yet.
  // Every education-derived point in this result (Section A, Section C, FSW
  // grid) is scored AS IF that education will assess as declared — every
  // consumer (report UI, PDF export, email) must render a visible caveat
  // wherever those numbers appear whenever this is true.
  ecaPending: boolean;
  proofOfFundsRequired: number; // CAD
  // True when no proof of funds is needed: CEC, or a valid job offer with or
  // without an LMIA (canada.ca "Express Entry: Job offer"; ruling D6).
  proofOfFundsExempt: boolean;
  proofOfFundsExemptReason: string;
  proofOfFundsSufficient: boolean; // exempt, or funds >= required
  maxTotal: number; // CRS maximum (1,270 since 2026-11-03)
  // 8-char SHA-256 prefix of crs-rules.json at build time.
  // Ties every result to the exact rule file that produced it.
  rulesVersion: string;
}

// ── JSON lookup helpers ──────────────────────────────────────────────────────

// Generic score ≥ threshold → CLB (thresholds sorted descending by min).
function fromMinThresholds(
  thresholds: ReadonlyArray<{ readonly min: number; readonly clb: number }>,
  score: number,
): number {
  for (const t of thresholds) {
    if (score >= t.min) return t.clb;
  }
  return 0;
}

// CLB ≥ threshold → points (thresholds sorted descending by minClb).
function fromClbPts(
  thresholds: ReadonlyArray<{
    readonly minClb: number;
    readonly points: number;
  }>,
  clb: number,
): number {
  for (const t of thresholds) {
    if (clb >= t.minClb) return t.points;
  }
  return 0;
}

// Whole years ≥ threshold → points (thresholds sorted descending by minYears).
function fromYearsPts(
  thresholds: ReadonlyArray<{
    readonly minYears: number;
    readonly points: number;
  }>,
  years: number,
): number {
  const w = Math.floor(years);
  for (const t of thresholds) {
    if (w >= t.minYears) return t.points;
  }
  return 0;
}

// ── High-wage occupations and job offers ─────────────────────────────────────

// The CRS maximum, read from crs-rules.json (1,270 since 2026-11-03).
export const CRS_MAX_TOTAL: number = rules.meta.crsMaxTotal;

// High-wage level (1, 2 or 3) of a NOC 2021 code on IRCC's list, or 0 when the
// occupation is not on the list. Decided by the NOC, never the person's salary.
export function highWageLevel(nocCode: string | undefined): 0 | 1 | 2 | 3 {
  if (!nocCode) return 0;
  const levels = rules.highWageOccupations.levels as Record<string, number>;
  const lvl = levels[nocCode.trim()];
  return lvl === 1 || lvl === 2 || lvl === 3 ? lvl : 0;
}

// TEER of a 5-digit NOC 2021 code (its second digit), or undefined if invalid.
function teerOf(nocCode: string | undefined): number | undefined {
  if (!nocCode || !/^\d{5}$/.test(nocCode.trim())) return undefined;
  return Number(nocCode.trim()[1]);
}

// FST skilled trades (canada.ca "Express Entry: Job offer"): major groups 72
// (not 726), 73, 82, 83, 92, 93 (not 932), minor group 6320, unit group 62200.
export function isSkilledTrade(nocCode: string | undefined): boolean {
  const n = (nocCode ?? '').trim();
  if (!/^\d{5}$/.test(n)) return false;
  if (['72', '73', '82', '83', '92', '93'].includes(n.slice(0, 2)))
    return !n.startsWith('726') && !n.startsWith('932');
  return n.startsWith('6320') || n === '62200';
}

function hasValidJobOffer(profile: ApplicantProfile): boolean {
  return profile.hasJobOffer === 'valid';
}

// ── Language test → CLB conversion ──────────────────────────────────────────

function ieltsGtToClb(ability: 'L' | 'R' | 'W' | 'S', score: number): number {
  return fromMinThresholds(rules.languageConversion.IELTS_GT[ability], score);
}

function ieltsAcToClb(ability: 'L' | 'R' | 'W' | 'S', score: number): number {
  return fromMinThresholds(
    rules.languageConversion.IELTS_Academic[ability],
    score,
  );
}

function celpipToClb(score: number): number {
  return fromMinThresholds(rules.languageConversion.CELPIP.all, score);
}

function tefToClb(ability: 'L' | 'R' | 'W' | 'S', score: number): number {
  return fromMinThresholds(rules.languageConversion.TEF[ability], score);
}

function tcfToClb(ability: 'L' | 'R' | 'W' | 'S', score: number): number {
  // W and S share the same 0-20 scale; L and R use the 100-699 scale.
  if (ability === 'L')
    return fromMinThresholds(rules.languageConversion.TCF.L, score);
  if (ability === 'R')
    return fromMinThresholds(rules.languageConversion.TCF.R, score);
  return fromMinThresholds(rules.languageConversion.TCF.WS, score);
}

export function scoresToClb(scores: LanguageScores): LanguageBands {
  const abilities = ['L', 'R', 'W', 'S'] as const;
  const rawScores = [
    scores.listening,
    scores.reading,
    scores.writing,
    scores.speaking,
  ];

  const clb = abilities.map((a, i) => {
    const s = rawScores[i] ?? 0;
    switch (scores.testType) {
      case 'IELTS_GT':
        return ieltsGtToClb(a, s);
      case 'IELTS_Academic':
        return ieltsAcToClb(a, s);
      case 'CELPIP':
        return celpipToClb(s);
      case 'TEF':
        return tefToClb(a, s);
      case 'TCF':
        return tcfToClb(a, s);
      default:
        return 0;
    }
  });

  return {
    listening: clb[0] ?? 0,
    reading: clb[1] ?? 0,
    writing: clb[2] ?? 0,
    speaking: clb[3] ?? 0,
  };
}

// ── Section A: Core / Human Capital ─────────────────────────────────────────

function agePoints(age: number, hasSpouse: boolean): number {
  if (age < 18 || age >= 45) return 0;
  const table = (
    hasSpouse ? rules.sectionA.ageWithSpouse : rules.sectionA.ageSingle
  ) as Record<string, number>;
  return table[String(age)] ?? 0;
}

function educationPoints(level: EducationLevel, hasSpouse: boolean): number {
  const table = (
    hasSpouse
      ? rules.sectionA.educationWithSpouse
      : rules.sectionA.educationSingle
  ) as Record<EducationLevel, number>;
  return table[level] ?? 0;
}

function firstLangPointsPerBand(clb: number, hasSpouse: boolean): number {
  return fromClbPts(
    hasSpouse
      ? rules.sectionA.firstLanguageWithSpouse
      : rules.sectionA.firstLanguageSingle,
    clb,
  );
}

function firstLanguagePoints(bands: LanguageBands, hasSpouse: boolean): number {
  return (
    firstLangPointsPerBand(bands.listening, hasSpouse) +
    firstLangPointsPerBand(bands.reading, hasSpouse) +
    firstLangPointsPerBand(bands.writing, hasSpouse) +
    firstLangPointsPerBand(bands.speaking, hasSpouse)
  );
}

function secondLangPointsPerBand(clb: number): number {
  return fromClbPts(rules.sectionA.secondLanguage, clb);
}

function secondLanguagePoints(bands: LanguageBands): number {
  return (
    secondLangPointsPerBand(bands.listening) +
    secondLangPointsPerBand(bands.reading) +
    secondLangPointsPerBand(bands.writing) +
    secondLangPointsPerBand(bands.speaking)
  );
}

function canadianExpPoints(years: number, hasSpouse: boolean): number {
  return fromYearsPts(
    hasSpouse
      ? rules.sectionA.canadianExpWithSpouse
      : rules.sectionA.canadianExpSingle,
    years,
  );
}

// High-wage experience tier from the Canadian jobs list: level 1 if 12+ months
// at level 1; else level 2 if 12+ months combined at levels 1-2; else level 3
// if 12+ months combined at levels 1-3 (canada.ca express-entry/changes.html).
// Months are capped at the applicant's total Canadian months, so the list can
// never claim more experience than the work-length entry.
function highWageTier(profile: ApplicantProfile): 0 | 1 | 2 | 3 {
  const lmi = rules.sectionA.labourMarketIntegration;
  const totalMonths = Math.floor(profile.canadianWorkExperienceYears * 12);
  if (totalMonths < lmi.minHighWageMonths) return 0;
  const byLevel = [0, 0, 0, 0];
  for (const job of profile.canadianJobs ?? []) {
    const lvl = highWageLevel(job.nocCode);
    if (lvl > 0 && job.months > 0) byLevel[lvl] += job.months;
  }
  const cap = (m: number): number => Math.min(m, totalMonths);
  if (cap(byLevel[1]) >= lmi.minHighWageMonths) return 1;
  if (cap(byLevel[1] + byLevel[2]) >= lmi.minHighWageMonths) return 2;
  if (cap(byLevel[1] + byLevel[2] + byLevel[3]) >= lmi.minHighWageMonths)
    return 3;
  return 0;
}

function tierPoints(
  table: { level1: number; level2: number; level3: number },
  level: 0 | 1 | 2 | 3,
): number {
  if (level === 1) return table.level1;
  if (level === 2) return table.level2;
  if (level === 3) return table.level3;
  return 0;
}

// Labour Market Integration factor: the higher of Canadian work (work-length +
// high-wage experience) and a high-wage job offer, never both, capped at
// 150 single / 140 with a spouse.
function labourMarketIntegration(profile: ApplicantProfile): LmiDetail {
  const lmi = rules.sectionA.labourMarketIntegration;
  const workLengthPoints = canadianExpPoints(
    profile.canadianWorkExperienceYears,
    profile.hasSpouse,
  );
  const reachedTier = highWageTier(profile);
  const held = reachedTier > 0 && profile.canadianJobsOverlap === true;
  const highWageLevel_ = held ? 0 : reachedTier;
  const highWagePoints = tierPoints(lmi.highWageExperience, highWageLevel_);
  const jobOfferLevel = hasValidJobOffer(profile)
    ? highWageLevel(profile.jobOfferNocCode)
    : 0;
  const jobOfferPoints = tierPoints(lmi.jobOffer, jobOfferLevel);
  const workOption = workLengthPoints + highWagePoints;
  const option: 'work' | 'offer' =
    workOption >= jobOfferPoints ? 'work' : 'offer';
  const cap = profile.hasSpouse ? lmi.maxWithSpouse : lmi.maxSingle;
  const awarded = Math.min(
    cap,
    option === 'work' ? workOption : jobOfferPoints,
  );
  return {
    workLengthPoints,
    highWagePoints,
    highWageLevel: highWageLevel_,
    jobOfferPoints,
    jobOfferLevel,
    option,
    awarded,
    highWageHeldForReview: held,
  };
}

// ── Section C: Skill Transferability ────────────────────────────────────────

function minClb(bands: LanguageBands): number {
  return Math.min(
    bands.listening,
    bands.reading,
    bands.writing,
    bands.speaking,
  );
}

function eduLanguageTransfer(
  edu: EducationLevel,
  langBands: LanguageBands,
): number {
  const min = minClb(langBands);
  // IRCC's official table (canada.ca CRS criteria) puts a single bachelor's degree
  // in the same "one credential, 1yr+" tier as a 1-2yr post-secondary credential —
  // the higher tier is only for 2+ credentials (one 3yr+), master's, or doctoral.
  const isPostSecondary12 =
    edu === 'one_year_post_secondary' ||
    edu === 'two_year_post_secondary' ||
    edu === 'bachelors';
  const isBachelorsPlus =
    edu === 'two_or_more_degrees' || edu === 'masters' || edu === 'doctoral';
  const cfg = rules.sectionC.eduLanguage;

  if (isPostSecondary12) {
    if (min >= 9) return cfg.postSecondary12.clb9;
    if (min >= 7) return cfg.postSecondary12.clb7;
    return 0;
  }
  if (isBachelorsPlus) {
    if (min >= 9) return cfg.bachelorsPlus.clb9;
    if (min >= 7) return cfg.bachelorsPlus.clb7;
    return 0;
  }
  return 0;
}

function eduCanadianExpTransfer(
  edu: EducationLevel,
  canadianYears: number,
): number {
  const cWhole = Math.floor(canadianYears);
  if (cWhole < 1) return 0;
  // Same tier split as eduLanguageTransfer above — a single bachelor's degree
  // belongs with the 1-2yr post-secondary tier, not the 2+ credential tier.
  const isBachelorsPlus =
    edu === 'two_or_more_degrees' || edu === 'masters' || edu === 'doctoral';
  const isPostSecondary12 =
    edu === 'one_year_post_secondary' ||
    edu === 'two_year_post_secondary' ||
    edu === 'bachelors';
  const cfg = rules.sectionC.eduCanadianExp;

  if (isBachelorsPlus)
    return cWhole >= 2 ? cfg.bachelorsPlus.cwe2plus : cfg.bachelorsPlus.cwe1;
  if (isPostSecondary12)
    return cWhole >= 2
      ? cfg.postSecondary12.cwe2plus
      : cfg.postSecondary12.cwe1;
  return 0;
}

function foreignExpLanguageTransfer(
  foreignYears: number,
  langBands: LanguageBands,
): number {
  const w = Math.floor(foreignYears);
  const min = minClb(langBands);
  const cfg = rules.sectionC.foreignExpLanguage;

  if (w >= 3) {
    if (min >= 9) return cfg.fwe3plus.clb9;
    if (min >= 7) return cfg.fwe3plus.clb7;
    return 0;
  }
  if (w >= 1) {
    if (min >= 9) return cfg.fwe1plus.clb9;
    if (min >= 7) return cfg.fwe1plus.clb7;
    return 0;
  }
  return 0;
}

// Certificate of qualification + language (CRS Section C, max 50): CLB 7+ in
// all four first-language abilities = 50; CLB 5+ in all four = 25.
function certificateTransfer(
  hasCertificate: boolean | undefined,
  langBands: LanguageBands,
): number {
  if (!hasCertificate) return 0;
  const min = minClb(langBands);
  const cfg = rules.sectionC.certificateOfQualification;
  if (min >= 7) return cfg.clb7AllFour;
  if (min >= 5) return cfg.clb5AllFour;
  return 0;
}

function foreignExpCanadianExpTransfer(
  foreignYears: number,
  canadianYears: number,
): number {
  const fWhole = Math.floor(foreignYears);
  const cWhole = Math.floor(canadianYears);
  if (cWhole < 1) return 0;
  const cfg = rules.sectionC.foreignExpCanadianExp;

  if (fWhole >= 3)
    return cWhole >= 2 ? cfg.fwe3plus.cwe2plus : cfg.fwe3plus.cwe1;
  if (fWhole >= 1)
    return cWhole >= 2 ? cfg.fwe1plus.cwe2plus : cfg.fwe1plus.cwe1;
  return 0;
}

// ── FSW 67-Point Grid ────────────────────────────────────────────────────────

function fswLangPerBand(clb: number): number {
  return fromClbPts(rules.fsw.languagePerBand, clb);
}

function fswLanguagePoints(
  firstBands: LanguageBands,
  secondBands?: LanguageBands,
): number {
  const first =
    fswLangPerBand(firstBands.listening) +
    fswLangPerBand(firstBands.reading) +
    fswLangPerBand(firstBands.writing) +
    fswLangPerBand(firstBands.speaking);

  // Second official language: 4 points only when CLB 5+ in ALL four abilities
  // (canada.ca federal-skilled-workers.html, modified 2026-11-03).
  let second = 0;
  if (
    secondBands &&
    allAbilitiesAtLeast(secondBands, rules.fsw.secondLanguageMinClb)
  ) {
    second = rules.fsw.secondLanguageAllFourPoints;
  }

  return Math.min(rules.fsw.maxLanguageTotal, first + second);
}

function fswWorkExpPoints(years: number): number {
  return fromYearsPts(rules.fsw.workExp, years);
}

function fswAgePoints(age: number): number {
  const table = rules.fsw.agePoints as Record<string, number>;
  return table[String(age)] ?? 0;
}

// FSW adaptability (max 10, 5 per element; canada.ca six selection factors):
// your past study in Canada, your past work in Canada (1+ year), arranged
// employment, relatives in Canada, and — with an accompanying spouse — the
// spouse's language (CLB 4+ in all four), past study and past work in Canada.
interface AdaptabilityInputs {
  hasCanadianEducation: boolean;
  hasFamilyInCanada: boolean;
  canadianWorkYears: number;
  hasJobOffer: boolean;
  spouseLanguageClb4: boolean;
  spouseCanadianStudy: boolean;
  spouseCanadianWorkYears: number;
}

function adaptabilityInputs(profile: ApplicantProfile): AdaptabilityInputs {
  const spouseBands =
    profile.hasSpouse && profile.spouseLanguageScores
      ? scoresToClb(profile.spouseLanguageScores)
      : undefined;
  return {
    hasCanadianEducation: profile.hasCanadianEducation,
    hasFamilyInCanada: profile.hasFamilyInCanada,
    canadianWorkYears: profile.canadianWorkExperienceYears,
    hasJobOffer: fswArrangedEmploymentValid(profile),
    spouseLanguageClb4:
      spouseBands !== undefined &&
      allAbilitiesAtLeast(
        spouseBands,
        rules.fsw.adaptabilitySpouseLanguageMinClb,
      ),
    spouseCanadianStudy:
      profile.hasSpouse && profile.spouseHasCanadianStudy === true,
    spouseCanadianWorkYears: profile.hasSpouse
      ? (profile.spouseCanadianExperience ?? 0)
      : 0,
  };
}

function fswAdaptabilityPoints(a: AdaptabilityInputs): number {
  const perFactor = rules.fsw.adaptabilityPerFactor;
  let pts = 0;
  if (a.hasCanadianEducation) pts += perFactor;
  if (a.hasFamilyInCanada) pts += perFactor;
  // Your own past work in Canada is worth 10, not 5 (six selection factors page).
  if (Math.floor(a.canadianWorkYears) >= 1)
    pts += rules.fsw.adaptabilityOwnCanadianWork;
  if (a.hasJobOffer) pts += perFactor;
  if (a.spouseLanguageClb4) pts += perFactor;
  if (a.spouseCanadianStudy) pts += perFactor;
  if (Math.floor(a.spouseCanadianWorkYears) >= 1) pts += perFactor;
  return Math.min(rules.fsw.adaptabilityMax, pts);
}

// FSW arranged employment (10 points): a valid offer in a TEER 0-3 job. When
// the offer NOC is not entered, the primary occupation's TEER is used.
function fswArrangedEmploymentValid(profile: ApplicantProfile): boolean {
  if (!hasValidJobOffer(profile)) return false;
  const teer = teerOf(profile.jobOfferNocCode) ?? profile.nocTeer;
  return teer <= 3;
}

// ── Section D — Additional points ─────────────────────────────────────────────

function isFrenchTest(testType: LanguageTestType): boolean {
  return testType === 'TEF' || testType === 'TCF';
}

function allAbilitiesAtLeast(bands: LanguageBands, min: number): boolean {
  return (
    bands.listening >= min &&
    bands.reading >= min &&
    bands.writing >= min &&
    bands.speaking >= min
  );
}

// CRS Section D French-language bonus (0/25/50). Language identity is taken from the
// test type: TEF/TCF = French, IELTS/CELPIP = English — so no separate profile field
// is needed. Requires NCLC 7+ on all four French abilities; the tier then depends on
// English: CLB 5+ on all four English abilities → 50, otherwise (English below CLB 5
// or no English test) → 25.
function frenchLanguageBonus(profile: ApplicantProfile): number {
  const first = profile.firstLanguageScores;
  const second =
    profile.hasSecondLanguage && profile.secondLanguageScores
      ? profile.secondLanguageScores
      : undefined;

  const frenchScores = isFrenchTest(first.testType)
    ? first
    : second && isFrenchTest(second.testType)
      ? second
      : undefined;
  if (!frenchScores) return 0;

  if (!allAbilitiesAtLeast(scoresToClb(frenchScores), 7)) return 0;

  const englishScores = !isFrenchTest(first.testType)
    ? first
    : second && !isFrenchTest(second.testType)
      ? second
      : undefined;

  const bonus = rules.sectionD.frenchLanguageBonus;
  if (englishScores && allAbilitiesAtLeast(scoresToClb(englishScores), 5)) {
    return bonus.nclc7PlusEnglishClb5OrHigher;
  }
  return bonus.nclc7PlusEnglishClb4OrLower;
}

// CRS Section D Canadian post-secondary education bonus (0/15/30).
function canadianEducationBonus(level?: CanadianEducationLevel): number {
  const b = rules.sectionD.canadianEducation;
  if (level === 'three_year_plus') return b.credential3YearsOrLonger;
  if (level === 'one_or_two_year') return b.credential1to2Years;
  return 0;
}

// ── Proof of Funds ────────────────────────────────────────────────────────────
// Values live in proof-of-funds.json and are auto-updated daily by GitHub Actions.
// Do not edit the numbers there manually — the script overwrites them.

function proofOfFundsRequired(familySize: number): number {
  const size = Math.max(1, familySize);
  const table = fundsData.byFamilySize as Record<string, number>;
  if (size <= 7) return table[String(size)];
  return table['7'] + (size - 7) * fundsData.extraPerMember;
}

// ── Section B: Spouse / Common-Law Partner Factors ──────────────────────────

function spouseLangPointsPerBand(clb: number): number {
  return fromClbPts(rules.sectionB.spouseLanguage, clb);
}

function spouseCwePoints(years: number): number {
  return fromYearsPts(rules.sectionB.spouseCwe, years);
}

// ── Stream Eligibility ───────────────────────────────────────────────────────

function assessStreamEligibility(
  profile: ApplicantProfile,
  fswGrid: FswGrid,
  firstBands: LanguageBands,
  ecaPending: boolean,
): StreamEligibility {
  const minFirstLang = minClb(firstBands);
  const foreignWhole = Math.floor(profile.foreignWorkExperienceYears);
  const canadianWhole = Math.floor(profile.canadianWorkExperienceYears);
  const qualifyingTeer = profile.nocTeer <= 3;
  const minLangClb = rules.fsw.minFirstLanguageClb;

  // FSW: 67-point grid + CLB 7 minimum + qualifying NOC + 1yr work exp
  const fswLangOk = minFirstLang >= minLangClb;
  const fswExpOk = foreignWhole >= 1 || canadianWhole >= 1;
  const totalWhole = Math.floor(
    profile.foreignWorkExperienceYears + profile.canadianWorkExperienceYears,
  );
  const fswEligible =
    fswGrid.eligible && fswLangOk && qualifyingTeer && fswExpOk;

  // Real IRCC requires a completed ECA to actually earn foreign-education CRS
  // points or apply under FSW — this tool scores as if it will confirm, and
  // relies on this caveat (plus CrsResult.ecaPending) to say so everywhere.
  const ecaCaveat = ecaPending
    ? ' Provisional — assumes your declared education will confirm on ECA.'
    : '';

  let fswReason = '';
  if (!qualifyingTeer) fswReason = 'NOC TEER 4-5 does not qualify for FSW.';
  else if (!fswLangOk)
    fswReason = `Minimum CLB ${minLangClb} in all four abilities not met.`;
  else if (!fswExpOk)
    fswReason = 'At least 1 year of qualifying work experience required.';
  else if (!fswGrid.eligible)
    fswReason = `FSW ${rules.fsw.passmark}-point grid not met (scored ${fswGrid.total}/100).${ecaCaveat}`;
  else
    fswReason = `Scores ${fswGrid.total}/100 on FSW ${rules.fsw.passmark}-point grid — clears the pass mark. Eligible to create profile.${ecaCaveat}`;

  // CEC: 1yr authorized Canadian work in TEER 0-3. Language minimum depends on
  // the TEER: CLB 7 for TEER 0 or 1, CLB 5 for TEER 2 or 3 (ircc-facts s4).
  const cecMinClb = profile.nocTeer <= 1 ? 7 : 5;
  const cecEligible =
    canadianWhole >= 1 && qualifyingTeer && minFirstLang >= cecMinClb;
  const cecReason = cecEligible
    ? 'Meets 1-year Canadian work experience requirement.'
    : canadianWhole < 1
      ? 'Requires at least 1 year of authorized Canadian work experience.'
      : !qualifyingTeer
        ? 'Canadian work must be in a NOC TEER 0, 1, 2 or 3 job.'
        : `Minimum CLB ${cecMinClb} in all four abilities not met (TEER ${profile.nocTeer}).`;

  // FST: skilled trade (canada.ca "Express Entry: Job offer" groups), 2 years of
  // trade experience in the last 5, CLB 5 speaking and listening and CLB 4
  // reading and writing, and a valid job offer OR a certificate of qualification.
  const trade = isSkilledTrade(profile.nocCode);
  const fstLangOk =
    firstBands.speaking >= 5 &&
    firstBands.listening >= 5 &&
    firstBands.reading >= 4 &&
    firstBands.writing >= 4;
  const fstExpOk = totalWhole >= 2;
  const fstOfferOrCert =
    hasValidJobOffer(profile) || profile.hasCertificateOfQualification === true;
  const fstEligible = trade && fstLangOk && fstExpOk && fstOfferOrCert;
  const fstReason = !trade
    ? `NOC ${profile.nocCode || '(not entered)'} is not an FST skilled trade.`
    : !fstExpOk
      ? 'Requires 2 years of full-time work in the skilled trade within the last 5 years.'
      : !fstLangOk
        ? 'Requires CLB 5 in speaking and listening and CLB 4 in reading and writing.'
        : !fstOfferOrCert
          ? 'Requires a valid job offer (up to 2 employers, 1+ year) or a Canadian certificate of qualification.'
          : 'Meets the skilled trade, language and job offer or certificate requirements. Confirm the 2 years of work were in this trade within the last 5 years.';

  // Express Entry pool: eligible if eligible for any stream
  const poolEligible = fswEligible || cecEligible || fstEligible;
  // Only reachable via FSW here, since CEC has no education component.
  const poolEcaCaveat =
    poolEligible && fswEligible && !cecEligible ? ecaCaveat : '';
  const poolReason = poolEligible
    ? `Eligible to create and submit an Express Entry profile immediately.${poolEcaCaveat}`
    : 'Must qualify for FSW, CEC, or FST to enter the pool.';
  void foreignWhole;

  return {
    fsw: { eligible: fswEligible, likely: fswEligible, reason: fswReason },
    cec: { eligible: cecEligible, likely: cecEligible, reason: cecReason },
    fst: { eligible: fstEligible, likely: fstEligible, reason: fstReason },
    expressEntryPool: {
      eligible: poolEligible,
      likely: poolEligible,
      reason: poolReason,
    },
  };
}

// ── Scenario Projections ─────────────────────────────────────────────────────

// Every scenario re-scores the changed profile with scoreProfile(), so all
// caps (Section C pairs, Section C 100, Section D 600, LMI 150/140) apply
// exactly as they do to the real score.
function buildScenarios(
  profile: ApplicantProfile,
  currentCrs: number,
  firstBands: LanguageBands,
): ScenarioProjection[] {
  const scenarios: ScenarioProjection[] = [];
  const gain = (changed: ApplicantProfile, bands?: LanguageBands): number =>
    scoreProfile(changed, bands ?? firstBands).breakdown.total - currentCrs;
  const foreignWhole = Math.floor(profile.foreignWorkExperienceYears);
  const canadianWhole = Math.floor(profile.canadianWorkExperienceYears);

  // Scenario: next 1yr milestone
  if (foreignWhole < 2) {
    const delta = gain({
      ...profile,
      foreignWorkExperienceYears: foreignWhole + 1,
    });
    if (delta > 0) {
      scenarios.push({
        name: `Wait to Hit ${foreignWhole + 1}-Year Work Mark`,
        change: `Accrue ${foreignWhole + 1} full years of foreign work experience`,
        currentCrs,
        projectedCrs: currentCrs + delta,
        delta,
        competitive: currentCrs + delta >= 480,
      });
    }
  }

  // Scenario: hit 3yr FWE threshold
  if (foreignWhole < 3) {
    const delta3 = gain({ ...profile, foreignWorkExperienceYears: 3 });
    if (delta3 > 0) {
      scenarios.push({
        name: 'Hit 3-Year Foreign Work Mark',
        change: 'Reach 3 full years of foreign work experience',
        currentCrs,
        projectedCrs: currentCrs + delta3,
        delta: delta3,
        competitive: currentCrs + delta3 >= 480,
      });
    }
  }

  // Scenario: maximize language to CLB 10
  const improvedBands: LanguageBands = {
    listening: 10,
    reading: 10,
    writing: 10,
    speaking: 10,
  };
  const langDelta = gain(profile, improvedBands);
  if (langDelta > 0) {
    scenarios.push({
      name: 'Maximize Language (CLB 10 All Abilities)',
      change: 'Achieve CLB 10 in all four language abilities',
      currentCrs,
      projectedCrs: currentCrs + langDelta,
      delta: langDelta,
      competitive: currentCrs + langDelta >= 480,
    });
  }

  // Scenario: provincial nomination
  if (!profile.hasProvincialNomination) {
    // Adding PNP lifts Section D to the 600 cap; re-scoring gives the real gain
    // (600 minus the Section D points the applicant already holds).
    const pnpDelta = gain({ ...profile, hasProvincialNomination: true });
    scenarios.push({
      name: 'Provincial Nomination (PNP)',
      change: 'Receive Enhanced PNP nomination',
      currentCrs,
      projectedCrs: currentCrs + pnpDelta,
      delta: pnpDelta,
      competitive: true,
    });
  }

  // Scenario: 1yr Canadian work experience (in the primary occupation). A job
  // offer already scoring higher in the LMI factor is respected by re-scoring.
  if (canadianWhole === 0) {
    const withWork: ApplicantProfile = {
      ...profile,
      canadianWorkExperienceYears: 1,
      canadianJobs: [{ nocCode: profile.nocCode, months: 12 }],
      canadianJobsOverlap: false,
    };
    const cweDelta = gain(withWork);
    scenarios.push({
      name: 'Obtain 1 Year of Canadian Work Experience',
      change: '1 year of authorized Canadian work in qualifying NOC',
      currentCrs,
      projectedCrs: currentCrs + cweDelta,
      delta: cweDelta,
      competitive: currentCrs + cweDelta >= 480,
    });
  }

  // Scenario: qualifying job offer in the primary occupation, when that
  // occupation is on the high-wage list and no valid offer is recorded.
  const primaryLevel = highWageLevel(profile.nocCode);
  if (!hasValidJobOffer(profile) && primaryLevel > 0) {
    const withOffer: ApplicantProfile = {
      ...profile,
      hasJobOffer: 'valid',
      jobOfferNocCode: profile.nocCode,
    };
    const offerDelta = gain(withOffer);
    if (offerDelta > 0) {
      scenarios.push({
        name: 'Qualifying High-Wage Job Offer',
        change: `Valid job offer in NOC ${profile.nocCode} (high-wage level ${primaryLevel}); no LMIA needed`,
        currentCrs,
        projectedCrs: currentCrs + offerDelta,
        delta: offerDelta,
        competitive: currentCrs + offerDelta >= 480,
      });
    }
  }

  return scenarios;
}

// ── FSW Improvement Suggestions ──────────────────────────────────────────────

function buildFswImprovementSuggestions(
  profile: ApplicantProfile,
  fswGrid: FswGrid,
  firstBands: LanguageBands,
  secondBands?: LanguageBands,
): FswImprovementSuggestion[] {
  const suggestions: FswImprovementSuggestion[] = [];
  const current = fswGrid.total;

  // Language: improve to CLB 9
  if (fswGrid.language < 24) {
    const targetBands: LanguageBands = {
      listening: 9,
      reading: 9,
      writing: 9,
      speaking: 9,
    };
    const improvedLang = fswLanguagePoints(targetBands, secondBands);
    const gain = improvedLang - fswGrid.language;
    if (gain > 0) {
      suggestions.push({
        name: 'Improve Language to CLB 9 (All Abilities)',
        action:
          'Retake your language test targeting CLB 9 across all four abilities ' +
          '(IELTS GT: L 8.5 / R 8.0 / W 7.5 / S 7.5 or equivalent CELPIP / TEF / TCF)',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= rules.fsw.passmark,
      });
    }
  }

  const currentHasJobOffer = fswArrangedEmploymentValid(profile);
  const baseAdapt = adaptabilityInputs(profile);

  // Adaptability: gain Canadian work experience
  if (
    Math.floor(profile.canadianWorkExperienceYears) === 0 &&
    fswGrid.adaptability < rules.fsw.adaptabilityMax
  ) {
    const newAdapt = fswAdaptabilityPoints({
      ...baseAdapt,
      canadianWorkYears: 1,
    });
    const gain = newAdapt - fswGrid.adaptability;
    if (gain > 0) {
      suggestions.push({
        name: 'Gain Canadian Work Experience',
        action:
          'Obtain at least 1 year of full-time authorized work in Canada in a NOC TEER 0–3 occupation — worth 10 FSW adaptability points (adaptability is capped at 10)',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= rules.fsw.passmark,
      });
    }
  }

  // Arranged employment: a valid job offer earns 10 FSW points for arranged
  // employment plus 5 adaptability points (no LMIA needed since 2026-11-03).
  if (!currentHasJobOffer) {
    const newAdapt = fswAdaptabilityPoints({ ...baseAdapt, hasJobOffer: true });
    const gain = rules.fsw.arrangedEmployment + newAdapt - fswGrid.adaptability;
    if (gain > 0) {
      suggestions.push({
        name: 'Secure a Valid Job Offer in Canada',
        action:
          'Obtain a valid job offer from one Canadian employer: continuous, paid, full-time (30+ hours a week), non-seasonal, at least 1 year, in a TEER 0-3 job. No LMIA is needed since 3 November 2026 — adds 10 arranged-employment points plus up to 5 adaptability points',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= rules.fsw.passmark,
      });
    }
  }

  // Adaptability: Canadian post-secondary education
  if (
    !profile.hasCanadianEducation &&
    fswGrid.adaptability < rules.fsw.adaptabilityMax
  ) {
    const newAdapt = fswAdaptabilityPoints({
      ...baseAdapt,
      hasCanadianEducation: true,
    });
    const gain = newAdapt - fswGrid.adaptability;
    if (gain > 0) {
      suggestions.push({
        name: 'Complete a Canadian Study Program',
        action:
          'Study full-time in Canada in a post-secondary program of at least 2 academic years — adds 5 FSW adaptability points',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= rules.fsw.passmark,
      });
    }
  }

  // Adaptability: spouse language CLB 4+
  if (profile.hasSpouse && fswGrid.adaptability < rules.fsw.adaptabilityMax) {
    const spouseLang = profile.spouseLanguageScores;
    const spouseAlreadyHasCLB4 =
      spouseLang !== undefined &&
      (() => {
        const b = scoresToClb(spouseLang);
        return Math.min(b.listening, b.reading, b.writing, b.speaking) >= 4;
      })();
    if (!spouseAlreadyHasCLB4) {
      const newAdapt = Math.min(
        rules.fsw.adaptabilityMax,
        fswGrid.adaptability + rules.fsw.adaptabilityPerFactor,
      );
      const gain = newAdapt - fswGrid.adaptability;
      if (gain > 0) {
        suggestions.push({
          name: 'Spouse/Partner Language Test (CLB 4+ in All Four Abilities)',
          action:
            'Have your accompanying spouse or partner take an approved language test and achieve CLB 4 in Listening, Reading, Writing, and Speaking — adds 5 FSW adaptability points',
          currentFswTotal: current,
          projectedFswTotal: current + gain,
          pointsGained: gain,
          wouldQualify: current + gain >= rules.fsw.passmark,
        });
      }
    }
  }

  // Adaptability: spouse past work in Canada
  if (profile.hasSpouse && fswGrid.adaptability < rules.fsw.adaptabilityMax) {
    const spouseCwe = Math.floor(profile.spouseCanadianExperience ?? 0);
    if (spouseCwe < 1) {
      const newAdapt = Math.min(
        rules.fsw.adaptabilityMax,
        fswGrid.adaptability + rules.fsw.adaptabilityPerFactor,
      );
      const gain = newAdapt - fswGrid.adaptability;
      if (gain > 0) {
        suggestions.push({
          name: 'Spouse/Partner Canadian Work Experience (1+ Year)',
          action:
            'Your accompanying spouse or partner can earn 5 FSW adaptability points by completing at least 1 year of full-time authorized work in Canada on a valid work permit',
          currentFswTotal: current,
          projectedFswTotal: current + gain,
          pointsGained: gain,
          wouldQualify: current + gain >= rules.fsw.passmark,
        });
      }
    }
  }

  // Adaptability: spouse past studies in Canada
  if (
    profile.hasSpouse &&
    !profile.spouseHasCanadianStudy &&
    fswGrid.adaptability < rules.fsw.adaptabilityMax
  ) {
    const newAdapt = Math.min(
      rules.fsw.adaptabilityMax,
      fswGrid.adaptability + rules.fsw.adaptabilityPerFactor,
    );
    const gain = newAdapt - fswGrid.adaptability;
    if (gain > 0) {
      suggestions.push({
        name: 'Spouse/Partner Past Studies in Canada (2+ Years)',
        action:
          'Your accompanying spouse or partner can earn 5 FSW adaptability points by completing at least 2 academic years of full-time study at a secondary or post-secondary school in Canada',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= rules.fsw.passmark,
      });
    }
  }

  // Work experience: toward 6-year cap
  if (fswGrid.workExperience < 15) {
    const targetExp = fswWorkExpPoints(6);
    const gain = targetExp - fswGrid.workExperience;
    if (gain > 0) {
      suggestions.push({
        name: 'Accumulate More Skilled Work Experience',
        action:
          'Continue accruing qualifying skilled work experience (in Canada or abroad) to reach the 6-year tier (maximum 15 FSW work experience points)',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= rules.fsw.passmark,
      });
    }
  }

  suggestions.sort((a, b) => b.pointsGained - a.pointsGained);
  return suggestions;
}

// ── Main calculate function ──────────────────────────────────────────────────

// Sections A to D for one profile. `firstBandsOverride` lets a scenario test
// different first-language results without inventing test scores.
interface ScoredProfile {
  firstBands: LanguageBands;
  secondBands?: LanguageBands;
  ecaPending: boolean;
  breakdown: CrsBreakdown;
}

function scoreProfile(
  profile: ApplicantProfile,
  firstBandsOverride?: LanguageBands,
): ScoredProfile {
  const firstBands =
    firstBandsOverride ?? scoresToClb(profile.firstLanguageScores);
  const secondBands =
    profile.hasSecondLanguage && profile.secondLanguageScores
      ? scoresToClb(profile.secondLanguageScores)
      : undefined;

  // Every education-derived point below is scored on the applicant's stated
  // education level regardless of ECA status — Prash's call: show the
  // provisional score as if the ECA confirms it, flagged via ecaPending
  // rather than zeroed. canada.ca ("Educational credential assessment") does
  // require a completed ECA to actually earn these points on a real
  // application; this tool is a self-serve estimate, not a submission, so the
  // gap is bridged with a caveat everywhere these numbers are shown instead
  // of a hard block. See ecaPending on CrsResult.
  const ecaPending =
    !profile.hasEca && profile.education !== 'less_than_secondary';

  // Section A — Core
  const agePoints_ = agePoints(profile.age, profile.hasSpouse);
  const educationPoints_ = educationPoints(
    profile.education,
    profile.hasSpouse,
  );
  const firstLangPoints = firstLanguagePoints(firstBands, profile.hasSpouse);
  // Second official language: max 24 single, 22 with a spouse.
  const secondLangPoints = secondBands
    ? Math.min(
        profile.hasSpouse
          ? rules.sectionA.secondLanguageMaxWithSpouse
          : rules.sectionA.secondLanguageMaxSingle,
        secondLanguagePoints(secondBands),
      )
    : 0;
  const lmi = labourMarketIntegration(profile);
  const canadianExp = lmi.awarded;

  // Factor B — Spouse (max 40 pts, using separate spouse tables)
  let spousePoints = 0;
  if (profile.hasSpouse) {
    if (profile.spouseEducation) {
      const spEduTable = rules.sectionB.spouseEducation as Record<
        EducationLevel,
        number
      >;
      spousePoints += spEduTable[profile.spouseEducation] ?? 0;
    }
    if (profile.spouseLanguageScores) {
      const spBands = scoresToClb(profile.spouseLanguageScores);
      spousePoints +=
        spouseLangPointsPerBand(spBands.listening) +
        spouseLangPointsPerBand(spBands.reading) +
        spouseLangPointsPerBand(spBands.writing) +
        spouseLangPointsPerBand(spBands.speaking);
    }
    if (profile.spouseCanadianExperience) {
      spousePoints += spouseCwePoints(profile.spouseCanadianExperience);
    }
  }

  const coreTotal =
    agePoints_ +
    educationPoints_ +
    firstLangPoints +
    secondLangPoints +
    canadianExp +
    spousePoints;

  // Section C — Transferability (capped at 100)
  const eduLangTr = eduLanguageTransfer(profile.education, firstBands);
  const eduCanTr = eduCanadianExpTransfer(
    profile.education,
    profile.canadianWorkExperienceYears,
  );
  const foreignLangTr = foreignExpLanguageTransfer(
    profile.foreignWorkExperienceYears,
    firstBands,
  );
  const foreignCanTr = foreignExpCanadianExpTransfer(
    profile.foreignWorkExperienceYears,
    profile.canadianWorkExperienceYears,
  );
  const certTr = certificateTransfer(
    profile.hasCertificateOfQualification,
    firstBands,
  );
  // Each pair is capped at 50 (education; foreign work experience), the
  // certificate at 50, and Section C as a whole at 100 (crs-criteria.html).
  const transferTotal = Math.min(
    rules.sectionC.maxTotal,
    Math.min(rules.sectionC.educationPairMax, eduLangTr + eduCanTr) +
      Math.min(rules.sectionC.foreignExpPairMax, foreignLangTr + foreignCanTr) +
      certTr,
  );

  // Section D — Additional (capped at 600 per canada.ca)
  const provinceNom = profile.hasProvincialNomination
    ? rules.sectionD.provincialNomination
    : 0;
  const siblingPts = profile.hasSiblingInCanada ? rules.sectionD.sibling : 0;
  const frenchBonusPts = frenchLanguageBonus(profile);
  const canadianEducationPts = canadianEducationBonus(
    profile.canadianEducationLevel,
  );
  const additionalTotal = Math.min(
    rules.sectionD.maxTotal,
    provinceNom + siblingPts + frenchBonusPts + canadianEducationPts,
  );

  const total = coreTotal + transferTotal + additionalTotal;

  const breakdown: CrsBreakdown = {
    agePoints: agePoints_,
    educationPoints: educationPoints_,
    firstLanguagePoints: firstLangPoints,
    secondLanguagePoints: secondLangPoints,
    canadianExpPoints: canadianExp,
    lmi,
    spousePoints,
    coreTotal,
    eduLanguageTransfer: eduLangTr,
    eduCanadianExpTransfer: eduCanTr,
    foreignExpLanguageTransfer: foreignLangTr,
    foreignExpCanadianExpTransfer: foreignCanTr,
    certificateTransfer: certTr,
    transferTotal,
    provincialNomination: provinceNom,
    siblingPoints: siblingPts,
    frenchBonusPoints: frenchBonusPts,
    canadianEducationPoints: canadianEducationPts,
    additionalTotal,
    total,
  };

  return { firstBands, secondBands, ecaPending, breakdown };
}

export function calculate(profile: ApplicantProfile): CrsResult {
  const { firstBands, secondBands, ecaPending, breakdown } =
    scoreProfile(profile);
  const total = breakdown.total;

  // FSW grid
  const fswLang = fswLanguagePoints(firstBands, secondBands);
  const fswEdu =
    (rules.fsw.education as Record<EducationLevel, number>)[
      profile.education
    ] ?? 0;
  // FSW work experience counts skilled work in Canada or abroad.
  const fswExp = fswWorkExpPoints(
    profile.foreignWorkExperienceYears + profile.canadianWorkExperienceYears,
  );
  const fswAge = fswAgePoints(profile.age);
  const fswArranged = fswArrangedEmploymentValid(profile)
    ? rules.fsw.arrangedEmployment
    : 0;
  const fswAdapt = fswAdaptabilityPoints(adaptabilityInputs(profile));
  const fswTotal = fswLang + fswEdu + fswExp + fswAge + fswArranged + fswAdapt;
  const fswGrid: FswGrid = {
    language: fswLang,
    education: fswEdu,
    workExperience: fswExp,
    age: fswAge,
    arrangedEmployment: fswArranged,
    adaptability: fswAdapt,
    total: fswTotal,
    eligible: fswTotal >= rules.fsw.passmark,
  };

  const eligibility = assessStreamEligibility(
    profile,
    fswGrid,
    firstBands,
    ecaPending,
  );
  const scenarios = buildScenarios(profile, total, firstBands);

  const fswImprovements = !eligibility.expressEntryPool.eligible
    ? buildFswImprovementSuggestions(profile, fswGrid, firstBands, secondBands)
    : [];

  const fundsRequired = proofOfFundsRequired(profile.familySize);
  // Proof of funds is not needed for CEC, or with a valid job offer, with or
  // without an LMIA (canada.ca "Express Entry: Job offer"; Visa Forte ruling D6).
  const fundsExemptReason = eligibility.cec.eligible
    ? 'Not required when applying under the Canadian Experience Class.'
    : hasValidJobOffer(profile)
      ? 'Not required with a valid job offer (with or without an LMIA). Upload a letter explaining the job offer instead.'
      : '';
  const fundsExempt = fundsExemptReason !== '';

  return {
    firstLanguageBands: firstBands,
    secondLanguageBands: secondBands,
    breakdown,
    fswGrid,
    eligibility,
    scenarios,
    fswImprovements,
    ecaPending,
    proofOfFundsRequired: fundsRequired,
    proofOfFundsExempt: fundsExempt,
    proofOfFundsExemptReason: fundsExemptReason,
    proofOfFundsSufficient:
      fundsExempt || profile.settlementFunds >= fundsRequired,
    maxTotal: CRS_MAX_TOTAL,
    rulesVersion: CRS_RULES_VERSION,
  };
}
