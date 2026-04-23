// next.config.ts — Next.js configuration.
// Wrapped with withSentryConfig to enable GlitchTip error tracking.
// GlitchTip is 100% Sentry-compatible — uses @sentry/nextjs SDK.
// No SENTRY_AUTH_TOKEN needed — source map uploads are skipped.

import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  serverExternalPackages: ['require-in-the-middle', 'import-in-the-middle'],
  turbopack: {
    root: __dirname,
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress all Sentry build log output — keeps Vercel build logs clean
  silent: true,

  // Do not send telemetry about this plugin back to Sentry
  telemetry: false,
});
