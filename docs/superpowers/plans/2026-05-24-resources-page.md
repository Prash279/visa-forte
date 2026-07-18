# Resources Page — Implementation Plan

> ⚠️ **PARTIALLY SUPERSEDED — 2026-07-17.** Historical record; preserved as written. This plan was executed and the page shipped, but two of its assumptions are dead: **Paddle is not the payment rail** (Razorpay is the only rail — decision 2026-07-17), and the `paddleProductId` field it specifies is vestigial, replaced by a `pricingTier` key indexing into `PRICING` (`lib/pricing.ts`). Its "Paddle live payment integration — separate session" deferral is void. Current plan: *Resources Page - Plan.md* (Rev 3).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-section public Resources page at `/resources` — free downloads first, premium resources below — backed by a typed JSON data file and a download API route.

**Architecture:** Server component page (`page.tsx`) loads typed data from `resources.json` via `resources.ts` accessors; free-resource filtering is a `"use client"` component (`FreeResourcesGrid.tsx`); a shared `ResourceCard.tsx` renders both free and premium cards; a Next.js App Router API route handles file downloads. One existing file is modified: `SiteNav.tsx` (single object added to `NAV_LINKS`).

**Tech Stack:** Next.js 16.2.2 App Router, React 19, TypeScript strict, Vitest (node env), CSS modules pattern (per-page .css files), no new dependencies.

**⚠️ Constraint:** Touch ONLY the files listed. Do not refactor, rename, or reformat any existing code not required by these tasks.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `apps/web/src/lib/resources.json` | Raw seed data — 3 free, 2 premium resources |
| Create | `apps/web/src/lib/resources.ts` | Typed accessors: `findFreeResource`, `getAllFreeResources`, `getAllPremiumResources` |
| Create | `apps/web/src/__tests__/resources.test.ts` | Vitest tests for resources.ts |
| Create | `apps/web/src/components/ResourceCard.tsx` | Shared card UI — discriminated union props (free/premium) |
| Create | `apps/web/src/app/api/resources/download/[id]/route.ts` | GET handler — resolves id → fileName → serves PDF |
| Create | `apps/web/src/app/resources/FreeResourcesGrid.tsx` | "use client" — filter state + filtered card grid |
| Create | `apps/web/src/app/resources/page.tsx` | Server component — metadata, layout, section assembly |
| Create | `apps/web/src/app/resources/resources.css` | All page-specific styles |
| Create | `apps/web/public/downloads/README.md` | Placeholder — keeps directory in git; actual PDFs added by Prashant |
| **Modify** | `apps/web/src/components/SiteNav.tsx` | Add `{ href: "/resources", label: "Resources" }` to `NAV_LINKS` |

---

## Task 1 — Seed Data: resources.json

**Files:**
- Create: `apps/web/src/lib/resources.json`

- [ ] **Step 1.1 — Create the JSON file**

```json
{
  "free": [
    {
      "id": "ee-document-checklist",
      "title": "Express Entry Document Checklist",
      "type": "checklist",
      "category": "Express Entry",
      "description": "A complete, phase-by-phase list of every document required for an Express Entry profile — FSWP, CEC, and FSTP. Covers the profile stage, ITA, and e-APR submission. Updated for current IRCC requirements.",
      "fileName": "ee-document-checklist.pdf",
      "featured": true
    },
    {
      "id": "ielts-clb-crs-cheatsheet",
      "title": "IELTS → CLB → CRS Conversion Cheat Sheet",
      "type": "cheatsheet",
      "category": "Language Tests",
      "description": "Every IELTS band score converted to its CLB level and CRS points — for both first and second official language. Includes spouse contribution rows and the exact IRCC table structure.",
      "fileName": "ielts-clb-crs-cheatsheet.pdf",
      "featured": true
    },
    {
      "id": "ita-to-pr-roadmap",
      "title": "ITA to PR: The 11-Step Roadmap",
      "type": "timeline",
      "category": "Express Entry",
      "description": "A visual end-to-end timeline from the day you receive an Invitation to Apply to the day you land in Canada. Includes realistic timeframes for each stage and what happens if a step is delayed.",
      "fileName": "ita-to-pr-roadmap.pdf",
      "featured": true
    }
  ],
  "premium": [
    {
      "id": "loe-master-template-pack",
      "title": "Letter of Explanation (LOE) Master Template Pack",
      "type": "letter",
      "category": "Express Entry",
      "description": "Eight professionally written LOE templates covering the most common explanation scenarios: employment gaps, travel history discrepancies, study-to-work transitions, and more. Each template includes annotated notes explaining what IRCC officers look for.",
      "priceINR": 1997,
      "priceUSD": 35,
      "paddleProductId": "",
      "featured": true
    },
    {
      "id": "ee-pre-submission-audit-guide",
      "title": "Express Entry Pre-Submission Audit Guide",
      "type": "guide",
      "category": "Express Entry",
      "description": "A 40-point audit checklist with worked examples for every section of the e-APR. Covers every common rejection trigger, what to do when a document doesn't match the form exactly, and how to write explanatory notes that satisfy IRCC without triggering a request for more information.",
      "priceINR": 3997,
      "priceUSD": 69,
      "paddleProductId": "",
      "featured": true
    }
  ]
}
```

