import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMail = vi.fn();
const verify = vi.fn();
const createTransport = vi.fn(() => ({ sendMail, verify }));
const captureException = vi.fn();

vi.mock('nodemailer', () => ({ default: { createTransport } }));
vi.mock('@sentry/nextjs', () => ({ captureException }));

const RECIPIENT = 'client@example.com';
const SENDER = 'notifications@visaforte.com';
const TEST_CREDENTIAL = 'test_placeholder';

async function loadEmail(): Promise<typeof import('./email')> {
  vi.resetModules();
  return import('./email');
}

describe('email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.SMTP_USER = SENDER;
    process.env.SMTP_APP_PASSWORD = TEST_CREDENTIAL;
  });

  it('sends from the authenticated mailbox with the given display name', async () => {
    sendMail.mockResolvedValue({ rejected: [] });
    const { sendEmail } = await loadEmail();

    await sendEmail({
      to: RECIPIENT,
      subject: 'Hi',
      text: 'Body',
      fromName: 'Visa Forte CRM',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: RECIPIENT,
        from: { name: 'Visa Forte CRM', address: SENDER },
      }),
    );
  });

  it('throws and reports when the server rejects the send, without leaking the recipient', async () => {
    sendMail.mockRejectedValue(
      Object.assign(new Error(`550 5.1.1 <${RECIPIENT}> user unknown`), {
        code: 'EENVELOPE',
      }),
    );
    const { sendEmail } = await loadEmail();

    await expect(
      sendEmail({ to: RECIPIENT, subject: 'Hi', text: 'Body' }),
    ).rejects.toThrow('Email send failed (EENVELOPE)');
    expect(captureException).toHaveBeenCalledTimes(1);
    // Error.message is non-enumerable, so JSON.stringify(error) would always be "{}".
    const [reportedError, context] = captureException.mock.calls[0] as [
      Error,
      unknown,
    ];
    expect(reportedError.message).not.toContain(RECIPIENT);
    expect(JSON.stringify(context)).not.toContain(RECIPIENT);
    expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toContain(
      RECIPIENT,
    );
  });

  it('treats a partially rejected recipient list as a failure', async () => {
    sendMail.mockResolvedValue({ rejected: [RECIPIENT] });
    const { sendEmail } = await loadEmail();

    await expect(
      sendEmail({ to: RECIPIENT, subject: 'Hi', text: 'Body' }),
    ).rejects.toThrow('Email send failed (EREJECTED)');
  });

  it('fails loudly when the credential is not configured', async () => {
    delete process.env.SMTP_APP_PASSWORD;
    const { sendEmail, missingEmailConfig } = await loadEmail();

    expect(missingEmailConfig()).toEqual(['SMTP_APP_PASSWORD']);
    await expect(
      sendEmail({ to: RECIPIENT, subject: 'Hi', text: 'Body' }),
    ).rejects.toThrow('Email send failed (ECONFIG)');
    expect(sendMail).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('reports a revoked credential from the daily verify without throwing', async () => {
    verify.mockRejectedValue(
      Object.assign(new Error('Invalid login'), { code: 'EAUTH' }),
    );
    const { verifyEmailTransport } = await loadEmail();

    await expect(verifyEmailTransport()).resolves.toBe(false);
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email verify failed (EAUTH)' }),
      expect.anything(),
    );
  });
});
