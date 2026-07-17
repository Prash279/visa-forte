// pricing.ts — single source of truth for all consultation prices.
// Prices approved by Prashant Thirthingoth, April 2026.
//
// INR only. USD was removed on 2026-07-17: Razorpay international payments are
// not active on this account, so every USD checkout would fail at the gateway.
// To restore USD when the international gateway goes live, re-add a `usd` amount
// per tier and a `currency` parameter to the three helpers below — the callers
// (booking form, create-order, verify) each take it straight through.

// All 7 active service tiers with approved prices, in whole rupees.
export const PRICING: Record<string, number> = {
  "Pre-Application Eligibility Assessment": 4999,
  "PNP Stream Matching": 7499,
  "Document Review & Compliance Audit": 9999,
  "Refusal Analysis & Reapplication Strategy": 14999,
  "ITA Response Preparation": 17499,
  "Full Application File Management": 49999,
  "Post-Submission Monitoring": 7499,
};

// Returns the display price as a formatted string, e.g. "₹4,999".
// Returns null if the tier is not recognised — callers must handle this case.
export function formatPrice(tier: string): string | null {
  const inr = PRICING[tier];
  if (inr === undefined) return null;
  return `₹${inr.toLocaleString("en-IN")}`;
}

// Returns the amount in paise, the smallest unit Razorpay accepts for INR.
// Returns null if the tier is not recognised — never pass null to a payment processor.
export function getAmountInSmallestUnit(tier: string): number | null {
  const inr = PRICING[tier];
  if (inr === undefined) return null;
  return inr * 100;
}

// Returns the numeric price for a tier in whole rupees.
// Returns null if the tier is not recognised — callers must handle this case.
export function getPrice(tier: string): number | null {
  const inr = PRICING[tier];
  return inr === undefined ? null : inr;
}

// RT-3: 60-Day Countdown Planner pricing (in paise).
export const ITA_COUNTDOWN_STANDARD_PAISE = 299700; // ₹2,997
export const ITA_COUNTDOWN_PREMIUM_PAISE = 399700; // ₹3,997
