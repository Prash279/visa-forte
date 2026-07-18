import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { leads } from '../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// DELETE /api/admin/leads/[id]
// Permanently removes a lead from the database.
// Requires x-admin-delete-password header matching ADMIN_DELETE_PASSWORD env var.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  const adminDeletePassword = process.env.ADMIN_DELETE_PASSWORD ?? '';
  const providedPassword = req.headers.get('x-admin-delete-password') ?? '';
  if (!adminDeletePassword || providedPassword !== adminDeletePassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const { id } = await params;
  const [deleted] = await db.delete(leads).where(eq(leads.id, id)).returning();

  if (!deleted) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
