import { describe, it, expect } from 'vitest';
import {
  resolveOccupationEligibility,
  type OccupationEligibility,
} from './occupation-eligibility';
import pnpData from './pnp-streams.json';

// Golden accuracy cases: known NOC × stream → the occupation-eligibility result the
// province's PUBLISHED rule implies, each verified against the cited source this session.
// This is the measurable form of "accurate for any NOC": a new provincial fact = a new row.
// Resolver-level so the cases are deterministic and need no applicant profile.

interface Stream {
  id: string;
  occupationEligibility?: OccupationEligibility;
}
const STREAMS = (pnpData as { streams: Stream[] }).streams;
const eligOf = (id: string): OccupationEligibility | undefined => {
  const s = STREAMS.find((x) => x.id === id);
  if (!s) throw new Error(`no stream ${id}`);
  return s.occupationEligibility;
};

interface Case {
  noc: string;
  teer: number;
  streamId: string;
  expect: ReturnType<typeof resolveOccupationEligibility>;
  why: string;
}

const CASES: Case[] = [
  // Transport truck driver (NOC 73300, TEER 3) — the example that drove this work.
  {
    noc: '73300',
    teer: 3,
    streamId: 'on-trades',
    expect: 'eligible-listed',
    why: 'ontario.ca: ON Skilled Trades includes NOC Major Group 73 (general trades); 73300 is Major Group 73 [ESDC].',
  },
  {
    noc: '73300',
    teer: 3,
    streamId: 'ab-aos',
    expect: 'unrestricted',
    why: 'alberta.ca: 73300 is not on the AOS Ineligible Occupations list (verified 2026-06-17).',
  },
  {
    noc: '73300',
    teer: 3,
    streamId: 'ab-ee',
    expect: 'unrestricted',
    why: 'alberta.ca: Alberta EE excludes the AOS ineligible list; 73300 is not on it.',
  },
  {
    noc: '73300',
    teer: 3,
    streamId: 'sk-isw-ee',
    expect: 'ineligible-listed',
    why: 'saskatchewan.ca: 73300 is on the SINP Excluded Occupation List (EE/OID sub-categories).',
  },
  {
    noc: '73300',
    teer: 3,
    streamId: 'sk-isw-oid',
    expect: 'ineligible-listed',
    why: 'saskatchewan.ca: 73300 is on the SINP Excluded Occupation List.',
  },

  // Taxi/limousine driver (NOC 75200, TEER 5) — explicitly ineligible in Alberta.
  {
    noc: '75200',
    teer: 5,
    streamId: 'ab-aos',
    expect: 'ineligible-listed',
    why: 'alberta.ca: 75200 (taxi and limousine drivers) is on the AOS Ineligible Occupations list.',
  },

  // Software developer (NOC 21232, TEER 1) — not a skilled trade, not AB-ineligible.
  {
    noc: '21232',
    teer: 1,
    streamId: 'on-trades',
    expect: 'ineligible-listed',
    why: 'NOC 21232 is Major Group 21 (applied sciences), outside ON Skilled Trades major groups.',
  },
  {
    noc: '21232',
    teer: 1,
    streamId: 'ab-aos',
    expect: 'unrestricted',
    why: 'alberta.ca: 21232 is not on the AOS Ineligible Occupations list.',
  },

  // Registered nurse (NOC 31301, TEER 1) — on the SINP excluded list; not a trade.
  {
    noc: '31301',
    teer: 1,
    streamId: 'sk-isw-ee',
    expect: 'ineligible-listed',
    why: 'saskatchewan.ca: 31301 (registered nurses) is on the SINP Excluded Occupation List.',
  },
  {
    noc: '31301',
    teer: 1,
    streamId: 'on-trades',
    expect: 'ineligible-listed',
    why: 'NOC 31301 is Major Group 31 (health), outside ON Skilled Trades major groups.',
  },

  // Cook (NOC 63200, TEER 3) — ON Skilled Trades 6320 inclusion explicitly excludes cooks.
  {
    noc: '63200',
    teer: 3,
    streamId: 'on-trades',
    expect: 'ineligible-listed',
    why: 'ontario.ca: cooks are excluded from the ON Skilled Trades Minor Group 6320 inclusion.',
  },
];

describe('PNP occupation-eligibility golden cases (verified provincial facts)', () => {
  for (const c of CASES) {
    it(`NOC ${c.noc} × ${c.streamId} → ${c.expect}`, () => {
      const result = resolveOccupationEligibility(
        eligOf(c.streamId),
        c.noc,
        c.teer,
      );
      expect(result, c.why).toBe(c.expect);
    });
  }
});
