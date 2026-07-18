import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tomorrowIST, slaThresholdMs } from './helpers';

// ── tomorrowIST ──────────────────────────────────────────────────────────────

describe('tomorrowIST', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns a YYYY-MM-DD string', () => {
    vi.setSystemTime(new Date('2026-04-27T00:30:00Z')); // 06:00 IST
    const result = tomorrowIST();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns tomorrow in IST when cron fires at 00:30 UTC (06:00 IST on Apr 27)', () => {
    // 00:30 UTC on April 27 = 06:00 IST on April 27 → tomorrow IST = April 28
    vi.setSystemTime(new Date('2026-04-27T00:30:00Z'));
    expect(tomorrowIST()).toBe('2026-04-28');
  });

  it('handles month boundary correctly (Apr 30 → May 1)', () => {
    vi.setSystemTime(new Date('2026-04-30T00:30:00Z'));
    expect(tomorrowIST()).toBe('2026-05-01');
  });

  it('handles year boundary correctly (Dec 31 → Jan 1)', () => {
    vi.setSystemTime(new Date('2026-12-31T00:30:00Z'));
    expect(tomorrowIST()).toBe('2027-01-01');
  });
});

// ── slaThresholdMs ───────────────────────────────────────────────────────────

describe('slaThresholdMs', () => {
  it('returns 12 hours in ms for ITA Window clients', () => {
    expect(slaThresholdMs('ITA Window')).toBe(12 * 60 * 60 * 1000);
  });

  it('returns 24 hours in ms for all other stages', () => {
    const stages = [
      'Lead',
      'Qualified',
      'Active Client',
      'Submitted',
      'Decision Pending',
      'Completed',
      'Archived',
    ];
    for (const stage of stages) {
      expect(slaThresholdMs(stage)).toBe(24 * 60 * 60 * 1000);
    }
  });
});
