import { describe, it, expect } from 'vitest';
import { teerVerdict } from './noc-strategy';
import * as strategy from './noc-strategy';
import * as classify from './noc-classify';

describe('teerVerdict — TEER 0-3 is the skilled-work bar for FSW and CEC', () => {
  // canada.ca FSW "Who can apply" (dcterms.modified 2026-06-22): "be in 1 of these TEER
  // categories: 0, 1, 2, or 3". IRCC CEC officer instruction (2023-05-25): "one or more
  // TEER 0, TEER 1, TEER 2 or TEER 3 occupations". Both fetched 2026-08-18.
  it.each([0, 1, 2, 3])('TEER %i counts as skilled work experience', (t) => {
    expect(teerVerdict(t).expressEntryEligible).toBe(true);
  });

  it.each([4, 5])('TEER %i does not', (t) => {
    expect(teerVerdict(t).expressEntryEligible).toBe(false);
  });

  it('never states a bare eligibility promise — the copy says clearing the bar is not sufficient', () => {
    expect(teerVerdict(1).detail).toMatch(/necessary, not sufficient/i);
  });

  it('points TEER 4-5 at PNP rather than dead-ending them', () => {
    expect(teerVerdict(5).detail).toMatch(/Provincial Nominee/i);
  });
});

// The separation between "which code fits" and "what the code is worth" is a correctness
// guarantee, not a file-layout preference: bending classification toward the more valuable
// code is how a tool starts recommending codes a reference letter cannot support. This
// test fails if anyone ever wires the strategy layer into the classifier.
describe('the strategy layer is not reachable from the classifier', () => {
  it('noc-classify exports nothing from noc-strategy', () => {
    for (const key of Object.keys(strategy)) {
      expect(Object.keys(classify)).not.toContain(key);
    }
  });

  it('noc-classify.ts does not import noc-strategy', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/lib/noc-classify.ts', 'utf-8');
    expect(src).not.toMatch(/noc-strategy/);
  });

  it('the retrieval layer does not import noc-strategy either', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/lib/noc-retrieval.ts', 'utf-8');
    expect(src).not.toMatch(/noc-strategy/);
  });
});
