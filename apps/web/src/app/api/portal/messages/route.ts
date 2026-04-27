import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages, clients } from '../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';

const ADMIN_EMAIL = 'prashant@visaforte.com';

const ReplySchema = z.object({
  body: z.string().min(1, 'Message body is required').max(4000, 'Message too long'),
});

// Derive clientId from session — never from the request body (IDOR prevention).
async function getClientForSession(): Promise<{ clientId: string; userId: string } | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || !session.user?.id) return null;
  if (session.user.email === ADMIN_EMAIL) return null;

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .limit(1);

  if (!client) return null;
  return { clientId: client.id, userId: session.user.id };
}

// GET /api/portal/messages — client fetches their full message thread.
export async function GET(): Promise<NextResponse> {
  const ctx = await getClientForSession();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.clientId, ctx.clientId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ messages: thread });
}

// POST /api/portal/messages — client sends a reply.
// MVP: one reply per admin message thread. If a client message already exists, reject.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = await getClientForSession();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = ReplySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  // MVP: enforce one-reply-per-thread limit — client cannot send another message
  // if they have already replied.
  const [existingReply] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.clientId, ctx.clientId),
        eq(messages.senderRole, 'client')
      )
    )
    .limit(1);

  if (existingReply) {
    return NextResponse.json(
      { error: 'You have already replied. Wait for a response from Prashant.' },
      { status: 409 }
    );
  }

  const [message] = await db
    .insert(messages)
    .values({
      clientId: ctx.clientId,
      senderRole: 'client',
      senderId: ctx.userId,
      body: result.data.body,
    })
    .returning();

  return NextResponse.json({ message }, { status: 201 });
}