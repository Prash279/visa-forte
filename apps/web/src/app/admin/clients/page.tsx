import { redirect } from 'next/navigation';
import { desc, eq, count, and, min, inArray } from 'drizzle-orm';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import {
  clients,
  clientDocuments,
  messages,
  leads,
} from '../../../../drizzle/schema';
import { PRICING } from '@/lib/pricing';
import CrmTable from './CrmTable';
import '../admin.css';
import './crm.css';

export default async function CrmPage() {
  const authSession = await getCurrentAuthSession();

  if (!authSession?.session) redirect('/login');
  if (authSession.user?.email !== 'prashant@visaforte.com') redirect('/');

  const allClients = await db
    .select()
    .from(clients)
    .orderBy(desc(clients.createdAt));
  const serviceTiers = Object.keys(PRICING);

  // Build a map from client email → { leadId, filename } for resume download links.
  // Resumes live in the leads table (base64 data URI); we serve them via /api/admin/resume/[leadId].
  const clientEmails = allClients.map((c) => c.email);
  const resumeMap: Record<string, { leadId: string; filename: string }> = {};
  if (clientEmails.length > 0) {
    const resumeLeads = await db
      .select({
        id: leads.id,
        email: leads.email,
        resumeFilename: leads.resumeFilename,
      })
      .from(leads)
      .where(inArray(leads.email, clientEmails));
    for (const lead of resumeLeads) {
      if (lead.resumeFilename) {
        resumeMap[lead.email] = {
          leadId: lead.id,
          filename: lead.resumeFilename,
        };
      }
    }
  }

  // Count documents per client for the initial "Docs (N)" button label.
  const docCountRows = await db
    .select({ clientId: clientDocuments.clientId, count: count() })
    .from(clientDocuments)
    .groupBy(clientDocuments.clientId);

  const initialDocCounts: Record<string, number> = {};
  for (const row of docCountRows) {
    initialDocCounts[row.clientId] = row.count;
  }

  // Count unread client messages per client (for Step 14 saffron dot).
  const unreadClientMsgRows = await db
    .select({ clientId: messages.clientId, count: count() })
    .from(messages)
    .where(and(eq(messages.senderRole, 'client'), eq(messages.isRead, false)))
    .groupBy(messages.clientId);

  const initialUnreadFromClient: Record<string, number> = {};
  for (const row of unreadClientMsgRows) {
    initialUnreadFromClient[row.clientId] = row.count;
  }

  // Oldest unread client message timestamp per client (for Step 17 SLA indicators).
  const oldestUnreadRows = await db
    .select({ clientId: messages.clientId, oldestAt: min(messages.createdAt) })
    .from(messages)
    .where(and(eq(messages.senderRole, 'client'), eq(messages.isRead, false)))
    .groupBy(messages.clientId);

  const oldestUnreadClientMsgTs: Record<string, number> = {};
  for (const row of oldestUnreadRows) {
    if (row.oldestAt) {
      oldestUnreadClientMsgTs[row.clientId] = new Date(row.oldestAt).getTime();
    }
  }

  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-header-wordmark">Visa Forte</span>
          <span className="admin-header-divider" />
          <span className="admin-header-label">CRM</span>
        </div>
        <div className="admin-header-right">
          <a href="/admin" className="crm-header-nav-link">
            ← Dashboard
          </a>
          <span className="admin-header-email">{authSession.user?.email}</span>
        </div>
      </header>

      <div className="admin-accent" />

      <main className="admin-main">
        <div className="admin-welcome">
          <p className="admin-welcome-eyebrow">Client Management</p>
          <h1 className="admin-welcome-heading">CRM Pipeline</h1>
          <p className="admin-welcome-sub">
            Track every client from Lead through Completed. Stage changes and
            notes are saved immediately — no refresh needed.
          </p>
        </div>

        <CrmTable
          initialClients={allClients}
          serviceTiers={serviceTiers}
          initialDocCounts={initialDocCounts}
          initialUnreadFromClient={initialUnreadFromClient}
          oldestUnreadClientMsgTs={oldestUnreadClientMsgTs}
          resumeMap={resumeMap}
        />

        <div className="admin-footer">
          <p className="admin-footer-text">
            Visa Forte · Engineered for Passage.
          </p>
          <a href="/admin" className="admin-footer-link">
            ← Dashboard
          </a>
        </div>
      </main>
    </div>
  );
}
