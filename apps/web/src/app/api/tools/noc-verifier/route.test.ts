import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Claude is mocked: these tests pin the pipeline around the model (grounding,
// anchor-wins, fallback), not the model itself.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: createMock };
  },
}));

import { POST } from './route';

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/tools/noc-verifier', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function claudeReply(json: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(json) }] };
}

const DEVELOPER_DUTIES =
  'Write, modify, integrate and test software code for web applications. ' +
  'Maintain existing computer programs, identify and communicate technical ' +
  'problems, and prepare reports on software status.';

const DATA_SCIENCE_DUTIES =
  'Built Python-driven data collection, analysis, and visualization ' +
  'workflows across multiple AI call agent tasks to monitor latency, cost, ' +
  'routing quality, and user interaction trends, improving operational ' +
  'visibility and enabling continuous optimization with machine learning.';

describe('POST /api/tools/noc-verifier', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test_key';
    createMock.mockReset();
    // verifyCodeLive network call — stubbed out; "not verified" path.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 500, text: async () => '' }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects duties under 30 characters with 400', async () => {
    const res = await POST(postRequest({ duties: 'too short' }));
    expect(res.status).toBe(400);
  });

  it('rejects a malformed body with 400', async () => {
    const res = await POST(postRequest({ nope: true }));
    expect(res.status).toBe(400);
  });

  it('returns the AI-ranked, dataset-grounded result', async () => {
    createMock.mockResolvedValue(
      claudeReply({
        ranked: [
          {
            nocCode: '21232',
            fitScore: 92,
            rationale: 'Writing, modifying and testing software code.',
          },
        ],
        confidence: 'high',
        ambiguityFlag: false,
      }),
    );
    const res = await POST(
      postRequest({ jobTitle: 'Software Developer', duties: DEVELOPER_DUTIES }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      method: string;
      confidence: string;
      verifiedSource: 'esdc' | 'statcan' | null;
      matches: Array<Record<string, unknown>>;
    };
    expect(json.method).toBe('ai');
    expect(json.confidence).toBe('high');
    expect(json.verifiedSource).toBeNull(); // stubbed fetch → not verified
    expect(json.matches[0]?.code).toBe('21232');
    // TEER joined from the bundled dataset, never from the model
    expect(json.matches[0]?.teer).toBe(1);
    expect(json.matches[0]?.band).toBe('strongest');
    expect(String(json.matches[0]?.rationale)).toContain('software');
  });

  it('ignores model codes that were not in the shortlist (grounding)', async () => {
    createMock.mockResolvedValue(
      claudeReply({
        // 21300 Civil Engineers will not be in the shortlist for pure
        // software duties, so grounding must reject it and fall back.
        ranked: [{ nocCode: '99999', fitScore: 90, rationale: 'invented' }],
        confidence: 'high',
        ambiguityFlag: false,
      }),
    );
    const res = await POST(postRequest({ duties: DEVELOPER_DUTIES }));
    const json = (await res.json()) as { method: string };
    // Grounding failed → explicit lexical fallback, never a fabricated code
    expect(json.method).toBe('lexical');
  });

  it('promotes an anchored code the model ranked lower (anchor-wins)', async () => {
    // DATA_SCIENCE_DUTIES fires the ML/AI domain anchor (21211 et al).
    createMock.mockResolvedValue(
      claudeReply({
        ranked: [
          { nocCode: '21234', fitScore: 70, rationale: 'Web workflows.' },
          {
            nocCode: '21211',
            fitScore: 68,
            rationale: 'Python data collection, analysis and ML monitoring.',
          },
        ],
        confidence: 'medium',
        ambiguityFlag: true,
      }),
    );
    const res = await POST(
      postRequest({
        jobTitle: 'Data Science Engineer',
        duties: DATA_SCIENCE_DUTIES,
      }),
    );
    const json = (await res.json()) as {
      method: string;
      matches: Array<{ code: string; band: string }>;
    };
    expect(json.method).toBe('ai');
    expect(json.matches[0]?.code).toBe('21211'); // Data scientists won via anchor
  });

  it('falls back to labelled lexical matches when Claude is unreachable', async () => {
    createMock.mockRejectedValue(new Error('api down'));
    const res = await POST(
      postRequest({ jobTitle: 'Software Developer', duties: DEVELOPER_DUTIES }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      method: string;
      matches: Array<{ code: string }>;
    };
    expect(json.method).toBe('lexical');
    expect(json.matches.length).toBeGreaterThan(0);
    expect(json.matches.some((m) => m.code.startsWith('2123'))).toBe(true);
  });

  it('falls back to lexical when no API key is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(postRequest({ duties: DEVELOPER_DUTIES }));
    const json = (await res.json()) as { method: string };
    expect(json.method).toBe('lexical');
    expect(createMock).not.toHaveBeenCalled();
  });
});
