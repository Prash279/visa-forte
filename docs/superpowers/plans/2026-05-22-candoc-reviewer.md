# CanDoc Reviewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 17-layer AI document review pipeline in the Visa Forte Admin Panel — admin triggers → single Claude Vision call reviews all documents across 17 SOP layers → Prash annotates findings → MARP PDF generated → emailed to client via Resend with a 7-day JWT download link.

**Architecture:** Admin navigates to `/admin/candoc?clientId=<id>` from the CRM → POST `/api/admin/candoc/trigger` creates a DB row → POST `/api/admin/candoc/analyze` fires a single Claude Vision API call with all 17 SOP layers + all client documents → raw `FindingsJson` stored in DB → Prash annotates and checks off each layer → POST `/api/admin/candoc/signoff` generates MARP PDF server-side, uploads to Vercel Blob (private), emails client via Resend → client downloads via JWT-signed route.

**Tech Stack:** Next.js App Router, Drizzle ORM + Supabase (PostgreSQL), Claude Vision API (`claude-sonnet-4-6`), Vercel Blob (private), MARP CLI (`@marp-team/marp-cli` v4.3.1), Resend, Zod (runtime validation of AI JSON output), Vitest (unit tests), `jose` (JWT for client portal links)

---

## File Structure

### Create
- `apps/web/src/lib/candoc-types.ts` — Zod schemas, TypeScript interfaces, `parseFindings()`
- `apps/web/src/lib/candoc-types.test.ts` — unit tests for `parseFindings()`
- `apps/web/src/lib/candoc-diff.ts` — `computeDiff()` pure function (marks `isNew`/`isResolved`)
- `apps/web/src/lib/candoc-diff.test.ts` — unit tests for `computeDiff()`
- `apps/web/src/lib/candoc-marp.ts` — `buildCandocMarp()` → MARP markdown string
- `apps/web/src/lib/candoc-marp.test.ts` — unit tests for `buildCandocMarp()`
- `apps/web/src/app/api/admin/candoc/trigger/route.ts` — POST: create DB row, return `{reviewId, version}`
- `apps/web/src/app/api/admin/candoc/analyze/route.ts` — POST: Claude Vision, `maxDuration=120`
- `apps/web/src/app/api/admin/candoc/status/route.ts` — GET: polling endpoint
- `apps/web/src/app/api/admin/candoc/findings/route.ts` — PATCH: save annotations
- `apps/web/src/app/api/admin/candoc/signoff/route.ts` — POST: MARP → Blob → Resend → complete
- `apps/web/src/app/api/admin/candoc/report/route.ts` — GET: signed Blob URL for admin download
- `apps/web/src/app/api/client/candoc/report/route.ts` — GET: JWT-validated client download
- `apps/web/src/app/admin/candoc/page.tsx` — server component with auth guard
- `apps/web/src/app/admin/candoc/CanDocTool.tsx` — client component, full review workflow
- `apps/web/src/app/admin/candoc/candoc.css` — scoped styles

### Modify
- `apps/web/drizzle/schema.ts` — append `candocReviews` table + `CandocReview` type after line 252
- `apps/web/src/app/admin/clients/CrmTable.tsx` — add "CanDoc Review" button per row

---

## Task 1: Types, Schema, and DB Migration

> **⚠️ HALT-AND-ASK at Step 6:** Run `drizzle-kit push --dry-run` and show Prash the full output before executing. Do not run the migration without explicit approval.

**Files:**
- Create: `apps/web/src/lib/candoc-types.ts`
- Create: `apps/web/src/lib/candoc-types.test.ts`
- Modify: `apps/web/drizzle/schema.ts`

- [ ] **Step 1: Write the failing test**

File: `apps/web/src/lib/candoc-types.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseFindings } from './candoc-types'

const validLayer = {
  layer: 'S0',
  layerName: 'Client Profile Baseline',
  status: 'pass' as const,
  findings: [],
}

const validFindings = {
  reviewedAt: '2026-05-22T10:00:00.000Z',
  clientId: '123e4567-e89b-12d3-a456-426614174000',
  version: 1,
  sopLayers: [validLayer],
  overallRiskLevel: 'clear' as const,
  totalGaps: 0,
}

describe('parseFindings', () => {
  it('accepts a valid FindingsJson object', () => {
    expect(() => parseFindings(validFindings)).not.toThrow()
  })

  it('returns the parsed object with correct fields', () => {
    const result = parseFindings(validFindings)
    expect(result.clientId).toBe(validFindings.clientId)
    expect(result.version).toBe(1)
    expect(result.overallRiskLevel).toBe('clear')
  })

  it('rejects an invalid overallRiskLevel', () => {
    expect(() => parseFindings({ ...validFindings, overallRiskLevel: 'unknown' })).toThrow()
  })

  it('rejects an invalid SopLayerResult status', () => {
    const bad = { ...validFindings, sopLayers: [{ ...validLayer, status: 'ok' }] }
    expect(() => parseFindings(bad)).toThrow()
  })

  it('rejects a finding with invalid severity', () => {
    const bad = {
      ...validFindings,
      sopLayers: [{
        ...validLayer,
        findings: [{
          id: 'S0-001',
          severity: 'low',
          description: 'Test',
          documentRef: 'passport.pdf',
          suggestedAction: 'Resubmit',
        }],
      }],
    }
    expect(() => parseFindings(bad)).toThrow()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npx vitest run src/lib/candoc-types.test.ts
```

Expected: `FAIL` — `Cannot find module './candoc-types'`

- [ ] **Step 3: Create candoc-types.ts**

File: `apps/web/src/lib/candoc-types.ts`

```typescript
import { z } from 'zod'

const FindingSchema = z.object({
  id: z.string(),
  severity: z.enum(['info', 'minor', 'major', 'critical']),
  description: z.string(),
  documentRef: z.string(),
  suggestedAction: z.string(),
  isNew: z.boolean().optional(),
  isResolved: z.boolean().optional(),
  prashAnnotation: z.string().optional(),
})

const SopLayerResultSchema = z.object({
  layer: z.string(),
  layerName: z.string(),
  status: z.enum(['pass', 'gap', 'missing', 'partial']),
  findings: z.array(FindingSchema),
})

const FindingsJsonSchema = z.object({
  reviewedAt: z.string(),
  clientId: z.string(),
  version: z.number().int().positive(),
  sopLayers: z.array(SopLayerResultSchema),
  overallRiskLevel: z.enum(['clear', 'minor', 'major', 'critical']),
  totalGaps: z.number().int().min(0),
})

export type Finding = z.infer<typeof FindingSchema>
export type SopLayerResult = z.infer<typeof SopLayerResultSchema>
export type FindingsJson = z.infer<typeof FindingsJsonSchema>

export function parseFindings(json: unknown): FindingsJson {
  return FindingsJsonSchema.parse(json)
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd apps/web && npx vitest run src/lib/candoc-types.test.ts
```

Expected: `PASS` — 5 tests passing

- [ ] **Step 5: Add candocReviews table to schema.ts**

Append at the end of `apps/web/drizzle/schema.ts` (after `export type CanadaDataSnapshot = ...`):

