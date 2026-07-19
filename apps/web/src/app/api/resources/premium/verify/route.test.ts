import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ data: { id: 'mock' } }) };
  },
}));

const KEY_SECRET = 'test_secret';

function buildBody(overrides: Partial<Record<string, unknown>> = {}) {
  const razorpayOrderId = 'order_123';
  const razorpayPaymentId = 'pay_456';
  const razorpaySignature = createHmac('sha256', KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return {
    resourceId: 'loe-master-template-pack',
    name: 'Test Buyer',
    email: 'buyer@example.com',
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    ...overrides,
  };
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/resources/premium/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/resources/premium/verify', () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
    process.env.RESEND_API_KEY = 'test_resend_key';
  });

  it('rejects an invalid signature with 400', async () => {
    const { POST } = await import('./route');
    const body = buildBody({ razorpaySignature: 'tampered-signature' });
    const res = await POST(postRequest(body));
    expect(res.status).toBe(400);
  });

  it('rejects an unknown resource id with 404', async () => {
    const { POST } = await import('./route');
    const res = await POST(postRequest(buildBody({ resourceId: 'nope' })));
    expect(res.status).toBe(404);
  });

  it('rejects a missing email with 400', async () => {
    const { POST } = await import('./route');
    const res = await POST(postRequest(buildBody({ email: 'not-an-email' })));
    expect(res.status).toBe(400);
  });

  it('accepts a valid signature and returns a working download URL', async () => {
    const { POST } = await import('./route');
    const res = await POST(postRequest(buildBody()));
    expect(res.status).toBe(201);
    const { downloadUrl } = (await res.json()) as { downloadUrl: string };

    const url = new URL(downloadUrl);
    expect(url.pathname).toBe('/api/resources/premium/download');
    expect(url.searchParams.get('id')).toBe('loe-master-template-pack');

    // The minted token must satisfy the download route's own verifier
    const { verifyDownloadToken } =
      await import('@/lib/premium-download-token');
    expect(
      verifyDownloadToken(
        url.searchParams.get('id') ?? '',
        Number(url.searchParams.get('exp')),
        url.searchParams.get('sig') ?? '',
        KEY_SECRET,
      ),
    ).toBe(true);
  });
});
