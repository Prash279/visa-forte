import { redirect } from "next/navigation";
import { getCurrentAuthSession } from "@/lib/auth-server";
import SignOutButton from "./SignOutButton";
import { db } from "@/lib/db";
import { leads } from "../../../drizzle/schema";
import { desc } from "drizzle-orm";
import "./admin.css";

export default async function AdminPage() {
  const authSession = await getCurrentAuthSession();

  if (!authSession?.session) {
    redirect("/login");
  }

  const userEmail = authSession.user?.email ?? "";

  // Restrict admin access to the owner account only.
  // Redirect to "/" not "/login" — redirecting to /login creates an infinite
  // loop: middleware sees a valid session and redirects back to /admin, which
  // redirects to /login again, forever.
  if (userEmail !== "prashant@visaforte.com") {
    redirect("/");
  }

  const userName = userEmail.split("@")[0] ?? "there";

  // Fetch all intake leads, most recent first.
  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));

  // IST-aware greeting (UTC+5:30)
  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  ).getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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
            <p className="admin-stat-label">Open Cases</p>
            <p className="admin-stat-value">—</p>
            <p className="admin-stat-note">In progress</p>
          </div>
          <div className="admin-stat">
            <p className="admin-stat-label">Reports Sent</p>
            <p className="admin-stat-value">—</p>
            <p className="admin-stat-note">This month</p>
          </div>
          <div className="admin-stat">
            <p className="admin-stat-label">Upcoming Bookings</p>
            <p className="admin-stat-value">—</p>
            <p className="admin-stat-note">Next 7 days</p>
          </div>
        </div>

        {/* New Leads section */}
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
          // Table scrolls internally once it exceeds 520px — header stays pinned.
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {["Name", "Email", "Service Interest", "Submitted", "Status"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td><span className="admin-td-name">{lead.name}</span></td>
                    <td>
                      <a href={`mailto:${lead.email}`} className="admin-td-email">
                        {lead.email}
                      </a>
                    </td>
                    <td>
                      <span className="admin-td-service" title={lead.serviceInterest}>
                        {lead.serviceInterest}
                      </span>
                    </td>
                    <td>
                      <span className="admin-td-date">
                        {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${lead.status === "new" ? "admin-badge-new" : "admin-badge-other"}`}>
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="admin-footer">
          <p className="admin-footer-text">Visa Forte · Engineered for Passage.</p>
          <a href="/" className="admin-footer-link">View Site →</a>
        </div>

      </main>
    </div>
  );
}