```typescript

// One review record per (client, version) pair. Version increments on each re-review.
// status lifecycle: 'pending' → 'analyzing' → 'analyzed' → 'annotating' → 'complete' | 'error'
// rawFindings: full FindingsJson from Claude, stored after AI analysis.
// annotatedFindings: FindingsJson with Prash's prashAnnotation fields added per finding.
// signoffChecklist: { [layerCode]: boolean } — Prash confirms each layer before sign-off.
// reportBlobUrl: private Vercel Blob URL for the generated MARP PDF.
export const candocReviews = pgTable('candoc_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  status: text('status').notNull().default('pending'),
  triggeredAt: timestamp('triggered_at').notNull().defaultNow(),
  analyzedAt: timestamp('analyzed_at'),
  completedAt: timestamp('completed_at'),
  rawFindings: jsonb('raw_findings'),
  annotatedFindings: jsonb('annotated_findings'),
  signoffChecklist: jsonb('signoff_checklist'),
  reportBlobUrl: text('report_blob_url'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('candoc_reviews_client_version_idx').on(table.clientId, table.version),
])

export type CandocReview = typeof candocReviews.$inferSelect
```

- [ ] **Step 6: ⚠️ HALT — Run dry-run migration, show Prash output, await approval**

```bash
cd apps/web && npx drizzle-kit push --dry-run
```

Show the full terminal output to Prash. Do not proceed until he explicitly approves.

- [ ] **Step 7: After approval — execute migration**

```bash
cd apps/web && npx drizzle-kit push
```

Expected: `candoc_reviews` table created successfully.

- [ ] **Step 8: Commit**

```bash
git add apps/web/drizzle/schema.ts apps/web/src/lib/candoc-types.ts apps/web/src/lib/candoc-types.test.ts
git commit -m "feat: add candocReviews schema and FindingsJson Zod types"
```

---

## Task 2: API Routes — trigger, analyze, status

**Files:**
- Create: `apps/web/src/app/api/admin/candoc/trigger/route.ts`
- Create: `apps/web/src/app/api/admin/candoc/analyze/route.ts`
- Create: `apps/web/src/app/api/admin/candoc/status/route.ts`

Note on path depth: all three routes live at `src/app/api/admin/candoc/<name>/route.ts` — 6 directories deep from `apps/web/`, so the drizzle schema import is `'../../../../../../drizzle/schema'`.

- [ ] **Step 1: Create trigger route**

File: `apps/web/src/app/api/admin/candoc/trigger/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candocReviews, clients } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// POST /api/admin/candoc/trigger
// Body: { clientId: string }
// Creates a new candoc_reviews row. Version auto-increments from the latest existing version.
// Returns: { reviewId: string, version: number }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const { clientId } = await req.json() as { clientId: string }
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const [clientRow] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
    if (!clientRow) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const existing = await db
      .select({ version: candocReviews.version })
      .from(candocReviews)
      .where(eq(candocReviews.clientId, clientId))
      .orderBy(desc(candocReviews.version))
      .limit(1)

    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1

    const [created] = await db
      .insert(candocReviews)
      .values({ clientId, version: nextVersion, status: 'pending' })
      .returning({ id: candocReviews.id, version: candocReviews.version })

    return NextResponse.json({ reviewId: created.id, version: created.version })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create analyze route**

File: `apps/web/src/app/api/admin/candoc/analyze/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'
import { candocReviews, clientDocuments } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { generateDownloadUrl } from '@/lib/storage'
import { parseFindings } from '@/lib/candoc-types'
import { computeDiff } from '@/lib/candoc-diff'

export const maxDuration = 120

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

const SOP_SYSTEM_PROMPT = `You are an expert Canadian immigration document reviewer. You review client documents against IRCC SOP requirements for Express Entry applications.
Return ONLY valid JSON — no markdown fences, no explanation, just the JSON object.`

function buildSopPrompt(clientId: string, version: number): string {
  return `Review all provided documents against these 17 SOP layers:

S0 - Client Profile Baseline: Name, DOB, passport number consistent across all documents.
S1 - Express Entry Profile: NOC code, TEER level, pool entry date, ITA date if present.
S2 - NOC Verification: Duties letter must match the claimed NOC TEER description exactly.
S3 - Language Tests: IELTS/CELPIP/TEF/TCF/PTE Core results, valid to e-APR submission date (not ITA date). IELTS GT only (not Academic unless ECA requires it). PTE Core only (not Academic). CELPIP General only.
S4 - ECA: Evaluated by designated body (WES, ICAS, etc.), valid 5 years from issue date (not from ITA date).
S5 - Employment History: Each job needs reference letter on letterhead with duties, dates, salary, supervisor signature. Duties must align with claimed NOC TEER description.
S6 - Proof of Funds: CAD liquid assets per current IRCC table. Bank statement dated within 6 months of e-APR.
S7 - Passport: Valid for at least 18 months beyond intended landing. All pages clear and legible.
S8 - Police Clearance Certificate: From every country lived in 6+ months in the last 10 years. Issued within 6 months of e-APR submission.
S9 - Medical Examination: Completed by IRCC-designated panel physician. Valid 12 months from exam date.
S10 - Civil Status: Marriage certificate / divorce decree / death certificate as applicable.
S11 - Dependent Children: Birth certificate for each dependent child under 22.
S12 - Photos: Digital upload for e-APR; IRCC digital photo specifications apply.
S13 - Forms: IMM 0008, IMM 5669, IMM 5406, IMM 5562 (if applicable) — all signed, no blanks.
S14 - Fees: RPRF receipt, biometrics fee receipt, application processing fee receipt.
S15 - Consistency Review: Name, DOB, nationality consistent across ALL documents. No date overlaps in employment or travel history.
S16 - Biometrics: Enrollment confirmation if applicable (valid 10 years for adults 14–79).

Return this exact JSON (no other text):
{
  "reviewedAt": "<ISO 8601 timestamp>",
  "clientId": "${clientId}",
  "version": ${version},
  "sopLayers": [
    {
      "layer": "S0",
      "layerName": "Client Profile Baseline",
      "status": "pass|gap|missing|partial",
      "findings": [
        {
          "id": "S0-001",
          "severity": "info|minor|major|critical",
          "description": "<specific issue>",
          "documentRef": "<filename or 'Not provided'>",
          "suggestedAction": "<what to do>"
        }
      ]
    }
  ],
  "overallRiskLevel": "clear|minor|major|critical",
  "totalGaps": <count of layers where status != "pass">
}`
}

