import { describe, it, expect } from 'vitest'
import { parseFindings } from './candoc-types'

const validLayer = {
  layer: 'S0',
  layerName: 'Client Profile Baseline',
  status: 'pass' as const,
  findings: [],
}

const validFindings = {
  reviewedAt: '2026-05-22T10:00:00.000Z',
  clientId: '123e4567-e89b-12d3-a456-426614174000',
  version: 1,
  sopLayers: [validLayer],
  overallRiskLevel: 'clear' as const,
  totalGaps: 0,
}

describe('parseFindings', () => {
  it('accepts a valid FindingsJson object', () => {
    expect(() => parseFindings(validFindings)).not.toThrow()
  })

  it('returns the parsed object with correct fields', () => {
    const result = parseFindings(validFindings)
    expect(result.clientId).toBe(validFindings.clientId)
    expect(result.version).toBe(1)
    expect(result.overallRiskLevel).toBe('clear')
  })

  it('rejects an invalid overallRiskLevel', () => {
    expect(() => parseFindings({ ...validFindings, overallRiskLevel: 'unknown' })).toThrow()
  })

  it('rejects an invalid SopLayerResult status', () => {
    const bad = { ...validFindings, sopLayers: [{ ...validLayer, status: 'ok' }] }
    expect(() => parseFindings(bad)).toThrow()
  })

  it('rejects a finding with invalid severity', () => {
    const bad = {
      ...validFindings,
      sopLayers: [{
        ...validLayer,
        findings: [{
          id: 'S0-001',
          severity: 'low',
          description: 'Test',
          documentRef: 'passport.pdf',
          suggestedAction: 'Resubmit',
        }],
      }],
    }
    expect(() => parseFindings(bad)).toThrow()
  })
})
