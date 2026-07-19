import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createDownloadToken } from '@/lib/premium-download-token';

const KEY_SECRET = 'test_secret';
const RESOURCE_ID = 'loe-master-template-pack';

function getRequest(query: Record<string, string>): NextRequest {
  const params = new URLSearchParams(query);
  return new NextRequest(
    `http://localhost/api/resources/premium/download?${params.toString()}`,
  );
}

describe('GET /api/resources/premium/download', () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  });

  it('rejects a request with no token params with 403', async () => {
    const { GET } = await import('./route');
    const res = await GET(getRequest({}));
    expect(res.status).toBe(403);
  });

  it('rejects a tampered signature with 403', async () => {
    const { GET } = await import('./route');
    const token = createDownloadToken(RESOURCE_ID, KEY_SECRET);
    const res = await GET(
      getRequest({
        id: RESOURCE_ID,
        exp: String(token.expiresAt),
        sig: 'not-the-real-signature',
      }),
    );
    expect(res.status).toBe(403);
  });

  it('rejects a token minted for a different resource with 403', async () => {
    const { GET } = await import('./route');
    const token = createDownloadToken(
      'crs-gap-analysis-action-plan',
      KEY_SECRET,
    );
    const res = await GET(
      getRequest({
        id: RESOURCE_ID,
        exp: String(token.expiresAt),
        sig: token.signature,
      }),
    );
    expect(res.status).toBe(403);
  });

  it('serves the PDF as an attachment for a valid token', async () => {
    const { GET } = await import('./route');
    const token = createDownloadToken(RESOURCE_ID, KEY_SECRET);
    const res = await GET(
      getRequest({
        id: RESOURCE_ID,
        exp: String(token.expiresAt),
        sig: token.signature,
      }),
    );
    // 200 when the PDF is present on disk (it is committed to the repo)
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain(
      'loe-master-template-pack.pdf',
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    // Every PDF starts with "%PDF"
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('%PDF');
  });
});
