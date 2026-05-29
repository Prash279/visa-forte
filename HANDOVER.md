# HANDOVER.md — Session Checkpoint
**Project:** Visa Forte · `c:\Users\hp\visaforte`
**Branch:** main (3 commits ahead of origin/main — not yet pushed)
**Written:** 2026-05-29
**Session outcome:** CVP-5 research complete, implementation NOT started

---

## What This Session Did

Research only. Zero code written for CVP-5. The following was fully read and understood:

- `tasks/lessons.md` — reviewed ✓
- CVP-5 spec in `tasks/todo.md` — fully read ✓
- `AssessmentTool.tsx` (public tool, 1413 lines) — fully read ✓
- `CanVisaProTool.tsx` (admin tool, 1532 lines) — fully read ✓
- `crs-rules.json` age tables (`ageSingle` + `ageWithSpouse`) — read ✓
- `canvisa-pro.css` (CSS variables, cvp2- class patterns) — read ✓
- All 3 uncommitted files analysed (see below)

**The implementation plan below is complete. Next session writes code immediately.**

---

## Uncommitted Changes — Commit These First (CVP-4 Polish)

Three files have unstaged changes that are CVP-4 polish, not CVP-5 work:

| File | Change |
|---|---|
| `apps/web/src/components/NocSearch.tsx` | Added optional `onClear` prop; changed label to "Search by Job Title / Designation (optional)" |
| `apps/web/src/app/admin/canvisa-pro/CanVisaProTool.tsx` | Added `minSettlementFunds()`; `hasSiblingInCanada` in INITIAL + checkbox; `onClear` on NocSearch; family-size change auto-updates settlement funds |
| `apps/web/src/app/assessment/AssessmentTool.tsx` | `onClear` prop added to NocSearch call |

**Commit command (run this before any CVP-5 code):**
```bash
git add apps/web/src/components/NocSearch.tsx apps/web/src/app/admin/canvisa-pro/CanVisaProTool.tsx apps/web/src/app/assessment/AssessmentTool.tsx
git commit -m "fix(canvisa-pro): sibling checkbox, onClear prop, funds auto-update"
```

---

## CVP-5: Age-Sensitive Timeline Alert — Complete Implementation Plan

**Status:** NOT STARTED  
**Approved:** Yes — both public and admin tools

### What it delivers

An amber alert banner that fires when the applicant is within 12 months of a CRS age bracket change. Shows exact months, points lost, and strategic implication.

- **Public tool** (`/assessment`): amber banner, first element in result above hero card
- **Admin tool** (`/admin/canvisa-pro`): formal amber "Strategic Consideration" card above hero; generic fallback note when birth year/month not entered

---

### A. Add import to both tool files

```typescript
import crsRules from '@/lib/crs-rules.json'
```

---

### B. `getAgeAlert()` — add as file-level function in BOTH tool files

Place it after the existing helper functions (after `fmtDate`, `shortType`, `getEligibleDrawCategories`).

```typescript
type AgeAlertResult = {
  monthsUntilChange: number
  pointsLost: number
  currentPts: number
  nextPts: number
  birthdayAge: number
  birthdayMonthYear: string
}

function getAgeAlert(
  input: { dob?: string; birthYear?: number; birthMonth?: number } | null,
  agePointsTable: Record<string, number>
): AgeAlertResult | null {
  const today = new Date()
  let nextBirthdayDate: Date | null = null
  let birthdayAge = 0

  if (input?.dob) {
    const [y, m, d] = input.dob.split('-').map(Number)
    if (!y || !m || !d) return null
    const thisYear = new Date(today.getFullYear(), m - 1, d)
    const nextYear  = new Date(today.getFullYear() + 1, m - 1, d)
    nextBirthdayDate = thisYear > today ? thisYear : nextYear
    birthdayAge = nextBirthdayDate.getFullYear() - y
  } else if (input?.birthYear != null && input?.birthMonth != null) {
    const bMonth0 = input.birthMonth - 1
    const thisYear = new Date(today.getFullYear(), bMonth0, 1)
    const nextYear  = new Date(today.getFullYear() + 1, bMonth0, 1)
    nextBirthdayDate = thisYear > today ? thisYear : nextYear
    birthdayAge = nextBirthdayDate.getFullYear() - input.birthYear
  } else {
    return null
  }

  const monthsDiff =
    (nextBirthdayDate.getFullYear() - today.getFullYear()) * 12 +
    nextBirthdayDate.getMonth() - today.getMonth()

  if (monthsDiff > 12 || monthsDiff < 0) return null

  const currentAge = birthdayAge - 1
  const currentPts = agePointsTable[String(Math.min(currentAge, 44))] ?? 0
  const nextPts    = birthdayAge <= 44 ? (agePointsTable[String(birthdayAge)] ?? 0) : 0

  if (nextPts >= currentPts) return null

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const birthdayMonthYear = `${MONTHS[nextBirthdayDate.getMonth()]} ${nextBirthdayDate.getFullYear()}`

  return {
    monthsUntilChange: Math.max(1, monthsDiff),
    pointsLost: currentPts - nextPts,
    currentPts,
    nextPts,
    birthdayAge,
    birthdayMonthYear,
  }
}
```

