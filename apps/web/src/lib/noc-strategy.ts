// What a NOC code is WORTH — deliberately a separate module from what a NOC code IS.
//
// THE SEPARATION IS THE POINT, not an accident of file layout. The original NOC accuracy
// complaint was, underneath, that a higher-TEER code would be worth more; building toward
// the more valuable code would make the tool recommend codes an applicant's employment
// reference letter cannot support, which is a misrepresentation risk under IRPA s.40, not
// a strategy. So noc-classify.ts answers one question only — which code do these duties
// describe — and never sees anything in this file. Programme value is computed AFTER the
// code is settled, from the code alone, and is presented to the user as a separate panel.
//
// Nothing here may ever be imported by noc-classify.ts or by the retrieval layer. If a
// future change needs it there, the change is wrong.
//
// EVERY FIGURE IS VERIFIED LIVE, PER CLAUDE.md. No IRCC fact is written from memory.

export interface TeerVerdict {
  /** Does this TEER clear the skilled-work-experience bar for the main EE programmes? */
  expressEntryEligible: boolean;
  headline: string;
  detail: string;
}

// FSW: canada.ca "Federal Skilled Worker Program: Who can apply", dcterms.modified
// 2026-06-22, fetched 2026-08-18 — "Your skilled work experience must: be in 1 of these
// TEER categories: 0, 1, 2, or 3".
export const FSW_SOURCE = {
  url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html',
  pageModified: '2026-06-22',
  verifiedOn: '2026-08-18',
} as const;

// CEC: IRCC officer instruction "CEC: Qualifying work experience", dcterms.modified
// 2023-05-25, fetched 2026-08-18 — "at least 12 months of full-time, Canadian skilled work
// experience ... in one or more TEER 0, TEER 1, TEER 2 or TEER 3 occupations within the 36
// months before the date the application is received [R87.1(2)(a)]".
export const CEC_SOURCE = {
  url: 'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/permanent-residence/economic-classes/experience/qualifying-work-experience.html',
  pageModified: '2023-05-25',
  verifiedOn: '2026-08-18',
} as const;

const ELIGIBLE_TEERS = new Set([0, 1, 2, 3]);

export function teerVerdict(teer: number): TeerVerdict {
  if (ELIGIBLE_TEERS.has(teer)) {
    return {
      expressEntryEligible: true,
      headline: `TEER ${teer} counts as skilled work experience`,
      detail:
        'Both the Federal Skilled Worker Program and the Canadian Experience Class require experience in TEER 0, 1, 2 or 3. This code clears that bar. Clearing it is necessary, not sufficient — language scores, the duration and recency of the experience, and the other programme criteria are assessed separately.',
    };
  }
  return {
    expressEntryEligible: false,
    headline: `TEER ${teer} does not count as skilled work experience`,
    detail:
      'The Federal Skilled Worker Program and the Canadian Experience Class both require TEER 0, 1, 2 or 3. Experience in this code cannot be used to meet that requirement. It may still matter for other pathways — several Provincial Nominee Program streams accept occupations outside TEER 0–3, and those are assessed province by province.',
  };
}

// Deliberately NOT computed here: whether a code sits in an Express Entry category-based
// selection group (Healthcare, STEM, Trades, Transport, Education, Agriculture, French).
//
// Those NOC lists are revised at least annually and sometimes mid-year — Transport was
// added and Cooks removed in February 2026 — and this repository holds no category data
// file. A hardcoded list would go stale silently and tell an applicant they qualify for a
// draw they cannot enter, which is worse than saying nothing. Until a maintained data file
// with its own lastVerified stamp exists, the UI points at the live IRCC page instead.
export const CATEGORY_SELECTION_SOURCE = {
  url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations/category-based-selection.html',
  note: 'Category eligibility is assessed by IRCC from the NOC declared in the Express Entry profile. The categories and their NOC lists change at least annually — check the live page rather than any cached list.',
} as const;
