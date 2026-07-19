import { describe, it, expect, vi } from 'vitest';
import { getGroupByCode, type NocRetrievalHit } from './noc-retrieval';
import {
  buildCandidateBlock,
  parseRawClassification,
  extractJsonObject,
  groundClassification,
  esdcProfileUrl,
  statcanUnitGroupUrl,
  NOC_CLASSIFIER_SYSTEM,
  type RawClassification,
} from './noc-classify';

function hit(code: string, score: number): NocRetrievalHit {
  const group = getGroupByCode(code);
  if (!group) throw new Error(`unknown test code ${code}`);
  return { group, score };
}

const HITS: NocRetrievalHit[] = [
  hit('41404', 134),
  hit('12111', 102),
  hit('21223', 90),
];

describe('extractJsonObject', () => {
  it('pulls JSON out of fences and commentary', () => {
    expect(
      extractJsonObject('Here you go:\n```json\n{"a":1}\n```\nthanks'),
    ).toBe('{"a":1}');
  });
  it('ignores braces inside strings', () => {
    expect(extractJsonObject('{"s":"a}b"}')).toBe('{"s":"a}b"}');
  });
  it('returns null when there is no object', () => {
    expect(extractJsonObject('no json here')).toBeNull();
  });
});

describe('parseRawClassification', () => {
  it('parses a well-formed object', () => {
    const out = parseRawClassification(
      '{"ranked":[{"nocCode":"41404","rationale":"x","fitScore":90}],"confidence":"high","ambiguityFlag":false}',
    );
    expect(out?.confidence).toBe('high');
  });
  it('rejects an empty ranked array', () => {
    expect(
      parseRawClassification(
        '{"ranked":[],"confidence":"high","ambiguityFlag":false}',
      ),
    ).toBeNull();
  });
  it('rejects garbage', () => {
    expect(parseRawClassification('not json at all')).toBeNull();
  });
});

describe('groundClassification', () => {
  it('joins authoritative TEER and title from the dataset, not the model', () => {
    const raw: RawClassification = {
      ranked: [
        {
          nocCode: '41404',
          rationale: 'health policy, databases, statistical analysis',
          fitScore: 90,
        },
        {
          nocCode: '12111',
          rationale: 'health information management',
          fitScore: 78,
        },
      ],
      confidence: 'high',
      ambiguityFlag: false,
    };
    const g = groundClassification(raw, HITS)!;
    expect(g.nocCode).toBe('41404');
    expect(g.teer).toBe(1);
    expect(g.title).toContain('Health policy');
    expect(g.candidates[0]!.matchScore).toBe(134);
  });

  it('drops codes that were not in the retrieved shortlist', () => {
    const raw: RawClassification = {
      ranked: [
        {
          nocCode: '31301',
          rationale: 'real code but not shortlisted',
          fitScore: 85,
        },
        { nocCode: '41404', rationale: 'shortlisted', fitScore: 80 },
      ],
      confidence: 'high',
      ambiguityFlag: false,
    };
    const g = groundClassification(raw, HITS)!;
    expect(g.candidates.map((c) => c.nocCode)).toEqual(['41404']);
  });

  it('drops codes that are not real NOC codes', () => {
    const raw: RawClassification = {
      ranked: [
        { nocCode: '99999', rationale: 'invented', fitScore: 90 },
        { nocCode: '12111', rationale: 'real and shortlisted', fitScore: 80 },
      ],
      confidence: 'medium',
      ambiguityFlag: false,
    };
    const g = groundClassification(raw, HITS)!;
    expect(g.candidates.map((c) => c.nocCode)).toEqual(['12111']);
  });

  it('returns null when the model picked nothing from the shortlist', () => {
    const raw: RawClassification = {
      ranked: [{ nocCode: '99999', rationale: 'invented', fitScore: 50 }],
      confidence: 'low',
      ambiguityFlag: false,
    };
    expect(groundClassification(raw, HITS)).toBeNull();
  });

  it('forces the ambiguity flag when the surviving top codes span different TEER levels', () => {
    const raw: RawClassification = {
      ranked: [
        { nocCode: '41404', rationale: 'TEER 1', fitScore: 82 },
        { nocCode: '14111', rationale: 'TEER 4', fitScore: 75 },
      ],
      confidence: 'medium',
      ambiguityFlag: false,
    };
    const g = groundClassification(raw, [hit('41404', 100), hit('14111', 50)])!;
    expect(g.ambiguity.flag).toBe(true);
    expect(g.ambiguity.alternatives[0]!.nocCode).toBe('14111');
  });
});

describe('groundClassification — margin gating of weak ranked matches', () => {
  it('drops runners-up whose fit score is far below the leader, leaving one clean match', () => {
    const raw: RawClassification = {
      ranked: [
        { nocCode: '41404', rationale: 'strong, decisive fit', fitScore: 88 },
        { nocCode: '12111', rationale: 'shared keywords only', fitScore: 35 },
        { nocCode: '21223', rationale: 'weaker still', fitScore: 22 },
      ],
      confidence: 'high',
      ambiguityFlag: false,
    };
    const g = groundClassification(raw, HITS)!;
    expect(g.candidates.map((c) => c.nocCode)).toEqual(['41404']);
    expect(g.ambiguity.flag).toBe(false);
    expect(g.ambiguity.alternatives).toHaveLength(0);
  });

  it('keeps a runner-up that is genuinely close to the leader', () => {
    const raw: RawClassification = {
      ranked: [
        { nocCode: '41404', rationale: 'leader', fitScore: 82 },
        { nocCode: '12111', rationale: 'within margin', fitScore: 74 },
      ],
      confidence: 'medium',
      ambiguityFlag: false,
    };
    const g = groundClassification(raw, HITS)!;
    expect(g.candidates.map((c) => c.nocCode)).toEqual(['41404', '12111']);
  });

  it('exposes the model fit score on each surviving candidate', () => {
    const raw: RawClassification = {
      ranked: [{ nocCode: '41404', rationale: 'x', fitScore: 91 }],
      confidence: 'high',
      ambiguityFlag: false,
    };
    expect(groundClassification(raw, HITS)!.candidates[0]!.fitScore).toBe(91);
  });
});