- [ ] **Step 1.2 — Commit**

```bash
cd apps/web
git add src/lib/resources.json
git commit -m "feat(resources): add seed resources data"
```

---

## Task 2 — Typed Accessors: resources.ts

**Files:**
- Create: `apps/web/src/lib/resources.ts`

- [ ] **Step 2.1 — Create the typed accessor module**

```typescript
// apps/web/src/lib/resources.ts
// Typed accessors for resources.json — used by the page, the download route,
// and tests. Centralises the type definitions so they are defined exactly once.

import data from "./resources.json";

export type ResourceType =
  | "guide"
  | "checklist"
  | "cheatsheet"
  | "sample"
  | "letter"
  | "timeline"
  | "comparison";

export interface FreeResource {
  id: string;
  title: string;
  type: ResourceType;
  category: string;
  description: string;
  fileName: string;
  featured: boolean;
}

export interface PremiumResource {
  id: string;
  title: string;
  type: ResourceType;
  category: string;
  description: string;
  priceINR: number;
  priceUSD: number;
  paddleProductId: string;
  featured: boolean;
}

// Returns the free resource matching id, or undefined if not found.
export function findFreeResource(id: string): FreeResource | undefined {
  return (data.free as FreeResource[]).find((r) => r.id === id);
}

// Returns all free resources, featured items first.
export function getAllFreeResources(): FreeResource[] {
  return [...(data.free as FreeResource[])].sort(
    (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
  );
}

// Returns all premium resources, featured items first.
export function getAllPremiumResources(): PremiumResource[] {
  return [...(data.premium as PremiumResource[])].sort(
    (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
  );
}
```

- [ ] **Step 2.2 — Commit**

```bash
git add src/lib/resources.ts
git commit -m "feat(resources): add typed resource accessors"
```

---

## Task 3 — Tests: resources.test.ts (Write tests FIRST)

**Files:**
- Create: `apps/web/src/__tests__/resources.test.ts`

- [ ] **Step 3.1 — Write the tests**

