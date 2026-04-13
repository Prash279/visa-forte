// next.config.ts — Next.js configuration.
// Wrapped with withSentryConfig to enable GlitchTip error tracking.
// GlitchTip is 100% Sentry-compatible — uses @sentry/nextjs SDK.
// No SENTRY_AUTH_TOKEN needed — source map uploads are skipped.

import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  // Suppress all Sentry build log output — keeps Vercel build logs clean
  silent: true,

  // Do not send telemetry about this plugin back to Sentry
  telemetry: false,
});