describe('groundClassification — residual "Other..." catch-all demotion', () => {
  // Mirrors the Rashmi failure: the model leads with the residual catch-all 32109
  // while a specific group (41404) sits just behind it. A residual group must never
  // win over a specific group whose fit is comparable.
  const CLINICAL_HITS: NocRetrievalHit[] = [
    hit('32109', 201),
    hit('41404', 129),
    hit('32103', 216),
  ];

  it('promotes the specific group over a residual leader within the margin', () => {
    const raw: RawClassification = {
      ranked: [
        {
          nocCode: '32109',
          rationale: 'broad keyword overlap on assessment',
          fitScore: 80,
        },
        {
          nocCode: '41404',
          rationale: 'health policy research and program administration',
          fitScore: 72,
        },
      ],
      confidence: 'medium',
      ambiguityFlag: true,
    };
    const g = groundClassification(raw, CLINICAL_HITS)!;
    expect(g.nocCode).toBe('41404');
    expect(g.title).not.toMatch(/^Other/);
  });

  it('keeps the residual leader when no specific group is within the margin', () => {
    const raw: RawClassification = {
      ranked: [
        {
          nocCode: '32109',
          rationale: 'clearly the right residual bucket',
          fitScore: 84,
        },
        { nocCode: '41404', rationale: 'only loosely related', fitScore: 50 },
      ],
      confidence: 'medium',
      ambiguityFlag: false,
    };
    expect(groundClassification(raw, CLINICAL_HITS)!.nocCode).toBe('32109');
  });

  it('keeps a residual group that is the only valid pick', () => {
    const raw: RawClassification = {
      ranked: [{ nocCode: '32109', rationale: 'sole match', fitScore: 70 }],
      confidence: 'low',
      ambiguityFlag: false,
    };
    expect(groundClassification(raw, CLINICAL_HITS)!.nocCode).toBe('32109');
  });
});

describe('classifier prompt contract', () => {
  it('asks the model for a fitScore (the schema requires it, so the prompt must request it)', () => {
    expect(NOC_CLASSIFIER_SYSTEM).toContain('fitScore');
  });
  it('tells the model that paraphrased duties must not lower confidence', () => {
    const p = NOC_CLASSIFIER_SYSTEM.toLowerCase();
    expect(p).toContain('verbatim');
    expect(p).toContain('paraphrase');
  });
  it('warns the model that residual "Other..." groups are a last resort', () => {
    const p = NOC_CLASSIFIER_SYSTEM.toLowerCase();
    expect(p).toContain('residual');
    expect(p).toContain('other');
  });
  it('documents an output shape that parses against the schema', () => {
    const shape = extractJsonObject(
      NOC_CLASSIFIER_SYSTEM.slice(
        NOC_CLASSIFIER_SYSTEM.lastIndexOf('{"ranked"'),
      ),
    );
    expect(shape).not.toBeNull();
    expect(parseRawClassification(shape!)).not.toBeNull();
  });
});

describe('grounding block + citation urls', () => {
  it('embeds the real code, TEER and duties of each candidate', () => {
    const block = buildCandidateBlock(HITS);
    expect(block).toContain('NOC 41404 (TEER 1)');
    expect(block).toContain('Main duties:');
  });
  it('builds code-specific official URLs', () => {
    expect(esdcProfileUrl('41404')).toContain('code=41404.00');
    expect(statcanUnitGroupUrl('41404')).toContain('CPV=41404');
  });
});

describe('verifyCodeLive', () => {
  const htmlWith = (text: string) =>
    Promise.resolve({ status: 200, text: async () => `<html>${text}</html>` });

  it('verifies on ESDC first and never touches StatCan when ESDC confirms', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(String(url));
        return htmlWith('Data scientists');
      }),
    );
    const { verifyCodeLive } = await import('./noc-classify');
    const source = await verifyCodeLive('21211', 'Data scientists');
    vi.unstubAllGlobals();
    expect(source).toBe('esdc');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('noc.esdc.gc.ca');
  });

  it('falls back to StatCan when the ESDC check fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        String(url).includes('noc.esdc.gc.ca')
          ? Promise.resolve({ status: 404, text: async () => '' })
          : htmlWith('Data scientists'),
      ),
    );
    const { verifyCodeLive } = await import('./noc-classify');
    const source = await verifyCodeLive('21211', 'Data scientists');
    vi.unstubAllGlobals();
    expect(source).toBe('statcan');
  });

  it('returns null when neither source confirms the title', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => htmlWith('a page about something else entirely')),
    );
    const { verifyCodeLive } = await import('./noc-classify');
    const source = await verifyCodeLive('21211', 'Data scientists');
    vi.unstubAllGlobals();
    expect(source).toBeNull();
  });
});
