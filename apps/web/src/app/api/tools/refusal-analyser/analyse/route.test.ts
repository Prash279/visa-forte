import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createDownloadToken } from '@/lib/premium-download-token';
import { POST } from './route';

const KEY_SECRET = 'test_secret';

const LETTER =
  'I am not satisfied that you would leave Canada at the end of your stay. ' +
  'In reaching this decision I considered the purpose of your visit, your ' +
  'personal assets and financial status, and your family ties in Canada and ' +
  'in your country of residence.';

function postRequest(body: unknown): NextRequest {
  return new NextRequest(
    'http://localhost/api/tools/refusal-analyser/analyse',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

describe('POST /api/tools/refusal-analyser/analyse', () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  });

  it('rejects a request without a token with 403', async () => {
    const res = await POST(
      postRequest({ letterText: LETTER, exp: Date.now() + 10000, sig: 'nope' }),
    );
    expect(res.status).toBe(403);
  });

  it('rejects a token minted for a different product with 403', async () => {
    const token = createDownloadToken('loe-master-template-pack', KEY_SECRET);
    const res = await POST(
      postRequest({
        letterText: LETTER,
        exp: token.expiresAt,
        sig: token.signature,
      }),
    );
    expect(res.status).toBe(403);
  });

  it('rejects a letter that is too short with 400', async () => {
    const token = createDownloadToken('refusal-analyser', KEY_SECRET);
    const res = await POST(
      postRequest({
        letterText: 'too short',
        exp: token.expiresAt,
        sig: token.signature,
      }),
    );
    expect(res.status).toBe(400);
  });

  it('analyses the letter for a valid token', async () => {
    const token = createDownloadToken('refusal-analyser', KEY_SECRET);
    const res = await POST(
      postRequest({
        letterText: LETTER,
        exp: token.expiresAt,
        sig: token.signature,
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      matches: Array<{ id: string }>;
      generalGuidance: string[];
    };
    expect(json.matches[0]?.id).toBe('would-not-leave');
    expect(json.generalGuidance.length).toBeGreaterThan(0);
  });
});
