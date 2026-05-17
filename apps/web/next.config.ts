// next.config.ts — Next.js configuration.
// Wrapped with withSentryConfig to enable Sentry.io error tracking.
// No SENTRY_AUTH_TOKEN needed — source map uploads are skipped.

import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://o4511213768540160.ingest.us.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options',          value: 'DENY' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy',  value: csp },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['require-in-the-middle', 'import-in-the-middle'],
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress all Sentry build log output — keeps Vercel build logs clean
  silent: true,

  // Do not send telemetry about this plugin back to Sentry
  telemetry: false,
});
