// pricing.ts — single source of truth for all consultation prices.
// Prices approved by Prashant Thirthingoth, April 2026.
// INR uses price parity (not spot-rate conversion) for Indian market.

export type Currency = 'INR' | 'USD';

interface TierPrice {
  usd: number; // in USD
  inr: number; // in INR
}

// All 7 active service tiers with approved prices.
export const PRICING: Record<string, TierPrice> = {
  'Pre-Application Eligibility Assessment': { usd: 99,  inr: 4999  },
  'PNP Stream Matching':                    { usd: 149, inr: 7499  },
  'Document Review & Compliance Audit':     { usd: 199, inr: 9999  },
  'Refusal Analysis & Reapplication Strategy': { usd: 299, inr: 14999 },
  'ITA Response Preparation':               { usd: 349, inr: 17499 },
  'Full Application File Management':       { usd: 999, inr: 49999 },
  'Post-Submission Monitoring':             { usd: 149, inr: 7499  },
};

// Returns the display price as a formatted string, e.g. "₹4,999" or "$99".
// Returns null if the tier is not recognised — callers must handle this case.
export function formatPrice(tier: string, currency: Currency): string | null {
  const price = PRICING[tier];
  if (!price) return null;
  if (currency === 'INR') {
    return `₹${price.inr.toLocaleString('en-IN')}`;
  }
  return `$${price.usd}`;
}

// Returns the amount in the smallest unit for Razorpay (paise for INR, cents for USD).
// Returns null if the tier is not recognised — never pass null to a payment processor.
export function getAmountInSmallestUnit(tier: string, currency: Currency): number | null {
  const price = PRICING[tier];
  if (!price) return null;
  return currency === 'INR' ? price.inr * 100 : price.usd * 100;
}

// Returns the numeric price for a tier in the given currency.
// Returns null if the tier is not recognised — callers must handle this case.
export function getPrice(tier: string, currency: Currency): number | null {
  const price = PRICING[tier];
  if (!price) return null;
  return currency === 'INR' ? price.inr : price.usd;
}
