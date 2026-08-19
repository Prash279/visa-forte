import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Claude is mocked: these tests pin the pipeline around the model (grounding,
// anchor-wins, fallback), not the model itself.
const { createMock, sessionMock, rateLimitCount, capturedUpdate } = vi.hoisted(
  () => ({
    createMock: vi.fn(),
    sessionMock: vi.fn(),
    rateLimitCount: { value: 1 },
    capturedUpdate: { value: undefined as unknown },
  }),
);
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: createMock };
  },
}));

vi.mock('@/lib/auth-server', () => ({
  getCurrentAuthSession: sessionMock,
}));

// The durable rate limiter's upsert — returns rateLimitCount.value as the
// post-increment count, so individual tests can push it over RATE_LIMIT.
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn((arg: unknown) => {
          capturedUpdate.value = arg;
          return {
            returning: vi
              .fn()
              .mockImplementation(async () => [
                { count: rateLimitCount.value },
              ]),
          };
        }),
      })),
    })),
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
    sessionMock.mockReset().mockResolvedValue(null); // non-admin by default
    rateLimitCount.value = 1; // well under RATE_LIMIT by default
    capturedUpdate.value = undefined;
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

  it('never binds a raw Date into the rate-limit expiry SQL fragment', async () => {
    // postgres.js's raw-parameter bind path (what a free-form sql`` fragment
    // goes through) throws ERR_INVALID_ARG_TYPE on a bare JS Date — the
    // rate limiter must hand it an ISO string instead. The db mock records
    // what rateLimited() actually built, so this catches a regression the
    // mocked `returning()` result can't.
    createMock.mockResolvedValue(
      claudeReply({
        ranked: [{ nocCode: '21232', fitScore: 92, rationale: 'x' }],
        confidence: 'high',
        ambiguityFlag: false,
      }),
    );
    await POST(
      postRequest({ jobTitle: 'Software Developer', duties: DEVELOPER_DUTIES }),
    );

    function hasRawDate(node: unknown): boolean {
      if (node instanceof Date) return true;
      if (
        node &&
        typeof node === 'object' &&
        Array.isArray((node as { queryChunks?: unknown[] }).queryChunks)
      ) {
        return (node as { queryChunks: unknown[] }).queryChunks.some(
          hasRawDate,
        );
      }
      return false;
    }

    const update = capturedUpdate.value as
      { set: Record<string, unknown> } | undefined;
    expect(update).toBeDefined();
    expect(hasRawDate(update?.set.count)).toBe(false);
    expect(hasRawDate(update?.set.windowStart)).toBe(false);
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

  it('rejects a non-admin caller past RATE_LIMIT with 429', async () => {
    rateLimitCount.value = 21; // one past the 20/hour limit
    const res = await POST(postRequest({ duties: DEVELOPER_DUTIES }));
    expect(res.status).toBe(429);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('exempts an admin session from the public rate limit', async () => {
    sessionMock.mockResolvedValue({
      session: { id: 's1' },
      user: { email: 'prashant@visaforte.com' },
    });
    rateLimitCount.value = 999; // would 429 a non-admin
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
  });

  it('admin never receives a silent lexical downgrade — gets 503 instead', async () => {
    sessionMock.mockResolvedValue({
      session: { id: 's1' },
      user: { email: 'prashant@visaforte.com' },
    });
    createMock.mockRejectedValue(new Error('api down'));
    const res = await POST(
      postRequest({ jobTitle: 'Software Developer', duties: DEVELOPER_DUTIES }),
    );
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/unavailable|retry/i);
  });

  it('admin gets the wider ADMIN_RETRIEVE_TOP_K shortlist', async () => {
    sessionMock.mockResolvedValue({
      session: { id: 's1' },
      user: { email: 'prashant@visaforte.com' },
    });
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
    await POST(
      postRequest({ jobTitle: 'Software Developer', duties: DEVELOPER_DUTIES }),
    );
    const promptText = createMock.mock.calls[0]?.[0]?.messages?.[0]?.content as
      string | undefined;
    const candidateCount = (promptText?.match(/### Candidate \d+/g) ?? [])
      .length;
    expect(candidateCount).toBeGreaterThan(30); // wider than the public RETRIEVE_TOP_K
  });
});
