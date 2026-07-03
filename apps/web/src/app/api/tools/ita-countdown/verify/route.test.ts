import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
  },
}));

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
    name: 'Test Applicant',
    email: 'test@example.com',
    itaDate: '2026-07-04',
    citizenshipCountry: 'India',
    residenceCountries: ['India'],
    hasSpouse: false,
    numDependentChildren: 0,
    tier: 'standard' as const,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    ...overrides,
  };
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/tools/ita-countdown/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/tools/ita-countdown/verify', () => {
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

  it('accepts a valid signature and returns a token', async () => {
    const { POST } = await import('./route');
    const res = await POST(postRequest(buildBody()));
    expect(res.status).toBe(201);
    const json = await res.json() as { token?: string };
    expect(typeof json.token).toBe('string');
  });
});
