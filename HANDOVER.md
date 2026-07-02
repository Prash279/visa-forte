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
Build RT-2: CRS What-If Modeller at `/tools/crs-modeller`. Plan approved by Prash.
Prashant Proof on /assessment was completed and passed all 6 checks this session.

---

## What Was Done This Session

### Prashant Proof — /assessment (all 6 checks passed)
- Form submits with no contact gate ✅
- Score 459, 3 weakness chips (PNP +600, FWE +25, Lang +23), Best Pathway CEC 516 ✅
- "Check your inbox ✓" after name+email send ✅
- Resources "Check My Score Free →" → /assessment ✅
- /tools/canvisa → /assessment (301, no 404) ✅
- Age Alert banner working correctly ✅

### RT-2 Step Plan (commit `1a46796`)
- 8-step plan written in `tasks/todo.md` at line ~2146
- Committed: `docs: add rt-2 step plan — CRS What-If Modeller`
- Prash approved the plan

### RT-2 Build — NOT STARTED (session interrupted before writing any files)
All source files were read and understood. No code written yet.

---

## Immediate Next Steps — BUILD RT-2

### What to build
`/tools/crs-modeller` — CRS What-If Modeller. Free, ungated. Reuses `calculate()` from
`apps/web/src/lib/crs-calculator.ts`. No new DB tables, no new API endpoint.

### Files to CREATE (none exist yet)
```
apps/web/src/app/tools/crs-modeller/page.tsx          ← server component (metadata + shell)
apps/web/src/app/tools/crs-modeller/CrsModeller.tsx   ← 'use client' — all logic here
apps/web/src/app/tools/crs-modeller/crs-modeller.css  ← styles, imported by CrsModeller.tsx
```

### Files to MODIFY
```
apps/web/src/app/assessment/AssessmentTool.tsx         ← wire handoff URL in scenarios section
apps/web/src/app/resources/page.tsx                    ← convert "Coming Soon" card to live link
```

---

## Key Architecture Decisions (locked — don't re-derive)

### State model
The modeller holds a **base profile** (from URL params or defaults) + **lever overrides**.
On every lever change, call `calculate(baseProfile with overrides)` → get new total → delta = new − base.

```typescript
interface ModState {
  age: number
  hasSpouse: boolean
  education: EducationLevel
  // Language stored as CLB (4–12), not raw IELTS/CELPIP bands
  langL: number; langR: number; langW: number; langS: number
  foreignWE: number   // years (0–5)
  canadianWE: number  // years (0–5)
}
```

### URL params for handoff from /assessment
`/tools/crs-modeller?age=34&edu=masters&spouse=false&l=8&r=8&w=9&s=8&cwe=2&fwe=0`

- `edu` = EducationLevel string (e.g. `masters`, `bachelors`)
- `l/r/w/s` = CLB integers (4–12) — already converted from IELTS bands by /assessment
- `cwe` = Canadian WE years, `fwe` = foreign WE years
- `age` = integer, `spouse` = `true` | `false`

### CLB → CRS points approach
The `calculate()` function needs a full `ApplicantProfile` with `firstLanguageScores` (raw test scores).
To avoid storing test type in URL params, build a **synthetic CELPIP profile** in the modeller:
- CELPIP scores are 1:1 with CLB (CLB 4 = CELPIP 4, CLB 12 = CELPIP 12)
- Set `firstLanguageScores: { testType: 'CELPIP', listening: clbL, reading: clbR, writing: clbW, speaking: clbS }`
- This means the modeller works entirely in CLB space — no lossy conversion

### Base profile for calculate() (all non-lever fields use safe defaults)
```typescript
const baseProfile: ApplicantProfile = {
  name: '', nocCode: '', nocTeer: 1, occupationTitle: '',
  countryOfCitizenship: '', countryOfResidence: '',
  reportDate: new Date().toISOString().split('T')[0] ?? '',
  age: state.age,
  education: state.education,
  hasEca: true,
  firstLanguageScores: { testType: 'CELPIP', listening: state.langL, reading: state.langR, writing: state.langW, speaking: state.langS },
  hasSecondLanguage: false,
  foreignWorkExperienceYears: state.foreignWE,
  canadianWorkExperienceYears: state.canadianWE,
  hasSpouse: state.hasSpouse,
  hasProvincialNomination: false,
  hasSiblingInCanada: false,
  hasJobOffer: 'none',
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 15263, familySize: 1,
  hasCriminalRecord: false, hasMedicalCondition: false, hasPriorRefusal: false,
}
```

