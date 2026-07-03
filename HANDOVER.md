# Session Handoff
**Date:** 2026-07-04
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
Push the age alert root-cause fix to production → get Prash visual confirmation → get RT-3 plan approval → begin RT-3 Step 0.

---

## What happened this session

| Action | Status |
|---|---|
| HANDOVER.md date confirmed (was 2026-07-03 — yesterday, treated as history) | ✅ |
| tasks/lessons.md read | ✅ |
| Root cause of persistent age alert spacing bug identified | ✅ |
| New fix implemented and committed (commit `3720df8`) | ✅ |
| Prash visual confirmation of equal spacing | ❌ NOT YET — needs push + deploy |

---

## Root cause of the NEW fix (commit 3720df8)

**Why the previous fix (min-height: 81.34px on toolbar) didn't work:**

The toolbar (`<div class="asx-toolbar">`) sits at document y=0 with `position: static`. The fixed nav is also at y=0. At scroll=0, the toolbar is completely hidden behind the nav — both elements occupy the same y-space. The `min-height: 81.34px` made the toolbar the same height as the nav so `.asx-result` started at y=81.34px, but this was fragile: the nav height is 81.4px (0.06px more), and when the page arrived from a scrolled-form state (nav in `.scrolled` = 67px), the calculation broke. The previous fix was a symptom patch on the wrong element.

**What the new fix does:**

The canonical pattern for fixed navs is `padding-top: [nav-height]` on the content wrapper. This guarantees content starts BELOW the nav — no pixel-matching needed. Changes:

1. `globals.css`: Added `--nav-h: 81.4px` to `:root` (desktop) and `--nav-h: 69.8px` at the `@media (max-width: 860px)` breakpoint (mobile nav is shorter: logo 40px + 2×0.9rem padding + 1px border = 69.8px).

2. `assessment.css`: Removed `min-height: 81.34px` from `.asx-toolbar`. Added `.asx-result-view { padding-top: var(--nav-h); }`.

3. `AssessmentTool.tsx`: Changed result view wrapper from `className="asx-wrap"` to `className="asx-wrap asx-result-view"` (form view wrapper is unchanged).

**Result:**
- Wrapper has `padding-top: 81.4px` (desktop) or `69.8px` (mobile)
- Toolbar appears below the nav — buttons are now VISIBLE to the user (they were always hidden before)
- `.asx-result` (pearl background) starts after the toolbar
- Age alert card has `margin: 1.75rem auto` = 28px pearl above and below
- Equal spacing — guaranteed, not pixel-matched

---

## Awaiting: push to deploy

The fix is committed locally on `main` (commit `3720df8`). It has NOT been pushed to origin.

**To deploy:** `git push origin main` — Vercel auto-deploys.

**Prashant Proof (age alert spacing):**
1. Go to **visaforte.com/assessment**
2. Submit a profile with a DOB that triggers the age alert (e.g. DOB: 1990-08-01 — turning 36 in ~1 month)
3. Confirm:
   - The saffron age alert card has **equal pearl space above AND below**
   - The toolbar (← Edit Profile / New Assessment / Save / Print) is **visible** below the nav — it was previously invisible (hidden behind the nav)
4. If confirmed → RT-2 is fully and finally done

---

## RT-3 Plan — written, awaiting Prash approval

The full step plan for RT-3 (60-Day ITA Countdown Planner) is in `tasks/todo.md` under `### TASK RT-3`.

**Prash has not yet approved the RT-3 plan.** No code should be written until approval is given.

Key decisions locked:
- No PDF library: HTML email (Resend) + `@media print` + `window.print()`
- Token system: UUID in `itaCountdownOrders` DB table, result at `/tools/ita-countdown/result?token=<uuid>`
- Razorpay gated: ₹2,997 standard / ₹3,997 premium
- Premium tier triggers manual Resend notification to prashant@visaforte.com for doc review booking

---

## Immediate Next Steps

1. **Push to deploy:** `git push origin main` (after confirming `gh auth status` shows Prash279 and `vercel whoami` shows prash279)
2. **Prashant Proof:** Prash visits visaforte.com/assessment, submits with age-alert DOB, confirms equal spacing above/below. If confirmed → RT-2 done.
3. **RT-3 approval:** Prash reads `### TASK RT-3` in `tasks/todo.md` and approves or gives feedback.
4. Only after approval: RT-3 Step 0 (commit plan doc), then Step 1 (logic function).
