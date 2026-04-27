import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages, clients } from '../../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';

const ADMIN_EMAIL = 'prashant@visaforte.com';

const SendSchema = z.object({
  body: z.string().min(1, 'Message body is required').max(4000, 'Message too long'),
});

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// GET /api/admin/clients/[id]/messages — full message thread for a client.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id: clientId } = await params;

  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.clientId, clientId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ messages: thread });
}

// POST /api/admin/clients/[id]/messages — admin sends a new message to a client.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id: clientId } = await params;

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = SendSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const [message] = await db
    .insert(messages)
    .values({
      clientId,
      senderRole: 'admin',
      senderId: ADMIN_EMAIL,
      body: result.data.body,
    })
    .returning();

  return NextResponse.json({ message }, { status: 201 });
}