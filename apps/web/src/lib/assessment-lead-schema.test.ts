import { describe, it, expect } from 'vitest';
import { AssessmentLeadSchema } from './assessment-lead-schema';

const valid = {
  name: 'Arjun Sharma',
  email: 'arjun@example.com',
  crsScore: 487,
  consentGiven: true as const,
};

describe('AssessmentLeadSchema', () => {
  it('accepts a valid submission', () => {
    const result = AssessmentLeadSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects when name is empty', () => {
    const result = AssessmentLeadSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email address', () => {
    const result = AssessmentLeadSchema.safeParse({
      ...valid,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when consent is not given', () => {
    const result = AssessmentLeadSchema.safeParse({
      ...valid,
      consentGiven: false,
    });
    expect(result.success).toBe(false);
  });

  // The CRS maximum became 1,270 on 2026-11-03 (Ministerial Instructions
  // s.8(2)); the schema reads it from crs-rules.json via CRS_MAX_TOTAL.
  it('accepts the CRS maximum of 1270', () => {
    const result = AssessmentLeadSchema.safeParse({ ...valid, crsScore: 1270 });
    expect(result.success).toBe(true);
  });

  it('rejects a CRS score above 1270', () => {
    const result = AssessmentLeadSchema.safeParse({ ...valid, crsScore: 1271 });
    expect(result.success).toBe(false);
  });

  it('rejects a negative CRS score', () => {
    const result = AssessmentLeadSchema.safeParse({ ...valid, crsScore: -1 });
    expect(result.success).toBe(false);
  });
});
