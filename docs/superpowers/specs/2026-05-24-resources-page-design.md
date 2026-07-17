# Resources Page — Design Specification
**Date:** 2026-05-24
**Product:** Visa Forte — visaforte.com
**Author:** Brainstormed with Prashant Thirthingoth
**Status:** ⚠️ **PARTIALLY SUPERSEDED — 2026-07-17.** Historical record; preserved as written.

> **Paddle is not the payment rail.** This spec's "Paddle Integration (Phase 2)" section was never built and never will be. Razorpay is the only rail (decision 2026-07-17: India-first; revisit Stripe post-registration once revenue justifies a second rail). The `paddleProductId` field described here is vestigial and is replaced by a `pricingTier` key indexing into `PRICING` (`lib/pricing.ts`).
>
> The page layout, card design, filter, and download-route sections of this spec remain accurate and were built as described. For current premium checkout and delivery, see the live pattern in `api/payment/verify/route.ts` and `api/tools/ita-countdown/`, and the current plan: *Resources Page - Plan.md* (Rev 3).

---

## Context

Visa Forte has five public pages (About, Services, Visas, Assessment, Contact) but no dedicated resource library. Visitors and clients have no single place to find checklists, guides, templates, or reference materials. Competitors either don't have this content or produce low-quality versions of it.

The Resources page positions Prashant as the most prepared and transparent practitioner in his space. Free resources are of such quality they convert visitors into paying clients; premium resources are priced to reflect genuine expertise and monetise that expertise passively.

---

## Goals

1. **Lead magnet** — Free resources attract organic traffic and convert visitors into booked consultations.
2. **Client education hub** — Existing clients find reference materials without emailing basic questions.
3. **SEO & authority** — High-quality content ranks on Google and builds Prashant's expert reputation.
4. **Passive revenue** — Paid resources generate income independent of 1:1 consultation time.

---

## Route & Navigation

- **URL:** `/resources`
- **Nav:** Added as the 6th link in `SiteNav.tsx`, positioned between Visas and Assessment.
- **Final nav order:** About · Services · Visas · **Resources** · Assessment · Contact

---

## Page Architecture

```
<main class="resources-main">
  ├── <section class="resources-hero">          ← Dark Prussian, server-rendered
  ├── <section class="resources-free">          ← Free grid + filter (client component)
  ├── <section class="resources-premium">       ← Premium grid (server-rendered)
  └── <section class="resources-trust">         ← Trust close, server-rendered
</main>
```

**File structure:**
```
apps/web/src/app/resources/
├── page.tsx               ← Server component: metadata, data loading, layout shell
├── resources.css          ← All page-specific styles
└── FreeResourcesGrid.tsx  ← "use client" — filter state and filtered grid

apps/web/src/components/
└── ResourceCard.tsx       ← Shared card UI, no state (used in both sections)

apps/web/src/lib/
└── resources.json         ← Data source for all resources (free + premium)

apps/web/src/app/api/resources/download/[id]/
└── route.ts               ← GET handler: resolves file, serves it, logs download
```

---

## Data Model

**`apps/web/src/lib/resources.json`**

```typescript
// Type definitions (to be codified in a types file)
type ResourceType = "guide" | "checklist" | "cheatsheet" | "sample" | "letter" | "timeline" | "comparison";

type Category =
  | "Express Entry"
  | "PNP"
  | "Spousal Sponsorship"
  | "Language Tests"
  | "Education Credential Assessment"
  | "Work Experience"
  | "Financial Documents"
  | "Police Certificates"
  | "Medical Examination"
  | "Post-ITA";

interface FreeResource {
  id: string;           // kebab-case, stable, used in download URL
  title: string;
  type: ResourceType;
  category: Category;
  description: string;  // 2-3 sentences answering why/when/how/what
  fileName: string;     // file in public/downloads/  e.g. "ee-document-checklist.pdf"
  featured: boolean;    // featured items render first in the grid
}

interface PremiumResource {
  id: string;
  title: string;
  type: ResourceType;
  category: Category;
  description: string;
  priceINR: number;       // e.g. 797, 1997, 3997
  priceUSD: number;       // e.g. 14, 35, 69 — PPP-adjusted, not a direct FX conversion
  paddleProductId: string; // empty string until Paddle Phase 2 is implemented
  featured: boolean;
}
```

