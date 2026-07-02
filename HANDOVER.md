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
RT-2 (CRS What-If Modeller) is **fully built and deployed**. An open bug report from Prash needs diagnosis and fix before RT-3 begins.

---

## Completed (this session)

- ✅ `apps/web/src/app/tools/crs-modeller/CrsModeller.tsx` — written verbatim from handover, committed
- ✅ `apps/web/src/app/tools/crs-modeller/crs-modeller.css` — committed (existed from prior session)
- ✅ `apps/web/src/app/tools/crs-modeller/page.tsx` — committed (existed from prior session)
- ✅ `apps/web/src/app/assessment/AssessmentTool.tsx` — handoff link added at line 1439
- ✅ `apps/web/src/app/resources/page.tsx` — first tools-grid card converted to live link
- ✅ `apps/web/src/lib/crs-modeller.test.ts` — 3 delta assertions
- ✅ `tsc --noEmit` clean, `vitest run` 331/331 green
- ✅ Committed as `163756e` + handover `1a1f643`, pushed to `origin/main`
- ✅ Vercel deployment READY — confirmed via Vercel API (`dpl_BhKqRwfN9vEty5o2zuXL2XJUhU5x`)

---

## Open Issue — Prash Bug Report

**Prash says:** "I completed an assessment but am not able to view the What-if Modeller."

He attached a screenshot showing the full assessment result for Rakesh Sharma (CRS 396, Express Entry Pool ELIGIBLE, 4 CRS improvement scenarios rendered). The screenshot was taken on the live production site after the RT-2 deployment was live.

### Investigation completed this session

1. **Deployment confirmed READY** — latest Vercel deploy has commit `1a1f643` (all RT-2 code).
2. **CrsModeller.tsx confirmed on disk** — Read tool verified file exists and reads correctly.
3. **The "Try the What-If Modeller →" link IS in the rendered HTML** — it's inside the `{result.eligibility.expressEntryPool.eligible && scenarios.length > 0 && ...}` block, which IS rendering (4 scenarios visible in screenshot).
4. **Root cause identified — link is visually buried:**
   ```css
   .asx-scenarios-note {
     font-size: 0.75rem;   /* 12px — very small */
     color: #718096;       /* grey */
   }
   .asx-scenarios-note a { color: var(--teal); }
   ```
   The "Try the What-If Modeller →" link appears as 12px teal text in a grey disclaimer footnote at the bottom of the scenarios card. It is easy to overlook.
5. **Could also be a page load issue** — unable to fully verify in this session because Bash cwd drifted to `apps/web/src/lib` (hook error), blocking further shell commands. Prash may have found the link but hit an error on /tools/crs-modeller itself.

### Two possible root causes (verify first thing next session)

| Cause | Evidence | Fix |
|---|---|---|
| Link too small to see | CSS `0.75rem` footnote styling, Prash said "not able to view" (could mean "can't find") | Add a visible CTA button/pill below the scenarios card pointing to /tools/crs-modeller |
| /tools/crs-modeller page fails on load | Unconfirmed — investigation interrupted | Navigate to visaforte.com/tools/crs-modeller directly and check for errors |

---

## Immediate Next Steps

1. **Navigate to `visaforte.com/tools/crs-modeller` directly** — confirm the page loads without errors.
2. **Make the What-If Modeller link prominent** — the `asx-scenarios-note` is 12px grey footnote text. Add a standalone teal button or pill-link after the scenarios card:
   - Style: match the `asx-cta-btn` or create an `asx-tool-link` pill
   - Text: "Try the CRS What-If Modeller →"
   - Placement: between the scenarios card and the "What Happens Next" CTA card
3. **Run `tsc --noEmit` and `vitest run`** — must stay 331/331
4. **Commit + push** the visibility fix
5. **Ask Prash to re-verify** — Prashant Proof: go to /assessment → complete → see the modeller button → click → confirm /tools/crs-modeller loads with pre-filled values

Then mark RT-2 fully done and begin RT-3 step planning.

---

## Key Decisions (locked)

| Decision | Rationale |
|---|---|
| `calculate(buildProfile(state)).breakdown.total` | CrsResult has no `totalScore` — total is at `breakdown.total` |
| CELPIP testType + CLB integers as scores | CELPIP level 4–12 maps 1:1 to CLB — passes CLB directly into calculator |
| `useEffect` + `window.location.search` for URL params | Avoids Next.js searchParams-as-Promise complexity; clean client-side parse on mount |
| `getRelevantDraw`: CEC if canadianWE ≥ 1, else draws[0] | No All-Programs draw in current history; draws[0] is safe fallback |
| Import `assessment.css` first in CrsModeller.tsx | assessment.css is NOT globally loaded — must import `'../../assessment/assessment.css'` for asx-* classes |

---

## AssessmentTool.tsx — current state of the modeller link (line 1439)

```tsx
<p className="asx-scenarios-note">
  All projections assume current IRCC scoring rules. Verify live draw cutoffs at{' '}
  <a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html"
    target="_blank" rel="noopener noreferrer">canada.ca</a>{' · '}
  <Link href={`/tools/crs-modeller?age=${profile.age}&edu=${profile.education}&spouse=${profile.hasSpouse}&l=${firstClb.listening}&r=${firstClb.reading}&w=${firstClb.writing}&s=${firstClb.speaking}&cwe=${Math.floor(profile.canadianWorkExperienceYears)}&fwe=${Math.floor(profile.foreignWorkExperienceYears)}`}>
    Try the What-If Modeller →
  </Link>
</p>
```

This is correct code. The fix is to ALSO add a more visible standalone link element immediately after this paragraph (or replace the inline link with a button), not to change the note itself.

---

## Suggested fix code — add after the `</p>` at line 1446, before `</div>` at line 1447

```tsx
<Link
  href={`/tools/crs-modeller?age=${profile.age}&edu=${profile.education}&spouse=${profile.hasSpouse}&l=${firstClb.listening}&r=${firstClb.reading}&w=${firstClb.writing}&s=${firstClb.speaking}&cwe=${Math.floor(profile.canadianWorkExperienceYears)}&fwe=${Math.floor(profile.foreignWorkExperienceYears)}`}
  className="asx-modeller-link"
>
  Try the CRS What-If Modeller →
</Link>
```

Add to `assessment.css`:
```css
.asx-modeller-link {
  display: inline-block;
  margin-top: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--teal);
  text-decoration: none;
  border: 1.5px solid var(--teal);
  border-radius: 4px;
  padding: 0.45rem 1rem;
}
.asx-modeller-link:hover { background: var(--teal); color: #fff; }
```
