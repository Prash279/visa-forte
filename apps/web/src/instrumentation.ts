// instrumentation.ts — Next.js instrumentation hook.
// This is the recommended way to initialise Sentry/GlitchTip in Next.js App Router.
// Next.js calls register() once on server startup.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
}
