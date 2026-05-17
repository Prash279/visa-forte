// sentry.client.config.ts — Sentry.io error tracking, browser side.
// Captures unhandled JS errors that occur in the client (React components,
// event handlers, etc.) and reports them to Sentry.

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    tracesSampleRate: 0.1,

    // Never send PII to GlitchTip from the browser
    sendDefaultPii: false,

    enabled: process.env.NODE_ENV === 'production',
  });
}
