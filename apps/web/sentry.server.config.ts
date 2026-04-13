// sentry.server.config.ts — GlitchTip error tracking, server side.
// Uses @sentry/nextjs SDK — GlitchTip is 100% Sentry-compatible.
// Skips initialisation gracefully if SENTRY_DSN is not set.

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Capture 100% of errors, 10% of performance traces
    tracesSampleRate: 0.1,

    // PII scrubbing — client names, emails, and document content must never
    // appear in error reports sent to GlitchTip
    sendDefaultPii: false,

    // Only log errors in production — keep dev console clean
    enabled: process.env.NODE_ENV === 'production',
  });
}
