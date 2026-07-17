import { describe, it, expect } from 'vitest';
import {
  PRICING,
  formatPrice,
  getAmountInSmallestUnit,
  getPrice,
} from './pricing';

const KNOWN_TIER = 'Pre-Application Eligibility Assessment';

describe('pricing', () => {
  it('every tier is priced above zero', () => {
    for (const [tier, inr] of Object.entries(PRICING)) {
      expect(inr, `${tier} must be a positive price`).toBeGreaterThan(0);
    }
  });

  it('formats INR with Indian digit grouping', () => {
    expect(formatPrice(KNOWN_TIER)).toBe('₹4,999');
  });

  it('converts rupees to paise for Razorpay', () => {
    expect(getAmountInSmallestUnit(KNOWN_TIER)).toBe(499900);
  });

  // An unrecognised tier must never yield an amount — a null here is what stops
  // a bad tier reaching the payment processor as an order.
  it('returns null for an unknown tier rather than a fallback amount', () => {
    expect(formatPrice('Not A Real Tier')).toBeNull();
    expect(getAmountInSmallestUnit('Not A Real Tier')).toBeNull();
    expect(getPrice('Not A Real Tier')).toBeNull();
  });
});