### Per-lever delta isolation
Run `calculate()` once with current state → `baseScore`.
For each lever, call `calculate()` with only THAT lever changed to its max → compute max gain.
Display: `current value | points if maxed | max gain chip`.

### Cutoff comparison
Use CEC draw if `canadianWE >= 1`, else General/All-Programs.
Pull from `crs-draw-history.json` (already imported in assess tool — import same file).

### Lead capture
Same block as /assessment. Same API. Pass `toolName: 'crs-modeller'`.
The existing `Schema` in `/api/tools/lead-capture/route.ts` already accepts any `toolName` string.

### Resources page change
In `apps/web/src/app/resources/page.tsx`, the tools-grid maps over 4 items statically.
The first entry is `{ name: 'CRS What-If Modeller', desc: '...' }` with a "Coming Soon" badge.
Change it to a live card matching the hero card pattern — with `href="/tools/crs-modeller"`.

### Assessment handoff link
In `AssessmentTool.tsx`, in the "How to Improve Your Score" `asx-scenarios-note` paragraph
at the bottom of the scenarios card (line ~1439), add:
```tsx
{' · '}
<Link href={`/tools/crs-modeller?age=${profile.age}&edu=${profile.education}&spouse=${profile.hasSpouse}&l=${firstClb.listening}&r=${firstClb.reading}&w=${firstClb.writing}&s=${firstClb.speaking}&cwe=${Math.floor(profile.canadianWorkExperienceYears)}&fwe=${Math.floor(profile.foreignWorkExperienceYears)}`}>
  Try the What-If Modeller →
</Link>
```

---

## Key Code Locations
```
# Engine (do NOT modify)
apps/web/src/lib/crs-calculator.ts         ← calculate(), scoresToClb(), all types
apps/web/src/lib/crs-rules.json            ← CRS point tables
apps/web/src/lib/crs-draw-history.json     ← live draw data

# Patterns to match
apps/web/src/app/assessment/AssessmentTool.tsx   ← CSS class names, lead capture block pattern
apps/web/src/app/assessment/assessment.css       ← asx-* classes (reuse these, don't invent new ones)

# Lead capture API (unchanged)
apps/web/src/app/api/tools/lead-capture/route.ts

# Resources page
apps/web/src/app/resources/page.tsx

# RT-2 step plan (full detail)
tasks/todo.md  line ~2146  → "TASK RT-2: CRS What-If Modeller"
```

---

## CSS strategy
Reuse all `asx-*` classes from `assessment.css` — they are already global via the import.
Create `crs-modeller.css` only for the lever-specific UI (range sliders, delta chips, cutoff bar).
Naming: `mod-*` prefix for new classes to avoid collisions.

---

## Commit sequence
```
feat: scaffold /tools/crs-modeller route
feat: rt-2 state model + url param handoff
feat: rt-2 real-time delta engine
feat: rt-2 lever controls
feat: rt-2 score display + cutoff comparison
feat: rt-2 lead capture
feat: rt-2 resources page card + assessment handoff link
fix: rt-2 mobile responsive pass
test: rt-2 unit tests
```
Commit after each step. Don't batch.

---

## Decisions Locked (do not re-ask Prash)
| Decision | Detail |
|---|---|
| Single CRS tool page | `/assessment` — RT-2 is a separate page at `/tools/crs-modeller` |
| CLB approach in modeller | Synthetic CELPIP profile (CLB = CELPIP score 1:1), not raw IELTS bands |
| No new DB tables | Reuse `tool_events` + `draw_alert_subscribers` via existing lead-capture API |
| Resources page | Convert first tools-grid card from "Coming Soon" to live link |
| Assessment handoff | Link added in scenarios-note at bottom of "How to Improve" card |
| Prashant Proof required | Must test live at visaforte.com before marking RT-2 done |
