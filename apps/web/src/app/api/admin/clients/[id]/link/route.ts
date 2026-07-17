import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { z } from 'zod';
import { db } from '@/lib/db';
import { clients, users, accounts } from '../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { hashPassword, generateRandomString } from 'better-auth/crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

const LinkSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// POST /api/admin/clients/[id]/link
// Links a CRM client record to a Better Auth user account.
// If no account exists for the given email, one is created and an invite email is sent.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const result = LinkSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 },
    );
  }

  const { email } = result.data;

  // Verify the client exists
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Check if a Better Auth user already exists for this email
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;
  let accountCreated = false;
  let tempPassword = '';

  if (existingUser) {
    // User already has an account — just link the client record to it
    userId = existingUser.id;
  } else {
    // No account yet — create one with a temporary password and send an invite email
    tempPassword = generateRandomString(12, 'a-z', 'A-Z', '0-9');
    const passwordHash = await hashPassword(tempPassword);
    const now = new Date();
    const newUserId = generateRandomString(32, 'a-z', 'A-Z', '0-9');
    const accountId = generateRandomString(32, 'a-z', 'A-Z', '0-9');

    await db.insert(users).values({
      id: newUserId,
      name: client.name,
      email,
      emailVerified: false,
      role: 'client',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(accounts).values({
      id: accountId,
      accountId: newUserId,
      providerId: 'credential',
      userId: newUserId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    userId = newUserId;
    accountCreated = true;
  }

  // Link the client record to the user account
  await db.update(clients).set({ userId }).where(eq(clients.id, id));

  // Send invite email if a new account was created
  if (accountCreated) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://visaforte.com';
    resend.emails
      .send({
        from: 'Visa Forte <noreply@visaforte.com>',
        to: email,
        subject: 'Your Visa Forte client portal is ready',
        text: [
          `Dear ${client.name},`,
          '',
          'Your Visa Forte client portal has been set up. You can now log in to track your',
          'case status and upload the required documents for your application.',
          '',
          `Portal login: ${siteUrl}/login`,
          `Email:        ${email}`,
          `Password:     ${tempPassword}`,
          '',
          'Please log in and change your password at your earliest convenience.',
          '',
          'If you have any questions, reply to this email or contact us at prashant@visaforte.com.',
          '',
          'Visa Forte · Engineered for Passage.',
          'Secunderabad, India',
        ].join('\n'),
      })
      .catch((err) => console.error('Portal invite email failed:', err));
  }

  return NextResponse.json({ linked: true, created: accountCreated });
}
