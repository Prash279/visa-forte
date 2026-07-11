// apps/web/src/app/resources/page.tsx
// Server component — SEO metadata, data loading, page layout.
// All interactivity is delegated to FreeResourcesGrid (client component).

import type { JSX } from "react";
import "./resources.css";
import { getAllFreeResources, getAllPremiumResources } from "@/lib/resources";
import FreeResourcesGrid from "./FreeResourcesGrid";
import ResourceCard from "@/components/ResourceCard";
import MailtoButton from "@/components/MailtoButton";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Immigration Resources — Visa Forte | Checklists, Guides & Templates",
  description:
    "Free and premium immigration resources for Express Entry, PNP, and spousal sponsorship applicants. Checklists, application guides, cheat sheets, letter templates, and timelines — reviewed personally by Prashant Thirthingoth.",
  path: "/resources",
});

export default function ResourcesPage(): JSX.Element {
  const freeResources    = getAllFreeResources();
  const premiumResources = getAllPremiumResources();

  return (
    <main className="resources-main">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="resources-hero">
        <div className="resources-hero-inner">
          <p className="eyebrow r">Resource Library</p>
          <h1 className="resources-hero-headline r d1">
            Everything You Need.<br />
            Nothing You Don&apos;t.
          </h1>
          <div className="rule r d2" />
          <p className="resources-hero-lead r d2">
            Application guides, checklists, cheat sheets, and sample formats —
            built for Express Entry applicants who want to get it right the
            first time. No fluff. No filler. Just what works.
          </p>
        </div>
      </section>

      {/* ── TOOLS ─────────────────────────────────────────────── */}
      <section id="tools" className="sec resources-tools">
        <div className="sec-inner">
          <p className="eyebrow r">Interactive Tools</p>
          <h2 className="headline r d1">Check Your Score. Plan Your Move.</h2>
          <div className="rule r d2" />

          {/* Hero tool: CanVisa Pro Lite */}
          <div className="tools-hero-card r d2">
            <div className="tools-hero-content">
              <p className="tools-hero-label">Free · No Login Required</p>
              <h3 className="tools-hero-title">CanVisa Pro Lite — CRS Score Check</h3>
              <p className="tools-hero-desc">
                Enter your profile and get your Express Entry CRS score, the top 2–3 reasons
                it&apos;s lower than the last draw cutoff, and the highest-probability pathway — in
                under 3 minutes.
              </p>
            </div>
            <a href="/assessment" className="tools-hero-cta">
              Check My Score Free →
            </a>
          </div>

          {/* Tools grid — first card is live, rest coming soon */}
          <div className="tools-grid r d3">
            <a href="/tools/crs-modeller" className="tools-card" style={{ textDecoration: 'none' }}>
              <div className="tools-card-badge">Free · No Login Required</div>
              <h4 className="tools-card-title">CRS What-If Modeller</h4>
              <p className="tools-card-desc">
                Move one lever — language, education, or Canadian experience — and see the exact point gain. Find the fastest path to the cutoff.
              </p>
            </a>
            <a href="/tools/ita-countdown" className="tools-card" style={{ textDecoration: 'none' }}>
              <div className="tools-card-badge">₹2,997 · Launch Tool →</div>
              <h4 className="tools-card-title">60-Day Countdown Planner</h4>
              <p className="tools-card-desc">
                Generate a personalised day-by-day document preparation timeline from your ITA date.
              </p>
            </a>
            {[
              { name: 'NOC Code Verifier', desc: 'Confirm your 5-digit NOC 2021 code and TEER level against the official Statistics Canada CSV.' },
              { name: 'Refusal Pattern Analyser', desc: 'Identify the most common refusal grounds for your NOC and build a pre-emption strategy.' },
            ].map(tool => (
              <div key={tool.name} className="tools-card">
                <div className="tools-card-badge">Coming Soon</div>
                <h4 className="tools-card-title">{tool.name}</h4>
                <p className="tools-card-desc">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FREE RESOURCES ────────────────────────────────────── */}
      <section className="sec resources-free">
        <div className="sec-inner">
          <p className="eyebrow r">Free Resources</p>
          <h2 className="headline r d1">Start Here. No Email Required.</h2>
          <div className="rule r d2" />
          <FreeResourcesGrid resources={freeResources} />
        </div>
      </section>

      {/* ── PREMIUM RESOURCES ─────────────────────────────────── */}
      <section className="sec resources-premium">
        <div className="sec-inner">
          <p className="eyebrow r">Premium Resources</p>
          <h2 className="headline r d1">Go Deeper. Get It Done Faster.</h2>
          <div className="rule r d2" />
          <p className="resources-section-sub r d2">
            Detailed formats, worked examples, and annotated walkthroughs
            built for clients who are actively filing.
          </p>
          <div className="resources-grid">
            {premiumResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                kind="premium"
                id={resource.id}
                title={resource.title}
                type={resource.type}
                category={resource.category}
                description={resource.description}
                priceINR={resource.priceINR}
                priceUSD={resource.priceUSD}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST CLOSE ───────────────────────────────────────── */}
      <section className="resources-trust">
        <div className="resources-trust-inner">
          <p className="eyebrow r">The Standard</p>
          <h2 className="resources-trust-headline r d1">
            Every resource here was built because a client needed it
            and nothing good enough existed.
          </h2>
          <div className="rule r d1" />
          <p className="resources-trust-body r d2">
            Twenty years of practice. Every checklist, every template, every
            guide reviewed personally before it goes on this page.
            If it has our name on it, it works.
          </p>
          <MailtoButton className="btn-primary r d2">
            Get Reviewed →
          </MailtoButton>
        </div>
      </section>

    </main>
  );
}
