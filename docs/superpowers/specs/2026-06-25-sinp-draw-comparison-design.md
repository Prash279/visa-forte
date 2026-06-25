# SINP Draw Comparison — Design Spec

**Date:** 2026-06-25
**Author:** Claude Code (Senior Technical Partner) · approved by Prash
**Status:** Approved — implementation in progress
**Branch:** `feat/sinp-draw-comparison`

---

## Executive Summary

CanVisa Pro already scores an applicant on the SINP International Skilled Worker
points grid (`sinp-points.ts`), but it tells the applicant nothing about whether
that score would actually have survived a recent SINP Expression-of-Interest (EOI)
draw. This feature compares the applicant's standing against the **last 5 SINP EOI
draw cutoffs**, per sub-category, and reports a deterministic competitiveness verdict
per draw — never a probability.

## Problem & Constraints

Three traps the design must avoid:

1. **The data is not in the repo and cannot be recalled from memory.** SINP draw
   cutoffs are published on saskatchewan.ca (provincial — *not* canada.ca), as a
   periodically-updated "Expression of Interest (EOI) Selection Results" PDF
   (Publications Centre product 102708, served from `pubsaskdev.blob.core.windows.net`).
   Per the Anti-Hallucination Gate, every cutoff written into the data file must be
   transcribed from that PDF in-session and cross-checked, never typed from training data.

2. **Comparing the wrong number understates every applicant.** A SINP draw cutoff is
   scored against the *full* grid (Factor I + Factor II). Our engine computes only
   Factor I; Factor II (Saskatchewan connection) is an unknown in `[0, 30]`. Comparing
   Factor-I-only against a cutoff would systematically understate standing.

3. **"Chance" is a scope/accuracy landmine.** A score above a past cutoff does not
   guarantee an invitation, and stating a percentage strays toward regulated advice.
   Output is framed as *standing against historical cutoffs*, never a probability.

## Chosen Approach — The Honest Band

Because Factor II is unknown in `[0, 30]`, the applicant's true grid total sits in a
range `[FactorI, FactorI + 30]`. Compared against each draw's `cutoffScore`:

| Condition | Verdict |
|---|---|
| `FactorI >= cutoff` | **clears** — above the cutoff regardless of SK connection |
| `FactorI + 30 < cutoff` | **out-of-range** — cannot clear even with a maxed connection |
| otherwise (cutoff inside band) | **conditional** — outcome hinges on the SK connection (Factor II) |

No probability. No new applicant inputs required for the MVP. Mirrors the "to-confirm"
honesty already present in `SinpCard`.

## Data Source & Pipeline (verified 2026-06-25)

- **Product page:** `https://publications.saskatchewan.ca/#/products/102708`
- **Document:** "Expression of Interest (EOI) Selection Results" PDF, served from
  `pubsaskdev.blob.core.windows.net/pubsask-prod/<id>/...`. The blob is *not*
  bot-protected (saskatchewan.ca HTML pages return 403 to plain fetches; the blob does not).
- **Confirmed columns** (from the Feb-2021 archived table, structure unchanged):
  `Date of Selection · Category · Score of Lowest-Scoring Candidate · Candidates Invited to apply`.
  `Category` values seen: *Express Entry*, *Occupation In-Demand* (plus a newer
  *International Healthcare Worker* pool).
- **Extraction:** download blob PDF → `markitdown` → parse rows. Proven this session.
- **Current status:** "no scheduled EOI draws at this time" — the last 5 are historical.

## Architecture — 5 Isolated Units

1. **`apps/web/src/lib/sinp-draw-history.json`**
   ```jsonc
   {
     "source": "saskatchewan.ca — SINP EOI Selection Results",
     "sourceUrl": "https://publications.saskatchewan.ca/#/products/102708",
     "documentUrl": "<resolved current blob PDF URL>",
     "lastUpdated": "YYYY-MM-DD",
     "draws": [
       { "date": "YYYY-MM-DD", "subCategory": "Express Entry", "cutoffScore": 0, "invitationsIssued": 0 }
     ]
   }
   ```
   Each `cutoffScore` cross-checked against the PDF before commit.

