// Classifies whether an applicant's occupation can use the SINP's points-based
// Occupations In-Demand / Express Entry (OID/EE) sub-categories, or is closed out of
// them and therefore dependent on the employer-driven, sector-capped EPA route.
// Deterministic, never networked.
//
// Two verified gates from saskatchewan.ca close the points path (see sinp-2026.json):
//   1. NOC TEER 4 or 5 is categorically ineligible for OID/EE.
//   2. NOCs on the published Excluded Occupation List are ineligible for OID/EE.
// Either way the occupation routes to the employer-driven pathway (EPA / Saskatchewan
// Work Experience), which is also where the 2026 capped sectors operate.

import sinp2026 from './sinp-2026.json'

export type SinpPathwayStatus = 'oid-ee-eligible' | 'excluded-occupation' | 'teer-ineligible'

export interface SinpPathway {
  status: SinpPathwayStatus
  nocCode: string
  teer: number
  pointsPathOpen: boolean
  excludedTitle: string | null
  headline: string
  detail: string
}

const EXCLUDED_BY_NOC = new Map<string, string>(
  sinp2026.excludedList.occupations.map((o) => [o.noc, o.title]),
)
const INELIGIBLE_TEERS: readonly number[] = sinp2026.excludedList.ineligibleTeers

const EMPLOYER_ROUTE =
  'The route is employer-driven: a Saskatchewan employer must hold SINP job-offer approval (the Employer Position Assessment / EPA), the same pathway the 2026 capped sectors run on.'

export function classifySinpPathway(nocCode: string, teer: number): SinpPathway {
  const excludedTitle = EXCLUDED_BY_NOC.get(nocCode) ?? null

  if (excludedTitle !== null) {
    return {
      status: 'excluded-occupation',
      nocCode,
      teer,
      pointsPathOpen: false,
      excludedTitle,
      headline: 'Not eligible for the points-based OID / Express Entry sub-categories',
      detail: `NOC ${nocCode} is on the SINP Excluded Occupation List. ${EMPLOYER_ROUTE}`,
    }
  }

  if (INELIGIBLE_TEERS.includes(teer)) {
    return {
      status: 'teer-ineligible',
      nocCode,
      teer,
      pointsPathOpen: false,
      excludedTitle: null,
      headline: `TEER ${teer} is not eligible for the points-based OID / Express Entry sub-categories`,
      detail: `The OID and Express Entry sub-categories require NOC TEER 0–3. ${EMPLOYER_ROUTE}`,
    }
  }

  return {
    status: 'oid-ee-eligible',
    nocCode,
    teer,
    pointsPathOpen: true,
    excludedTitle: null,
    headline: 'Eligible for the points-based OID / Express Entry sub-categories',
    detail:
      'This occupation is TEER 0–3 and is not on the Excluded Occupation List, so the SINP points grid applies. Note that EOI points-draws are currently dormant; the points standing is a benchmark, not a live selection.',
  }
}
