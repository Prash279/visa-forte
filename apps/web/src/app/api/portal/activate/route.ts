import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bookings, clients, users, accounts } from '../../../../../drizzle/schema';
import { hashPassword, generateRandomString } from 'better-auth/crypto';

const Schema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  consentGiven: z.literal(true, { errorMap: () => ({ message: 'Consent is required to proceed' }) }),
});

// POST /api/portal/activate
// Called by the /activate page after the client sets their password.
// Validates the single-use portal token, creates a Better Auth account with the
// client-supplied password, links or creates a clients CRM row, then clears the token.
// The client component calls /api/auth/sign-in/email immediately after to get a session.
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = Schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { token, password } = result.data;
  const consentGivenAt = new Date();

  // Re-validate the token server-side — the page already checked it, but the
  // API must not trust the client. Checks existence, expiry, and non-null state.
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.portalToken, token),
        gt(bookings.portalTokenExpiresAt, new Date())
      )
    )
    .limit(1);

  if (!booking) {
    return NextResponse.json(
      { error: 'This activation link has expired or is no longer valid.' },
      { status: 400 }
    );
  }

  // If a Better Auth account already exists for this email, the client can just
  // log in. Clear the token so it cannot be reused (security: even unused links
  // should expire on first attempted activation for an existing account).
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, booking.email))
    .limit(1);

  if (existingUser) {
    await db
      .update(bookings)
      .set({ portalToken: null, portalTokenExpiresAt: null })
      .where(eq(bookings.id, booking.id));
    return NextResponse.json({ alreadyExists: true, email: booking.email });
  }

  // ── Create Better Auth user + credential account ──────────────────────────
  // Mirrors the pattern in /api/admin/clients/[id]/link/route.ts.
  // The client chose their own password — it is never stored in plain text.
  const passwordHash = await hashPassword(password);
  const now          = new Date();
  const newUserId    = generateRandomString(32, 'a-z', 'A-Z', '0-9');
  const accountId    = generateRandomString(32, 'a-z', 'A-Z', '0-9');

  await db.insert(users).values({
    id:            newUserId,
    name:          booking.name,
    email:         booking.email,
    emailVerified: false,
    role:          'client',
    status:        'active',
    createdAt:     now,
    updatedAt:     now,
  });

  await db.insert(accounts).values({
    id:         accountId,
    accountId:  newUserId,
    providerId: 'credential',
    userId:     newUserId,
    password:   passwordHash,
    createdAt:  now,
    updatedAt:  now,
  });

  // ── Create or link the CRM clients row ────────────────────────────────────
  // If Prash had already added this person to the CRM manually, link the userId.
  // Otherwise create a new row — paid clients should appear in the CRM automatically.
  const [existingClient] = await db
    .select()
    .from(clients)
    .where(eq(clients.email, booking.email))
    .limit(1);

  if (existingClient) {
    await db
      .update(clients)
      .set({ userId: newUserId, updatedAt: now, consentGiven: true, consentGivenAt })
      .where(eq(clients.id, existingClient.id));
  } else {
    await db.insert(clients).values({
      name:          booking.name,
      email:         booking.email,
      serviceTier:   booking.serviceTier,
      stage:         'Lead',   // Prash advances the stage after the first consultation
      userId:        newUserId,
      consentGiven:  true,
      consentGivenAt,
    });
  }

  // ── Clear the single-use token ────────────────────────────────────────────
  await db
    .update(bookings)
    .set({ portalToken: null, portalTokenExpiresAt: null })
    .where(eq(bookings.id, booking.id));

  return NextResponse.json({ success: true, email: booking.email });
}