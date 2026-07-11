import { describe, it, expect } from 'vitest'
import { getWeaknesses, getBestPathway } from './canvisa-lite-logic'
import type { CrsResult } from './crs-calculator'
import drawData from './crs-draw-history.json'

// Minimal CrsResult stub — only the fields getWeaknesses and getBestPathway touch.
function makeResult(scenarios: { name: string; delta: number; currentCrs: number; projectedCrs: number; competitive: boolean; change: string }[]): CrsResult {
  return {
    scenarios,
    breakdown: {
      total: 450,
      agePoints: 100, educationPoints: 126, firstLanguagePoints: 124, secondLanguagePoints: 0,
      canadianExpPoints: 80, spousePoints: 0, coreTotal: 430,
      eduLanguageTransfer: 20, eduCanadianExpTransfer: 0, foreignExpLanguageTransfer: 0,
      foreignExpCanadianExpTransfer: 0, transferTotal: 20,
      provincialNomination: 0, siblingPoints: 0, additionalTotal: 0,
    },
    firstLanguageBands:   { listening: 9, reading: 8, writing: 8, speaking: 8 },
    secondLanguageBands:  undefined,
    fswGrid:              { language: 28, education: 25, workExperience: 15, age: 10, adaptability: 5, total: 83, eligible: true },
    eligibility: {
      fsw:              { eligible: true,  likely: true,  reason: '' },
      cec:              { eligible: true,  likely: true,  reason: '' },
      fst:              { eligible: false, likely: false, reason: '' },
      expressEntryPool: { eligible: true,  likely: true,  reason: '' },
    },
    fswImprovements: [],
    proofOfFundsRequired: 13310,
    proofOfFundsSufficient: true,
    rulesVersion: 'test',
  }
}

describe('getWeaknesses', () => {
  it('returns top 3 scenarios sorted by pointGain descending', () => {
    const result = makeResult([
      { name: 'Language', change: '', delta: 32, currentCrs: 450, projectedCrs: 482, competitive: false },
      { name: 'PNP',      change: '', delta: 600, currentCrs: 450, projectedCrs: 1050, competitive: true },
      { name: 'CWE',      change: '', delta: 15, currentCrs: 450, projectedCrs: 465, competitive: false },
      { name: 'FWE 3yr',  change: '', delta: 25, currentCrs: 450, projectedCrs: 475, competitive: false },
    ])
    const chips = getWeaknesses(result)
    expect(chips).toHaveLength(3)
    expect(chips[0]!.label).toBe('PNP')
    expect(chips[0]!.pointGain).toBe(600)
    expect(chips[1]!.pointGain).toBe(32)
    expect(chips[2]!.pointGain).toBe(25)
  })

  it('skips scenarios with delta <= 0', () => {
    const result = makeResult([
      { name: 'Good', change: '', delta: 50, currentCrs: 450, projectedCrs: 500, competitive: true },
      { name: 'Zero', change: '', delta: 0,  currentCrs: 450, projectedCrs: 450, competitive: false },
    ])
    const chips = getWeaknesses(result)
    expect(chips).toHaveLength(1)
    expect(chips[0]!.label).toBe('Good')
  })

  it('returns fewer than 3 when fewer scenarios exist', () => {
    const result = makeResult([
      { name: 'Only One', change: '', delta: 10, currentCrs: 450, projectedCrs: 460, competitive: false },
    ])
    const chips = getWeaknesses(result)
    expect(chips).toHaveLength(1)
  })
})

describe('getBestPathway', () => {
  it('picks the above-cutoff category with smallest gap', () => {
    // The draw-history JSON is refreshed automatically from canada.ca, so the
    // PNP cutoff moves over time. Derive the expected cutoff from the same
    // JSON the logic reads instead of hardcoding a value that goes stale.
    const latestPnp = (drawData.draws as { type: string; cutoffScore: number }[])
      .find(d => /provincial nominee/i.test(d.type))
    expect(latestPnp).toBeDefined()
    const pathway = getBestPathway(latestPnp!.cutoffScore, ['PNP'])
    expect(pathway).not.toBeNull()
    expect(pathway!.category).toBe('PNP')
    expect(pathway!.gap).toBe(0)
  })

  it('picks closest-below-cutoff category when no category is above', () => {
    // Score well below both CEC and PNP cutoffs
    const pathway = getBestPathway(200, ['CEC', 'PNP'])
    expect(pathway).not.toBeNull()
    // CEC cutoff ~516, PNP cutoff ~730 — CEC gap (-316) is closer than PNP gap (-530)
    expect(pathway!.category).toBe('CEC')
  })

  it('returns null when no eligible categories have a matching draw', () => {
    const pathway = getBestPathway(400, ['UnknownCategory'])
    expect(pathway).toBeNull()
  })
})
