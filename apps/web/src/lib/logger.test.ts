// logger.test.ts — unit tests for the structured JSON logger.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from './logger';

describe('log()', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks(); // reset call history between tests
  });

  it('writes a JSON string to console.log', () => {
    log({
      level: 'info',
      service: 'test',
      action: 'run_test',
      result: 'success',
    });
    expect(console.log).toHaveBeenCalledOnce();
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('includes all required fields', () => {
    log({
      level: 'info',
      service: 'booking',
      action: 'create_booking',
      result: 'success',
    });
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const entry = JSON.parse(output);
    expect(entry).toMatchObject({
      level: 'info',
      service: 'booking',
      action: 'create_booking',
      result: 'success',
    });
  });

  it('adds a timestamp automatically', () => {
    log({
      level: 'info',
      service: 'test',
      action: 'run_test',
      result: 'success',
    });
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const entry = JSON.parse(output);
    expect(entry.timestamp).toBeDefined();
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('includes optional actorId and metadata when provided', () => {
    log({
      level: 'error',
      service: 'payment',
      action: 'verify_payment',
      result: 'failure',
      actorId: 'user@example.com',
      metadata: { orderId: 'order_123' },
    });
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const entry = JSON.parse(output);
    expect(entry.actorId).toBe('user@example.com');
    expect(entry.metadata).toEqual({ orderId: 'order_123' });
  });
});