```typescript
// apps/web/src/__tests__/resources.test.ts
import { describe, it, expect } from "vitest";
import {
  findFreeResource,
  getAllFreeResources,
  getAllPremiumResources,
} from "@/lib/resources";

const VALID_TYPES = [
  "guide",
  "checklist",
  "cheatsheet",
  "sample",
  "letter",
  "timeline",
  "comparison",
] as const;

describe("findFreeResource", () => {
  it("returns the resource when the id exists", () => {
    const resource = findFreeResource("ee-document-checklist");
    expect(resource).toBeDefined();
    expect(resource?.id).toBe("ee-document-checklist");
    expect(resource?.fileName).toBe("ee-document-checklist.pdf");
  });

  it("returns undefined for an id that does not exist", () => {
    expect(findFreeResource("this-does-not-exist")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(findFreeResource("")).toBeUndefined();
  });
});

describe("getAllFreeResources", () => {
  it("returns a non-empty array", () => {
    expect(getAllFreeResources().length).toBeGreaterThan(0);
  });

  it("every free resource has all required fields", () => {
    for (const r of getAllFreeResources()) {
      expect(r.id, `${r.id}: missing id`).toBeTruthy();
      expect(r.title, `${r.id}: missing title`).toBeTruthy();
      expect(r.fileName, `${r.id}: missing fileName`).toBeTruthy();
      expect(r.description, `${r.id}: missing description`).toBeTruthy();
      expect(
        (VALID_TYPES as readonly string[]).includes(r.type),
        `${r.id}: invalid type "${r.type}"`
      ).toBe(true);
      expect(typeof r.featured, `${r.id}: featured must be boolean`).toBe("boolean");
    }
  });

  it("all ids are unique", () => {
    const resources = getAllFreeResources();
    const ids = resources.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("featured resources appear before non-featured", () => {
    const resources = getAllFreeResources();
    const firstNonFeaturedIdx = resources.findIndex((r) => !r.featured);
    if (firstNonFeaturedIdx === -1) return; // all featured — pass
    const afterNonFeatured = resources.slice(firstNonFeaturedIdx);
    expect(afterNonFeatured.every((r) => !r.featured)).toBe(true);
  });
});

describe("getAllPremiumResources", () => {
  it("returns a non-empty array", () => {
    expect(getAllPremiumResources().length).toBeGreaterThan(0);
  });

  it("every premium resource has valid pricing", () => {
    for (const r of getAllPremiumResources()) {
      expect(r.id, `${r.id}: missing id`).toBeTruthy();
      expect(r.title, `${r.id}: missing title`).toBeTruthy();
      expect(r.priceINR, `${r.id}: priceINR must be positive`).toBeGreaterThan(0);
      expect(r.priceUSD, `${r.id}: priceUSD must be positive`).toBeGreaterThan(0);
      expect(
        (VALID_TYPES as readonly string[]).includes(r.type),
        `${r.id}: invalid type "${r.type}"`
      ).toBe(true);
    }
  });

  it("all ids are unique", () => {
    const resources = getAllPremiumResources();
    const ids = resources.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 3.2 — Run tests to verify they PASS** (data and accessors are already in place)

```bash
cd apps/web
npm test -- --reporter=verbose
```

Expected output: all 10 tests pass. If any fail, fix `resources.ts` or `resources.json` before proceeding.

- [ ] **Step 3.3 — Commit**

```bash
git add src/__tests__/resources.test.ts
git commit -m "test(resources): add data integrity and accessor tests"
```

---

## Task 4 — Shared Card Component: ResourceCard.tsx

**Files:**
- Create: `apps/web/src/components/ResourceCard.tsx`

- [ ] **Step 4.1 — Create the component**

```tsx
// apps/web/src/components/ResourceCard.tsx
// Shared card UI for both free and premium resources.
// Uses a discriminated union so TypeScript enforces the right props per kind.
// No client-side state — safe to use in server components.

import type { JSX } from "react";
import type { ResourceType } from "@/lib/resources";

// Human-readable label for each resource type (shown as the badge text)
const TYPE_LABELS: Record<ResourceType, string> = {
  guide:      "Guide",
  checklist:  "Checklist",
  cheatsheet: "Cheat Sheet",
  sample:     "Sample Format",
  letter:     "Letter Template",
  timeline:   "Timeline",
  comparison: "Comparison Table",
};

interface FreeCardProps {
  kind: "free";
  id: string;
  title: string;
  type: ResourceType;
  category: string;
  description: string;
}

interface PremiumCardProps {
  kind: "premium";
  id: string;
  title: string;
  type: ResourceType;
  category: string;
  description: string;
  priceINR: number;
  priceUSD: number;
}

type ResourceCardProps = FreeCardProps | PremiumCardProps;

