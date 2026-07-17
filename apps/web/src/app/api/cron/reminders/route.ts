import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lt, inArray } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import {
  bookings,
  messages,
  clients,
  irccQueries,
} from '../../../../../drizzle/schema';
import { log } from '@/lib/logger';
import { tomorrowIST, slaThresholdMs } from './helpers';

export { tomorrowIST, slaThresholdMs };

const resend = new Resend(process.env.RESEND_API_KEY);

// Vercel passes Authorization: Bearer {CRON_SECRET} on all scheduled cron invocations.
// If CRON_SECRET is not set or does not match, reject the request.
function isAuthorised(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${cronSecret}`;
}

// GET /api/cron/reminders
// Runs daily at 00:30 UTC (06:00 IST) via Vercel Cron.
// 1. Sends 24-hour reminder emails for tomorrow's paid bookings.
// 2. Sends an SLA breach digest to Prash for unanswered client messages past their threshold.
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://visaforte.com';
  const tomorrow = tomorrowIST();

  // ── Email 2: 24-hour appointment reminders ────────────────────────────────
  let remindersSent = 0;
  let reminderFailures = 0;

  try {
    const tomorrowsBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.bookingDate, tomorrow),
          eq(bookings.paymentStatus, 'paid'),
          eq(bookings.reminderSent, false),
        ),
      );

    for (const booking of tomorrowsBookings) {
      // Client reminder — tracks success so we only mark sent if delivery succeeded
      let clientEmailSent = false;
      try {
        await resend.emails.send({
          from: 'Visa Forte <noreply@visaforte.com>',
          to: booking.email,
          subject: `Reminder: Your Visa Forte consultation is tomorrow — ${booking.bookingDate}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A2E;">
              <h2 style="color:#0C2340;margin-bottom:4px;">Your consultation is tomorrow.</h2>
              <div style="width:40px;height:2px;background:#C97B1E;margin-bottom:24px;"></div>
              <p style="margin:0 0 8px;">Dear ${booking.name},</p>
              <p style="margin:0 0 24px;line-height:1.7;color:#444;">
                This is a reminder that your <strong>${booking.serviceTier}</strong> consultation
                with Prashant is scheduled for <strong>${booking.bookingDate}</strong>.
              </p>
              <p style="margin:0 0 16px;line-height:1.7;color:#444;">
                To prepare, you can review and upload any required documents in your client portal:
              </p>
              <a href="${siteUrl}/portal"
                 style="display:inline-block;padding:14px 28px;background:#0C2340;color:#fff;
                        text-decoration:none;border-radius:4px;font-weight:600;
                        letter-spacing:0.04em;margin-bottom:24px;">
                Go to My Portal →
              </a>
              <p style="margin:0 0 24px;line-height:1.7;color:#555;">
                If you have any questions before the consultation, please contact
                <a href="mailto:prashant@visaforte.com" style="color:#C97B1E;">prashant@visaforte.com</a>.
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
              <p style="margin:0;font-size:0.8rem;color:#aaa;">
                Visa Forte · Engineered for Passage. · Secunderabad, India
              </p>
            </div>
          `,
        });
        clientEmailSent = true;
      } catch (err) {
        reminderFailures++;
        log({
          level: 'error',
          service: 'cron-reminders',
          action: 'send_client_reminder',
          result: 'failure',
          metadata: { bookingId: booking.id, error: String(err) },
        });
      }

      // Prash copy — best-effort, does not affect reminderSent flag
      try {
        await resend.emails.send({
          from: 'Visa Forte <noreply@visaforte.com>',
          to: 'prashant@visaforte.com',
          subject: `[Reminder Sent] Tomorrow: ${booking.name} — ${booking.serviceTier}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
              <h2 style="color:#0c2340;">Consultation Tomorrow</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#666;width:130px;">Client</td><td style="padding:8px 0;font-weight:600;">${booking.name}</td></tr>
                <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${booking.email}">${booking.email}</a></td></tr>
                <tr><td style="padding:8px 0;color:#666;">Service</td><td style="padding:8px 0;">${booking.serviceTier}</td></tr>
                <tr><td style="padding:8px 0;color:#666;">Date</td><td style="padding:8px 0;font-weight:600;">${booking.bookingDate}</td></tr>
                <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Query</td><td style="padding:8px 0;line-height:1.6;white-space:pre-wrap;">${booking.query}</td></tr>
              </table>
              <p style="margin-top:16px;font-size:0.85rem;color:#888;">A reminder email has been sent to the client.</p>
            </div>
          `,
        });
      } catch (err) {
        log({
          level: 'error',
          service: 'cron-reminders',
          action: 'send_prash_copy',
          result: 'failure',
          metadata: { bookingId: booking.id, error: String(err) },
        });
      }

      // Only mark as sent if the client email was actually delivered
      if (clientEmailSent) {
        try {
          await db
            .update(bookings)
            .set({ reminderSent: true })
            .where(eq(bookings.id, booking.id));
          remindersSent++;
        } catch (err) {
          reminderFailures++;
          log({
            level: 'error',
            service: 'cron-reminders',
            action: 'mark_reminder_sent',
            result: 'failure',
            metadata: { bookingId: booking.id, error: String(err) },
          });
        }
      }
    }
  } catch (err) {
    log({
      level: 'error',
      service: 'cron-reminders',
      action: 'query_tomorrows_bookings',
      result: 'failure',
      metadata: { error: String(err) },
    });
  }

  log({
    level: 'info',
    service: 'cron-reminders',
    action: 'reminders_complete',
    result: 'success',
    metadata: { date: tomorrow, sent: remindersSent },
  });

  // ── Email 3: SLA breach digest ────────────────────────────────────────────
  // Find all unread client messages and check against the per-stage SLA threshold.
  // Groups by client — sends one digest email to Prash, not one per message.
  let slaBreachCount = 0;

  try {
    const unreadClientMessages = await db
      .select({
        clientId: messages.clientId,
        clientName: clients.name,
        clientEmail: clients.email,
        stage: clients.stage,
        messageCreatedAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(clients, eq(messages.clientId, clients.id))
      .where(
        and(eq(messages.senderRole, 'client'), eq(messages.isRead, false)),
      );

    const now = new Date();

    // Collapse to one entry per client, keeping the oldest unread message date
    const breachedClients = new Map<
      string,
      {
        name: string;
        email: string;
        stage: string;
        oldestAt: Date;
      }
    >();

    for (const row of unreadClientMessages) {
      const threshold = slaThresholdMs(row.stage);
      const age = now.getTime() - row.messageCreatedAt.getTime();
      if (age > threshold) {
        const existing = breachedClients.get(row.clientId);
        if (!existing || row.messageCreatedAt < existing.oldestAt) {
          breachedClients.set(row.clientId, {
            name: row.clientName,
            email: row.clientEmail,
            stage: row.stage,
            oldestAt: row.messageCreatedAt,
          });
        }
      }
    }

    slaBreachCount = breachedClients.size;

    if (slaBreachCount > 0) {
      const rows = Array.from(breachedClients.values())
        .map((c) => {
          const hoursAgo = Math.floor(
            (now.getTime() - c.oldestAt.getTime()) / (60 * 60 * 1000),
          );
          const label = c.stage === 'ITA Window' ? '⚠ ITA Window' : c.stage;
          return `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${c.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${label}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;color:#c00;">${hoursAgo}h ago</td>
          </tr>`;
        })
        .join('');

      await resend.emails.send({
        from: 'Visa Forte <noreply@visaforte.com>',
        to: 'prashant@visaforte.com',
        subject: `[Action Required] ${slaBreachCount} client message${slaBreachCount > 1 ? 's' : ''} past SLA`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#0c2340;">SLA Breach Alert</h2>
            <p style="color:#444;line-height:1.6;">
              The following clients have sent messages that have not been read past the SLA threshold
              (24 hours standard, 12 hours for ITA Window clients).
            </p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <thead>
                <tr style="background:#f5f5f5;">
                  <th style="padding:8px;text-align:left;color:#666;font-weight:600;">Client</th>
                  <th style="padding:8px;text-align:left;color:#666;font-weight:600;">Stage</th>
                  <th style="padding:8px;text-align:left;color:#666;font-weight:600;">Oldest Unread</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin-top:20px;">
              <a href="${siteUrl}/admin/clients" style="color:#c97b1e;">Go to CRM to reply →</a>
            </p>
          </div>
        `,
      });
    }
  } catch (err) {
    log({
      level: 'error',
      service: 'cron-reminders',
      action: 'sla_breach_check',
      result: 'failure',
      metadata: { error: String(err) },
    });
  }

  log({
    level: 'info',
    service: 'cron-reminders',
    action: 'sla_check_complete',
    result: 'success',
    metadata: { breachedClients: slaBreachCount },
  });

  // ── Email 4: IRCC deadline alerts ──────────────────────────────────
  // Query open IRCC queries whose deadline falls within 3 days from today (IST).
  let irccAlertCount = 0;

  try {
    // Compute today and today+3 as YYYY-MM-DD strings (IST)
    const todayDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
    );
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = fmt(todayDate);
    const plusThree = new Date(todayDate);
    plusThree.setDate(plusThree.getDate() + 3);
    const plusThreeStr = fmt(plusThree);

    // Find open queries with deadline in the window [today, today+3]
    const upcomingQueries = await db
      .select({
        queryId: irccQueries.id,
        clientId: irccQueries.clientId,
        queryType: irccQueries.queryType,
        responseDeadline: irccQueries.responseDeadline,
      })
      .from(irccQueries)
      .where(
        and(
          eq(irccQueries.status, 'Open'),
          // Both bounds applied in SQL — safe because column is always YYYY-MM-DD (enforced by Zod on insert)
          gte(irccQueries.responseDeadline, todayStr),
          lt(irccQueries.responseDeadline, plusThreeStr),
        ),
      );

    const dueQueries = upcomingQueries;

    if (dueQueries.length > 0) {
      // Fetch client names for each affected clientId
      const clientIds = [...new Set(dueQueries.map((q) => q.clientId))];
      const affectedClients = await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(inArray(clients.id, clientIds));
      const clientNameMap = Object.fromEntries(
        affectedClients.map((c) => [c.id, c.name]),
      );

      const tableRows = dueQueries
        .sort((a, b) => a.responseDeadline.localeCompare(b.responseDeadline))
        .map((q) => {
          const daysLeft = Math.ceil(
            (new Date(q.responseDeadline).getTime() - todayDate.getTime()) /
              (24 * 60 * 60 * 1000),
          );
          const urgency =
            daysLeft === 0
              ? '⚠ Today'
              : daysLeft < 0
                ? '⚠ Overdue'
                : `${daysLeft}d left`;
          return `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${clientNameMap[q.clientId] ?? q.clientId}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${q.queryType}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${q.responseDeadline}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;color:#c97b1e;font-weight:600;">${urgency}</td>
          </tr>`;
        })
        .join('');

      await resend.emails.send({
        from: 'Visa Forte <noreply@visaforte.com>',
        to: 'prashant@visaforte.com',
        subject: `[Action Required] ${dueQueries.length} IRCC ${dueQueries.length === 1 ? 'query' : 'queries'} due within 3 days`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#0c2340;">IRCC Query Deadline Alert</h2>
            <p style="color:#444;line-height:1.6;">
              The following IRCC queries have a response deadline within the next 3 days.
            </p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <thead>
                <tr style="background:#f5f5f5;">
                  <th style="padding:8px;text-align:left;color:#666;font-weight:600;">Client</th>
                  <th style="padding:8px;text-align:left;color:#666;font-weight:600;">Query Type</th>
                  <th style="padding:8px;text-align:left;color:#666;font-weight:600;">Deadline</th>
                  <th style="padding:8px;text-align:left;color:#666;font-weight:600;">Urgency</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <p style="margin-top:20px;">
              <a href="${siteUrl}/admin/monitoring" style="color:#c97b1e;">Go to Monitoring →</a>
            </p>
          </div>
        `,
      });

      irccAlertCount = dueQueries.length;
    }
  } catch (err) {
    log({
      level: 'error',
      service: 'cron-reminders',
      action: 'ircc_deadline_check',
      result: 'failure',
      metadata: { error: String(err) },
    });
  }

  log({
    level: 'info',
    service: 'cron-reminders',
    action: 'ircc_deadline_complete',
    result: 'success',
    metadata: { alertsSent: irccAlertCount },
  });

  const hadFailures = reminderFailures > 0;
  return NextResponse.json(
    {
      sent: remindersSent,
      slaBreaches: slaBreachCount,
      irccAlerts: irccAlertCount,
      failures: reminderFailures,
    },
    { status: hadFailures ? 207 : 200 },
  );
}
