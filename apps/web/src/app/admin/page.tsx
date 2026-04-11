import { redirect } from "next/navigation";
import { getCurrentAuthSession } from "@/lib/auth-server";
import SignOutButton from "./SignOutButton";

// Stat card — shows a metric with a Saffron top rule.
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
    <div className="bg-white border-t-2 border-saffron px-6 py-6 shadow-sm">
      <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-ink mb-3" style={{ opacity: 0.5 }}>
        {label}
      </p>
      <p className="font-display text-prussian text-4xl leading-none mb-2">{value}</p>
      <p className="font-sans text-xs text-ink" style={{ opacity: 0.4 }}>{note}</p>
    </div>
  );
}

// Phase card — shows an upcoming feature with its phase tag.
function PhaseCard({
  phase,
  title,
  description,
}: {
  phase: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white px-6 py-5 shadow-sm border-l border-sand">
      <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-saffron font-medium">
        {phase}
      </span>
      <p className="font-sans text-sm font-medium text-prussian mt-1 mb-1">{title}</p>
      <p className="font-sans text-xs text-ink leading-relaxed" style={{ opacity: 0.5 }}>
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
  const userName = userEmail.split("@")[0] ?? "there";

  // Determine greeting based on server time (UTC+5:30 for IST)
  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  ).getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-pearl flex flex-col">

      {/* ── Top navigation bar ── */}
      <header className="bg-prussian px-8 py-0 flex items-center justify-between h-14 shrink-0">
        <div className="flex items-center gap-4">
          {/* Wordmark */}
          <span className="font-sans text-[11px] tracking-[0.3em] uppercase text-pearl">
            Visa Forte
          </span>
          {/* Saffron divider */}
          <span className="block w-px h-4 bg-saffron opacity-60" />
          {/* Section label */}
          <span className="font-sans text-[11px] tracking-[0.18em] uppercase text-pearl opacity-40">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span className="font-sans text-[11px] text-pearl opacity-40 hidden sm:block">
            {userEmail}
          </span>
          <span className="block w-px h-3 bg-pearl opacity-20 hidden sm:block" />
          <SignOutButton />
        </div>
      </header>

      {/* ── Saffron accent rule under header ── */}
      <div className="h-[2px] bg-saffron opacity-80 shrink-0" />

      {/* ── Main content ── */}
      <main className="flex-1 px-8 py-10 max-w-5xl w-full mx-auto">

        {/* Welcome section */}
        <div className="mb-10">
          <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink mb-2" style={{ opacity: 0.4 }}>
            Dashboard
          </p>
          <h1 className="font-display text-prussian text-5xl italic leading-tight mb-3">
            {greeting}, {userName}.
          </h1>
          <p className="font-sans text-sm text-ink leading-relaxed" style={{ opacity: 0.55 }}>
            Your Visa Forte operations hub. Manage clients, track cases, and generate reports — all in one place.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total Clients"     value="—" note="Active in platform" />
          <StatCard label="Open Cases"        value="—" note="In progress" />
          <StatCard label="Reports Sent"      value="—" note="This month" />
          <StatCard label="Upcoming Bookings" value="—" note="Next 7 days" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <span className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink" style={{ opacity: 0.35 }}>
            Platform Roadmap
          </span>
          <div className="flex-1 h-px bg-sand" />
        </div>

        {/* Phase cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <PhaseCard
            phase="Phase 1 · Live"
            title="Authentication"
            description="Secure account creation and login. Admin and client roles."
          />
          <PhaseCard
            phase="Phase 2 · Next"
            title="Client CRM"
            description="Client table with status tracking, notes, and document history."
          />
          <PhaseCard
            phase="Phase 2 · Next"
            title="CanVisa Pro"
            description="Embedded PR eligibility engine with McKinsey-style PDF reports."
          />
          <PhaseCard
            phase="Phase 3"
            title="Bookings"
            description="Client self-booking with calendar integration and reminders."
          />
          <PhaseCard
            phase="Phase 3"
            title="Payments"
            description="Paddle-powered invoicing and subscription billing for service tiers."
          />
          <PhaseCard
            phase="Phase 3"
            title="Document Storage"
            description="Secure Cloudflare R2 storage with signed download links."
          />
        </div>

        {/* Footer strip */}
        <div className="border-t border-sand pt-6 flex items-center justify-between">
          <p className="font-sans text-[11px] text-ink" style={{ opacity: 0.3 }}>
            Visa Forte · Engineered for Passage.
          </p>
          <a
            href="/"
            className="font-sans text-[11px] tracking-[0.15em] uppercase text-teal hover:underline"
          >
            View Site
          </a>
        </div>

      </main>
    </div>
  );
}