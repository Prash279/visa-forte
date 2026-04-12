import { redirect } from "next/navigation";
import { getCurrentAuthSession } from "@/lib/auth-server";
import SignOutButton from "./SignOutButton";
import { db } from "@/lib/db";
import { leads } from "../../../drizzle/schema";
import { desc } from "drizzle-orm";

// Metric card — large display number with saffron top rule.
function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div
      className="bg-white px-8 py-8"
      style={{ borderTop: "3px solid var(--saffron)" }}
    >
      <p
        className="font-sans text-[10px] tracking-[0.22em] uppercase text-ink mb-5"
        style={{ opacity: 0.38 }}
      >
        {label}
      </p>
      <p
        className="font-display text-prussian leading-none mb-3"
        style={{ fontSize: "3.25rem" }}
      >
        {value}
      </p>
      <p className="font-sans text-[11px] text-ink" style={{ opacity: 0.35 }}>
        {note}
      </p>
    </div>
  );
}

// Roadmap item — minimal left-border card.
function RoadmapCard({
  phase,
  title,
  description,
  isLive,
}: {
  phase: string;
  title: string;
  description: string;
  isLive?: boolean;
}) {
  return (
    <div
      className="bg-white px-6 py-5"
      style={{
        borderLeft: isLive
          ? "3px solid var(--saffron)"
          : "1px solid var(--sand)",
      }}
    >
      <span
        className="font-sans text-[10px] tracking-[0.2em] uppercase font-medium"
        style={{ color: isLive ? "var(--saffron)" : "var(--ink)", opacity: isLive ? 1 : 0.38 }}
      >
        {phase}
      </span>
      <p className="font-sans text-sm font-semibold text-prussian mt-1.5 mb-1">
        {title}
      </p>
      <p
        className="font-sans text-xs text-ink leading-relaxed"
        style={{ opacity: 0.45 }}
      >
        {description}
      </p>
    </div>
  );
}

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

  // Determine greeting based on server time (UTC+5:30 for IST)
  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  ).getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-pearl flex flex-col">

      {/* ── Top navigation bar ── */}
      <header className="bg-prussian px-10 flex items-center justify-between h-16 shrink-0">
        <div className="flex items-center gap-5">
          <span className="font-display text-pearl text-lg tracking-[0.12em]">
            Visa Forte
          </span>
          <span
            className="block w-px h-5 bg-saffron"
            style={{ opacity: 0.5 }}
          />
          <span
            className="font-sans text-[10px] tracking-[0.22em] uppercase text-pearl"
            style={{ opacity: 0.38 }}
          >
            Admin
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span
            className="font-sans text-[11px] text-pearl hidden sm:block"
            style={{ opacity: 0.35 }}
          >
            {userEmail}
          </span>
          <SignOutButton />
        </div>
      </header>

      {/* ── Saffron accent rule ── */}
      <div className="h-[2px] bg-saffron shrink-0" style={{ opacity: 0.75 }} />

      {/* ── Main content ── */}
      <main className="flex-1 p-10 max-w-5xl w-full mx-auto">

        {/* ── Welcome ── */}
        <div className="mb-14">
          <p
            className="font-sans text-[10px] tracking-[0.24em] uppercase text-ink mb-3"
            style={{ opacity: 0.35 }}
          >
            Dashboard
          </p>
          <h1 className="font-display text-prussian italic leading-none mb-4" style={{ fontSize: "3.5rem" }}>
            {greeting}, {userName}.
          </h1>
          <p
            className="font-sans text-sm text-ink leading-relaxed max-w-lg"
            style={{ opacity: 0.48 }}
          >
            Your Visa Forte operations hub. Manage clients, track cases, and generate reports.
          </p>
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          <StatCard
            label="New Leads"
            value={String(allLeads.length)}
            note="Intake submissions"
          />
          <StatCard label="Open Cases" value="—" note="In progress" />
          <StatCard label="Reports Sent" value="—" note="This month" />
          <StatCard label="Upcoming Bookings" value="—" note="Next 7 days" />
        </div>

        {/* ── New Leads section ── */}
        <div className="flex items-center gap-5 mb-8">
          <span
            className="font-sans text-[10px] tracking-[0.22em] uppercase text-ink whitespace-nowrap"
            style={{ opacity: 0.35 }}
          >
            New Leads
            {allLeads.length > 0 && (
              <span className="ml-2 text-saffron" style={{ opacity: 1 }}>
                ({allLeads.length})
              </span>
            )}
          </span>
          <div className="flex-1 h-px bg-sand" />
          <a
            href="/intake"
            className="font-sans text-[10px] tracking-[0.18em] uppercase text-teal hover:underline whitespace-nowrap"
          >
            View Form →
          </a>
        </div>

        {allLeads.length === 0 ? (
          <div
            className="bg-white px-8 py-12 text-center mb-16"
            style={{ borderTop: "2px solid var(--sand)" }}
          >
            <p
              className="font-sans text-sm text-ink mb-2"
              style={{ opacity: 0.38 }}
            >
              No intake submissions yet.
            </p>
            <a href="/intake" className="font-sans text-sm text-teal hover:underline">
              Share the intake form →
            </a>
          </div>
        ) : (
          // Table scrolls internally once it exceeds 520px — header stays pinned.
          <div className="bg-white mb-16 overflow-x-auto" style={{ maxHeight: "520px", overflowY: "auto" }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="bg-white"
                  style={{ borderBottom: "1px solid var(--sand)", position: "sticky", top: 0, zIndex: 1 }}
                >
                  {["Name", "Email", "Service Interest", "Submitted", "Status"].map((h) => (
                    <th
                      key={h}
                      className="font-sans text-[10px] tracking-[0.18em] uppercase text-ink px-6 py-4 font-semibold bg-white"
                      style={{ opacity: 0.38 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="leads-row transition-colors"
                    style={{ borderBottom: "1px solid var(--sand)" }}
                  >
                    {/* Name */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="font-sans text-sm font-semibold text-prussian">
                        {lead.name}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-5">
                      <a
                        href={`mailto:${lead.email}`}
                        className="font-sans text-sm text-teal font-light hover:underline"
                      >
                        {lead.email}
                      </a>
                    </td>

                    {/* Service Interest — truncated */}
                    <td className="px-6 py-5" style={{ maxWidth: "220px" }}>
                      <span
                        className="font-sans text-sm text-ink font-light block truncate"
                        title={lead.serviceInterest}
                        style={{ opacity: 0.75 }}
                      >
                        {lead.serviceInterest}
                      </span>
                    </td>

                    {/* Submitted date */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className="font-sans text-xs text-ink"
                        style={{ opacity: 0.4 }}
                      >
                        {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-5">
                      <span
                        className="font-sans text-[10px] tracking-[0.12em] uppercase font-semibold px-2.5 py-1"
                        style={{
                          background:
                            lead.status === "new"
                              ? "rgba(201,123,30,0.12)"
                              : "rgba(12,35,64,0.07)",
                          color:
                            lead.status === "new"
                              ? "var(--saffron)"
                              : "var(--ink)",
                        }}
                      >
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Platform Roadmap ── */}
        <div className="flex items-center gap-5 mb-8">
          <span
            className="font-sans text-[10px] tracking-[0.22em] uppercase text-ink whitespace-nowrap"
            style={{ opacity: 0.35 }}
          >
            Platform Roadmap
          </span>
          <div className="flex-1 h-px bg-sand" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-16">
          <RoadmapCard
            isLive
            phase="Phase 1 · Live"
            title="Authentication"
            description="Secure account creation and login. Admin and client roles."
          />
          <RoadmapCard
            phase="Phase 2 · Next"
            title="Client CRM"
            description="Client table with status tracking, notes, and document history."
          />
          <RoadmapCard
            phase="Phase 2 · Next"
            title="CanVisa Pro"
            description="Embedded PR eligibility engine with McKinsey-style PDF reports."
          />
          <RoadmapCard
            phase="Phase 3"
            title="Bookings"
            description="Client self-booking with calendar integration and reminders."
          />
          <RoadmapCard
            phase="Phase 3"
            title="Payments"
            description="Paddle-powered invoicing and subscription billing for service tiers."
          />
          <RoadmapCard
            phase="Phase 3"
            title="Document Storage"
            description="Secure Cloudflare R2 storage with signed download links."
          />
        </div>

        {/* ── Footer strip ── */}
        <div
          className="flex items-center justify-between pt-6"
          style={{ borderTop: "1px solid var(--sand)" }}
        >
          <p
            className="font-sans text-[10px] tracking-[0.1em] text-ink"
            style={{ opacity: 0.28 }}
          >
            Visa Forte · Engineered for Passage.
          </p>
          <a
            href="/"
            className="font-sans text-[10px] tracking-[0.18em] uppercase text-teal hover:underline"
          >
            View Site →
          </a>
        </div>

      </main>
    </div>
  );
}
