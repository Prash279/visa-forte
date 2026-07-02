# Session Handoff
**Date:** 2026-07-02
**Branch:** main
**Mode:** chain

---

## ⚠ Trust check — read before acting on anything below
This handover is a snapshot taken on the **Date** above. At the start of a session, compare
that date to today. If it is not the current session's date, treat everything below as
history: re-verify every fact from source and do NOT act on its "Immediate Next Steps".
A handover is only authoritative on the day it was written.

---

## Goal
Write and approve the Resources Tools Phase 1 plan, then build RT-1: CanVisa Pro lite at
`/tools/canvisa`. This session wrote the plan to `tasks/todo.md` under the section
"Resources Tools — Phase 1". No code was written. The next session's job is to get Prash's
approval on the plan, commit it (Task 0 rule), then build RT-1 step by step.

---

## What Was Done This Session

### 1. Reviewed uncommitted changes (git diff on two files)
Both changes are safe, self-contained, and do NOT touch the CRS engine or PNP eligibility.

**`apps/web/src/app/admin/canvisa-pro/CanVisaProTool.tsx`**
PPTX download fix in `downloadPnpPptx()`:
- Stamps correct MIME type (`application/vnd.openxmlformats...`) on the raw blob from `buildPnpPptxBlob`
- Appends anchor to `document.body` before `.click()` (required by some browsers)
- Defers `URL.revokeObjectURL` by 100ms to prevent Firefox `blob:null` race

**`apps/web/src/app/admin/canvisa-pro/PnpReport.tsx`**
One-line display fix: "Stream data verified" now shows `reportGenerated` (the report date) instead of `pnp.dataVersion` (which was undefined for some profiles).

**Neither file has been committed.** They were pre-existing at session start.

### 2. Wrote Resources Tools — Phase 1 plan to `tasks/todo.md`
New section appended at the end of the file: `## Resources Tools — Phase 1`.

Covers all five tools with what-it-delivers, and a full 10-step build plan for RT-1.
RT-2 through RT-5 have their what-it-delivers and a "step plan written when predecessor ships" placeholder.

**Plan is awaiting Prash approval. Zero code written.**

---

## Decisions Made (locked — do not re-ask)

All product decisions were locked in the previous session's grilling (see prior handover entry
in git history). The plan in `tasks/todo.md` faithfully implements those decisions. Key ones:

| Decision | Detail |
|---|---|
| RT-1 result view | CRS score + top 3 weakness chips + single best pathway card |
| Withheld from RT-1 | Multi-pathway table, full action plan, MARP/PPTX download |
| Lead capture | Post-result, ungated. Name + Email + two pre-checked boxes |
| Email delivery | Plain-text Resend email for now (PDF delivery is a future enhancement, not Day 1) |
| Draw alert | Upserts to `draw_alert_subscribers` table (unique on email) |
| DB tables (ship with RT-1) | `tool_events`, `settings`, `draw_alert_subscribers` (migration 0014) |
| Resources page update | CanVisa Pro Lite hero card + 2×2 tool grid above existing PDFs |

---

## Immediate Next Steps

**1. Prash approves the plan in `tasks/todo.md`** (section "Resources Tools — Phase 1")
Read it at the bottom of the file. If changes needed, edit before approving.

**2. Step 0 — commit the plan before any code (Task 0 / lessons.md Planning L1)**
```
git add tasks/todo.md HANDOVER.md
git commit -m "docs: add resources tools phase 1 plan"
```

**3. Start RT-1 build — follow the step plan in `tasks/todo.md` exactly:**
- Step 1: DB — add `toolEvents`, `settings`, `drawAlertSubscribers` to `schema.ts` → `drizzle-kit generate` → `drizzle-kit migrate`
- Step 2: API `POST /api/tools/lead-capture`
- Step 3: API `POST /api/tools/draw-alert`
- Step 4: `CanVisaLite.tsx` client component
- Step 5: `canvisa-lite.css` (mobile-first, Visa Forte brand)
- Step 6: `apps/web/src/app/tools/canvisa/page.tsx`
- Step 7: Resources page Tools section
- Step 8: Nav "Tools" link
- Step 9: Tests
- Step 10: TypeScript check + commit

**4. ⚠ Commit the two uncommitted admin files at the same time or before Step 1:**
```
git add apps/web/src/app/admin/canvisa-pro/CanVisaProTool.tsx
git add apps/web/src/app/admin/canvisa-pro/PnpReport.tsx
git commit -m "fix(canvisa-pro): pptx mime type + deferred revoke + stream data date display"
```
These are clean fixes that should be in git before building on top of them.

---

## Key Code Locations

```
# Plan (read this first)
tasks/todo.md  — "Resources Tools — Phase 1" section at the bottom

# CRS engine (import — do not copy)
apps/web/src/lib/crs-calculator.ts

# PNP eligibility engine (import — do not copy)
apps/web/src/lib/pnp-eligibility.ts

# Live draw data (cron-updated daily)
apps/web/src/lib/crs-draw-history.json

# Public assessment tool (reference for form shape and result helpers)
apps/web/src/app/assessment/AssessmentTool.tsx
apps/web/src/app/assessment/assessment.css

# Internal admin tool (reference — do not copy wholesale)
apps/web/src/app/admin/canvisa-pro/CanVisaProTool.tsx
apps/web/src/app/admin/canvisa-pro/PnpReport.tsx

# DB schema (add new tables here)
apps/web/drizzle/schema.ts

# Razorpay payment routes (reuse for RT-3 and RT-5 premium tools)
apps/web/src/app/api/payment/create-order/route.ts
apps/web/src/app/api/payment/verify/route.ts

# Resources page (add Tools section here)
apps/web/src/app/resources/page.tsx
apps/web/src/app/resources/resources.css
apps/web/src/lib/resources.json

# Nav (add Tools link here)
apps/web/src/components/SiteNav.tsx  (or NavBar.tsx — grep for the nav component)
```

---

## What Is NOT Done

- Plan not yet approved by Prash
- The two uncommitted admin files have not been committed
- Zero RT-1 code written
- `tool_events`, `settings`, `draw_alert_subscribers` tables do not exist yet
- `/tools/canvisa` route does not exist yet
- Resources page Tools section does not exist yet
