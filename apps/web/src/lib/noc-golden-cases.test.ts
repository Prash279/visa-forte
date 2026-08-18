import { describe, it, expect } from 'vitest';
import { retrieveCandidates } from './noc-retrieval';
import { RETRIEVE_TOP_K, ADMIN_RETRIEVE_TOP_K } from './noc-classify';
import { NOC_GOLDEN_CASES } from './noc-golden-cases';

// The free half of the golden corpus: no Claude call, no credits, runs on every commit.
//
// It asserts the FLOOR, not accuracy. Claude ranks only what retrieval hands it, so a
// correct code missing from the shortlist means the classifier could not have returned it
// however good the prompt is. Scoring which code Claude actually picks costs money and
// lives in noc-live-eval.test.ts, opt-in.
//
// Both shortlist sizes are checked because they are genuinely different products: the
// public tool sends 30 candidates, admin CanVisa Pro sends 60. A case that only survives
// at 60 is a real risk to the public tool and must fail loudly here rather than show up
// as a wrong answer on a stranger's free check.

describe('NOC golden corpus — retrieval floor (free, no API call)', () => {
  describe.each(NOC_GOLDEN_CASES)('$id → NOC $expected', (c) => {
    it(`reaches the PUBLIC shortlist (top ${RETRIEVE_TOP_K})`, () => {
      const hits = retrieveCandidates(c.duties, c.jobTitle, RETRIEVE_TOP_K);
      const rank = hits.findIndex((h) => h.group.code === c.expected) + 1;
      expect(
        rank,
        `NOC ${c.expected} is absent from the public top ${RETRIEVE_TOP_K}. ` +
          `Claude cannot pick a code retrieval never surfaced. Trap this case guards: ${c.trap}`,
      ).toBeGreaterThan(0);
    });

    it(`reaches the ADMIN shortlist (top ${ADMIN_RETRIEVE_TOP_K})`, () => {
      const hits = retrieveCandidates(
        c.duties,
        c.jobTitle,
        ADMIN_RETRIEVE_TOP_K,
      );
      expect(hits.some((h) => h.group.code === c.expected)).toBe(true);
    });
  });

  // Ranks are recorded rather than asserted. Retrieval order is explicitly NOT a ranking
  // — the prompt tells the model so, because TF-IDF leads with the wrong code often
  // enough that pinning a rank here would fail on harmless changes. What this does give
  // the next session is the measured number, so an anchor can be justified by evidence
  // instead of by argument (the mistake that put a no-op anchor in the file).
  it('records where each correct code actually lands (diagnostic, never asserted)', () => {
    const table = NOC_GOLDEN_CASES.map((c) => {
      const hits = retrieveCandidates(
        c.duties,
        c.jobTitle,
        ADMIN_RETRIEVE_TOP_K,
      );
      const rank = hits.findIndex((h) => h.group.code === c.expected) + 1;
      return `${c.id.padEnd(38)} ${c.expected}  rank ${rank || '—'}/${hits.length}`;
    }).join('\n');
    expect(table).toBeTruthy();
    if (process.env.NOC_RANKS) process.stdout.write(`\n${table}\n\n`);
  });
});
