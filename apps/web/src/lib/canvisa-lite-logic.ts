// Pure functions for CanVisa Pro Lite — weakness chips and best pathway.
// Separated so they can be unit-tested without a DOM.

import type {
  CrsResult,
  ApplicantProfile,
  StreamEligibility,
  LanguageBands,
} from './crs-calculator';
import drawData from './crs-draw-history.json';

export interface WeaknessChip {
  label: string;
  pointGain: number;
}

export interface BestPathway {
  category: string;
  cutoffScore: number;
  drawDate: string;
  gap: number; // applicantScore - cutoffScore; negative = below cutoff
}

// Top N improvement opportunities from the calculator's scenario projections.
export function getWeaknesses(result: CrsResult, n = 3): WeaknessChip[] {
  return result.scenarios
    .filter((s) => s.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, n)
    .map((s) => ({ label: s.name, pointGain: s.delta }));
}

// Mirrors the eligibility logic in AssessmentTool.tsx.
export function getEligibleDrawCategories(
  profile: ApplicantProfile,
  elig: StreamEligibility,
  secondLangBands: LanguageBands | undefined,
): string[] {
  const cats: string[] = [];

  if (elig.cec.eligible) cats.push('CEC');

  const isFrenchTest =
    profile.hasSecondLanguage &&
    (profile.secondLanguageScores?.testType === 'TEF' ||
      profile.secondLanguageScores?.testType === 'TCF');
  const frenchClbMet =
    secondLangBands != null &&
    secondLangBands.listening >= 7 &&
    secondLangBands.reading >= 7 &&
    secondLangBands.writing >= 7 &&
    secondLangBands.speaking >= 7;
  if (isFrenchTest && frenchClbMet) cats.push('French');

  const nocNum = parseInt(profile.nocCode, 10);
  if (!isNaN(nocNum)) {
    if (nocNum >= 30010 && nocNum <= 35109) cats.push('Healthcare');
    if (
      (nocNum >= 72000 && nocNum <= 75199) ||
      (nocNum >= 82000 && nocNum <= 82099) ||
      (nocNum >= 92000 && nocNum <= 95199)
    )
      cats.push('Trades');
    if (nocNum >= 40000 && nocNum <= 41499) cats.push('Education');
  }

  if (profile.hasProvincialNomination) cats.push('PNP');

  // Fallback: pool-eligible applicants can be drawn in a General or STEM round
  if (elig.expressEntryPool.eligible && cats.length === 0) cats.push('General');

  return cats;
}

type DrawEntry = { date: string; type: string; cutoffScore: number };

const CATEGORY_MATCHERS: Array<{
  category: string;
  test: (t: string) => boolean;
}> = [
  { category: 'CEC', test: (t) => /canadian experience class/i.test(t) },
  { category: 'French', test: (t) => /french/i.test(t) },
  { category: 'Healthcare', test: (t) => /health/i.test(t) },
  { category: 'Trades', test: (t) => /trade/i.test(t) },
  { category: 'Education', test: (t) => /education/i.test(t) },
  { category: 'PNP', test: (t) => /provincial nominee/i.test(t) },
  { category: 'General', test: (t) => /^general$/i.test(t) },
];

function latestDraw(category: string): DrawEntry | null {
  const matcher = CATEGORY_MATCHERS.find((m) => m.category === category);
  if (!matcher) return null;
  return (
    (drawData.draws as DrawEntry[]).find((d) => matcher.test(d.type)) ?? null
  );
}

// Best pathway = eligible category with smallest gap to its most recent draw cutoff.
// Above-cutoff categories win over below-cutoff; ties go to smallest absolute gap.
export function getBestPathway(
  crsScore: number,
  eligibleCategories: string[],
): BestPathway | null {
  const candidates = eligibleCategories
    .map((cat) => {
      const draw = latestDraw(cat);
      if (!draw) return null;
      return {
        category: cat,
        cutoffScore: draw.cutoffScore,
        drawDate: draw.date,
        gap: crsScore - draw.cutoffScore,
      };
    })
    .filter((c): c is BestPathway => c !== null);

  if (candidates.length === 0) return null;

  const above = candidates.filter((c) => c.gap >= 0);
  if (above.length > 0) return above.sort((a, b) => a.gap - b.gap)[0]!;

  return candidates.sort((a, b) => b.gap - a.gap)[0]!;
}
