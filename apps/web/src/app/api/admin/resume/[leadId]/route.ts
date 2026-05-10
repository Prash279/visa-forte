import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { leads } from '../../../../../../drizzle/schema';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
): Promise<NextResponse> {
  const authSession = await getCurrentAuthSession();
  if (!authSession?.session || authSession.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { leadId } = await params;

  const [lead] = await db
    .select({ resumeUrl: leads.resumeUrl, resumeFilename: leads.resumeFilename })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);

  if (!lead?.resumeUrl || !lead.resumeFilename) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  }

  // Parse the data URI: data:<mime>;base64,<data>
  const match = lead.resumeUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: 'Invalid resume data' }, { status: 500 });
  }
  const [, mimeType, base64Data] = match;
  const buffer = Buffer.from(base64Data!, 'base64');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': mimeType!,
      'Content-Disposition': `attachment; filename="${lead.resumeFilename}"`,
      'Content-Length': String(buffer.byteLength),
    },
  });
}