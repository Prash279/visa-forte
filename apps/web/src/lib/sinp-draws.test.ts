import { describe, it, expect } from 'vitest'
import {
  drawVerdict,
  analyzeSinpDraws,
  type SinpDraw,
  type SinpDrawDataset,
} from './sinp-draws'
import { SINP_MAX_POINTS, type SinpScore, type SinpFactor } from './sinp-points'

// Builds a minimal SinpScore: a single computed factor holding `computed` points,
// plus to-confirm factors whose maxima sum to `headroom`.
function makeScore(computed: number, headroom: number): SinpScore {
  const factors: SinpFactor[] = [
    { key: 'computed', label: 'Computed', points: computed, maxPoints: computed, status: 'computed', detail: '' },
    { key: 'to-confirm', label: 'To confirm', points: 0, maxPoints: headroom, status: 'to-confirm', detail: '' },
  ]
  return {
    factors,
    computedPoints: computed,
    maxPoints: SINP_MAX_POINTS,
    passMark: 60,
    meetsPassMark: computed >= 60,
    hasUnconfirmedFactors: headroom > 0,
  }
}

function dataset(draws: SinpDraw[]): SinpDrawDataset {
  return { lastUpdated: '2024-09-12', programStatus: 'paused', sourceUrl: 'https://example/source', draws }
}

// ── drawVerdict — the three honest-band boundaries ───────────────────────────
describe('drawVerdict — band vs cutoff', () => {
  it('clears when the floor alone meets the cutoff', () => {
    expect(drawVerdict(88, 110, 88)).toBe('clears') // floor exactly == cutoff
    expect(drawVerdict(90, 110, 88)).toBe('clears')
  })
  it('is conditional when the cutoff sits inside the band', () => {
    expect(drawVerdict(68, 98, 88)).toBe('conditional')
    expect(drawVerdict(68, 88, 88)).toBe('conditional') // ceiling exactly == cutoff still reachable
  })
  it('is out-of-range when even the ceiling falls short', () => {
    expect(drawVerdict(50, 87, 88)).toBe('out-of-range') // ceiling just below cutoff
  })
})

// ── analyzeSinpDraws — grouping, counts, band derivation ─────────────────────
describe('analyzeSinpDraws', () => {
  const fiveDates: SinpDraw[] = [
    { date: '2024-09-12', subCategory: 'Express Entry', cutoffScore: 88, invitationsIssued: 57 },
    { date: '2024-09-12', subCategory: 'Occupations In-Demand', cutoffScore: 88, invitationsIssued: 32 },
    { date: '2024-06-13', subCategory: 'Express Entry', cutoffScore: 88, invitationsIssued: 88 },
    { date: '2024-03-07', subCategory: 'Express Entry', cutoffScore: 89, invitationsIssued: 21 },
    { date: '2023-12-27', subCategory: 'Express Entry', cutoffScore: 69, invitationsIssued: 15 },
    { date: '2023-10-23', subCategory: 'Express Entry', cutoffScore: 84, invitationsIssued: 59 },
    { date: '2023-08-16', subCategory: 'Express Entry', cutoffScore: 60, invitationsIssued: 23 },
  ]

  it('collapses sub-category rows into one comparison per date, most recent first, capped at 5', () => {
    const a = analyzeSinpDraws(makeScore(70, 30), dataset(fiveDates))
    expect(a.comparisons).toHaveLength(5)
    expect(a.comparisons[0].date).toBe('2024-09-12')
    expect(a.comparisons.at(-1)?.date).toBe('2023-10-23') // 2023-08-16 dropped (6th)
  })

  it('merges sub-categories and sums invitations within a date', () => {
    const a = analyzeSinpDraws(makeScore(70, 30), dataset(fiveDates))
    const top = a.comparisons[0]
    expect(top.subCategories).toEqual(['Express Entry', 'Occupations In-Demand'])
    expect(top.invitationsIssued).toBe(57 + 32)
  })

  it('derives the band from computed floor + to-confirm headroom and tallies verdicts', () => {
    // floor 70, ceiling 100. Cutoffs after grouping: 88, 88, 89, 69, 84.
    // 69 → clears (70>=69); 84/88/88/89 → conditional (inside 70..100).
    const a = analyzeSinpDraws(makeScore(70, 30), dataset(fiveDates))
    expect(a.bandFloor).toBe(70)
    expect(a.bandCeiling).toBe(100)
    expect(a.clears).toBe(1)
    expect(a.conditional).toBe(4)
    expect(a.outOfRange).toBe(0)
  })

  it('caps the ceiling at the 110-point grid maximum', () => {
    const a = analyzeSinpDraws(makeScore(100, 40), dataset(fiveDates))
    expect(a.bandCeiling).toBe(SINP_MAX_POINTS) // 100 + 40 = 140, capped to 110
  })

  it('returns no comparisons when there is no draw data', () => {
    const a = analyzeSinpDraws(makeScore(70, 30), dataset([]))
    expect(a.comparisons).toHaveLength(0)
    expect(a.clears + a.conditional + a.outOfRange).toBe(0)
  })

  it('passes dataset metadata through for staleness display', () => {
    const a = analyzeSinpDraws(makeScore(70, 30), dataset(fiveDates))
    expect(a.lastUpdated).toBe('2024-09-12')
    expect(a.programStatus).toBe('paused')
  })
})
