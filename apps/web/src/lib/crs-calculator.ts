// CRS calculation engine — post-March 2025 rules.
// All point tables live in crs-rules.json. To update any value (e.g. when IRCC
// changes the CRS grid), edit that JSON file only — no TypeScript changes needed.
//
// Source: canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/
//   express-entry/eligibility/criteria-comprehensive-ranking-system/grid.html

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
  hasJobOffer?: 'lmia' | 'exempt' | 'none'; // FSW adaptability: +5 pts (arranged employment)
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
  canadianExpPoints: number;
  spousePoints: number;
  coreTotal: number;
  // C: Transferability
  eduLanguageTransfer: number;
  eduCanadianExpTransfer: number;
  foreignExpLanguageTransfer: number;
  foreignExpCanadianExpTransfer: number;
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

export interface FswGrid {
  language: number; // max 28
  education: number; // max 25
  workExperience: number; // max 15
  age: number; // max 12
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
  proofOfFundsSufficient: boolean;
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

  let second = 0;
  if (secondBands) {
    second = Math.min(
      rules.fsw.secondLanguageCapBands,
      [
        secondBands.listening,
        secondBands.reading,
        secondBands.writing,
        secondBands.speaking,
      ].filter((clb) => clb >= rules.fsw.secondLanguageMinClb).length,
    );
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

function fswAdaptabilityPoints(
  hasCanadianEducation: boolean,
  hasFamilyInCanada: boolean,
  canadianWorkYears: number,
  hasJobOffer?: boolean,
): number {
  const perFactor = rules.fsw.adaptabilityPerFactor;
  let pts = 0;
  if (hasCanadianEducation) pts += perFactor;
  if (hasFamilyInCanada) pts += perFactor;
  if (Math.floor(canadianWorkYears) >= 1) pts += perFactor;
  if (hasJobOffer) pts += perFactor;
  return Math.min(rules.fsw.adaptabilityMax, pts);
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

  // CEC: 1yr authorized Canadian work in TEER 0-3, CLB 7 minimum
  const cecEligible =
    canadianWhole >= 1 && qualifyingTeer && minFirstLang >= minLangClb;
  const cecReason = cecEligible
    ? 'Meets 1-year Canadian work experience requirement.'
    : canadianWhole < 1
      ? 'Requires at least 1 year of authorized Canadian work experience.'
      : 'NOC TEER or language requirement not met.';

  // FST: qualifying skilled trade occupation
  const fstEligible = false;
  const fstReason =
    'NOC TEER 1 professional occupation does not qualify as a skilled trade.';

  // Express Entry pool: eligible if eligible for any stream
  const poolEligible = fswEligible || cecEligible;
  // Only reachable via FSW here, since CEC has no education component.
  const poolEcaCaveat =
    poolEligible && fswEligible && !cecEligible ? ecaCaveat : '';
  const poolReason = poolEligible
    ? `Eligible to create and submit an Express Entry profile immediately.${poolEcaCaveat}`
    : 'Must qualify for FSW, CEC, or FST to enter the pool.';

  return {
    fsw: { eligible: fswEligible, likely: fswEligible, reason: fswReason },
    cec: { eligible: cecEligible, likely: cecEligible, reason: cecReason },
    fst: { eligible: fstEligible, likely: false, reason: fstReason },
    expressEntryPool: {
      eligible: poolEligible,
      likely: poolEligible,
      reason: poolReason,
    },
  };
}

// ── Scenario Projections ─────────────────────────────────────────────────────

function buildScenarios(
  profile: ApplicantProfile,
  currentCrs: number,
  firstBands: LanguageBands,
): ScenarioProjection[] {
  const scenarios: ScenarioProjection[] = [];
  const foreignWhole = Math.floor(profile.foreignWorkExperienceYears);
  const canadianWhole = Math.floor(profile.canadianWorkExperienceYears);

  // Scenario: next 1yr milestone
  if (foreignWhole < 2) {
    const delta =
      foreignExpLanguageTransfer(foreignWhole + 1, firstBands) -
      foreignExpLanguageTransfer(
        profile.foreignWorkExperienceYears,
        firstBands,
      );
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
    const delta3 =
      foreignExpLanguageTransfer(3, firstBands) -
      foreignExpLanguageTransfer(
        profile.foreignWorkExperienceYears,
        firstBands,
      );
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
  const currentLangPts = firstLanguagePoints(firstBands, profile.hasSpouse);
  const improvedBands: LanguageBands = {
    listening: 10,
    reading: 10,
    writing: 10,
    speaking: 10,
  };
  const improvedLangPts = firstLanguagePoints(improvedBands, profile.hasSpouse);
  const langDelta = improvedLangPts - currentLangPts;
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
    // Adding PNP lifts Section D to the 600 cap; the real gain is 600 minus the
    // Section D points the applicant already holds (sibling + French + Canadian edu).
    const nonPnpSectionD =
      (profile.hasSiblingInCanada ? rules.sectionD.sibling : 0) +
      frenchLanguageBonus(profile) +
      canadianEducationBonus(profile.canadianEducationLevel);
    const pnpDelta = rules.sectionD.maxTotal - nonPnpSectionD;
    scenarios.push({
      name: 'Provincial Nomination (PNP)',
      change: 'Receive Enhanced PNP nomination',
      currentCrs,
      projectedCrs: currentCrs + pnpDelta,
      delta: pnpDelta,
      competitive: true,
    });
  }

  // Scenario: 1yr Canadian work experience
  if (canadianWhole === 0) {
    const cweDelta =
      canadianExpPoints(1, profile.hasSpouse) +
      eduCanadianExpTransfer(profile.education, 1) +
      foreignExpCanadianExpTransfer(profile.foreignWorkExperienceYears, 1);
    scenarios.push({
      name: 'Obtain 1 Year of Canadian Work Experience',
      change: '1 year of authorized Canadian work in qualifying NOC',
      currentCrs,
      projectedCrs: currentCrs + cweDelta,
      delta: cweDelta,
      competitive: currentCrs + cweDelta >= 480,
    });
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

  const currentHasJobOffer =
    profile.hasJobOffer === 'lmia' || profile.hasJobOffer === 'exempt';

  // Adaptability: gain Canadian work experience
  if (
    Math.floor(profile.canadianWorkExperienceYears) === 0 &&
    fswGrid.adaptability < rules.fsw.adaptabilityMax
  ) {
    const newAdapt = fswAdaptabilityPoints(
      profile.hasCanadianEducation,
      profile.hasFamilyInCanada,
      1,
      currentHasJobOffer,
    );
    const gain = newAdapt - fswGrid.adaptability;
    if (gain > 0) {
      suggestions.push({
        name: 'Gain Canadian Work Experience',
        action:
          'Obtain at least 1 year of authorized work in Canada in a NOC TEER 0–3 occupation — adds 5 FSW adaptability points',
        currentFswTotal: current,
        projectedFswTotal: current + gain,
        pointsGained: gain,
        wouldQualify: current + gain >= rules.fsw.passmark,
      });
    }
  }

  // Adaptability: secure a valid job offer
  if (!currentHasJobOffer && fswGrid.adaptability < rules.fsw.adaptabilityMax) {
    const newAdapt = fswAdaptabilityPoints(
      profile.hasCanadianEducation,
      profile.hasFamilyInCanada,
      profile.canadianWorkExperienceYears,
      true,
    );
    const gain = newAdapt - fswGrid.adaptability;
    if (gain > 0) {
      suggestions.push({
        name: 'Secure a Valid Job Offer in Canada',
        action:
          'Obtain a qualifying arranged employment offer (LMIA-supported or LMIA-exempt) from a Canadian employer — adds 5 FSW adaptability points',
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
    const newAdapt = fswAdaptabilityPoints(
      true,
      profile.hasFamilyInCanada,
      profile.canadianWorkExperienceYears,
      currentHasJobOffer,
    );
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
  if (profile.hasSpouse && fswGrid.adaptability < rules.fsw.adaptabilityMax) {
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
        name: 'Accumulate More Foreign Work Experience',
        action:
          'Continue accruing qualifying work experience to reach the 6-year tier (maximum 15 FSW work experience points)',
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

export function calculate(profile: ApplicantProfile): CrsResult {
  const firstBands = scoresToClb(profile.firstLanguageScores);
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
  const secondLangPoints = secondBands ? secondLanguagePoints(secondBands) : 0;
  const canadianExp = canadianExpPoints(
    profile.canadianWorkExperienceYears,
    profile.hasSpouse,
  );

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
  const transferTotal = Math.min(
    rules.sectionC.maxTotal,
    eduLangTr + eduCanTr + foreignLangTr + foreignCanTr,
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
    spousePoints,
    coreTotal,
    eduLanguageTransfer: eduLangTr,
    eduCanadianExpTransfer: eduCanTr,
    foreignExpLanguageTransfer: foreignLangTr,
    foreignExpCanadianExpTransfer: foreignCanTr,
    transferTotal,
    provincialNomination: provinceNom,
    siblingPoints: siblingPts,
    frenchBonusPoints: frenchBonusPts,
    canadianEducationPoints: canadianEducationPts,
    additionalTotal,
    total,
  };

  // FSW grid
  const fswLang = fswLanguagePoints(firstBands, secondBands);
  const fswEdu =
    (rules.fsw.education as Record<EducationLevel, number>)[
      profile.education
    ] ?? 0;
  const fswExp = fswWorkExpPoints(profile.foreignWorkExperienceYears);
  const fswAge = fswAgePoints(profile.age);
  const fswAdapt = fswAdaptabilityPoints(
    profile.hasCanadianEducation,
    profile.hasFamilyInCanada,
    profile.canadianWorkExperienceYears,
    profile.hasJobOffer === 'lmia' || profile.hasJobOffer === 'exempt',
  );
  const fswTotal = fswLang + fswEdu + fswExp + fswAge + fswAdapt;
  const fswGrid: FswGrid = {
    language: fswLang,
    education: fswEdu,
    workExperience: fswExp,
    age: fswAge,
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
    proofOfFundsSufficient: profile.settlementFunds >= fundsRequired,
    rulesVersion: CRS_RULES_VERSION,
  };
}
