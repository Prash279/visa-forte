// GET /api/health — application health check.
// Returns 200 if the database is reachable, 503 if not.
// UptimeRobot hits this endpoint every 5 minutes to confirm the site is alive.

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    // A lightweight query — just confirms the DB connection is alive
    await db.execute(sql`SELECT 1`);

    log({
      level: 'info',
      service: 'health',
      action: 'health_check',
      result: 'success',
    });

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log({
      level: 'error',
      service: 'health',
      action: 'health_check',
      result: 'failure',
      metadata: { error: error instanceof Error ? error.message : 'unknown' },
    });

    // Return minimal info to the outside world — full error is in logs only
    return Response.json({ status: 'error' }, { status: 503 });
  }
}