**JSON structure:**
```json
{
  "free": [ /* FreeResource[] */ ],
  "premium": [ /* PremiumResource[] */ ]
}
```

---

## Section 1 — Hero

| Element | Value |
|---|---|
| Background | Prussian blue (`var(--prussian)`) |
| Eyebrow | `RESOURCE LIBRARY` (saffron) |
| Headline | "Everything You Need. Nothing You Don't." |
| Lead | "Application guides, checklists, cheat sheets, and sample formats — built for Express Entry applicants who want to get it right the first time. No fluff. No filler. Just what works." |
| Pattern | Matches existing hero pattern: `.r` scroll-reveal, `.d1/.d2` delay classes |

---

## Section 2 — Free Resources

**Eyebrow:** `FREE RESOURCES`
**Headline:** `Start Here. No Email Required.`

### Filter Pills

Interactive pill bar — client-side, no page reload. One pill active at a time. Default: `All`.

```
All · Application Guides · Checklists · Cheat Sheets · Sample Formats ·
Letter Templates · Timelines & Roadmaps · Comparison Tables
```

Pill labels map to `ResourceType` values:
| Pill label | ResourceType filter |
|---|---|
| All | (no filter) |
| Application Guides | `guide` |
| Checklists | `checklist` |
| Cheat Sheets | `cheatsheet` |
| Sample Formats | `sample` |
| Letter Templates | `letter` |
| Timelines & Roadmaps | `timeline` |
| Comparison Tables | `comparison` |

On mobile: pills scroll horizontally with `overflow-x: auto; white-space: nowrap`.

### Resource Cards — Free

3-col desktop · 2-col tablet (≤900px) · 1-col mobile (≤600px)

Each card contains:
1. **Type badge** — coloured pill: `GUIDE` `CHECKLIST` `CHEAT SHEET` `SAMPLE FORMAT` `LETTER` `TIMELINE` `COMPARISON`
2. **Category tag** — small text: e.g. "Express Entry"
3. **Title** — bold, 1-2 lines
4. **Description** — 2-3 sentences
5. **CTA button** — `Download Free →` — calls `/api/resources/download/[id]`

Featured resources (where `featured: true`) render first within each filtered view.

### Download API Route

`GET /api/resources/download/[id]`

- Reads `resources.json`, finds matching `FreeResource` by `id`
- Resolves `fileName` to `public/downloads/[fileName]`
- Returns file with `Content-Disposition: attachment`
- Logs the download (console for now; structured logging later)
- Returns 404 if `id` not found; 500 if file missing

Files live in `apps/web/public/downloads/`. This directory is created as part of implementation. Placeholder files added at launch.

---

## Section 3 — Premium Resources

**Eyebrow:** `PREMIUM RESOURCES`
**Headline:** `Go Deeper. Get It Done Faster.`
**Subhead:** `Detailed formats, worked examples, and annotated walkthroughs built for clients who are actively filing.`

**Visual treatment:** Slightly warm off-white background `#fdf8f0` — added as `--resources-premium-bg` in `resources.css` to signal a different tier without touching globals.css.

### Pricing Tiers

| Resource type | INR price | USD price | PPP note |
|---|---|---|---|
| Cheat sheets & quick refs | ₹797 | $14 | PPP-adjusted ~57:1 vs market 84:1 |
| Checklists & letter templates | ₹1,997 | $35 | Consistent ratio |
| Full guides & worked examples | ₹3,997 | $69 | < 10% of one consultation |
| **Complete Library Bundle** | **₹9,997** | **$169** | Save ₹8,000+ / Save $100+ |