---

### C. Public tool — `AssessmentTool.tsx`

#### C1. Compute alert in result view (after `const scoreColor = ...`, ~line 1031)

```typescript
const ageTable = profile.hasSpouse
  ? crsRules.sectionA.ageWithSpouse as Record<string, number>
  : crsRules.sectionA.ageSingle as Record<string, number>
const ageAlert = getAgeAlert(dateOfBirth ? { dob: dateOfBirth } : null, ageTable)
```

(`dateOfBirth` is already computed at line 197: `` `${dobYear}-${dobMonth}-${dobDay}` `` or `''`)

#### C2. JSX — insert as first element inside `<div className="asx-result">`, before `<section className="asx-score-hero">`

```jsx
{ageAlert && (
  <div className="asx-age-alert">
    <span className="asx-age-alert-icon">⚠</span>
    <div className="asx-age-alert-body">
      <strong>Age Alert:</strong> You turn {ageAlert.birthdayAge} in{' '}
      {ageAlert.monthsUntilChange} month{ageAlert.monthsUntilChange === 1 ? '' : 's'}{' '}
      ({ageAlert.birthdayMonthYear}). Your CRS age points decrease by{' '}
      {ageAlert.pointsLost} — from {ageAlert.currentPts} to {ageAlert.nextPts}.
      Improving your score or submitting your profile before this date preserves those points.
    </div>
  </div>
)}
```

#### C3. CSS — append to `assessment.css`

```css
/* ── Age Alert Banner (CVP-5) ────────────────────────────── */
.asx-age-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  background: #FFFBEB;
  border: 1.5px solid #F59E0B;
  border-left: 4px solid #F59E0B;
  border-radius: 6px;
  padding: 1rem 1.25rem;
  margin: 1.5rem auto 0;
  max-width: var(--max-w, 860px);
}

.asx-age-alert-icon {
  font-size: 1.25rem;
  line-height: 1;
  color: #D97706;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.asx-age-alert-body {
  font-size: 0.9rem;
  line-height: 1.65;
  color: #92400E;
}

.asx-age-alert-body strong { color: #B45309; font-weight: 700; }
```

---

### D. Admin tool — `CanVisaProTool.tsx`

#### D1. Add state (with other useState hooks near top of component)

```typescript
const [birthYear, setBirthYear]   = useState<number | ''>('')
const [birthMonth, setBirthMonth] = useState<number | ''>('')
```

#### D2. Add two optional fields in Identity section form

Find the Age field (around line 803):
```jsx
<div className="cvp-field">
  <label className="cvp-label">Age</label>
  <input className="cvp-input" type="number" .../>
</div>
```

Insert immediately after it (still inside the same `cvp-grid-2`):
```jsx
<div className="cvp-field">
  <label className="cvp-label">
    Birth Year <span className="cvp-optional">(optional — for age bracket analysis)</span>
  </label>
  <input
    className="cvp-input"
    type="number"
    min={1944}
    max={2008}
    placeholder="e.g. 1995"
    value={birthYear}
    onChange={e => setBirthYear(e.target.value ? parseInt(e.target.value) : '')}
  />
</div>
<div className="cvp-field">
  <label className="cvp-label">
    Birth Month <span className="cvp-optional">(optional)</span>
  </label>
  <select
    className="cvp-select"
    value={birthMonth}
    onChange={e => setBirthMonth(e.target.value ? parseInt(e.target.value) : '')}
  >
    <option value="">— Select —</option>
    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
      <option key={i + 1} value={i + 1}>{m}</option>
    ))}
  </select>
</div>
```

#### D3. Compute ageAlert in report view (after `const maritalStatusStr = ...`, ~line 1215)

```typescript
const ageTableAdmin = profile.hasSpouse
  ? crsRules.sectionA.ageWithSpouse as Record<string, number>
  : crsRules.sectionA.ageSingle as Record<string, number>
const ageAlert = getAgeAlert(
  (birthYear && birthMonth)
    ? { birthYear: birthYear as number, birthMonth: birthMonth as number }
    : null,
  ageTableAdmin
)
const hasAgeInput = Boolean(birthYear && birthMonth)
```

#### D4. JSX — insert as first element inside `<div className="cvp2-body">`, before the hero section

