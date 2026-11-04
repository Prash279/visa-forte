<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Email

All email goes through `sendEmail()` in `src/lib/email.ts` (Google Workspace SMTP). It throws on failure after reporting to Sentry, so wrap non-critical sends in try/catch and never ignore the error. Resend is retired; ESLint blocks importing `resend` or `nodemailer` anywhere else.