// POST /api/admin/candoc/analyze
// Body: { reviewId: string }
// Fetches all client documents, calls Claude Vision, stores rawFindings with diff markers.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  let reviewId: string | undefined

  try {
    const body = await req.json() as { reviewId: string }
    reviewId = body.reviewId
    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 })
    }

    const [review] = await db
      .select()
      .from(candocReviews)
      .where(eq(candocReviews.id, reviewId))
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    if (review.status !== 'pending') {
      return NextResponse.json({ error: `Review is already ${review.status}` }, { status: 409 })
    }

    await db
      .update(candocReviews)
      .set({ status: 'analyzing', updatedAt: new Date() })
      .where(eq(candocReviews.id, reviewId))

    const docs = await db
      .select()
      .from(clientDocuments)
      .where(eq(clientDocuments.clientId, review.clientId))

    const imageBlocks: Anthropic.Messages.ImageBlockParam[] = docs.map((doc) => ({
      type: 'image' as const,
      source: {
        type: 'url' as const,
        url: generateDownloadUrl(doc.blobUrl),
      },
    }))

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SOP_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text' as const, text: buildSopPrompt(review.clientId, review.version) },
        ],
      }],
    })

    const rawText = message.content.find((b) => b.type === 'text')?.text ?? ''
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
    let parsed = parseFindings(JSON.parse(jsonText))

    // If this is a re-review, compute diff against the previous version
    if (review.version > 1) {
      const [prevReview] = await db
        .select({ rawFindings: candocReviews.rawFindings })
        .from(candocReviews)
        .where(eq(candocReviews.clientId, review.clientId))
        .orderBy(desc(candocReviews.version))
        .offset(1)
        .limit(1)

      if (prevReview?.rawFindings) {
        const prevParsed = parseFindings(prevReview.rawFindings)
        parsed = computeDiff(prevParsed, parsed)
      }
    }

    await db
      .update(candocReviews)
      .set({ status: 'analyzed', rawFindings: parsed, analyzedAt: new Date(), updatedAt: new Date() })
      .where(eq(candocReviews.id, reviewId))

    return NextResponse.json({ ok: true, version: review.version })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    if (reviewId) {
      await db
        .update(candocReviews)
        .set({ status: 'error', errorMessage: message, updatedAt: new Date() })
        .where(eq(candocReviews.id, reviewId))
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create status route**

File: `apps/web/src/app/api/admin/candoc/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candocReviews } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// GET /api/admin/candoc/status?clientId=<uuid>
// Returns latest review for the client. Polled every 3s by the UI.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
  }

  try {
    const [review] = await db
      .select({
        id: candocReviews.id,
        status: candocReviews.status,
        version: candocReviews.version,
        rawFindings: candocReviews.rawFindings,
        annotatedFindings: candocReviews.annotatedFindings,
        signoffChecklist: candocReviews.signoffChecklist,
        errorMessage: candocReviews.errorMessage,
        analyzedAt: candocReviews.analyzedAt,
        completedAt: candocReviews.completedAt,
      })
      .from(candocReviews)
      .where(eq(candocReviews.clientId, clientId))
      .orderBy(desc(candocReviews.version))
      .limit(1)

    if (!review) return NextResponse.json({ status: 'none' })
    return NextResponse.json(review)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Manual verification**

```bash
# Start dev server
cd apps/web && npm run dev

# Trigger a review (replace <uuid> with a real client ID from the DB)
curl -X POST http://localhost:3000/api/admin/candoc/trigger \
  -H "Content-Type: application/json" \
  -d '{"clientId":"<uuid>"}'
# Expected: {"reviewId":"<uuid>","version":1}

# Poll status
curl "http://localhost:3000/api/admin/candoc/status?clientId=<uuid>"
# Expected: {"id":"...","status":"pending","version":1,...}
```

Note: The analyze endpoint requires `ANTHROPIC_API_KEY` in `.env.local` and documents uploaded for the client. Full integration test happens in Task 3 after the UI is wired.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/admin/candoc/
git commit -m "feat: add CanDoc trigger, analyze (Claude Vision), and status routes"
```

---

## Task 3: Admin UI — CanDoc Page + CrmTable Button

**Files:**
- Create: `apps/web/src/app/admin/candoc/candoc.css`
- Create: `apps/web/src/app/admin/candoc/page.tsx`
- Create: `apps/web/src/app/admin/candoc/CanDocTool.tsx`
- Modify: `apps/web/src/app/admin/clients/CrmTable.tsx`

- [ ] **Step 1: Create candoc.css**

File: `apps/web/src/app/admin/candoc/candoc.css`

```css
.candoc-wrap {
  min-height: 100vh;
  background: var(--clr-bg);
  color: var(--clr-text-primary);
  font-family: var(--font-sans);
  padding: 2rem;
}

.candoc-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.candoc-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--clr-text-primary);
  margin: 0;
}

.candoc-back {
  background: none;
  border: none;
  color: var(--clr-accent);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  text-decoration: underline;
}

.candoc-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.candoc-status-badge.none      { background: #1e293b; color: #64748b; }
.candoc-status-badge.pending   { background: #334155; color: #94a3b8; }
.candoc-status-badge.analyzing { background: #1e3a5f; color: #60a5fa; }
.candoc-status-badge.analyzed  { background: #1a3a2a; color: #4ade80; }
.candoc-status-badge.annotating{ background: #3b2a1a; color: #fb923c; }
.candoc-status-badge.complete  { background: #1c1a3a; color: #a78bfa; }
.candoc-status-badge.error     { background: #3a1a1a; color: #f87171; }

.candoc-trigger-btn {
  background: var(--clr-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.candoc-trigger-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.candoc-layer-grid { display: grid; gap: 1rem; margin-top: 1.5rem; }

.candoc-layer-card {
  background: var(--clr-surface);
  border: 1px solid var(--clr-border);
  border-radius: 8px;
  padding: 1rem 1.25rem;
}

.candoc-layer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.candoc-layer-title { font-size: 0.95rem; font-weight: 600; }

.candoc-layer-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}

.candoc-layer-badge.pass    { background: #1a3a2a; color: #4ade80; }
.candoc-layer-badge.gap     { background: #3b2a1a; color: #fb923c; }
.candoc-layer-badge.partial { background: #3b331a; color: #fbbf24; }
.candoc-layer-badge.missing { background: #3a1a1a; color: #f87171; }

.candoc-finding {
  border-left: 3px solid var(--clr-border);
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
}

.candoc-finding.critical { border-color: #f87171; }
.candoc-finding.major    { border-color: #fb923c; }
.candoc-finding.minor    { border-color: #fbbf24; }
.candoc-finding.info     { border-color: #60a5fa; }
.candoc-finding.resolved { opacity: 0.5; text-decoration: line-through; }

.candoc-annotation-input {
  width: 100%;
  margin-top: 0.5rem;
  background: var(--clr-bg);
  border: 1px solid var(--clr-border);
  border-radius: 4px;
  color: var(--clr-text-primary);
  font-size: 0.8rem;
  padding: 0.4rem 0.6rem;
  resize: vertical;
  min-height: 2.5rem;
}

.candoc-signoff-section {
  margin-top: 2rem;
  background: var(--clr-surface);
  border: 1px solid var(--clr-border);
  border-radius: 8px;
  padding: 1.25rem;
}

.candoc-signoff-title { font-size: 1rem; font-weight: 700; margin-bottom: 1rem; }

.candoc-checklist-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0;
  font-size: 0.875rem;
}

.candoc-signoff-btn {
  margin-top: 1rem;
  background: #4ade80;
  color: #0f1a0f;
  border: none;
  border-radius: 6px;
  padding: 0.7rem 1.6rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}

.candoc-signoff-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.candoc-error {
  background: #3a1a1a;
  color: #f87171;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  margin-top: 1rem;
}
```

- [ ] **Step 2: Create page.tsx**

File: `apps/web/src/app/admin/candoc/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { getCurrentAuthSession } from '@/lib/auth-server'
import CanDocTool from './CanDocTool'
import '../admin.css'

export const metadata = { title: 'CanDoc Review — Visa Forte Admin' }

export default async function CanDocPage(): Promise<React.JSX.Element> {
  const authSession = await getCurrentAuthSession()
  if (!authSession?.session) redirect('/login')
  if (authSession.user?.email !== 'prashant@visaforte.com') redirect('/')
  return <CanDocTool />
}
```

- [ ] **Step 3: Create CanDocTool.tsx**

File: `apps/web/src/app/admin/candoc/CanDocTool.tsx`

```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import type { FindingsJson } from '@/lib/candoc-types'
import './candoc.css'

type ReviewStatus = 'none' | 'pending' | 'analyzing' | 'analyzed' | 'annotating' | 'complete' | 'error'

interface StatusResponse {
  id?: string
  status: ReviewStatus
  version?: number
  rawFindings?: FindingsJson
  annotatedFindings?: FindingsJson
  signoffChecklist?: Record<string, boolean>
  errorMessage?: string
}

const POLL_MS = 3000

const STATUS_LABEL: Record<ReviewStatus, string> = {
  none: 'No Review',
  pending: 'Pending',
  analyzing: 'Analyzing…',
  analyzed: 'Ready to Annotate',
  annotating: 'Annotating',
  complete: 'Complete',
  error: 'Error',
}

export default function CanDocTool(): React.JSX.Element {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId') ?? ''
  const clientName = searchParams.get('name') ?? 'Client'

  const [status, setStatus] = useState<ReviewStatus>('none')
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [findings, setFindings] = useState<FindingsJson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!clientId) return
    try {
      const res = await fetch(`/api/admin/candoc/status?clientId=${clientId}`)
      const data: StatusResponse = await res.json()
      setStatus(data.status)
      if (data.annotatedFindings) setFindings(data.annotatedFindings)
      else if (data.rawFindings) setFindings(data.rawFindings)
      if (data.errorMessage) setError(data.errorMessage)
      if (data.id) setReviewId(data.id)
      if (['analyzed', 'annotating', 'complete', 'error', 'none'].includes(data.status)) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      }
    } catch { /* keep polling on transient network errors */ }
  }, [clientId])

  useEffect(() => { void fetchStatus() }, [fetchStatus])

  const handleTrigger = async (): Promise<void> => {
    setTriggering(true)
    setError(null)
    try {
      const trigRes = await fetch('/api/admin/candoc/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const { reviewId: newId, error: trigErr } = await trigRes.json() as { reviewId?: string; error?: string }
      if (trigErr || !newId) { setError(trigErr ?? 'Trigger failed'); return }

      setReviewId(newId)
      setStatus('analyzing')
      void fetch('/api/admin/candoc/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: newId }),
      })
      pollRef.current = setInterval(() => { void fetchStatus() }, POLL_MS)
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="candoc-wrap">
      <div className="candoc-header">
        <button className="candoc-back" onClick={() => history.back()}>← Back</button>
        <h1>CanDoc Review — {clientName}</h1>
        <span className={`candoc-status-badge ${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      {['none', 'error'].includes(status) && (
        <button
          className="candoc-trigger-btn"
          disabled={triggering || !clientId}
          onClick={() => void handleTrigger()}
        >
          {triggering ? 'Starting…' : 'Run CanDoc Review'}
        </button>
      )}

      {status === 'analyzing' && (
        <p style={{ color: 'var(--clr-text-secondary)', marginTop: '1rem' }}>
          Claude is reviewing all documents across 17 SOP layers. This takes up to 2 minutes…
        </p>
      )}

      {error && <div className="candoc-error">{error}</div>}

      {findings && ['analyzed', 'annotating', 'complete'].includes(status) && (
        <FindingsView
          findings={findings}
          reviewId={reviewId!}
          clientId={clientId}
          status={status}
          onStatusChange={setStatus}
          onFindingsChange={setFindings}
        />
      )}
    </div>
  )
}

