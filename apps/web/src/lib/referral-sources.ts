// Marketing channels for "How did you hear about us?" — single source of truth
// shared by the intake form dropdown and the intake API's Zod whitelist.
export const REFERRAL_SOURCES = [
  'Google Search',
  'LinkedIn',
  'YouTube',
  'Instagram / Facebook',
  'Referral from a friend or family member',
  'Other',
] as const;