**Pricing psychology applied:**
- All prices use charm-pricing (end in 7 or 9, never round numbers).
- INR prices reflect India PPP — Indian buyers get ~30% real discount vs USD buyers.
- The bundle creates loss aversion: individual sum far exceeds bundle price.
- Free resources on the same page anchor quality upward — paid resources feel like obvious extensions.

### Resource Cards — Premium

Same card structure as free, with two differences:
1. Price badge: `₹1,997` large · `$35 USD` small below it
2. CTA button: `Buy — ₹1,997 →`

**Bundle card:** Full-width or 2-col-spanning card with saffron border + "Best Value" badge.

### Paddle Integration (Phase 2 — Halt-and-Ask)

⚠️ Per CLAUDE.md, Paddle payment processing is a **Halt-and-Ask zone**. The "Buy" CTA is fully specced but will not be wired to Paddle until a dedicated implementation session with explicit approval.

**At launch:** Premium "Buy" buttons display the price but are not yet functional. A small note below the button: `"Payment integration coming soon — contact us to purchase."` with a mailto link.

**Phase 2 scope (separate spec):**
- Paddle.js loaded on the resources page
- `Paddle.Checkout.open({ product: paddleProductId })` on button click
- Webhook at `/api/webhooks/paddle` marks purchase, sends download link via email
- `paddleProductId` in `resources.json` populated from Paddle dashboard

---

## Section 4 — Trust Close

| Element | Value |
|---|---|
| Eyebrow | `THE STANDARD` |
| Headline | "Every resource here was built because a client needed it and nothing good enough existed." |
| Body | "Twenty years of practice. Every checklist, every template, every guide reviewed personally before it goes on this page. If it has our name on it, it works." |
| CTA | `Get Reviewed →` (triggers existing triage mailto, matches nav CTA behaviour) |
| Background | Prussian blue — matches hero, bookends the page |

---

## Seed Content (Launch)

At least 3 free and 2 premium resources must be ready on day one so the page is not empty. These are placeholders in `resources.json` — actual PDF files to be created by Prashant separately.

**Suggested free seeds:**
1. Express Entry Document Checklist (checklist, Express Entry)
2. IELTS → CLB → CRS Conversion Cheat Sheet (cheatsheet, Language Tests)
3. ITA-to-PR Roadmap: 11 Steps from Invite to Landing (timeline, Express Entry)

**Suggested premium seeds:**
1. Letter of Explanation (LOE) Master Template Pack (letter, ₹1,997/$35)
2. Express Entry Application Guide: Pre-Submission Audit (guide, ₹3,997/$69)

---

## SEO Metadata

```typescript
export const metadata: Metadata = {
  title: "Immigration Resources — Visa Forte | Checklists, Guides & Templates",
  description:
    "Free and premium immigration resources for Express Entry, PNP, and spousal sponsorship applicants. Checklists, application guides, cheat sheets, letter templates, and timelines — reviewed personally by Prashant Thirthingoth.",
};
```

---

## Verification (Definition of Done)

1. `/resources` loads with no errors and correct SEO metadata.
2. Filter pills correctly show/hide cards by type. "All" shows everything.
3. `Download Free →` on a free resource triggers a file download (not a 404).
4. Premium cards display correct INR and USD pricing.
5. Premium "Buy" CTA shows the "coming soon" state cleanly — no broken UI.
6. Resources nav link is active/highlighted when on `/resources`.
7. Mobile: filter pills scroll horizontally, cards are single-column, no text below 0.75rem.
8. Tablet (768px): hamburger shows, 2-col card grid, eyebrows are saffron on Prussian sections.
9. Prashant Proof: Go to `/resources`, click a free download button, confirm file downloads. Time: < 60 seconds.

---

## Out of Scope (This Phase)

- Paddle live payment integration (Phase 2 — separate Halt-and-Ask session)
- Email-gated downloads (decided against — no email gate for free resources)
- Blog / articles (separate feature — different content model needed)
- Glossary (separate feature — alphabetical UI, different from resource cards)
- Client portal integration (separate feature)
- Download analytics dashboard (log to console at launch, dashboard later)

---

*Spec approved by Prashant Thirthingoth — 2026-05-24*
