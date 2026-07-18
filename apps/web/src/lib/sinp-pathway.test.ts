import { describe, it, expect } from 'vitest';
import { classifySinpPathway } from './sinp-pathway';

// NOC/TEER facts below are taken from the verified sinp-2026.json Excluded Occupation
// List (saskatchewan.ca), not training data.

describe('classifySinpPathway', () => {
  it('closes the points path for a NOC on the Excluded Occupation List', () => {
    // 73300 Transport truck drivers (TEER 3) is on the excluded list → capped-sector / EPA route.
    const r = classifySinpPathway('73300', 3);
    expect(r.status).toBe('excluded-occupation');
    expect(r.pointsPathOpen).toBe(false);
    expect(r.excludedTitle).toBe('Transport truck drivers');
  });

  it('closes the points path for an excluded TEER 0-3 professional (e.g. RN 31301)', () => {
    const r = classifySinpPathway('31301', 1);
    expect(r.status).toBe('excluded-occupation');
    expect(r.pointsPathOpen).toBe(false);
  });

  it('closes the points path for TEER 4/5 occupations not individually listed', () => {
    // 65200 Food counter attendants (TEER 5) is not enumerated but is categorically ineligible.
    const r = classifySinpPathway('65200', 5);
    expect(r.status).toBe('teer-ineligible');
    expect(r.pointsPathOpen).toBe(false);
    expect(r.excludedTitle).toBeNull();

    const teer4 = classifySinpPathway('75110', 4);
    expect(teer4.status).toBe('teer-ineligible');
    expect(teer4.pointsPathOpen).toBe(false);
  });

  it('opens the points path for a TEER 0-3 occupation that is not excluded (e.g. 21231)', () => {
    const r = classifySinpPathway('21231', 1);
    expect(r.status).toBe('oid-ee-eligible');
    expect(r.pointsPathOpen).toBe(true);
    expect(r.excludedTitle).toBeNull();
  });

  it('prefers the named excluded-occupation status over the TEER gate', () => {
    // Even if a hypothetical excluded NOC were passed with TEER 4, the named-list match wins.
    const r = classifySinpPathway('73300', 4);
    expect(r.status).toBe('excluded-occupation');
  });
});
