import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/tools/noc-verifier', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const DEVELOPER_DUTIES =
  'Write, modify, integrate and test software code for web applications. ' +
  'Maintain existing computer programs, identify and communicate technical ' +
  'problems, and prepare reports on software status.';

describe('POST /api/tools/noc-verifier', () => {
  it('rejects duties under 30 characters with 400', async () => {
    const res = await POST(postRequest({ duties: 'too short' }));
    expect(res.status).toBe(400);
  });

  it('rejects a malformed body with 400', async () => {
    const res = await POST(postRequest({ nope: true }));
    expect(res.status).toBe(400);
  });

  it('returns up to 3 ranked matches with the expected shape', async () => {
    const res = await POST(
      postRequest({ jobTitle: 'Software Developer', duties: DEVELOPER_DUTIES }),
    );
    expect(res.status).toBe(200);
    const { matches } = (await res.json()) as {
      matches: Array<Record<string, unknown>>;
    };
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(3);

    const top = matches[0]!;
    expect(top.band).toBe('strongest');
    expect(String(top.code)).toMatch(/^\d{5}$/);
    expect([0, 1, 2, 3, 4, 5]).toContain(top.teer);
    expect(String(top.esdcUrl)).toContain(String(top.code));
    expect(Array.isArray(top.mainDuties)).toBe(true);
  });

  it('surfaces software occupations for software duties (deterministic)', async () => {
    const res = await POST(
      postRequest({ jobTitle: 'Software Developer', duties: DEVELOPER_DUTIES }),
    );
    const { matches } = (await res.json()) as {
      matches: Array<{ code: string }>;
    };
    // 2123x = software and web development unit groups in NOC 2021
    // (21232 software developers, 21234 web developers, 21231 software engineers)
    expect(matches.some((m) => m.code.startsWith('2123'))).toBe(true);
  });

  it('is deterministic: identical input gives identical output', async () => {
    const a = await (
      await POST(postRequest({ duties: DEVELOPER_DUTIES }))
    ).json();
    const b = await (
      await POST(postRequest({ duties: DEVELOPER_DUTIES }))
    ).json();
    expect(a).toEqual(b);
  });
});
