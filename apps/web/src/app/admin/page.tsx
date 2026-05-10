import { redirect } from "next/navigation";
import { and, eq, gte, lte, lt, desc, sql } from "drizzle-orm";
import { getCurrentAuthSession } from "@/lib/auth-server";
import SignOutButton from "./SignOutButton";
import LeadsTable from "./LeadsTable";
import BookingCalendar from "./BookingCalendar";
import DeletionRequestsPanel from "./DeletionRequestsPanel";
import { db } from "@/lib/db";
import { leads, bookings, clients, deletionRequests, auditLog, irccQueries } from "../../../drizzle/schema";
import { CRM_STAGES } from "@/lib/crm-stages";
import "./admin.css";

export default async function AdminPage() {
  const authSession = await getCurrentAuthSession();

  if (!authSession?.session) {
    redirect("/login");
  }

  const userEmail = authSession.user?.email ?? "";

  // Restrict admin access to the owner account only.
  if (userEmail !== "prashant@visaforte.com") {
    redirect("/");
  }

  const userName = userEmail.split("@")[0] ?? "there";

  // Fetch all intake leads, most recent first.
  // Explicitly exclude resumeUrl (base64 data) to keep the payload small — the
  // download route serves it on demand.
  const allLeads = await db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      serviceInterest: leads.serviceInterest,
      notes: leads.notes,
      resumeFilename: leads.resumeFilename,
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .orderBy(desc(leads.createdAt));

  // Fetch all bookings, most recent first.
  const allBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt));

  // Count bookings in the next 7 days (IST-aware).
  const todayIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const in7Days = new Date(todayIST);
  in7Days.setDate(todayIST.getDate() + 7);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const upcomingBookings = await db
    .select()
    .from(bookings)
    .where(
      and(
        gte(bookings.bookingDate, fmt(todayIST)),
        lte(bookings.bookingDate, fmt(in7Days))
      )
    );

  // Fetch all CRM clients for the metric card, ITA Window banner, and pipeline overview.
  const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));
  const itaClients = allClients.filter(c => c.stage === 'ITA Window');

  // Count clients per pipeline stage for the Pipeline Overview section.
  const pipelineRows = await db
    .select({ stage: clients.stage, count: sql<number>`count(*)::int` })
    .from(clients)
    .groupBy(clients.stage);

  // Map to all 9 stages so stages with zero clients still render (no missing card).
  const stageCountMap = Object.fromEntries(CRM_STAGES.map(s => [s, 0]));
  for (const row of pipelineRows) {
    stageCountMap[row.stage] = row.count;
  }

  // Count clients in Submitted / Decision Pending stages and their open IRCC queries.
  const monitoringClientCount = allClients.filter(
    c => c.stage === 'Submitted' || c.stage === 'Decision Pending'
  ).length;

  const openQueryRows = await db
    .select({ id: irccQueries.id })
    .from(irccQueries)
    .where(eq(irccQueries.status, 'Open'));
  const openQueryCount = openQueryRows.length;

  // Fetch pending data deletion requests for the admin action panel.
  const pendingDeletionRows = await db
    .select({
      requestId: deletionRequests.id,
      clientId: clients.id,
      clientName: clients.name,
      clientEmail: clients.email,
      requestedAt: deletionRequests.requestedAt,
    })
    .from(deletionRequests)
    .innerJoin(clients, eq(deletionRequests.clientId, clients.id))
    .where(eq(deletionRequests.status, 'pending'))
    .orderBy(desc(deletionRequests.requestedAt));

  // Serialize Date → ISO string for the client component.
  const pendingDeletions = pendingDeletionRows.map(r => ({
    ...r,
    requestedAt: r.requestedAt.toISOString(),
  }));

  // Find the most recent nightly data-retention cron run for the admin footer indicator.
  const [lastCronRow] = await db
    .select({ createdAt: auditLog.createdAt })
    .from(auditLog)
    .where(and(eq(auditLog.event, 'client_deleted'), eq(auditLog.actorId, 'cron')))
    .orderBy(desc(auditLog.createdAt))
    .limit(1);

  let lastRetentionRun: string | null = null;
  let lastRetentionCount = 0;

  if (lastCronRow) {
    lastRetentionRun = lastCronRow.createdAt.toISOString();
    // Count all clients deleted by the cron on the same UTC calendar day as the latest run.
    const dayStart = new Date(lastCronRow.createdAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.event, 'client_deleted'),
          eq(auditLog.actorId, 'cron'),
          gte(auditLog.createdAt, dayStart),
          lt(auditLog.createdAt, dayEnd)
        )
      );
    lastRetentionCount = countRow?.count ?? 0;
  }

  // Serialize leads for the LeadsTable client component (Date → ISO string).
  const leadsForTable = allLeads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  // Strip bookings to serializable scalar fields only before passing to the client calendar component.
  // Excludes createdAt (Date object) — not needed for calendar display.
  const bookingsForCalendar = allBookings.map(b => ({
    id: b.id,
    name: b.name,
    email: b.email,
    serviceTier: b.serviceTier,
    bookingDate: b.bookingDate,     // text column — already a YYYY-MM-DD string
    paymentStatus: b.paymentStatus,
    status: b.status,
    amountPaid: b.amountPaid,
    currency: b.currency,
  }));

  // IST-aware greeting and calendar seed values.
  const hour = todayIST.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const todayStr = fmt(todayIST);
  const calInitialYear = todayIST.getFullYear();
  const calInitialMonth = todayIST.getMonth(); // 0-indexed

  return (
    <div className="admin-wrap">

      {/* ── Header ── */}
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-header-wordmark">Visa Forte</span>
          <span className="admin-header-divider" />
          <span className="admin-header-label">Admin</span>
        </div>
        <div className="admin-header-right">
          <span className="admin-header-email">{userEmail}</span>
          <SignOutButton />
        </div>
      </header>

      {/* ── Saffron accent rule ── */}
      <div className="admin-accent" />

      {/* ── ITA Window alert banner — shown when any client requires immediate action ── */}
      {itaClients.length > 0 && (
        <div className="crm-ita-banner admin-ita-banner">
          <span className="crm-ita-banner-icon">⚑</span>
          <span className="crm-ita-banner-text">
            {itaClients.length} client{itaClients.length > 1 ? 's' : ''} in ITA Window —
            immediate action required.{' '}
            <a href="/admin/clients" className="admin-ita-banner-link">Go to CRM →</a>
          </span>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="admin-main">

        {/* Welcome */}
        <div className="admin-welcome">
          <p className="admin-welcome-eyebrow">Dashboard</p>
          <h1 className="admin-welcome-heading">{greeting}, {userName}.</h1>
          <p className="admin-welcome-sub">
            Your Visa Forte operations hub. Manage clients, track cases, and generate reports.
          </p>
        </div>

        {/* Metrics */}
        <div className="admin-metrics">
          <div className="admin-stat">
            <p className="admin-stat-label">New Leads</p>
            <p className="admin-stat-value">{allLeads.length}</p>
            <p className="admin-stat-note">Intake submissions</p>
          </div>
          <div className="admin-stat">
            <p className="admin-stat-label">Total Bookings</p>
            <p className="admin-stat-value">{allBookings.length}</p>
            <p className="admin-stat-note">All time</p>
          </div>
          <div className="admin-stat">
            <p className="admin-stat-label">CRM Clients</p>
            <p className="admin-stat-value">{allClients.length}</p>
            <p className="admin-stat-note">All stages</p>
          </div>
          <div className="admin-stat">
            <p className="admin-stat-label">Upcoming Bookings</p>
            <p className="admin-stat-value">{upcomingBookings.length}</p>
            <p className="admin-stat-note">Next 7 days</p>
          </div>
          <div className="admin-stat">
            <p className="admin-stat-label">Monitoring</p>
            <p className="admin-stat-value">{monitoringClientCount}</p>
            <p className="admin-stat-note">
              {openQueryCount > 0
                ? <a href="/admin/monitoring" style={{ color: 'var(--saffron)', fontWeight: 600 }}>{openQueryCount} open {openQueryCount === 1 ? 'query' : 'queries'}</a>
                : 'Submitted / pending'}
            </p>
          </div>
        </div>

        {/* ── Pipeline Overview ── */}
        <div className="admin-section-header">
          <span className="admin-section-title">Pipeline Overview</span>
          <span className="admin-section-rule" />
          <a href="/admin/clients" className="admin-section-link">Open CRM →</a>
        </div>

        <div className="admin-pipeline">
          {CRM_STAGES.map(stage => {
            const count = stageCountMap[stage] ?? 0;
            const isITA = stage === 'ITA Window';
            const itaActive = isITA && count > 0;
            return (
              <a
                key={stage}
                href="/admin/clients"
                className={`admin-pipeline-card${itaActive ? ' admin-pipeline-card-ita' : ''}`}
              >
                <span className="admin-pipeline-stage">{stage}</span>
                <span className={`admin-pipeline-count${itaActive ? ' admin-pipeline-count-ita' : ''}`}>
                  {count}
                </span>
              </a>
            );
          })}
        </div>

        {/* ── New Leads section ── */}
        <div className="admin-section-header">
          <span className="admin-section-title">
            New Leads
            {allLeads.length > 0 && (
              <span className="admin-section-count">({allLeads.length})</span>
            )}
          </span>
          <span className="admin-section-rule" />
          <a href="/intake" className="admin-section-link">View Form →</a>
        </div>

        {allLeads.length === 0 ? (
          <div className="admin-empty">
            <p className="admin-empty-text">No intake submissions yet.</p>
            <a href="/intake" className="admin-empty-link">Share the intake form →</a>
          </div>
        ) : (
          <LeadsTable leads={leadsForTable} />
        )}

        {/* ── Bookings Calendar ── */}
        <div className="admin-section-header">
          <span className="admin-section-title">
            Bookings
            {allBookings.length > 0 && (
              <span className="admin-section-count">({allBookings.length})</span>
            )}
          </span>
          <span className="admin-section-rule" />
          <a href="/admin/availability" className="admin-section-link">Manage Availability →</a>
        </div>

        {allBookings.length === 0 ? (
          <div className="admin-empty">
            <p className="admin-empty-text">No bookings yet.</p>
            <a href="/admin/availability" className="admin-empty-link">Open availability slots →</a>
          </div>
        ) : (
          <BookingCalendar
            bookings={bookingsForCalendar}
            initialYear={calInitialYear}
            initialMonth={calInitialMonth}
            today={todayStr}
          />
        )}

        {/* ── Data Deletion Requests ── */}
        <div className="admin-section-header">
          <span className="admin-section-title">
            Data Deletion Requests
            {pendingDeletions.length > 0 && (
              <span className="admin-section-count admin-section-count-alert">
                ({pendingDeletions.length})
              </span>
            )}
          </span>
          <span className="admin-section-rule" />
        </div>
        <DeletionRequestsPanel initialRequests={pendingDeletions} />

        {/* ── Tools section ── */}
        <div className="admin-section-header">
          <span className="admin-section-title">Tools</span>
          <span className="admin-section-rule" />
        </div>
        <div className="admin-tools">
          <a href="/admin/clients" className="admin-tool-card">
            <p className="admin-tool-name">Client CRM</p>
            <p className="admin-tool-desc">Manage your client pipeline across 9 stages from Lead to Completed. Edit stages inline, add private notes, and track ITA Window clients at a glance.</p>
            <span className="admin-tool-cta">Open CRM →</span>
          </a>
          <a href="/admin/canvisa-pro" className="admin-tool-card">
            <p className="admin-tool-name">CanVisa Pro</p>
            <p className="admin-tool-desc">Generate a full PR eligibility assessment report for any applicant. Includes CRS calculation, FSW grid, pathway ranking, and gap analysis.</p>
            <span className="admin-tool-cta">Open Tool →</span>
          </a>
          <a href="/admin/availability" className="admin-tool-card">
            <p className="admin-tool-name">Availability Manager</p>
            <p className="admin-tool-desc">Set available and unavailable dates for client bookings across all service tiers.</p>
            <span className="admin-tool-cta">Manage →</span>
          </a>
          <a href="/admin/monitoring" className="admin-tool-card">
            <p className="admin-tool-name">Post-Submission Monitoring</p>
            <p className="admin-tool-desc">Track AOR numbers, expected decision dates, IRCC portal status, and open queries for submitted applications. Get deadline alerts before responses are due.</p>
            <span className="admin-tool-cta">Open Monitoring →</span>
          </a>
        </div>

        {/* Footer */}
        <div className="admin-footer">
          <p className="admin-footer-text">Visa Forte · Engineered for Passage.</p>
          <a href="/" className="admin-footer-link">View Site →</a>
          <p className="admin-retention-note">
            {lastRetentionRun
              ? `Last retention run: ${new Date(lastRetentionRun).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — ${lastRetentionCount} record${lastRetentionCount === 1 ? '' : 's'} deleted`
              : 'No retention runs yet.'}
          </p>
        </div>

      </main>
    </div>
  );
}