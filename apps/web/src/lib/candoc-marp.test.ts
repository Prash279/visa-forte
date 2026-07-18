import { describe, it, expect } from 'vitest';
import { buildCandocMarp } from './candoc-marp';
import type { FindingsJson } from './candoc-types';

const mockFindings: FindingsJson = {
  reviewedAt: '2026-05-22T10:00:00Z',
  clientId: 'client-uuid-123',
  version: 1,
  overallRiskLevel: 'major',
  totalGaps: 2,
  sopLayers: [
    {
      layer: 'S0',
      layerName: 'Identity Documents',
      status: 'gap',
      findings: [
        {
          id: 'S0-001',
          severity: 'critical',
          description: 'Passport expires within 6 months',
          documentRef: 'passport.pdf',
          suggestedAction: 'Renew passport before applying',
          prashAnnotation: 'Client informed to renew by June 2026',
          isNew: false,
          isResolved: false,
        },
      ],
    },
    {
      layer: 'S1',
      layerName: 'Language Tests',
      status: 'pass',
      findings: [],
    },
  ],
};

describe('buildCandocMarp', () => {
  it('includes MARP front matter', () => {
    const md = buildCandocMarp(mockFindings, 'John Doe');
    expect(md).toContain('marp: true');
  });

  it('includes client name', () => {
    const md = buildCandocMarp(mockFindings, 'John Doe');
    expect(md).toContain('John Doe');
  });

  it('includes all SOP layer codes present in findings', () => {
    const md = buildCandocMarp(mockFindings, 'John Doe');
    expect(md).toContain('S0');
    expect(md).toContain('S1');
  });

  it('includes overall risk level in uppercase', () => {
    const md = buildCandocMarp(mockFindings, 'John Doe');
    expect(md).toContain('MAJOR');
  });

  it('includes Prash annotations', () => {
    const md = buildCandocMarp(mockFindings, 'John Doe');
    expect(md).toContain('Client informed to renew by June 2026');
  });

  it('includes legal disclaimer', () => {
    const md = buildCandocMarp(mockFindings, 'John Doe');
    expect(md.toLowerCase()).toContain('informational');
  });
});
