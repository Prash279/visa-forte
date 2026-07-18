// Per-stream occupation eligibility — the deterministic answer to "can THIS NOC use
// THIS stream?", resolved from data each stream carries, never from a coarse field guess.
//
// The old model only had a boolean `occupationListRestricted` that the engine never
// enforced, plus a sparse `occupationFocus` major-group heuristic. This module replaces
// the hard part of that with explicit, sourced eligibility rules so the report can say
// "on the province's list" / "not on the list" / "set at job-offer stage" / "not yet
// curated" — instead of silently scoring every occupation the same.
//
// Group rules use NOC 2021 code prefixes (broad=1 digit, major=2, sub-major=3, minor=4,
// unit=5), so "73" matches every transport-trades unit group and "726" carves out the
// transportation-officers sub-major without listing each code. SINP keeps its dedicated
// excluded-list logic (sinp-2026.json) via the 'sinp-excluded' mode.

import { classifySinpPathway } from './sinp-pathway';

// What the resolver concludes for a given NOC against a given stream.
//  - 'eligible-listed'      NOC is affirmatively on the stream's eligible list/rule → strong positive
//  - 'ineligible-listed'    NOC is on an exclude list, or absent from a required include list → hard gate
//  - 'conditional-employer' eligibility is set by the job offer / EPA, not the NOC → securable
//  - 'unrestricted'         the stream imposes no occupation rule (or NOC simply isn't excluded)
//  - 'unknown'              the stream restricts by occupation but the list is not yet curated
export type OccupationEligibilityResult =
  | 'eligible-listed'
  | 'ineligible-listed'
  | 'conditional-employer'
  | 'unrestricted'
  | 'unknown';

// Shared provenance for any list/rule that asserts an occupation restriction.
interface EligibilitySource {
  source: string; // official provincial URL the list/rule was verified against
  lastVerified: string; // ISO date the list was checked
  documentDate?: string; // ISO date the province published the underlying list
  note?: string;
}

// A stream's occupation rule. Absent on a stream === { mode: 'unrestricted' }.
export type OccupationEligibility =
  | { mode: 'unrestricted' }
  | { mode: 'teer-only' }
  | ({ mode: 'include-list'; nocs: string[] } & EligibilitySource)
  | ({
      mode: 'include-rule';
      includeGroups: string[];
      excludeGroups?: string[];
    } & EligibilitySource)
  | ({ mode: 'exclude-list'; nocs: string[] } & EligibilitySource)
  | ({ mode: 'sinp-excluded' } & EligibilitySource)
  | ({ mode: 'employer-driven'; note: string } & EligibilitySource)
  | { mode: 'unknown'; note: string; source: string };

// True when the NOC code starts with any of the given NOC-2021 prefixes.
function matchesAnyGroup(nocCode: string, prefixes: string[]): boolean {
  return prefixes.some((p) => nocCode.startsWith(p));
}

export function resolveOccupationEligibility(
  elig: OccupationEligibility | undefined,
  nocCode: string,
  teer: number,
): OccupationEligibilityResult {
  if (!elig) return 'unrestricted';
  switch (elig.mode) {
    case 'unrestricted':
    case 'teer-only':
      return 'unrestricted';
    case 'include-list':
      return elig.nocs.includes(nocCode)
        ? 'eligible-listed'
        : 'ineligible-listed';
    case 'include-rule': {
      if (!matchesAnyGroup(nocCode, elig.includeGroups))
        return 'ineligible-listed';
      if (elig.excludeGroups && matchesAnyGroup(nocCode, elig.excludeGroups))
        return 'ineligible-listed';
      return 'eligible-listed';
    }
    case 'exclude-list':
      // On the ineligible list → hard gate. Not on it → the occupation simply isn't a blocker.
      return elig.nocs.includes(nocCode) ? 'ineligible-listed' : 'unrestricted';
    case 'sinp-excluded':
      // Delegates to the verified SINP Excluded Occupation List (sinp-2026.json). TEER 4/5
      // is handled by the stream's allowedTeers gate, so only the list result matters here.
      return classifySinpPathway(nocCode, teer).status === 'excluded-occupation'
        ? 'ineligible-listed'
        : 'unrestricted';
    case 'employer-driven':
      return 'conditional-employer';
    case 'unknown':
      return 'unknown';
  }
}
