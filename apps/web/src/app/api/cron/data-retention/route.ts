import { NextRequest, NextResponse } from 'next/server';
import { and, eq, lt } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { clients, clientDocuments, auditLog } from '../../../../../drizzle/schema';
import { deleteFile } from '@/lib/storage';
import { log } from '@/lib/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

function isAuthorised(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${cronSecret}`;
}

// GET /api/cron/data-retention
// Runs nightly at 20:30 UTC (02:00 IST) via Vercel Cron.
// Purges Archived clients whose record has not been updated in 730+ days (2 years).
// Processes at most 20 clients per run to stay within Vercel's function timeout.
// Sends a summary email to Prash if any clients were deleted.
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Two years ago, expressed as a SQL interval for the WHERE clause.
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Find Archived clients last updated more than 2 years ago, capped at 20 per run.
  const expiredClients = await db
    .select({ id: clients.id, name: clients.name, email: clients.email })
    .from(clients)
    .where(
      and(
        eq(clients.stage, 'Archived'),
        lt(clients.updatedAt, twoYearsAgo)
      )
    )
    .limit(20);

  if (expiredClients.length === 0) {
    log({ level: 'info', service: 'data-retention', action: 'run', result: 'success', metadata: { deleted: 0 } });
    return NextResponse.json({ deleted: 0 });
  }

  let deleted = 0;
  const summary: { name: string; email: string; filesDeleted: number }[] = [];

  for (const client of expiredClients) {
    try {
      const docs = await db
        .select({ blobUrl: clientDocuments.blobUrl })
        .from(clientDocuments)
        .where(eq(clientDocuments.clientId, client.id));

      for (const doc of docs) {
        try {
          await deleteFile(doc.blobUrl);
        } catch {
          // Blob already gone — continue.
        }
      }

      await db.insert(auditLog).values({
        event: 'client_deleted',
        actorId: 'cron',
        targetClientId: client.id,
        metadata: {
          reason: 'retention_policy',
          clientEmail: client.email,
          filesDeleted: docs.length,
        },
      });

      // Cascade removes clientDocuments, deletionRequests, and messages.
      await db.delete(clients).where(eq(clients.id, client.id));

      summary.push({ name: client.name, email: client.email, filesDeleted: docs.length });
      deleted++;
    } catch (err) {
      log({ level: 'error', service: 'data-retention', action: 'delete_client', result: 'failure', metadata: { clientId: client.id, error: String(err) } });
    }
  }

  log({ level: 'info', service: 'data-retention', action: 'run', result: 'success', metadata: { deleted } });

  if (deleted > 0) {
    const rows = summary
      .map(s => `• ${s.name} (${s.email}) — ${s.filesDeleted} file(s) removed`)
      .join('\n');

    await resend.emails.send({
      from: 'Visa Forte <notifications@visaforte.com>',
      to: 'prashant@visaforte.com',
      subject: `Data Retention: ${deleted} client record(s) purged`,
      text: [
        'Automated Data Retention — Nightly Run',
        '',
        `${deleted} Archived client record(s) older than 2 years were permanently deleted.`,
        '',
        rows,
        '',
        'This action was performed automatically per the DPDP data retention policy.',
        'All events have been written to the audit log.',
      ].join('\n'),
    });
  }

  return NextResponse.json({ deleted });
}