2. **`compareSinpToDraws(sinp, draws)`** — pure function (in `sinp-points.ts` or a
   sibling module), own `.test.ts` (TDD, mirrors `sinp-points.test.ts`). Returns, per
   draw, the band verdict (`clears` | `conditional` | `out-of-range`) plus the band
   bounds and the cutoff. Selects the applicant's eligible sub-category(ies) so the
   comparison uses the right cutoffs. A draw missing a usable sub-category match is
   surfaced as `to-confirm`, never silently scored.

3. **`SinpCard` extension** in `apps/web/src/app/admin/canvisa-pro/PnpReport.tsx` — a
   "Standing vs last 5 draws" sub-section: one row per draw (date · sub-category ·
   cutoff · verdict chip) plus the band visual against the cutoff line. Mobile-first,
   reusing the `pnp-sinp-*` CSS idiom; breakpoints verified at 375 → 768 → 1280.

4. **PPTX / MARP export parity** — `pnp-pptx.ts` and `pnp-marp.ts` render the same band
   table so the client deck matches the on-screen report.

5. **Disclaimer reinforcement** — band framed as standing against historical cutoffs;
   `lastUpdated` staleness surfaced in the UI; standard IRCC/SINP disclaimer carried through.

## Testing

- `compareSinpToDraws` unit tests: clears / conditional / out-of-range boundaries,
  empty draws, sub-category with no match, FactorI exactly == cutoff, FactorI+30 exactly == cutoff.
- Every `cutoffScore` derived from the saskatchewan.ca PDF, not training data.
- Prashant Proof: open the admin CanVisa Pro tool, run a Saskatchewan-eligible profile,
  confirm the "Standing vs last 5 draws" section renders with correct verdicts.

## Out of Scope (YAGNI)

- Capturing real Factor II inputs to collapse the band to a point (possible later enhancement).
- Probability / percentage estimates (explicitly rejected).
- Non-SINP provincial draws.

## Caveats

SINP draw activity is intermittent and sub-category-variable; a band that clears a past
cutoff is not a guarantee of an invitation. Cutoffs change without notice — the data
file's `lastUpdated` is the source of truth for freshness and must be refreshed from
product 102708 whenever a new selection is published.

---

## Revision — 2026-06-26: pivot to sector-based selection

After review, the draw comparison was demoted in favour of the SINP **2026 sector-based
model**, which is how Saskatchewan now selects (the EOI points-draw system is dormant —
last draw 2024-09-12). All facts verified against saskatchewan.ca in-session.

**Verified findings.** The pause ended 27 March 2025; the program is now sector-based
(≈4,761 allocation). Priority sectors (Healthcare, Agriculture, Skilled Trades, Energy,
Mining, Manufacturing, Technology) get ≥50% of allocation and continuous intake / overseas
application. Capped sectors are 25% — Food Service & Accommodation 15% (714), Trucking 5%
(238), Retail Trade 5% (238) — run through six 2026 intake windows via the Employer
Position Assessment (EPA, formerly the JAF). **No public NOC→sector list exists**: sector
membership is set by the employer at EPA time, so it cannot be auto-classified per NOC.

**What is NOC-classifiable (and verified):** the **Excluded Occupation List** (~145 NOCs,
*Updated 2024-05-01*) plus the rule that **TEER 4/5 are ineligible** for the points-based
OID/EE sub-categories. This determines whether the points/draw path is even open.

**New architecture (additive to the units above):**
- `sinp-2026.json` — verified Excluded Occupation List + sector-model framework.
- `classifySinpPathway(noc, teer)` — pure scorer + `sinp-pathway.test.ts`. Returns
  `oid-ee-eligible` / `excluded-occupation` / `teer-ineligible` (+ `pointsPathOpen`).
- `SinpPathwayCard` — new **primary** SINP element: pathway status + the priority/capped
  sector model as context. The points card is kept; the draw comparison is demoted into a
  collapsed `<details>` under a "points-draw system dormant" banner.
- PPTX: the SINP slide now leads with the 2026 pathway/sector model; draws are a reference line.

**Honest limitation:** the three capped sectors cannot be mapped to NOCs authoritatively
(employer-determined), so the sector model is presented as context, not auto-classified.
The Excluded-list + TEER classification is exact.
