import { redirect } from 'next/navigation';
import { inArray, asc } from 'drizzle-orm';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { clients, applicationMonitoring, irccQueries } from '../../../../drizzle/schema';
import MonitoringPanel from './MonitoringPanel';
import './monitoring.css';

export default async function MonitoringPage() {
  const authSession = await getCurrentAuthSession();
  if (!authSession?.session) redirect('/login');
  if (authSession.user?.email !== 'prashant@visaforte.com') redirect('/');

  // Fetch all clients in Submitted or Decision Pending stages
  const submittedClients = await db
    .select()
    .from(clients)
    .where(inArray(clients.stage, ['Submitted', 'Decision Pending']))
    .orderBy(asc(clients.createdAt));

  const clientIds = submittedClients.map(c => c.id);

  // Fetch monitoring records for those clients
  const monitoringRows = clientIds.length > 0
    ? await db
        .select()
        .from(applicationMonitoring)
        .where(inArray(applicationMonitoring.clientId, clientIds))
    : [];

  // Fetch all IRCC queries for those clients
  const queryRows = clientIds.length > 0
    ? await db
        .select()
        .from(irccQueries)
        .where(inArray(irccQueries.clientId, clientIds))
        .orderBy(asc(irccQueries.receivedAt))
    : [];

  const todayIST = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  const todayStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;

  // Assemble the data structure passed to the client component
  const monitoringMap = Object.fromEntries(monitoringRows.map(m => [m.clientId, m]));
  const queriesMap: Record<string, typeof queryRows> = {};
  for (const q of queryRows) {
    if (!queriesMap[q.clientId]) queriesMap[q.clientId] = [];
    queriesMap[q.clientId].push(q);
  }

  const rows = submittedClients.map(client => ({
    id: client.id,
    name: client.name,
    email: client.email,
    stage: client.stage,
    serviceTier: client.serviceTier,
    monitoring: monitoringMap[client.id]
      ? {
          id: monitoringMap[client.id].id,
          aorNumber: monitoringMap[client.id].aorNumber,
          submittedAt: monitoringMap[client.id].submittedAt,
          expectedDecisionDate: monitoringMap[client.id].expectedDecisionDate,
          lastStatusCheck: monitoringMap[client.id].lastStatusCheck,
          irccPortalStatus: monitoringMap[client.id].irccPortalStatus,
          monitoringNotes: monitoringMap[client.id].monitoringNotes,
        }
      : null,
    queries: (queriesMap[client.id] ?? []).map(q => ({
      id: q.id,
      queryType: q.queryType,
      receivedAt: q.receivedAt,
      responseDeadline: q.responseDeadline,
      responseSubmittedAt: q.responseSubmittedAt,
      status: q.status,
      notes: q.notes,
      createdAt: q.createdAt.toISOString(),
    })),
  }));

  const openQueryCount = queryRows.filter(q => q.status === 'Open').length;

  return (
    <div className="mon-wrap">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-header-wordmark">Visa Forte</span>
          <span className="admin-header-divider" />
          <span className="admin-header-label">Post-Submission Monitoring</span>
        </div>
        <div className="admin-header-right">
          <a href="/admin" className="mon-back-link">← Dashboard</a>
        </div>
      </header>

      <div className="admin-accent" />

      <main className="admin-main">
        <div className="admin-welcome">
          <p className="admin-welcome-eyebrow">Monitoring</p>
          <h1 className="admin-welcome-heading">Post-Submission Tracking</h1>
          <p className="admin-welcome-sub">
            Track AOR numbers, expected decision dates, and IRCC queries for submitted applications.
            {openQueryCount > 0 && (
              <span className="mon-open-badge"> {openQueryCount} open {openQueryCount === 1 ? 'query' : 'queries'} requiring attention.</span>
            )}
          </p>
        </div>

        <MonitoringPanel rows={rows} today={todayStr} />
      </main>
    </div>
  );
}
