import { describe, it, expect } from 'vitest';
import { retrieveCandidates, getGroupByCode } from './noc-retrieval';

// Representative of Rashmi's documented clinical-trial-operations duties.
const RASHMI_DUTIES = `
Maintained and ensured inspection readiness of the Trial Master File (TMF/eTMF) for multiple clinical trials.
Coordinated with Institutional Review Boards (IRB) and ethics committees on study approvals and amendments.
Managed the Clinical Trial Management System (CTMS) and tracked site regulatory documents and compliance.
Completed Case Report Forms (CRF) and resolved data queries. Reported adverse and serious adverse events per regulatory requirements.
Oversaw vendors and compiled study metrics and progress reports for senior officials.
Reviewed health programme data, monitored study conduct, maintained health information databases,
analysed statistical information, and assessed compliance with health regulatory standards.
`;

// Real CRC/CTA duties — no artificial health-policy language.
// Used to verify that the domain anchor surfaces 41404 even when the TF-IDF
// engine finds no overlap with the official NOC 2021 StatCan vocabulary.
const REAL_CRC_DUTIES = `
Managed ICF version control and distributed regulatory packages to sites.
Coordinated with central and local IRBs on approvals and amendments.
Managed end-to-end TMF/eTMF maintenance and inspection readiness activities.
Performed periodic TMF QC reviews. Maintained CTMS accuracy.
Supported study start-up activities: site identification, regulatory submissions,
IRB approvals, and site activation. Conducted active patient recruitment and
pre-screening. Supported the informed consent process. Documented AEs/SAEs.
`;

const SOFTWARE_DUTIES = `
Designed, developed and tested software applications and web services. Wrote and maintained source code in
multiple programming languages, debugged programs, and built APIs and databases for production systems.
`;

// Reported fiber/telecom OSP network design duties (2026-08-18). TF-IDF alone ranks
// the GIS/drafting technologist codes above 21311 Computer engineers — which on these
// duties is defensible, not a bug. The anchor's job is to put all four candidates in
// front of Claude, not to pick between them.
const FIBER_OSP_DUTIES = `
Delivered end-to-end fiber network design and permits documentation for AT&T, applying buried and aerial
construction guidelines to keep designs audit-ready and standards-compliant.
Analyzed land base and field survey inputs to plan new fiber network builds, cutting downstream rework by
catching specification issues before design handoff.
Vectorized fiber optic network components (joints, cables, conduits) onto land base using the Geofow GIS
platform, producing accurate as-built network documentation.
`;

function topCodes(duties: string, title?: string, k = 20): string[] {
  return retrieveCandidates(duties, title, k).map((c) => c.group.code);
}

describe('noc-retrieval', () => {
  it('ranks NOC 41404 first in the candidate set for Rashmi-style health-policy duties', () => {
    const ranked = retrieveCandidates(
      RASHMI_DUTIES,
      'Clinical Research Coordinator',
    );
    expect(ranked[0]?.group.code).toBe('41404');
  });

  it('a rescued code is placed FIRST, not buried at the end of the shortlist', () => {
    // Real CRC duties contain none of the NOC 2021 StatCan vocabulary, so TF-IDF misses
    // 41404 entirely (measured: absent from the top 30; the lexical leaders are
    // petroleum and mining process operators). The anchor must not merely include it —
    // it must put it where the classifier reads it first. Appending it last made it
    // candidate 31 of 31, the worst slot in the prompt for the one code we have
    // specific reason to believe in.
    const hits = retrieveCandidates(
      REAL_CRC_DUTIES,
      'Clinical Trial Assistant',
    );
    expect(hits[0]?.group.code).toBe('41404');
    // score 0 is the signature of a code TF-IDF did not find on its own.
    expect(hits[0]?.score).toBe(0);
  });

  it('leaves ordering alone when no anchor fires', () => {
    const hits = retrieveCandidates(SOFTWARE_DUTIES, 'Software Developer');
    // Unanchored input must stay in pure descending lexical order.
    const scores = hits.map((h) => h.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(scores[0]).toBeGreaterThan(0);
  });

  it('does not duplicate an anchored code that TF-IDF already found', () => {
    const hits = retrieveCandidates(
      REAL_CRC_DUTIES,
      'Clinical Trial Assistant',
    );
    const codes = hits.map((h) => h.group.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('ranks software-developer duties to the 2123x family', () => {
    const codes = topCodes(SOFTWARE_DUTIES, 'Software Developer', 10);
    expect(codes.some((c) => c.startsWith('2123'))).toBe(true);
  });

  it('returns nothing for empty or signal-free input', () => {
    expect(retrieveCandidates('   ')).toEqual([]);
    expect(retrieveCandidates('the and for with')).toEqual([]);
  });

  it('is deterministic for identical input', () => {
    expect(topCodes(RASHMI_DUTIES)).toEqual(topCodes(RASHMI_DUTIES));
  });

  it('getGroupByCode resolves a known code and rejects an unknown one', () => {
    expect(getGroupByCode('41404')?.teer).toBe(1);
    expect(getGroupByCode('99999')).toBeUndefined();
  });

  it('fiber/OSP duties need no anchor — TF-IDF finds every candidate unaided', () => {
    // This is why the fiber anchor was deleted rather than re-pointed. All four
    // candidates are already on the shortlist on their own merits, so an anchor for
    // them rescues nothing; its only live effect was forcing a winner. A non-zero
    // score is the proof — anchored-in codes enter at score 0.
    // topK=30 is what the public route actually passes (RETRIEVE_TOP_K); the module
    // default of 20 is never used in production. 22310 sits at rank 29 — inside the
    // real shortlist, outside the default.
    const hits = retrieveCandidates(
      FIBER_OSP_DUTIES,
      'Telecom Design Specialist',
      30,
    );
    for (const code of ['21311', '22212', '22214', '22310']) {
      const hit = hits.find((h) => h.group.code === code);
      expect(hit, `${code} missing from shortlist`).toBeDefined();
      expect(hit!.score).toBeGreaterThan(0);
    }
  });

  it('NOC 32109 main duties carry no bare sub-occupation heading labels', () => {
    // StatCan's "Main duties" element for residual groups embeds sub-occupation titles
    // (e.g. "Hearing instrument practitioners") that are headings, not duties — they
    // inflate keyword overlap and already live in `examples`. They must be removed.
    const duties = getGroupByCode('32109')!.mainDuties;
    const headings = [
      'Hearing instrument practitioners',
      'Communicative disorders assistants and speech-language pathology assistants',
      'Ophthalmic medical technologists and technicians',
      'Physical rehabilitation therapists',
      'Physiotherapy assistants and occupational therapy assistants',
    ];
    for (const heading of headings) expect(duties).not.toContain(heading);
    // The genuine duty statements remain.
    expect(
      duties.some((d) =>
        d.startsWith('Examine adult clients to assess hearing loss'),
      ),
    ).toBe(true);
  });
});
