// apps/web/src/app/resources/page.tsx
// Server component — SEO metadata, data loading, page layout.
// All interactivity is delegated to FreeResourcesGrid (client component).

import type { Metadata } from "next";
import type { JSX } from "react";
import "./resources.css";
import { getAllFreeResources, getAllPremiumResources } from "@/lib/resources";
import FreeResourcesGrid from "./FreeResourcesGrid";
import ResourceCard from "@/components/ResourceCard";
import MailtoButton from "@/components/MailtoButton";

export const metadata: Metadata = {
  title:
    "Immigration Resources — Visa Forte | Checklists, Guides & Templates",
  description:
    "Free and premium immigration resources for Express Entry, PNP, and spousal sponsorship applicants. Checklists, application guides, cheat sheets, letter templates, and timelines — reviewed personally by Prashant Thirthingoth.",
};

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

      {/* ── FREE RESOURCES ────────────────────────────────────── */}
      <section className="sec resources-free">
        <div className="sec-inner">
          <div className="resources-section-header r">
            <p className="eyebrow">Free Resources</p>
            <h2 className="resources-section-headline">
              Start Here. No Email Required.
            </h2>
          </div>
          <FreeResourcesGrid resources={freeResources} />
        </div>
      </section>

      {/* ── PREMIUM RESOURCES ─────────────────────────────────── */}
      <section className="sec resources-premium">
        <div className="sec-inner">
          <div className="resources-section-header r">
            <p className="eyebrow">Premium Resources</p>
            <h2 className="resources-section-headline">
              Go Deeper. Get It Done Faster.
            </h2>
            <p className="resources-section-sub">
              Detailed formats, worked examples, and annotated walkthroughs
              built for clients who are actively filing.
            </p>
          </div>
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
