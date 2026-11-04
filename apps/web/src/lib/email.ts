// The only module that sends email. Transport: Google Workspace SMTP (smtp.gmail.com).
// ESLint blocks importing nodemailer or any email SDK anywhere else.
//
// sendEmail() throws on failure, after logging it and reporting it to Sentry,
// so a dead credential surfaces within one send instead of failing silently.
// Error reports carry only the SMTP error code: provider messages can contain
// recipient addresses, which must never reach logs or Sentry.

import nodemailer, { type Mail } from 'nodemailer';
import * as Sentry from '@sentry/nextjs';
import { log } from './logger';

const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;
// nodemailer's defaults allow minutes of waiting; a hung connection would
// outlive the serverless function and the failure would never be reported.
const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;
const DEFAULT_FROM_NAME = 'Visa Forte';
const REQUIRED_ENV = ['SMTP_USER', 'SMTP_APP_PASSWORD'] as const;

type EmailBody =
  { html: string; text?: string } | { text: string; html?: string };

export type EmailMessage = EmailBody & {
  to: string;
  subject: string;
  // Display name only. The address is always SMTP_USER: Gmail rewrites any
  // From address the authenticated mailbox does not own.
  fromName?: string;
  replyTo?: string;
};

let transporter: Mail | undefined;

export function missingEmailConfig(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

function getTransporter(): Mail {
  const missing = missingEmailConfig();
  if (missing.length > 0) {
    throw Object.assign(
      new Error(`Email not configured: missing ${missing.join(', ')}`),
      {
        code: 'ECONFIG',
      },
    );
  }
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_APP_PASSWORD },
  });
  return transporter;
}

function errorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err)
    return String(err.code);
  return 'UNKNOWN';
}

function reportFailure(action: 'send' | 'verify', err: unknown): Error {
  const code = errorCode(err);
  const safe = new Error(`Email ${action} failed (${code})`);
  log({
    level: 'error',
    service: 'email',
    action,
    result: 'failure',
    metadata: { code },
  });
  Sentry.captureException(safe, { tags: { service: 'email', code } });
  return safe;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const { fromName = DEFAULT_FROM_NAME, ...rest } = message;
  try {
    const mailer = getTransporter();
    const info = await mailer.sendMail({
      ...rest,
      from: { name: fromName, address: process.env.SMTP_USER ?? '' },
    });
    if (info.rejected && info.rejected.length > 0) {
      throw Object.assign(new Error('Recipient rejected'), {
        code: 'EREJECTED',
      });
    }
    log({ level: 'info', service: 'email', action: 'send', result: 'success' });
  } catch (err) {
    throw reportFailure('send', err);
  }
}

// Confirms the credential still works without sending anything. Run daily so an
// expired or revoked app password is reported before a customer email fails.
export async function verifyEmailTransport(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch (err) {
    reportFailure('verify', err);
    return false;
  }
}
