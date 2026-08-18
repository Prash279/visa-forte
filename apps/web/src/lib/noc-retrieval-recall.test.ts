import { describe, it, expect } from 'vitest';
import { retrieveCandidates } from './noc-retrieval';
import { RETRIEVE_TOP_K } from './noc-classify';
import nocData from './noc-2021.json';

// Dataset self-test (free, CI, no Claude call): for every official NOC 2021
// unit group, feed that group's OWN lead statement + main duties back through
// retrieval and assert its own code lands in the public shortlist.
//
// This does not measure real-world accuracy — a real applicant's duties are
// paraphrased, not copied from StatCan wording. That is what the golden corpus
// in noc-golden-cases.ts measures: noc-golden-cases.test.ts checks those
// paraphrased duties reach the shortlist for free, and `npm run eval:noc`
// scores what the classifier actually picks. What
// this catches is the failure that would silently starve the AI ranking stage
// for every occupation in a group at once: a tokenization bug, a bad dataset
// row, or a RETRIEVE_TOP_K set too low for the corpus size — because Claude
// can only rank codes that retrieval puts in front of it.

interface NocGroup {
  code: string;
  title: string;
  leadStatement: string;
  mainDuties: string[];
}

const GROUPS = (nocData as { groups: NocGroup[] }).groups;

describe('noc-retrieval recall self-test (dataset-derived, no fixtures needed)', () => {
  const misses: string[] = [];

  for (const group of GROUPS) {
    const duties = `${group.leadStatement} ${group.mainDuties.join(' ')}`;
    const hits = retrieveCandidates(duties, undefined, RETRIEVE_TOP_K);
    if (!hits.some((h) => h.group.code === group.code)) {
      misses.push(`${group.code} ${group.title}`);
    }
  }

  it(`recalls at least 95% of ${GROUPS.length} NOC groups from their own official duties`, () => {
    const recallRate = 1 - misses.length / GROUPS.length;
    expect(
      recallRate,
      `Missed (own text did not retrieve own code): ${misses.slice(0, 20).join(', ')}${misses.length > 20 ? '…' : ''}`,
    ).toBeGreaterThanOrEqual(0.95);
  });
});