export default function ResourceCard(props: ResourceCardProps): JSX.Element {
  return (
    <article className={`resource-card resource-card--${props.kind}`}>
      {/* Header row: type badge + category */}
      <div className="resource-card-header">
        <span className={`resource-type-badge resource-type-badge--${props.type}`}>
          {TYPE_LABELS[props.type]}
        </span>
        <span className="resource-category">{props.category}</span>
      </div>

      {/* Content */}
      <h3 className="resource-card-title">{props.title}</h3>
      <p className="resource-card-description">{props.description}</p>

      {/* CTA footer */}
      <div className="resource-card-footer">
        {props.kind === "free" ? (
          <a
            href={`/api/resources/download/${props.id}`}
            className="resource-cta resource-cta--free"
            download
          >
            Download Free →
          </a>
        ) : (
          <div className="resource-premium-cta">
            <div className="resource-price">
              <span className="resource-price-inr">
                ₹{props.priceINR.toLocaleString("en-IN")}
              </span>
              <span className="resource-price-usd">${props.priceUSD} USD</span>
            </div>
            <button
              className="resource-cta resource-cta--premium"
              disabled
              aria-disabled="true"
            >
              Buy — ₹{props.priceINR.toLocaleString("en-IN")} →
            </button>
            <p className="resource-cta-note">
              Payment integration coming soon.{" "}
              <a href="mailto:prashant@visaforte.com?subject=Purchase%20Enquiry%20%E2%80%94%20Resource">
                Contact to purchase
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 4.2 — Commit**

```bash
git add src/components/ResourceCard.tsx
git commit -m "feat(resources): add ResourceCard shared component"
```

---

## Task 5 — Download API Route: route.ts

**Files:**
- Create: `apps/web/src/app/api/resources/download/[id]/route.ts`

- [ ] **Step 5.1 — Create the API route**

```typescript
// apps/web/src/app/api/resources/download/[id]/route.ts
// Serves free PDF resources by id.
// Returns 404 if the id is not in resources.json.
// Returns 503 if the file exists in data but hasn't been uploaded yet.
// Logs every successful download to stdout for analytics.

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { findFreeResource } from "@/lib/resources";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Next.js 15+ requires awaiting params
  const { id } = await context.params;

  const resource = findFreeResource(id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "downloads",
    resource.fileName
  );

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch {
    // File registered in data but not yet uploaded — return 503 (not 404,
    // so we can distinguish "unknown resource" from "file pending upload")
    return NextResponse.json(
      { error: "File not available yet — check back soon" },
      { status: 503 }
    );
  }

  console.log(`[resources/download] id=${id} file=${resource.fileName}`);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resource.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Step 5.2 — Commit**

```bash
git add src/app/api/resources/download/
git commit -m "feat(resources): add free resource download API route"
```

---

## Task 6 — Client Filter Grid: FreeResourcesGrid.tsx

**Files:**
- Create: `apps/web/src/app/resources/FreeResourcesGrid.tsx`

- [ ] **Step 6.1 — Create the component**

```tsx
// apps/web/src/app/resources/FreeResourcesGrid.tsx
// Client component — manages filter pill state and renders the filtered card grid.
// Receives all free resources as a prop from the server component (no client-side fetch).

"use client";

import { useState } from "react";
import type { JSX } from "react";
import ResourceCard from "@/components/ResourceCard";
import type { FreeResource, ResourceType } from "@/lib/resources";

type FilterValue = ResourceType | "all";

const FILTER_PILLS: { label: string; value: FilterValue }[] = [
  { label: "All",                  value: "all" },
  { label: "Application Guides",   value: "guide" },
  { label: "Checklists",           value: "checklist" },
  { label: "Cheat Sheets",         value: "cheatsheet" },
  { label: "Sample Formats",       value: "sample" },
  { label: "Letter Templates",     value: "letter" },
  { label: "Timelines & Roadmaps", value: "timeline" },
  { label: "Comparison Tables",    value: "comparison" },
];

interface Props {
  resources: FreeResource[];
}

export default function FreeResourcesGrid({ resources }: Props): JSX.Element {
  const [active, setActive] = useState<FilterValue>("all");

  const filtered =
    active === "all" ? resources : resources.filter((r) => r.type === active);

  return (
    <div>
      {/* Filter pill bar */}
      <div className="filter-pills" role="group" aria-label="Filter by resource type">
        {FILTER_PILLS.map(({ label, value }) => (
          <button
            key={value}
            className={`filter-pill${active === value ? " active" : ""}`}
            onClick={() => setActive(value)}
            aria-pressed={active === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Card grid or empty state */}
      {filtered.length === 0 ? (
        <p className="filter-empty">
          No resources in this category yet — check back soon.
        </p>
      ) : (
        <div className="resources-grid">
          {filtered.map((resource) => (
            <ResourceCard
              key={resource.id}
              kind="free"
              id={resource.id}
              title={resource.title}
              type={resource.type}
              category={resource.category}
              description={resource.description}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6.2 — Commit**

```bash
git add src/app/resources/FreeResourcesGrid.tsx
git commit -m "feat(resources): add FreeResourcesGrid client component"
```

---

## Task 7 — Page Component: page.tsx

**Files:**
- Create: `apps/web/src/app/resources/page.tsx`

- [ ] **Step 7.1 — Create the server component**

```tsx
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
          <p className="eyebrow r resources-trust-eyebrow">The Standard</p>
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
```

- [ ] **Step 7.2 — Commit**

```bash
git add src/app/resources/page.tsx
git commit -m "feat(resources): add Resources page server component"
```

---

## Task 8 — Page Styles: resources.css

**Files:**
- Create: `apps/web/src/app/resources/resources.css`

- [ ] **Step 8.1 — Create the stylesheet**

```css
/* resources.css — styles for /resources only */

/* ── HERO ─────────────────────────────────────────────────── */
.resources-hero {
  background: var(--prussian);
  padding: 11rem 2.5rem 7rem;
  position: relative;
  overflow: hidden;
}

.resources-hero-inner {
  max-width: var(--max-w);
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* Eyebrow on Prussian background — explicit saffron override (lessons.md #2) */
.resources-hero .eyebrow { color: var(--saffron); }

.resources-hero-headline {
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 5.5vw, 5rem);
  font-weight: 400;
  line-height: 1.06;
  color: var(--pearl);
  max-width: 820px;
  letter-spacing: -0.015em;
  margin-bottom: 0;
}

.resources-hero-lead {
  font-family: var(--font-body);
  font-size: 1.05rem;
  font-weight: 300;
  line-height: 1.82;
  color: rgba(248, 244, 238, 0.78);
  max-width: 600px;
}

/* ── FREE RESOURCES SECTION ───────────────────────────────── */
.resources-free { background: var(--pearl); }

.resources-section-header {
  margin-bottom: 2.5rem;
}

.resources-section-headline {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.012em;
  color: var(--ink);
  margin-top: 0;
}

.resources-section-sub {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 300;
  line-height: 1.75;
  color: rgba(26, 43, 60, 0.72);
  max-width: 580px;
  margin-top: 0.75rem;
}

/* ── FILTER PILLS ─────────────────────────────────────────── */
.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2.5rem;
}

.filter-pill {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.45rem 1rem;
  background: transparent;
  border: 1px solid var(--sand);
  color: var(--ink);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.filter-pill:hover {
  border-color: var(--saffron);
  color: var(--saffron);
}

.filter-pill.active {
  background: var(--prussian);
  border-color: var(--prussian);
  color: var(--pearl);
}

.filter-empty {
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: rgba(26, 43, 60, 0.55);
  padding: 3rem 0;
  text-align: center;
}

/* ── RESOURCE CARD GRID ───────────────────────────────────── */
.resources-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* ── RESOURCE CARD ────────────────────────────────────────── */
.resource-card {
  background: #ffffff;
  border: 1px solid var(--sand);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.resource-card:hover {
  border-color: rgba(201, 123, 30, 0.45);
  box-shadow: 0 4px 20px rgba(12, 35, 64, 0.07);
}

/* Card header row */
.resource-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Type badge — colour varies by resource type */
.resource-type-badge {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.18rem 0.55rem;
}

.resource-type-badge--guide,
.resource-type-badge--timeline    { background: var(--prussian); color: var(--pearl); }

.resource-type-badge--checklist,
.resource-type-badge--letter      { background: var(--teal);     color: var(--pearl); }

.resource-type-badge--cheatsheet  { background: var(--saffron);  color: var(--prussian); }

.resource-type-badge--sample,
.resource-type-badge--comparison  { background: var(--ink);      color: var(--pearl); }

/* Category tag */
.resource-category {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(26, 43, 60, 0.5);
}

/* Card title */
.resource-card-title {
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 1.8vw, 1.35rem);
  font-weight: 500;
  line-height: 1.25;
  color: var(--ink);
  margin: 0;
}

/* Card description */
.resource-card-description {
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 300;
  line-height: 1.72;
  color: rgba(26, 43, 60, 0.75);
  flex: 1; /* pushes CTA footer to the bottom of the card */
}

/* Card CTA footer */
.resource-card-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--sand);
}

/* Free download CTA */
.resource-cta--free {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--saffron);
  transition: color 0.18s ease;
}

.resource-cta--free:hover { color: var(--prussian); }

/* Premium CTA block */
.resource-premium-cta {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.resource-price {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.resource-price-inr {
  font-family: var(--font-body);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.01em;
}

.resource-price-usd {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(26, 43, 60, 0.55);
  letter-spacing: 0.04em;
}

.resource-cta--premium {
  display: inline-block;
  background: var(--prussian);
  color: var(--pearl);
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.75rem 1.4rem;
  border: none;
  cursor: not-allowed;
  opacity: 0.65;
  width: 100%;
  text-align: center;
}

.resource-cta-note {
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 300;
  color: rgba(26, 43, 60, 0.55);
  line-height: 1.5;
}

.resource-cta-note a {
  color: var(--teal);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ── PREMIUM RESOURCES SECTION ────────────────────────────── */
/* Warm amber wash distinguishes this section from the pearl free section */
.resources-premium { background: var(--amber); }

/* ── TRUST CLOSE SECTION ──────────────────────────────────── */
.resources-trust {
  background: var(--prussian);
  padding: 6rem 2.5rem;
  text-align: center;
}

.resources-trust-inner {
  max-width: 680px;
  margin: 0 auto;
}

/* Explicit eyebrow saffron on Prussian background (lessons.md #2) */
.resources-trust .eyebrow { color: var(--saffron); }

.resources-trust-headline {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3.5vw, 3rem);
  font-weight: 400;
  line-height: 1.18;
  color: var(--pearl);
  margin-bottom: 1.5rem;
  letter-spacing: -0.01em;
}

.resources-trust-body {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 300;
  line-height: 1.8;
  color: rgba(248, 244, 238, 0.75);
  margin-bottom: 2.5rem;
}

/* ── RESPONSIVE ───────────────────────────────────────────── */
@media (max-width: 900px) {
  .resources-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 860px) {
  /* Tablet breakpoint matches nav hamburger breakpoint (lessons.md #3) */
  .resources-hero { padding: 9rem 1.5rem 5rem; }
  .resources-trust { padding: 4.5rem 1.5rem; }
}

@media (max-width: 640px) {
  /* Filter pills scroll horizontally instead of wrapping (lessons.md UX) */
  .filter-pills {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .filter-pills::-webkit-scrollbar { display: none; }

  .resources-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 8.2 — Commit**

```bash
git add src/app/resources/resources.css
git commit -m "feat(resources): add Resources page stylesheet"
```

---

## Task 9 — Nav Update: SiteNav.tsx (Only existing file modified)

**Files:**
- Modify: `apps/web/src/components/SiteNav.tsx` — lines 15–21 only

⚠️ This is the ONLY modification to existing code. Touch nothing else in this file.

- [ ] **Step 9.1 — Add Resources to NAV_LINKS**

Open `apps/web/src/components/SiteNav.tsx`. Find this exact block:

```typescript
const NAV_LINKS = [
  { href: "/about",        label: "About"      },
  { href: "/services",     label: "Services"   },
  { href: "/visas",        label: "Visas"      },
  { href: "/assessment",   label: "Assessment" },
  { href: "/contact",      label: "Contact"    },
];
```

Replace with:

```typescript
const NAV_LINKS = [
  { href: "/about",        label: "About"      },
  { href: "/services",     label: "Services"   },
  { href: "/visas",        label: "Visas"      },
  { href: "/resources",    label: "Resources"  },
  { href: "/assessment",   label: "Assessment" },
  { href: "/contact",      label: "Contact"    },
];
```

- [ ] **Step 9.2 — Verify the diff is exactly one line added**

```bash
git diff src/components/SiteNav.tsx
```

Expected: only `+  { href: "/resources",    label: "Resources"  },` added. If the diff shows anything else, revert and repeat Step 9.1.

- [ ] **Step 9.3 — Commit**

```bash
git add src/components/SiteNav.tsx
git commit -m "feat(resources): add Resources link to site navigation"
```

---

## Task 10 — Downloads Directory

**Files:**
- Create: `apps/web/public/downloads/README.md`

- [ ] **Step 10.1 — Create the directory placeholder**

```markdown
# downloads/

This directory holds the PDF files served by `/api/resources/download/[id]`.

Each file corresponds to a `fileName` value in `src/lib/resources.json`.

## Adding a new resource file

1. Add the PDF here with the exact `fileName` from `resources.json`.
2. The download API will serve it automatically — no code changes needed.

## Current expected files

- `ee-document-checklist.pdf`
- `ielts-clb-crs-cheatsheet.pdf`
- `ita-to-pr-roadmap.pdf`

Until the actual PDFs are uploaded, the download route returns HTTP 503
("File not available yet") — the button still renders but shows a browser error
on click. This is intentional: the page is live, the PDFs are populated separately.
```

- [ ] **Step 10.2 — Commit**

```bash
git add public/downloads/README.md
git commit -m "chore(resources): add downloads directory placeholder"
```

---

## Task 11 — Type-Check and Full Test Run

- [ ] **Step 11.1 — Run TypeScript type-check**

```bash
cd apps/web
npm run typecheck
```

Expected: no errors. If errors appear, they will be in the new files only — fix before proceeding.

- [ ] **Step 11.2 — Run full test suite**

```bash
npm test
```

Expected: all tests pass, including the new `resources.test.ts` suite (10 tests).

---

## Task 12 — Verification (Prashant Proof)

The app must be running locally before these steps. Start it with:

```bash
cd apps/web
npm run dev
```

- [ ] **Step 12.1 — Resources page loads**

Go to `http://localhost:3000/resources`. Confirm:
- Page loads with no console errors
- Hero section shows "Everything You Need. Nothing You Don't."
- Free Resources section shows 3 cards
- Premium Resources section shows 2 cards on an amber-tinted background
- Trust close section at the bottom shows dark (Prussian) background

- [ ] **Step 12.2 — Nav link appears and activates**

- The nav bar shows "Resources" between Visas and Assessment
- Clicking it goes to `/resources` (or if already there, stays)
- The "Resources" link highlights (active state) when on that page
- Check mobile: hamburger menu also shows the Resources link

- [ ] **Step 12.3 — Filter pills work**

- Click "Checklists" — only the Express Entry Checklist card shows
- Click "Timelines & Roadmaps" — only the Roadmap card shows
- Click "Guides" — no cards show (empty state text appears)
- Click "All" — all 3 free resource cards return

- [ ] **Step 12.4 — Brand audit (lessons.md #4)**

Check at 1280px, 768px (tablet), and 375px (mobile):
- No text below 0.75rem font-size in resources.css (scan visually)
- Eyebrow "Resource Library" in hero is saffron
- Eyebrow "The Standard" in trust section is saffron
- Hamburger shows on tablet (768px)
- Filter pills scroll horizontally at 375px

- [ ] **Step 12.5 — Final commit and push (when Prashant approves)**

```bash
cd apps/web
git log --oneline -8   # Review all commits from this session
# Prashant reviews, then:
git push origin main
```

---

## Out of Scope

- Paddle live payment integration — separate session, Halt-and-Ask required
- Actual PDF content files — created by Prashant separately and dropped in `public/downloads/`
- Blog / articles — separate feature
- Glossary — separate feature
- Download analytics dashboard — log to stdout at launch, dashboard later

---

*Plan written: 2026-05-24 · Spec: docs/superpowers/specs/2026-05-24-resources-page-design.md*
