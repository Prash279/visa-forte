import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import {
  clients,
  clientDocuments,
  applicationMonitoring,
  irccQueries,
} from '../../../drizzle/schema';
import { getChecklist } from '@/lib/document-checklist';
import Link from 'next/link';
import PortalDashboard from './PortalDashboard';
import './portal.css';

const ADMIN_EMAIL = 'prashant@visaforte.com';

export default async function PortalPage() {
  const authSession = await getCurrentAuthSession();

  if (!authSession?.session) redirect('/login');
  // Admin belongs in the admin dashboard, not the client portal
  if (authSession.user?.email === ADMIN_EMAIL) redirect('/admin');

  const userId = authSession.user?.id;

  // Find the CRM client record linked to this user account
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId))
    .limit(1);

  if (!client) {
    return (
      <div className="portal-wrap">
        <header className="portal-header">
          <div className="portal-header-left">
            <Link href="/" className="portal-wordmark">
              Visa Forte
            </Link>
          </div>
          <div className="portal-header-right">
            <span className="portal-header-email">
              {authSession.user?.email}
            </span>
            <Link href="/api/auth/sign-out" className="portal-signout">
              Sign Out
            </Link>
          </div>
        </header>
        <div className="portal-accent" />
        <main className="portal-main">
          <div className="portal-setup-state">
            <p className="portal-setup-eyebrow">Client Portal</p>
            <h1 className="portal-setup-heading">
              Your portal is being set up.
            </h1>
            <p className="portal-setup-body">
              Your account has been created successfully. Prashant is linking
              your case file — this usually takes less than a day. Please check
              back soon, or contact us at{' '}
              <a href="mailto:prashant@visaforte.com">prashant@visaforte.com</a>
              .
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Fetch all documents already uploaded for this client
  const uploadedDocs = await db
    .select({
      id: clientDocuments.id,
      docType: clientDocuments.docType,
      filename: clientDocuments.filename,
      uploadedAt: clientDocuments.uploadedAt,
    })
    .from(clientDocuments)
    .where(eq(clientDocuments.clientId, client.id));

  const checklist = getChecklist(client.serviceTier);

  // Build a map: docType → { filename, uploadedAt } for quick lookup in the dashboard
  const uploadedMap: Record<
    string,
    { id: string; filename: string; uploadedAt: Date }
  > = {};
  for (const doc of uploadedDocs) {
    if (doc.docType) {
      uploadedMap[doc.docType] = {
        id: doc.id,
        filename: doc.filename,
        uploadedAt: doc.uploadedAt,
      };
    }
  }

  // For clients in Submitted or Decision Pending stage, fetch monitoring data (read-only portal view).
  // AOR number and monitoring notes are intentionally excluded — client-visible only: dates and status.
  let portalMonitoring: {
    submittedAt: string;
    irccPortalStatus: string | null;
    lastStatusCheck: string | null;
    hasOpenQuery: boolean;
  } | null = null;

  if (client.stage === 'Submitted' || client.stage === 'Decision Pending') {
    const [mon] = await db
      .select({
        submittedAt: applicationMonitoring.submittedAt,
        irccPortalStatus: applicationMonitoring.irccPortalStatus,
        lastStatusCheck: applicationMonitoring.lastStatusCheck,
      })
      .from(applicationMonitoring)
      .where(eq(applicationMonitoring.clientId, client.id))
      .limit(1);

    if (mon) {
      const openQueries = await db
        .select({ id: irccQueries.id })
        .from(irccQueries)
        .where(
          and(
            eq(irccQueries.clientId, client.id),
            eq(irccQueries.status, 'Open'),
          ),
        )
        .limit(1);

      portalMonitoring = {
        submittedAt: mon.submittedAt,
        irccPortalStatus: mon.irccPortalStatus,
        lastStatusCheck: mon.lastStatusCheck,
        hasOpenQuery: openQueries.length > 0,
      };
    }
  }

  return (
    <div className="portal-wrap">
      <header className="portal-header">
        <div className="portal-header-left">
          <Link href="/" className="portal-wordmark">
            Visa Forte
          </Link>
          <span className="portal-header-divider" />
          <span className="portal-header-label">Client Portal</span>
        </div>
        <div className="portal-header-right">
          <span className="portal-header-email">{authSession.user?.email}</span>
          <Link href="/api/auth/sign-out" className="portal-signout">
            Sign Out
          </Link>
        </div>
      </header>

      <div className="portal-accent" />

      <main className="portal-main">
        <PortalDashboard
          client={{
            id: client.id,
            name: client.name,
            email: client.email,
            serviceTier: client.serviceTier,
            stage: client.stage,
            consentGivenAt: client.consentGivenAt,
          }}
          checklist={checklist}
          uploadedMap={uploadedMap}
          monitoring={portalMonitoring}
        />
      </main>
    </div>
  );
}
