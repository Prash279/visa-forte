import { describe, it, expect } from 'vitest';
import {
  CreateMonitoringSchema,
  CreateQuerySchema,
  UpdateQuerySchema,
  isOverdue,
  isDeadlineWithin,
} from './monitoring-schemas';

// ── CreateMonitoringSchema ────────────────────────────────────────────

describe('CreateMonitoringSchema', () => {
  it('accepts a valid monitoring record with only required field', () => {
    const result = CreateMonitoringSchema.safeParse({ submittedAt: '2026-01-15' });
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated monitoring record', () => {
    const result = CreateMonitoringSchema.safeParse({
      submittedAt: '2026-01-15',
      aorNumber: 'AOR-20260115-ABCDE',
      expectedDecisionDate: '2027-01-15',
      lastStatusCheck: '2026-05-01',
      irccPortalStatus: 'In Progress',
      monitoringNotes: 'Biometrics collected. No issues.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a record missing submittedAt', () => {
    const result = CreateMonitoringSchema.safeParse({ aorNumber: 'AOR-123' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid date format for submittedAt', () => {
    const result = CreateMonitoringSchema.safeParse({ submittedAt: '15-01-2026' });
    expect(result.success).toBe(false);
  });

  it('accepts empty string for optional date fields (cleared by user)', () => {
    const result = CreateMonitoringSchema.safeParse({
      submittedAt: '2026-01-15',
      expectedDecisionDate: '',
      lastStatusCheck: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects aorNumber longer than 50 characters', () => {
    const result = CreateMonitoringSchema.safeParse({
      submittedAt: '2026-01-15',
      aorNumber: 'A'.repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

// ── CreateQuerySchema ─────────────────────────────────────────────────

describe('CreateQuerySchema', () => {
  it('accepts a valid query', () => {
    const result = CreateQuerySchema.safeParse({
      queryType: 'Additional Documents Request',
      receivedAt: '2026-04-01',
      responseDeadline: '2026-04-30',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a query missing queryType', () => {
    const result = CreateQuerySchema.safeParse({
      receivedAt: '2026-04-01',
      responseDeadline: '2026-04-30',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a query with invalid receivedAt format', () => {
    const result = CreateQuerySchema.safeParse({
      queryType: 'Medical Update',
      receivedAt: '01/04/2026',
      responseDeadline: '2026-04-30',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a query with invalid responseDeadline format', () => {
    const result = CreateQuerySchema.safeParse({
      queryType: 'Medical Update',
      receivedAt: '2026-04-01',
      responseDeadline: 'April 30 2026',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a query with optional notes', () => {
    const result = CreateQuerySchema.safeParse({
      queryType: 'Background Check',
      receivedAt: '2026-04-01',
      responseDeadline: '2026-05-01',
      notes: 'Client notified.',
    });
    expect(result.success).toBe(true);
  });
});

// ── UpdateQuerySchema ─────────────────────────────────────────────────

describe('UpdateQuerySchema', () => {
  it('accepts a valid status transition to Responded', () => {
    const result = UpdateQuerySchema.safeParse({
      status: 'Responded',
      responseSubmittedAt: '2026-04-20',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid status of Open', () => {
    const result = UpdateQuerySchema.safeParse({ status: 'Open' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status value', () => {
    const result = UpdateQuerySchema.safeParse({ status: 'Pending' });
    expect(result.success).toBe(false);
  });

  it('rejects missing status', () => {
    const result = UpdateQuerySchema.safeParse({ responseSubmittedAt: '2026-04-20' });
    expect(result.success).toBe(false);
  });
});

// ── isOverdue ────────────────────────────────────────────────────────

describe('isOverdue', () => {
  it('returns true when deadline is before today', () => {
    expect(isOverdue('2026-04-01', '2026-05-01')).toBe(true);
  });

  it('returns false when deadline is today', () => {
    expect(isOverdue('2026-05-01', '2026-05-01')).toBe(false);
  });

  it('returns false when deadline is in the future', () => {
    expect(isOverdue('2026-06-01', '2026-05-01')).toBe(false);
  });
});

// ── isDeadlineWithin ──────────────────────────────────────────────────

describe('isDeadlineWithin', () => {
  it('returns true when deadline equals today (0 days out)', () => {
    expect(isDeadlineWithin('2026-05-01', '2026-05-01', 3)).toBe(true);
  });

  it('returns true when deadline is exactly 3 days out', () => {
    expect(isDeadlineWithin('2026-05-04', '2026-05-01', 3)).toBe(true);
  });

  it('returns false when deadline is 4 days out', () => {
    expect(isDeadlineWithin('2026-05-05', '2026-05-01', 3)).toBe(false);
  });

  it('returns false when deadline is in the past', () => {
    expect(isDeadlineWithin('2026-04-28', '2026-05-01', 3)).toBe(false);
  });
});
