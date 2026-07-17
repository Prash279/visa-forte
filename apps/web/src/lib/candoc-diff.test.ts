import { describe, it, expect } from 'vitest';
import { computeDiff } from './candoc-diff';
import type { FindingsJson } from './candoc-types';

const base: FindingsJson = {
  reviewedAt: '2026-05-20T10:00:00Z',
  clientId: 'abc',
  version: 1,
  overallRiskLevel: 'major',
  totalGaps: 2,
  sopLayers: [
    {
      layer: 'S6',
      layerName: 'Proof of Funds',
      status: 'gap',
      findings: [
        {
          id: 'S6-001',
          severity: 'major',
          description: 'Bank statement too old',
          documentRef: 'bank.pdf',
          suggestedAction: 'Resubmit',
        },
        {
          id: 'S6-002',
          severity: 'minor',
          description: 'Balance below minimum',
          documentRef: 'bank.pdf',
          suggestedAction: 'Top up',
        },
      ],
    },
    {
      layer: 'S7',
      layerName: 'Passport',
      status: 'gap',
      findings: [
        {
          id: 'S7-001',
          severity: 'critical',
          description: 'Passport expires in 14 months',
          documentRef: 'passport.pdf',
          suggestedAction: 'Renew',
        },
      ],
    },
  ],
};

const curr: FindingsJson = {
  reviewedAt: '2026-05-22T10:00:00Z',
  clientId: 'abc',
  version: 2,
  overallRiskLevel: 'minor',
  totalGaps: 1,
  sopLayers: [
    {
      layer: 'S6',
      layerName: 'Proof of Funds',
      status: 'pass',
      findings: [],
    },
    {
      layer: 'S7',
      layerName: 'Passport',
      status: 'gap',
      findings: [
        {
          id: 'S7-001',
          severity: 'critical',
          description: 'Passport expires in 14 months',
          documentRef: 'passport.pdf',
          suggestedAction: 'Renew',
        },
        {
          id: 'S7-002',
          severity: 'major',
          description: 'Page 3 scan illegible',
          documentRef: 'passport.pdf',
          suggestedAction: 'Rescan page 3',
        },
      ],
    },
  ],
};

describe('computeDiff', () => {
  it('marks a finding absent in prev as isNew', () => {
    const result = computeDiff(base, curr);
    const s7 = result.sopLayers.find((l) => l.layer === 'S7')!;
    expect(s7.findings.find((f) => f.id === 'S7-002')?.isNew).toBe(true);
  });

  it('does not mark a persisted finding as new', () => {
    const result = computeDiff(base, curr);
    const s7 = result.sopLayers.find((l) => l.layer === 'S7')!;
    expect(s7.findings.find((f) => f.id === 'S7-001')?.isNew).toBeFalsy();
  });

  it('injects resolved findings from prev with isResolved=true', () => {
    const result = computeDiff(base, curr);
    const s6 = result.sopLayers.find((l) => l.layer === 'S6')!;
    expect(s6.findings.find((f) => f.id === 'S6-001')?.isResolved).toBe(true);
    expect(s6.findings.find((f) => f.id === 'S6-002')?.isResolved).toBe(true);
  });

  it('resolved findings appear at the end of the layer findings list', () => {
    const result = computeDiff(base, curr);
    const s6 = result.sopLayers.find((l) => l.layer === 'S6')!;
    expect(s6.findings[0]?.isResolved).toBe(true);
  });

  it('preserves all current metadata unchanged', () => {
    const result = computeDiff(base, curr);
    expect(result.reviewedAt).toBe(curr.reviewedAt);
    expect(result.version).toBe(2);
    expect(result.overallRiskLevel).toBe('minor');
  });

  it('returns curr unchanged when prev is null', () => {
    const result = computeDiff(null, curr);
    expect(result).toEqual(curr);
  });
});
