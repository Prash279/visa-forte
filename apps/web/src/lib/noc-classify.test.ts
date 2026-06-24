import { describe, it, expect } from 'vitest'
import { getGroupByCode, type NocRetrievalHit } from './noc-retrieval'
import {
  buildCandidateBlock,
  parseRawClassification,
  extractJsonObject,
  groundClassification,
  esdcProfileUrl,
  statcanUnitGroupUrl,
  type RawClassification,
} from './noc-classify'

function hit(code: string, score: number): NocRetrievalHit {
  const group = getGroupByCode(code)
  if (!group) throw new Error(`unknown test code ${code}`)
  return { group, score }
}

const HITS: NocRetrievalHit[] = [hit('41404', 134), hit('12111', 102), hit('21223', 90)]

describe('extractJsonObject', () => {
  it('pulls JSON out of fences and commentary', () => {
    expect(extractJsonObject('Here you go:\n```json\n{"a":1}\n```\nthanks')).toBe('{"a":1}')
  })
  it('ignores braces inside strings', () => {
    expect(extractJsonObject('{"s":"a}b"}')).toBe('{"s":"a}b"}')
  })
  it('returns null when there is no object', () => {
    expect(extractJsonObject('no json here')).toBeNull()
  })
})

describe('parseRawClassification', () => {
  it('parses a well-formed object', () => {
    const out = parseRawClassification(
      '{"ranked":[{"nocCode":"41404","rationale":"x"}],"confidence":"high","ambiguityFlag":false}'
    )
    expect(out?.confidence).toBe('high')
  })
  it('rejects an empty ranked array', () => {
    expect(
      parseRawClassification('{"ranked":[],"confidence":"high","ambiguityFlag":false}')
    ).toBeNull()
  })
  it('rejects garbage', () => {
    expect(parseRawClassification('not json at all')).toBeNull()
  })
})

describe('groundClassification', () => {
  it('joins authoritative TEER and title from the dataset, not the model', () => {
    const raw: RawClassification = {
      ranked: [
        { nocCode: '41404', rationale: 'health policy, databases, statistical analysis' },
        { nocCode: '12111', rationale: 'health information management' },
      ],
      confidence: 'high',
      ambiguityFlag: false,
    }
    const g = groundClassification(raw, HITS)!
    expect(g.nocCode).toBe('41404')
    expect(g.teer).toBe(1)
    expect(g.title).toContain('Health policy')
    expect(g.candidates[0]!.matchScore).toBe(134)
  })

  it('drops codes that were not in the retrieved shortlist', () => {
    const raw: RawClassification = {
      ranked: [
        { nocCode: '31301', rationale: 'real code but not shortlisted' },
        { nocCode: '41404', rationale: 'shortlisted' },
      ],
      confidence: 'high',
      ambiguityFlag: false,
    }
    const g = groundClassification(raw, HITS)!
    expect(g.candidates.map((c) => c.nocCode)).toEqual(['41404'])
  })

  it('drops codes that are not real NOC codes', () => {
    const raw: RawClassification = {
      ranked: [
        { nocCode: '99999', rationale: 'invented' },
        { nocCode: '12111', rationale: 'real and shortlisted' },
      ],
      confidence: 'medium',
      ambiguityFlag: false,
    }
    const g = groundClassification(raw, HITS)!
    expect(g.candidates.map((c) => c.nocCode)).toEqual(['12111'])
  })

  it('returns null when the model picked nothing from the shortlist', () => {
    const raw: RawClassification = {
      ranked: [{ nocCode: '99999', rationale: 'invented' }],
      confidence: 'low',
      ambiguityFlag: false,
    }
    expect(groundClassification(raw, HITS)).toBeNull()
  })

  it('forces the ambiguity flag when the top codes span different TEER levels', () => {
    const raw: RawClassification = {
      ranked: [
        { nocCode: '41404', rationale: 'TEER 1' },
        { nocCode: '14111', rationale: 'TEER 4' },
      ],
      confidence: 'medium',
      ambiguityFlag: false,
    }
    const g = groundClassification(raw, [hit('41404', 100), hit('14111', 50)])!
    expect(g.ambiguity.flag).toBe(true)
    expect(g.ambiguity.alternatives[0]!.nocCode).toBe('14111')
  })
})

describe('grounding block + citation urls', () => {
  it('embeds the real code, TEER and duties of each candidate', () => {
    const block = buildCandidateBlock(HITS)
    expect(block).toContain('NOC 41404 (TEER 1)')
    expect(block).toContain('Main duties:')
  })
  it('builds code-specific official URLs', () => {
    expect(esdcProfileUrl('41404')).toContain('code=41404.00')
    expect(statcanUnitGroupUrl('41404')).toContain('CPV=41404')
  })
})
