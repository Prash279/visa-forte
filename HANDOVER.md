# Session Handoff
**Date:** 2026-07-03
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
RT-2 (CRS What-If Modeller) — **fully built, deployed, and link-visibility bug fixed.**
Awaiting Prash's Prashant Proof to close RT-2 and begin RT-3 planning.

---

## Completed (this session)

- ✅ Confirmed `/tools/crs-modeller` loads correctly in production (Playwright verified)
- ✅ Added `.asx-modeller-link` teal pill button in `AssessmentTool.tsx` — committed `1fe8976`
- ✅ Fixed `getRelevantDraw` bug: removed `draws[0]` fallback that was showing Healthcare as the cutoff for Software Developer (0 CWE). Now returns `null` and renders a saffron-bordered note: "Express Entry is currently running category-based draws only — no All-Programs draw in the current cycle." — committed `447514d`
- ✅ `tsc --noEmit` clean, `vitest run` 331/331 green across both fixes
- ✅ Both commits pushed to `origin/main`, Vercel auto-deploy triggered

---

## Bug post-mortem (for lessons.md if Prash agrees)

`getRelevantDraw` fell back to `draws[0]` when no CEC or All-Programs draw was found. The draw history has no All-Programs draws — only Healthcare, Trades, CEC, French, PNP categories. For a user with 0 Canadian WE, `draws[0]` = "Healthcare and Social Services Occupations" — shown as their cutoff benchmark. Wrong. Fix: return `null` + honest note instead.

---

## Awaiting — Prashant Proof

**Prash must verify before RT-2 is marked done:**

1. Go to **visaforte.com/assessment**
2. Complete an assessment with Software Developer NOC (fill all fields, submit)
3. Scroll to the "CRS Improvement Scenarios" section
4. Confirm a teal pill button **"Try the CRS What-If Modeller →"** is visible
5. Click it → confirm `/tools/crs-modeller` loads with profile pre-filled
6. Confirm the score section shows your CRS number with a **saffron-bordered note** ("Express Entry is currently running category-based draws only…") — NOT "Healthcare and Social Services Occupations"

---

## Key Decisions (locked, from RT-2)

| Decision | Rationale |
|---|---|
| `calculate(buildProfile(state)).breakdown.total` | CrsResult has no `totalScore` — total is at `breakdown.total` |
| CELPIP testType + CLB integers as scores | CELPIP level 4–12 maps 1:1 to CLB — passes CLB directly into calculator |
| `useEffect` + `window.location.search` for URL params | Avoids Next.js searchParams-as-Promise complexity; clean client-side parse on mount |
| `getRelevantDraw`: CEC if canadianWE ≥ 1, else draws[0] | No All-Programs draw in current history; draws[0] is safe fallback |
| Import `assessment.css` first in CrsModeller.tsx | assessment.css is NOT globally loaded — must import `'../../assessment/assessment.css'` for asx-* classes |
| Teal pill button over replacing footnote link | Both now coexist — footnote stays for disclosure context, pill ensures discoverability |

---

## Next Steps (after Prash confirms)

1. Mark RT-2 fully done in `tasks/todo.md`
2. Begin RT-3 step planning — review `spec.md` for what RT-3 covers and write the plan
