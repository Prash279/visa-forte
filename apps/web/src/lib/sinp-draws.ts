// Compares an applicant's SINP points standing against recent SINP Expression-of-
// Interest (EOI) draw cutoffs. Deterministic, never networked.
//
// The applicant's true grid total is unknown within a band: the computed Factor I
// points form the FLOOR, and the still-to-confirm factors (Saskatchewan connection,
// a missing second-language test) form the headroom up to a CEILING. Each draw's
// cutoff is judged against that band, never a probability:
//
//   floor   >= cutoff  → clears        (above the cutoff regardless of SK connection)
//   ceiling <  cutoff  → out-of-range  (cannot clear even with a maxed connection)
//   otherwise          → conditional   (outcome hinges on the SK connection / 2nd language)
//
// Draw data is transcribed from saskatchewan.ca (see sinp-draw-history.json); this
// module never invents a cutoff.

import sinpDrawData from './sinp-draw-history.json';
import { SINP_MAX_POINTS, type SinpScore } from './sinp-points';

export type SinpDrawVerdict = 'clears' | 'conditional' | 'out-of-range';

export interface SinpDraw {
  date: string;
  subCategory: string;
  cutoffScore: number;
  invitationsIssued: number;
}

export interface SinpDrawDataset {
  lastUpdated: string;
  programStatus: string;
  sourceUrl: string;
  draws: SinpDraw[];
}

export interface SinpDrawComparison {
  date: string;
  subCategories: string[];
  cutoffScore: number;
  invitationsIssued: number;
  verdict: SinpDrawVerdict;
}

export interface SinpDrawAnalysis {
  bandFloor: number;
  bandCeiling: number;
  passMark: number;
  comparisons: SinpDrawComparison[];
  clears: number;
  conditional: number;
  outOfRange: number;
  lastUpdated: string;
  programStatus: string;
  sourceUrl: string;
}

const MAX_DRAW_DATES = 5;

// The honest verdict for one cutoff against the applicant's [floor, ceiling] band.
export function drawVerdict(
  bandFloor: number,
  bandCeiling: number,
  cutoffScore: number,
): SinpDrawVerdict {
  if (bandFloor >= cutoffScore) return 'clears';
  if (bandCeiling < cutoffScore) return 'out-of-range';
  return 'conditional';
}

// Headroom above the computed floor: the sum of every still-to-confirm factor's
// maximum, capped so the ceiling can never exceed the 110-point grid maximum.
function bandFromScore(sinp: SinpScore): { floor: number; ceiling: number } {
  const floor = sinp.computedPoints;
  const headroom = sinp.factors
    .filter((f) => f.status === 'to-confirm')
    .reduce((acc, f) => acc + f.maxPoints, 0);
  return { floor, ceiling: Math.min(floor + headroom, SINP_MAX_POINTS) };
}

// Collapse per-sub-category draw rows into one comparison per selection date, taking
// the most recent dates. Within a date the cutoff is normally identical across
// sub-categories; if it ever differs, the higher (more conservative) bar is used.
function groupByDate(draws: SinpDraw[]): Omit<SinpDrawComparison, 'verdict'>[] {
  const byDate = new Map<string, Omit<SinpDrawComparison, 'verdict'>>();
  for (const draw of draws) {
    const existing = byDate.get(draw.date);
    if (!existing) {
      byDate.set(draw.date, {
        date: draw.date,
        subCategories: [draw.subCategory],
        cutoffScore: draw.cutoffScore,
        invitationsIssued: draw.invitationsIssued,
      });
      continue;
    }
    if (!existing.subCategories.includes(draw.subCategory))
      existing.subCategories.push(draw.subCategory);
    existing.cutoffScore = Math.max(existing.cutoffScore, draw.cutoffScore);
    existing.invitationsIssued += draw.invitationsIssued;
  }
  return [...byDate.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_DRAW_DATES);
}

export function analyzeSinpDraws(
  sinp: SinpScore,
  dataset: SinpDrawDataset = sinpDrawData as SinpDrawDataset,
): SinpDrawAnalysis {
  const { floor, ceiling } = bandFromScore(sinp);

  const comparisons: SinpDrawComparison[] = groupByDate(dataset.draws).map(
    (group) => ({
      ...group,
      verdict: drawVerdict(floor, ceiling, group.cutoffScore),
    }),
  );

  const count = (v: SinpDrawVerdict): number =>
    comparisons.filter((c) => c.verdict === v).length;

  return {
    bandFloor: floor,
    bandCeiling: ceiling,
    passMark: sinp.passMark,
    comparisons,
    clears: count('clears'),
    conditional: count('conditional'),
    outOfRange: count('out-of-range'),
    lastUpdated: dataset.lastUpdated,
    programStatus: dataset.programStatus,
    sourceUrl: dataset.sourceUrl,
  };
}