```jsx
{/* ── CVP-5: Age Alert ───────────────────────────────────── */}
{ageAlert ? (
  <div className="cvp2-age-alert">
    <div className="cvp2-age-alert-label">Strategic Consideration</div>
    <p className="cvp2-age-alert-body">
      Applicant approaches a CRS age bracket change in{' '}
      <strong>{ageAlert.monthsUntilChange} month{ageAlert.monthsUntilChange === 1 ? '' : 's'}</strong>{' '}
      ({ageAlert.birthdayMonthYear}). Current bracket:{' '}
      <strong>{ageAlert.currentPts} points</strong>. Next bracket:{' '}
      <strong>{ageAlert.nextPts} points</strong>. Difference:{' '}
      <strong>−{ageAlert.pointsLost} points</strong>. Recommend prioritising
      pathway progression before {ageAlert.birthdayMonthYear}.
    </p>
  </div>
) : !hasAgeInput ? (
  <div className="cvp2-generic-age-note">
    <span className="cvp2-generic-age-icon">ℹ</span>
    <span>
      Age Bracket Note: Enter Birth Year and Birth Month above for a precise
      timeline alert. Bracket boundaries have material CRS point implications
      at ages 30, 36–45.
    </span>
  </div>
) : null}
```

#### D5. CSS — append to `canvisa-pro.css`

```css
/* ── CVP-5 Age Alert ─────────────────────────────────────── */
.cvp2-age-alert {
  background: rgba(253, 224, 71, 0.06);
  border: 1px solid rgba(253, 224, 71, 0.35);
  border-left: 4px solid var(--cvp-amber);
  border-radius: 6px;
  padding: 1.125rem 1.375rem;
  margin-bottom: 1.5rem;
}

.cvp2-age-alert-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cvp-amber);
  margin-bottom: 0.5rem;
}

.cvp2-age-alert-body {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--cvp-muted);
}

.cvp2-age-alert-body strong { color: var(--cvp-text); font-weight: 600; }

.cvp2-generic-age-note {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  background: rgba(100, 116, 139, 0.08);
  border: 1px solid var(--cvp-border);
  border-radius: 6px;
  padding: 0.875rem 1.125rem;
  font-size: 0.82rem;
  color: #64748B;
  line-height: 1.65;
  margin-bottom: 1.5rem;
}

.cvp2-generic-age-icon { flex-shrink: 0; font-size: 1rem; margin-top: 0.05rem; }

.cvp-optional { color: var(--cvp-muted); font-weight: 400; font-size: 0.75em; }
```

---

### E. TypeScript check + final commit

```bash
cd apps/web && npx tsc --noEmit
# Zero errors required

git add apps/web/src/app/assessment/AssessmentTool.tsx \
        apps/web/src/app/assessment/assessment.css \
        apps/web/src/app/admin/canvisa-pro/CanVisaProTool.tsx \
        apps/web/src/app/admin/canvisa-pro/canvisa-pro.css
git commit -m "feat(assessment,canvisa-pro): age-sensitive timeline alert on both tools"
```

---

## Age Points Reference (crs-rules.json — verified)

**ageSingle** — key drop ages:
- 29 → 30: 110 → 105 (−5)
- 30 → 31: 105 → 99 (−6)
- 40 → 41: 50 → 39 (−11) ← largest single drop
- 41 → 42: 39 → 28 (−11)
- 44 → 45: 6 → 0 (−6)

Every year from 30 to 44 is a bracket drop. 45+ = 0 pts.

**ageWithSpouse** — same age boundaries, slightly lower absolute values (20–29=100, 30=95, etc.)

---

## CVP Roadmap Status

| Task | Status |
|---|---|
| CVP-1: NOC 2021 Data Foundation | ✅ COMPLETE |
| CVP-2: NOC Auto-Population (NocSearch) | ✅ COMPLETE |
| CVP-3: Admin Form Upgrades | ✅ COMPLETE |
| CVP-4: Admin Result View | ✅ COMPLETE |
| **CVP-5: Age Alert (both tools)** | **⬜ Plan ready — implement next** |
| CVP-6: Category Draw Matrix (admin) | ⬜ NOT STARTED |
| CVP-7: Narrative Verdict (admin) | ⬜ NOT STARTED |
| CVP-8: Final check + deploy | ⬜ NOT STARTED |

---

## Prashant Proof for CVP-5

**Public Tool:**
1. `/assessment` — enter DOB for someone 29y 10m old (born ~2 months before turning 30)
2. Submit — confirm amber banner appears at the TOP of result, above the score card
3. Enter DOB for a 25-year-old — confirm no banner appears
4. Enter DOB for a 44-year-old with 8 months left — confirm banner fires with age-45 info

**Admin Tool:**
1. `/admin/canvisa-pro` — confirm Birth Year + Birth Month fields appear in Identity section
2. Enter year/month placing applicant 3 months from 30th birthday → Generate report → amber Strategic Consideration card appears ABOVE the hero score card
3. Clear year/month → regenerate → generic age bracket note appears instead
4. Profile for a 25-year-old → confirm no alert

---

*HANDOVER written 2026-05-29 — CVP-5 plan is complete and implementation-ready.*
