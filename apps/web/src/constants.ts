// Named constants — no magic numbers
export const SITE_NAME = 'Visa Forte';
export const SITE_TAGLINE = 'Engineered for Passage.';
export const CONTACT_EMAIL = 'hello@visaforte.com';
export const CONTACT_LOCATION = 'Secunderabad, India';

// Brand colors
export const COLORS = {
  PRUSSIAN: '#0C2340',
  SAFFRON: '#C97B1E',
  PEARL: '#F8F4EE',
  TEAL: '#1A5C72',
  INK: '#1A2B3C',
  SAND: '#E2DBD1',
  AMBER: '#EDD9B0',
} as const;

// API endpoints (to be added)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Other constants
export const ASSESSMENT_FEE = 299;