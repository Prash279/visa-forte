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
RT-1 (CanVisa Pro Lite at `/tools/canvisa`) is fully built and committed. The next session's
job is to deploy, verify in the browser (Prashant Proof), then plan and build RT-2: CRS
What-If Modeller at `/tools/crs-modeller`.

---

## What Was Done This Session

### 1. Schema + migration committed and applied
- `feat(db)` commit `75e9da5`: three new tables — `tool_events`, `settings`, `draw_alert_subscribers`
- Migration 0019 applied to live Supabase DB by Prash (`npx drizzle-kit migrate` — additive only)

### 2. RT-1 fully built — commit `cbfa558`
All Steps 2–10 complete in a single commit:

- **`POST /api/tools/lead-capture`** — Zod-validated; upserts `draw_alert_subscribers` (if `wantsDrawAlert`);
  inserts `tool_events` row; sends Resend email to subscriber (score + weaknesses + pathway) and
  admin notification to prashant@visaforte.com
- **`POST /api/tools/draw-alert`** — upserts subscriber on email conflict; inserts event row
- **`apps/web/src/lib/canvisa-lite-logic.ts`** — `getWeaknesses`, `getEligibleDrawCategories`,
  `getBestPathway` — pure functions, fully tested
- **`apps/web/src/app/tools/canvisa/CanVisaLite.tsx`** — full CRS form (DOB, education,
  language L/R/W/S, second language, CWE, FWE, spouse section, PNP, sibling, Canadian education,
  family size, funds); result view with score hero card, 3 weakness chips, best pathway card,
  handoff copy, lead capture block (2 pre-checked boxes), legal disclaimer
- **`apps/web/src/app/tools/canvisa/canvisa-lite.css`** — mobile-first 375→768→1280px
- **`apps/web/src/app/tools/canvisa/page.tsx`** — server component, SEO metadata
- **`apps/web/src/app/resources/page.tsx`** — Tools section added above Free Resources:
  CanVisa Pro Lite hero card + 2×2 coming-soon grid (Modeller / Countdown / NOC Verifier / Refusal)
- **`apps/web/src/app/resources/resources.css`** — tools section styles (mobile-first)
- **`apps/web/src/components/SiteNav.tsx`** — "Tools" link → `/resources#tools`
- **Tests**: `canvisa-lite-logic.test.ts` (3 tests) + `lead-capture/route.test.ts` (4 tests)
- **Gates**: `tsc --noEmit` clean · 328/328 vitest green

### 3. NOT done this session
- No `git push` / Vercel deploy (Prash has not explicitly requested a push)
- Prashant Proof not yet completed (awaiting deploy)

---

## ⚠ Required Before Next Session Can Start

**Prash must deploy and verify:**

1. **Deploy** (from repo root — never from inside `apps/web`):
   ```
   git push origin main
   ```
   Or: `vercel deploy --prod` from `c:\Users\hp\visaforte`

2. **Prashant Proof** (once live):
   - Go to visaforte.com/tools/canvisa (no login) → fill in: age 34, Master's + ECA,
     IELTS 7/7/7.5/7, 2yr Canadian WE TEER 1, single, family 1
   - Click "Check My Score →" → confirm score card + 3 weakness chips + pathway card appear
   - Enter name + email, leave both checkboxes ticked, click "Send My Results →" → "Check your inbox ✓"
   - Check inbox — confirm CRS score email arrives
   - Check prashant@visaforte.com — confirm admin lead notification arrived
   - Go to visaforte.com/resources → confirm Tools section appears above Free Resources
   - On mobile (375px) → confirm score card and chips are readable and not clipped

---

## Immediate Next Steps (after Prashant Proof passes)

**RT-2: CRS What-If Modeller — `/tools/crs-modeller`**

The plan for RT-2 has NOT been written yet. From `tasks/todo.md` (line ~2147):
> "Status: 🔲 NOT STARTED — step plan written when RT-1 is complete"
> "What this delivers: An interactive score simulator. The applicant starts from their base CRS
> score (entered or imported from RT-1 handoff) and adjusts sliders/dropdowns for language band,
> education, Canadian WE to see the resulting score change in real-time. Shows how many points
> each lever is worth and which combination clears the most recent draw cutoff. Free, ungated."

**The next session's Task 0**: write the RT-2 step plan in `tasks/todo.md`, get Prash approval,
then build. Do NOT start any RT-2 code before the step plan is committed.

---

## Key Code Locations

```
# RT-1 deliverables
apps/web/src/app/tools/canvisa/          ← CanVisaLite.tsx, canvisa-lite.css, page.tsx
apps/web/src/app/api/tools/lead-capture/ ← route.ts, route.test.ts
apps/web/src/app/api/tools/draw-alert/   ← route.ts
apps/web/src/lib/canvisa-lite-logic.ts   ← weakness + pathway logic (tested)
apps/web/src/lib/canvisa-lite-logic.test.ts

# Resources page (updated)
apps/web/src/app/resources/page.tsx
apps/web/src/app/resources/resources.css

# Nav (updated)
apps/web/src/components/SiteNav.tsx

# Plan for RT-2 (not yet written)
tasks/todo.md  → "TASK RT-2: CRS What-If Modeller"

# CRS engine (shared — do not modify)
apps/web/src/lib/crs-calculator.ts
apps/web/src/lib/crs-rules.json

# DB schema
apps/web/drizzle/schema.ts               ← tool_events, settings, drawAlertSubscribers all live here
```

---

## Decisions Locked (do not re-ask)

| Decision | Detail |
|---|---|
| RT-1 result view | CRS score + top 3 weakness chips + single best pathway card |
| Withheld from RT-1 | Multi-pathway table, full action plan, MARP/PPTX download, PNP section |
| Lead capture | Post-result, ungated. Name + Email + two pre-checked boxes |
| Email delivery | Plain-text Resend email (no PDF on Day 1) |
| Draw alert | Upserts to `draw_alert_subscribers` (unique on email) |
| Tools route | `/tools/canvisa` — dedicated route (not under /assessment) |
| Resources page | CanVisa Pro Lite hero card + 2×2 tool grid above existing PDFs |
| Nav link | "Tools" → `/resources#tools` |
| RT-2 plan | Written in tasks/todo.md BEFORE any RT-2 code |