interface FindingsViewProps {
  findings: FindingsJson
  reviewId: string
  clientId: string
  status: ReviewStatus
  onStatusChange: (s: ReviewStatus) => void
  onFindingsChange: (f: FindingsJson) => void
}

function FindingsView({ findings, reviewId, clientId, status, onStatusChange, onFindingsChange }: FindingsViewProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [signingOff, setSigningOff] = useState(false)
  const [signoffError, setSignoffError] = useState<string | null>(null)
  const [local, setLocal] = useState<FindingsJson>(findings)

  const allLayersChecked = findings.sopLayers.every((l) => checklist[l.layer])

  const handleAnnotation = (li: number, fi: number, value: string): void => {
    const updated: FindingsJson = {
      ...local,
      sopLayers: local.sopLayers.map((layer, i) =>
        i !== li ? layer : {
          ...layer,
          findings: layer.findings.map((f, j) =>
            j !== fi ? f : { ...f, prashAnnotation: value }
          ),
        }
      ),
    }
    setLocal(updated)
    onFindingsChange(updated)
  }

  const handleSaveAnnotations = async (): Promise<void> => {
    setSaving(true)
    try {
      await fetch('/api/admin/candoc/findings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, annotatedFindings: local }),
      })
      onStatusChange('annotating')
    } finally { setSaving(false) }
  }

  const handleSignOff = async (): Promise<void> => {
    setSigningOff(true)
    setSignoffError(null)
    try {
      const res = await fetch('/api/admin/candoc/signoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, clientId, signoffChecklist: checklist, annotatedFindings: local }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (data.error) { setSignoffError(data.error); return }
      onStatusChange('complete')
    } finally { setSigningOff(false) }
  }

  const handleDownload = async (): Promise<void> => {
    const res = await fetch(`/api/admin/candoc/report?clientId=${clientId}`)
    const { downloadUrl } = await res.json() as { downloadUrl?: string }
    if (downloadUrl) window.open(downloadUrl, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--clr-text-secondary)' }}>
          Reviewed: {new Date(findings.reviewedAt).toLocaleString()} · v{findings.version} ·
          Risk: <strong>{findings.overallRiskLevel.toUpperCase()}</strong> · Gaps: {findings.totalGaps}
        </span>
        {status !== 'complete' && (
          <button className="candoc-trigger-btn" onClick={() => void handleSaveAnnotations()} disabled={saving}>
            {saving ? 'Saving…' : 'Save Annotations'}
          </button>
        )}
        {status === 'complete' && (
          <button className="candoc-trigger-btn" onClick={() => void handleDownload()}>
            Download Report PDF
          </button>
        )}
      </div>

      <div className="candoc-layer-grid">
        {local.sopLayers.map((layer, li) => (
          <div key={layer.layer} className="candoc-layer-card">
            <div className="candoc-layer-header">
              <span className="candoc-layer-title">{layer.layer} — {layer.layerName}</span>
              <span className={`candoc-layer-badge ${layer.status}`}>{layer.status}</span>
            </div>
            {layer.findings.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-secondary)', margin: '0.25rem 0 0' }}>
                No findings — layer cleared.
              </p>
            )}
            {layer.findings.map((finding, fi) => (
              <div key={finding.id} className={`candoc-finding ${finding.severity}${finding.isResolved ? ' resolved' : ''}`}>
                {finding.isNew && (
                  <span style={{ background: '#1e3a5f', color: '#60a5fa', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px', marginRight: '0.4rem' }}>NEW</span>
                )}
                {finding.isResolved && (
                  <span style={{ background: '#1a3a2a', color: '#4ade80', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px', marginRight: '0.4rem' }}>RESOLVED</span>
                )}
                <strong>[{finding.severity.toUpperCase()}]</strong> {finding.description}
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-secondary)', marginTop: '0.2rem' }}>
                  Doc: {finding.documentRef} · Action: {finding.suggestedAction}
                </div>
                {status !== 'complete' && (
                  <textarea
                    className="candoc-annotation-input"
                    placeholder="Prash annotation (optional)"
                    value={finding.prashAnnotation ?? ''}
                    onChange={(e) => handleAnnotation(li, fi, e.target.value)}
                  />
                )}
                {status === 'complete' && finding.prashAnnotation && (
                  <div style={{ marginTop: '0.3rem', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--clr-text-secondary)' }}>
                    Note: {finding.prashAnnotation}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {status !== 'complete' && (
        <div className="candoc-signoff-section">
          <div className="candoc-signoff-title">Sign-off Checklist</div>
          {findings.sopLayers.map((layer) => (
            <label key={layer.layer} className="candoc-checklist-item">
              <input
                type="checkbox"
                checked={checklist[layer.layer] ?? false}
                onChange={(e) => setChecklist((prev) => ({ ...prev, [layer.layer]: e.target.checked }))}
              />
              {layer.layer} — {layer.layerName}
            </label>
          ))}
          <button
            className="candoc-signoff-btn"
            disabled={!allLayersChecked || signingOff}
            onClick={() => void handleSignOff()}
          >
            {signingOff ? 'Generating report…' : 'Sign Off & Send Report'}
          </button>
          {signoffError && <div className="candoc-error">{signoffError}</div>}
        </div>
      )}

      {status === 'complete' && (
        <div style={{ marginTop: '1.5rem', color: '#4ade80', fontWeight: 700 }}>
          ✓ Review complete. Report sent to client.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add "CanDoc Review" button to CrmTable.tsx**

In `apps/web/src/app/admin/clients/CrmTable.tsx`, add the `useRouter` import:

```typescript
import { useRouter } from 'next/navigation'
```

Inside the `CrmTable` component function body (top level, with other `useState` calls), add:

```typescript
const router = useRouter()
```

Find the section that renders per-row action buttons for each client `c`. Add this button alongside the existing actions:

```typescript
<button
  style={{
    background: 'none',
    border: '1px solid var(--clr-accent)',
    color: 'var(--clr-accent)',
    borderRadius: '4px',
    padding: '0.25rem 0.6rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }}
  onClick={() => router.push(`/admin/candoc?clientId=${c.id}&name=${encodeURIComponent(c.name)}`)}
>
  CanDoc Review
</button>
```

- [ ] **Step 5: Manual end-to-end test**

1. Go to `/admin/clients`
2. Click "CanDoc Review" on any client row — confirm navigation to `/admin/candoc?clientId=...`
3. Click "Run CanDoc Review" — status badge changes to "Analyzing…"
4. Wait up to 2 minutes — status changes to "Ready to Annotate", findings appear

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin/candoc/ apps/web/src/app/admin/clients/CrmTable.tsx
git commit -m "feat: add CanDoc admin page with findings view and CRM trigger button"
```

---

## Task 4: findings PATCH + signoff stub

**Files:**
- Create: `apps/web/src/app/api/admin/candoc/findings/route.ts`
- Create: `apps/web/src/app/api/admin/candoc/signoff/route.ts`

- [ ] **Step 1: Create findings PATCH route**

File: `apps/web/src/app/api/admin/candoc/findings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candocReviews } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { parseFindings } from '@/lib/candoc-types'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// PATCH /api/admin/candoc/findings
// Body: { reviewId: string, annotatedFindings: FindingsJson }
// Validates via Zod then saves annotatedFindings, sets status to 'annotating'.
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const { reviewId, annotatedFindings } = await req.json() as { reviewId: string; annotatedFindings: unknown }
    if (!reviewId) return NextResponse.json({ error: 'reviewId is required' }, { status: 400 })

    const parsed = parseFindings(annotatedFindings)
    await db
      .update(candocReviews)
      .set({ annotatedFindings: parsed, status: 'annotating', updatedAt: new Date() })
      .where(eq(candocReviews.id, reviewId))

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create signoff route stub**

This stub marks the review complete without generating a PDF. Task 5 replaces it with the full MARP + Blob implementation.

File: `apps/web/src/app/api/admin/candoc/signoff/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candocReviews, clients } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { parseFindings, type FindingsJson } from '@/lib/candoc-types'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// POST /api/admin/candoc/signoff
// Body: { reviewId, clientId, signoffChecklist, annotatedFindings }
// Stub — MARP + Blob + Resend wired in Tasks 5 and 6.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const body = await req.json() as {
      reviewId: string
      clientId: string
      signoffChecklist: Record<string, boolean>
      annotatedFindings: unknown
    }
    const { reviewId, clientId, signoffChecklist, annotatedFindings } = body
    if (!reviewId || !clientId) {
      return NextResponse.json({ error: 'reviewId and clientId are required' }, { status: 400 })
    }

    const parsed: FindingsJson = parseFindings(annotatedFindings)

    const [clientRow] = await db
      .select({ name: clients.name, email: clients.email })
      .from(clients)
      .where(eq(clients.id, clientId))
    if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    await db
      .update(candocReviews)
      .set({
        status: 'complete',
        annotatedFindings: parsed,
        signoffChecklist,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(candocReviews.id, reviewId))

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Manual verification of full annotation flow**

1. Trigger a review and wait for "Ready to Annotate"
2. Add an annotation to one finding → click "Save Annotations" → confirm status becomes "Annotating"
3. Check all SOP layer checkboxes → click "Sign Off & Send Report"
4. Confirm status badge changes to "Complete" and the success message appears

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/admin/candoc/findings/ apps/web/src/app/api/admin/candoc/signoff/
git commit -m "feat: add findings PATCH and signoff stub routes"
```

---

## Task 5: MARP Report + Vercel Blob + Admin /report Route

**Files:**
- Create: `apps/web/src/lib/candoc-marp.ts`
- Create: `apps/web/src/lib/candoc-marp.test.ts`
- Modify: `apps/web/src/app/api/admin/candoc/signoff/route.ts` (full implementation)
- Create: `apps/web/src/app/api/admin/candoc/report/route.ts`

- [ ] **Step 1: Write the failing test**

File: `apps/web/src/lib/candoc-marp.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { buildCandocMarp } from './candoc-marp'
import type { FindingsJson } from './candoc-types'

const sample: FindingsJson = {
  reviewedAt: '2026-05-22T10:00:00.000Z',
  clientId: 'abc',
  version: 2,
  overallRiskLevel: 'major',
  totalGaps: 1,
  sopLayers: [
    { layer: 'S0', layerName: 'Client Profile Baseline', status: 'pass', findings: [] },
    {
      layer: 'S6',
      layerName: 'Proof of Funds',
      status: 'gap',
      findings: [{
        id: 'S6-001',
        severity: 'major',
        description: 'Bank statement older than 6 months',
        documentRef: 'bank.pdf',
        suggestedAction: 'Provide statement within 6 months of e-APR',
        prashAnnotation: 'Client sending updated statement',
      }],
    },
  ],
}

describe('buildCandocMarp', () => {
  it('starts with MARP front matter', () => {
    expect(buildCandocMarp(sample, 'Ravi Kumar')).toContain('---\nmarp: true')
  })

  it('includes the client name', () => {
    expect(buildCandocMarp(sample, 'Ravi Kumar')).toContain('Ravi Kumar')
  })

  it('includes all SOP layer codes', () => {
    const result = buildCandocMarp(sample, 'Ravi Kumar')
    expect(result).toContain('S0')
    expect(result).toContain('S6')
  })

  it('includes the overall risk level', () => {
    expect(buildCandocMarp(sample, 'Ravi Kumar').toLowerCase()).toContain('major')
  })

  it('includes Prash annotation text', () => {
    expect(buildCandocMarp(sample, 'Ravi Kumar')).toContain('Client sending updated statement')
  })

  it('includes the legal disclaimer', () => {
    expect(buildCandocMarp(sample, 'Ravi Kumar')).toContain('informational and guidance purposes only')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npx vitest run src/lib/candoc-marp.test.ts
```

Expected: `FAIL` — `Cannot find module './candoc-marp'`

- [ ] **Step 3: Create candoc-marp.ts**

File: `apps/web/src/lib/candoc-marp.ts`

```typescript
import type { FindingsJson, SopLayerResult } from './candoc-types'

const DISCLAIMER = 'The information provided is for informational and guidance purposes only, based on publicly available IRCC regulations and policies. This does not constitute legal advice. Immigration regulations are subject to frequent change. Verify all information with official IRCC sources (www.canada.ca/immigration).'

const RISK_COLOUR: Record<string, string> = {
  clear: '#4ade80', minor: '#fbbf24', major: '#fb923c', critical: '#f87171',
}

const STATUS_ICON: Record<string, string> = {
  pass: '✅', gap: '⚠️', partial: '🔶', missing: '❌',
}

function layerSlide(layer: SopLayerResult): string {
  const icon = STATUS_ICON[layer.status] ?? '•'
  const findingLines = layer.findings.length === 0
    ? '_No findings — layer satisfies all requirements._'
    : layer.findings.map((f) => {
        const annotation = f.prashAnnotation ? `\n  > **Consultant note:** ${f.prashAnnotation}` : ''
        return `- **[${f.severity.toUpperCase()}]** ${f.description}\n  _Doc: ${f.documentRef} · Action: ${f.suggestedAction}_${annotation}`
      }).join('\n')

  return `---

## ${icon} ${layer.layer} — ${layer.layerName}

**Status:** ${layer.status.toUpperCase()}

${findingLines}
`
}

export function buildCandocMarp(findings: FindingsJson, clientName: string): string {
  const reviewDate = new Date(findings.reviewedAt).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const riskColour = RISK_COLOUR[findings.overallRiskLevel] ?? '#94a3b8'
  const passCount = findings.sopLayers.filter((l) => l.status === 'pass').length

  return `---
marp: true
theme: default
paginate: true
style: |
  section {
    background: #0f172a;
    color: #e2e8f0;
    font-family: 'Inter', sans-serif;
    font-size: 1.1rem;
  }
  h1 { color: #f8a100; font-size: 2rem; }
  h2 { color: #f8a100; font-size: 1.4rem; }
  strong { color: #f8a100; }
  em { color: #94a3b8; font-style: normal; }
  blockquote { border-left: 3px solid #f8a100; padding-left: 1rem; color: #94a3b8; }
---

# Document Review Report

**Client:** ${clientName}
**Review Date:** ${reviewDate}
**Version:** ${findings.version}
**Prepared by:** Visa Forte Consulting — prashant@visaforte.com

---

## Executive Summary

| Metric | Value |
|---|---|
| Layers Reviewed | ${findings.sopLayers.length} |
| Layers Cleared | ${passCount} |
| Layers with Gaps | ${findings.totalGaps} |
| Overall Risk | **${findings.overallRiskLevel.toUpperCase()}** |

<style scoped>strong { color: ${riskColour}; }</style>
${findings.sopLayers.map(layerSlide).join('\n')}
---

## Disclaimer

_${DISCLAIMER}_

---

**Visa Forte Consulting** · visaforte.com · prashant@visaforte.com

_Engineered for Passage._
`
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd apps/web && npx vitest run src/lib/candoc-marp.test.ts
```

Expected: `PASS` — 6 tests passing

- [ ] **Step 5: Replace signoff route with full MARP + Blob implementation**

Replace the entire content of `apps/web/src/app/api/admin/candoc/signoff/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { db } from '@/lib/db'
import { candocReviews, clients } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { uploadFile } from '@/lib/storage'
import { parseFindings, type FindingsJson } from '@/lib/candoc-types'
import { buildCandocMarp } from '@/lib/candoc-marp'

const execFileAsync = promisify(execFile)

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// POST /api/admin/candoc/signoff
// Body: { reviewId, clientId, signoffChecklist, annotatedFindings }
// Generates MARP PDF → uploads to Vercel Blob (private) → marks complete.
// Task 6 adds Resend email delivery.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const body = await req.json() as {
      reviewId: string
      clientId: string
      signoffChecklist: Record<string, boolean>
      annotatedFindings: unknown
    }
    const { reviewId, clientId, signoffChecklist, annotatedFindings } = body
    if (!reviewId || !clientId) {
      return NextResponse.json({ error: 'reviewId and clientId are required' }, { status: 400 })
    }

    const parsed: FindingsJson = parseFindings(annotatedFindings)

    const [clientRow] = await db
      .select({ name: clients.name, email: clients.email })
      .from(clients)
      .where(eq(clients.id, clientId))
    if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const marpMd = buildCandocMarp(parsed, clientRow.name)
    const tmpDir = await mkdtemp(join(tmpdir(), 'candoc-'))
    const mdPath = join(tmpDir, 'report.md')
    const pdfPath = join(tmpDir, 'report.pdf')

    await writeFile(mdPath, marpMd, 'utf-8')
    await execFileAsync('npx', [
      '@marp-team/marp-cli', mdPath, '--pdf', '--output', pdfPath, '--allow-local-files',
    ])

    const pdfBuffer = await readFile(pdfPath)
    const blobPathname = `candoc/${clientId}/v${parsed.version}/report.pdf`
    const { url: reportBlobUrl } = await uploadFile(blobPathname, pdfBuffer, 'application/pdf')

    await unlink(mdPath).catch(() => undefined)
    await unlink(pdfPath).catch(() => undefined)

    await db
      .update(candocReviews)
      .set({
        status: 'complete',
        annotatedFindings: parsed,
        signoffChecklist,
        reportBlobUrl,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(candocReviews.id, reviewId))

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Signoff failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 6: Create admin report download route**

File: `apps/web/src/app/api/admin/candoc/report/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candocReviews } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { generateDownloadUrl } from '@/lib/storage'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// GET /api/admin/candoc/report?clientId=<uuid>
// Returns a signed short-lived download URL for the latest completed review PDF.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  const clientId = new URL(req.url).searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 })

  try {
    const [review] = await db
      .select({ reportBlobUrl: candocReviews.reportBlobUrl })
      .from(candocReviews)
      .where(eq(candocReviews.clientId, clientId))
      .orderBy(desc(candocReviews.version))
      .limit(1)

    if (!review?.reportBlobUrl) {
      return NextResponse.json({ error: 'No report available' }, { status: 404 })
    }

    return NextResponse.json({ downloadUrl: generateDownloadUrl(review.reportBlobUrl) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 7: Run all tests**

```bash
cd apps/web && npx vitest run
```

Expected: All existing tests + new candoc-marp tests pass.

- [ ] **Step 8: Manual verification**

1. Complete a full review through the sign-off step
2. Confirm status shows "Complete" in the UI
3. Click "Download Report PDF" — verify the PDF opens correctly and contains the client name, all SOP layers, and the disclaimer

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/candoc-marp.ts apps/web/src/lib/candoc-marp.test.ts \
  apps/web/src/app/api/admin/candoc/signoff/ apps/web/src/app/api/admin/candoc/report/
git commit -m "feat: MARP PDF generation, Vercel Blob upload, admin report download"
```

---

## Task 6: Resend Email + Client Portal Download Route

**Prerequisites:** Confirm `jose` is installed (`npm list jose` in `apps/web/`). If absent: `npm install jose`. Add to `.env.local`:
```
CLIENT_PORTAL_SECRET=<random 32+ character string>
NEXT_PUBLIC_APP_URL=https://visaforte.com
```

**Files:**
- Create: `apps/web/src/app/api/client/candoc/report/route.ts`
- Modify: `apps/web/src/app/api/admin/candoc/signoff/route.ts` (add JWT + Resend)
- Modify: `apps/web/.env.example` (add new vars)

Note on path depth: `src/app/api/client/candoc/report/route.ts` is also 6 levels from `apps/web/`, so drizzle schema import is `'../../../../../../drizzle/schema'`.

- [ ] **Step 1: Create client portal download route**

File: `apps/web/src/app/api/client/candoc/report/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candocReviews } from '../../../../../../drizzle/schema'
import { generateDownloadUrl } from '@/lib/storage'

// GET /api/client/candoc/report?token=<jwt>
// JWT payload: { reviewId: string }. No admin session — validated via JWT.
// Redirects to signed Blob download URL.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  try {
    const secret = new TextEncoder().encode(process.env.CLIENT_PORTAL_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    const reviewId = payload.reviewId as string
    if (!reviewId) return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 })

    const [review] = await db
      .select({ reportBlobUrl: candocReviews.reportBlobUrl })
      .from(candocReviews)
      .where(eq(candocReviews.id, reviewId))

    if (!review?.reportBlobUrl) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.redirect(generateDownloadUrl(review.reportBlobUrl))
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
}
```

- [ ] **Step 2: Update signoff route — add JWT generation and Resend email**

In `apps/web/src/app/api/admin/candoc/signoff/route.ts`, add these imports after the existing imports:

```typescript
import { SignJWT } from 'jose'
import { Resend } from 'resend'
```

Insert this block after `const { url: reportBlobUrl } = await uploadFile(...)` and before the DB update:

```typescript
    const jwtSecret = new TextEncoder().encode(process.env.CLIENT_PORTAL_SECRET!)
    const portalToken = await new SignJWT({ reviewId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(jwtSecret)

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/client/candoc/report?token=${portalToken}`

    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: 'Visa Forte Consulting <prashant@visaforte.com>',
      to: clientRow.email,
      subject: `Your Immigration Document Review — ${clientRow.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:2rem;border-radius:8px;">
          <h2 style="color:#f8a100;">Your Document Review is Ready</h2>
          <p>Dear ${clientRow.name},</p>
          <p>Prashant Thirthingoth at Visa Forte Consulting has completed a review of your immigration documents against IRCC requirements.</p>
          <p>
            <a href="${portalUrl}" style="background:#f8a100;color:#0f172a;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block;margin:1rem 0;">
              Download Your Review Report
            </a>
          </p>
          <p style="color:#64748b;font-size:0.875rem;">This link expires in 7 days. If you have questions, reply to this email.</p>
          <hr style="border-color:#334155;margin:1.5rem 0;" />
          <p style="color:#64748b;font-size:0.75rem;">The information provided is for informational and guidance purposes only and does not constitute legal advice. Verify all information with official IRCC sources (www.canada.ca/immigration).</p>
          <p style="color:#94a3b8;font-size:0.75rem;">Visa Forte Consulting · visaforte.com · prashant@visaforte.com</p>
        </div>
      `,
    })
```

- [ ] **Step 3: Update .env.example**

Ensure `apps/web/.env.example` contains:

```
# CanDoc Reviewer
CLIENT_PORTAL_SECRET=your_random_32_character_secret_here
NEXT_PUBLIC_APP_URL=https://visaforte.com
```

- [ ] **Step 4: Manual verification**

1. Complete a full review sign-off
2. Check the client email address — confirm the email arrives with the "Download Your Review Report" button
3. Click the button — confirm the PDF downloads correctly
4. Confirm the admin "Download Report PDF" button still works

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/client/candoc/ apps/web/src/app/api/admin/candoc/signoff/ apps/web/.env.example
git commit -m "feat: Resend email delivery and client portal JWT download route"
```

---

## Task 7: Diff Comparison for Re-Reviews

**Files:**
- Create: `apps/web/src/lib/candoc-diff.ts`
- Create: `apps/web/src/lib/candoc-diff.test.ts`

Note: The analyze route already imports and calls `computeDiff` (written in Task 2). This task creates the implementation. The import will resolve correctly once the file exists.

- [ ] **Step 1: Write the failing test**

File: `apps/web/src/lib/candoc-diff.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { computeDiff } from './candoc-diff'
import type { FindingsJson } from './candoc-types'

const base: FindingsJson = {
  reviewedAt: '2026-05-20T10:00:00Z',
  clientId: 'abc',
  version: 1,
  overallRiskLevel: 'major',
  totalGaps: 2,
  sopLayers: [
    {
      layer: 'S6', layerName: 'Proof of Funds', status: 'gap',
      findings: [
        { id: 'S6-001', severity: 'major', description: 'Bank statement too old', documentRef: 'bank.pdf', suggestedAction: 'Resubmit' },
        { id: 'S6-002', severity: 'minor', description: 'Balance below minimum', documentRef: 'bank.pdf', suggestedAction: 'Top up' },
      ],
    },
    {
      layer: 'S7', layerName: 'Passport', status: 'gap',
      findings: [
        { id: 'S7-001', severity: 'critical', description: 'Passport expires in 14 months', documentRef: 'passport.pdf', suggestedAction: 'Renew' },
      ],
    },
  ],
}

const curr: FindingsJson = {
  reviewedAt: '2026-05-22T10:00:00Z',
  clientId: 'abc',
  version: 2,
  overallRiskLevel: 'minor',
  totalGaps: 1,
  sopLayers: [
    { layer: 'S6', layerName: 'Proof of Funds', status: 'pass', findings: [] },
    {
      layer: 'S7', layerName: 'Passport', status: 'gap',
      findings: [
        { id: 'S7-001', severity: 'critical', description: 'Passport expires in 14 months', documentRef: 'passport.pdf', suggestedAction: 'Renew' },
        { id: 'S7-002', severity: 'major', description: 'Page 3 scan illegible', documentRef: 'passport.pdf', suggestedAction: 'Rescan page 3' },
      ],
    },
  ],
}

describe('computeDiff', () => {
  it('marks a finding absent in prev as isNew', () => {
    const result = computeDiff(base, curr)
    const s7 = result.sopLayers.find((l) => l.layer === 'S7')!
    expect(s7.findings.find((f) => f.id === 'S7-002')?.isNew).toBe(true)
  })

  it('does not mark a persisted finding as new', () => {
    const result = computeDiff(base, curr)
    const s7 = result.sopLayers.find((l) => l.layer === 'S7')!
    expect(s7.findings.find((f) => f.id === 'S7-001')?.isNew).toBeUndefined()
  })

  it('injects resolved findings from prev with isResolved=true', () => {
    const result = computeDiff(base, curr)
    const s6 = result.sopLayers.find((l) => l.layer === 'S6')!
    expect(s6.findings.find((f) => f.id === 'S6-001')?.isResolved).toBe(true)
    expect(s6.findings.find((f) => f.id === 'S6-002')?.isResolved).toBe(true)
  })

  it('preserves curr totalGaps unchanged', () => {
    expect(computeDiff(base, curr).totalGaps).toBe(1)
  })

  it('preserves curr overallRiskLevel', () => {
    expect(computeDiff(base, curr).overallRiskLevel).toBe('minor')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && npx vitest run src/lib/candoc-diff.test.ts
```

Expected: `FAIL` — `Cannot find module './candoc-diff'`

- [ ] **Step 3: Create candoc-diff.ts**

File: `apps/web/src/lib/candoc-diff.ts`

```typescript
import type { FindingsJson, SopLayerResult, Finding } from './candoc-types'

// Compares prev review against curr. Findings new to curr get isNew=true.
// Findings present in prev but absent from curr are injected with isResolved=true
// so the UI can show what was fixed since the last review.
export function computeDiff(prev: FindingsJson, curr: FindingsJson): FindingsJson {
  const prevById = new Map<string, Finding>()
  for (const layer of prev.sopLayers) {
    for (const f of layer.findings) prevById.set(f.id, f)
  }

  const currIds = new Set<string>()
  for (const layer of curr.sopLayers) {
    for (const f of layer.findings) currIds.add(f.id)
  }

  const diffLayers: SopLayerResult[] = curr.sopLayers.map((layer) => {
    const annotated: Finding[] = layer.findings.map((f) =>
      prevById.has(f.id) ? f : { ...f, isNew: true }
    )

    const prevLayer = prev.sopLayers.find((l) => l.layer === layer.layer)
    if (prevLayer) {
      for (const pf of prevLayer.findings) {
        if (!currIds.has(pf.id)) annotated.push({ ...pf, isResolved: true })
      }
    }

    return { ...layer, findings: annotated }
  })

  return { ...curr, sopLayers: diffLayers }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd apps/web && npx vitest run src/lib/candoc-diff.test.ts
```

Expected: `PASS` — 5 tests passing

- [ ] **Step 5: Run full test suite**

```bash
cd apps/web && npx vitest run
```

Expected: All tests pass (candoc-types, candoc-marp, candoc-diff, plus all pre-existing tests).

- [ ] **Step 6: Manual re-review test**

1. Run a first review for a client (version 1) — complete it
2. Upload an additional document for the client
3. Click "CanDoc Review" again — trigger version 2
4. After analysis, verify that:
   - Findings fixed since v1 show the green "RESOLVED" badge
   - New findings show the blue "NEW" badge
   - Persisted findings show neither badge

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/candoc-diff.ts apps/web/src/lib/candoc-diff.test.ts
git commit -m "feat: add diff comparison for re-reviews with isNew/isResolved markers"
```

---

## Self-Review

Spec coverage check (17 requirements → task mapping):

| Requirement | Task | Verified |
|---|---|---|
| 17 SOP layers (S0–S16) enumerated in prompt | Task 2, `buildSopPrompt()` | ✓ |
| Single Claude Vision API call | Task 2, analyze route | ✓ |
| `rawFindings` stored as JSONB | Task 1, schema; Task 2, DB update | ✓ |
| Admin-only guard on all `/api/admin/candoc/*` | Tasks 2–5, `requireAdmin()` | ✓ |
| Status lifecycle: pending→analyzing→analyzed→annotating→complete\|error | Task 2, analyze route | ✓ |
| `maxDuration = 120` on analyze route | Task 2 | ✓ |
| Polling every 3s | Task 3, `POLL_MS = 3000` | ✓ |
| Prash annotation per finding | Task 3, `CanDocTool.tsx` | ✓ |
| Sign-off checklist (all layers) | Task 3, `FindingsView` | ✓ |
| MARP PDF generation | Task 5, `buildCandocMarp()` + MARP CLI | ✓ |
| Vercel Blob private upload | Task 5, `uploadFile()` | ✓ |
| Admin report download | Task 5, `/api/admin/candoc/report` | ✓ |
| Resend email to client | Task 6, signoff route | ✓ |
| JWT client portal link (7-day expiry) | Task 6, `jose` SignJWT | ✓ |
| Client download route (no admin session) | Task 6, `/api/client/candoc/report` | ✓ |
| Legal disclaimer in MARP PDF | Task 5, `DISCLAIMER` constant | ✓ |
| Diff comparison (isNew/isResolved) | Task 7, `computeDiff()` | ✓ |

Type consistency check:
- `FindingsJson`, `SopLayerResult`, `Finding` → defined in `candoc-types.ts`, used in all routes, MARP builder, and diff function. No renamed methods between tasks.
- `parseFindings(unknown): FindingsJson` → called in analyze, findings PATCH, and signoff routes.
- `computeDiff(prev: FindingsJson, curr: FindingsJson): FindingsJson` → called in analyze route (Task 2 imports it; Task 7 creates the file).
- `buildCandocMarp(findings: FindingsJson, clientName: string): string` → called in signoff route.
- `requireAdmin()` pattern → identical across all 6 admin routes.

Placeholder scan: No "TBD", "TODO", "implement later", or "similar to Task N" found. All code blocks are complete.

One ordering note: Task 2's analyze route imports `computeDiff` from `candoc-diff.ts`, which is created in Task 7. This means the TypeScript compiler will error on the analyze route until Task 7 is done. **Workaround:** If executing tasks sequentially, create a stub `candoc-diff.ts` after Task 2 (before Task 3) with just the function signature returning `curr` unchanged. Task 7 replaces it with the real implementation. The stub:

```typescript
// Stub — replaced in Task 7 with real diff logic
import type { FindingsJson } from './candoc-types'
export function computeDiff(_prev: FindingsJson, curr: FindingsJson): FindingsJson { return curr }
```
