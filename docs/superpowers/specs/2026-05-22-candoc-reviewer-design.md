# CanDoc Reviewer Tool — Design Specification
**Date:** 2026-05-22  
**Owner:** Prashant Thirthingoth · Visa Forte Consulting  
**Status:** Approved for Implementation

---

## 1. Feature Overview

CanDoc Reviewer is an AI-powered document review tool embedded in the Visa Forte Admin Panel. It connects to the client CRM, retrieves all uploaded client documents from Vercel Blob, sends them through a Claude Vision AI pipeline that cross-verifies each document against 17 SOP layers, and generates a detailed Documentation Review Report listing every gap, discrepancy, and corrective action.

The workflow is two-stage: AI does the first-pass review (automated, fast, exhaustive), then Prash annotates and signs off before the report is released to the client.

**Confirmed scope decisions:**
- Admin-triggered (Prash clicks "Run CanDoc Review" on the client record)
- Claude Vision handles all document formats (machine-readable PDFs + scanned images)
- Annotation + sign-off gate combined sequentially
- Report delivery via email (Resend) + client portal download link
- Unlimited versioned re-reviews (v1, v2, v3...) with diff comparison showing new/resolved gaps
- Single-pass Claude analysis (all 17 SOP layers in one API call); raw JSON stored in DB
- Frontend polls DB status every ~3 seconds during analysis

---

## 2. Standard Operating Procedure (SOP) — 17 Layers

All 5 corrections from Prash's review have been applied. This is the authoritative SOP the AI enforces.

### S0 — Client Profile Baseline
Extract from CRM: full name, email, DOB (computed from documents), nationality, current country of residence, service tier. All downstream layers reference this baseline.

### S1 — Express Entry Profile Completeness
Verify: active EE profile exists or intent confirmed; pool entry date recorded; ITA date if received. Check for profile gaps (missing NOC, missing language scores, missing educational history).

**Conditional — Provincial Nomination (PNP):** If the client received a Provincial Nomination Certificate (PNC) through a PNP stream linked to Express Entry, verify the nomination certificate is present, issued by the province, not expired, and the 600-point CRS allocation is reflected in the profile. Flag missing PNC as critical.

**Job offer CRS points — removed March 25, 2025:** Job offer points were eliminated from the CRS on March 25, 2025. If any client EE profile still reflects claimed job offer CRS points (50 or 200), flag this as a profile error that must be corrected before submission. Having a job offer may still be relevant for program eligibility in some streams, but it yields zero CRS points.

### S2 — NOC Verification (TEER 0–3 Only)
Confirm job title maps to a TEER 0, 1, 2, or 3 NOC 2021 code. TEER 4 and 5 are ineligible. Flag if the NOC code on the offer letter / reference letters does not match the claimed code.

### S3 — Language Tests
**English (IELTS General Training / CELPIP General / PTE Core):** Minimum CLB 7 per band (listening, reading, writing, speaking). For IELTS: verify the test is General Training, not Academic. For PTE Core: verify it is PTE Core, not PTE Academic — PTE Academic is not accepted for Express Entry. For PTE Core CLB equivalency, verify scores against the current IRCC conversion table at canada.ca at review time — do not use training data for these thresholds.

**Language test validity (critical):** The test must be less than 2 years old at the time of **e-APR submission** — not the ITA date. ITA is issued up to 60 days before the submission deadline. A test that is valid at ITA may expire before the e-APR is submitted. Flag any test with less than 90 days remaining from the expected submission date and advise the client to re-test.

**French (TEF Canada or TCF Canada):** Only required if client is claiming French language points. If claimed, verify band minimums and test recency. Not required otherwise.

Cross-check: language test name on document must match the test type claimed in the EE profile.

### S4 — Educational Credential Assessment (ECA)
For foreign degrees: ECA from a designated organisation (WES, ICAS, IQAS, MCC, etc.) required. Verify: applicant name matches ECA, degree level matches claimed education points, ECA not expired. IRCC confirms ECAs are valid for **5 years from the date of issue** (for assessments issued on or after April 17, 2013). Check: issue date + 5 years > e-APR submission date. If the issuing body is not WES or IQAS, confirm the body's own internal validity window has not changed.

### S5 — Employment History & Reference Letters
Each job claimed for points needs: company name on letterhead, job title, NOC code, duties description, employment dates (start/end), hours per week, salary, supervisor name + contact, company stamp/seal if required by country.

**Duties–NOC TEER alignment check (critical):** The duties listed in the reference letter must substantively match the lead statement and main duties listed under the claimed NOC 2021 code in the National Occupational Classification. Flag any reference letter where the duties are generic, vague, or describe work that maps to a different (or lower TEER) NOC code — this is one of the most common grounds for IRCC officer refusal.

Cross-check dates against pay stubs, T4s, or tax documents. Flag any gap > 3 months unexplained.

### S6 — Proof of Funds (POF)
**Qualifying assets (Prash's policy):**
| Asset type | Qualifies |
|---|---|
| Chequing / savings account | Yes |
| Fixed deposit / GIC | Yes |
| Mutual funds (liquid) | Yes |
| Gold / jewellery | No |
| Property / real estate | No |
| Equity / stocks | No |

Funds must be unencumbered (not pledged as collateral). Statement must be dated within 6 months of application. Minimum amount per IRCC table for family size (fetch current table at review time from canada.ca — do not use training data). Flag any large deposit in the 90 days before the statement date; request source-of-funds explanation letter.

### S7 — Passport Validity
Per IRCC official guidance, the passport must not expire within 6 months of the **e-APR submission date** (not the PR decision date). Since PR processing takes 6–12 months post-submission, a passport expiring in exactly 6 months from application date could expire mid-processing. Best practice: flag any passport expiring within 18 months of the expected submission date and advise renewal before filing. If applicant has dual nationality, both passports needed. Cross-check: name on passport must match all other documents exactly (including middle name conventions).

### S8 — Police Clearance Certificates (PCC)
**Rule:** Required for every country (excluding Canada) where the applicant has lived for 6 or more consecutive months since age 18.

Canada is explicitly excluded — IRCC handles any Canadian residence check internally. No RCMP certificate is required or accepted for Canadian residence periods.

For each qualifying country, verify PCC is present, issued by the correct authority, covers the correct period, and is accompanied by a certified translation if not in English or French.

**Validity windows (confirmed from IRCC):**
- **Country of current residence:** PCC must be issued no more than **6 months** before the e-APR submission date. Flag any PCC for the current country that is older than 6 months.
- **All other qualifying countries (past residence):** PCC must be issued after the last date the applicant resided there for 6 or more consecutive months. No fixed time-based expiry applies, but IRCC may request updated certificates during processing if the original is deemed stale.

Note: "typically 3 months" is a common misconception — the official IRCC rule is 6 months for the country of current residence.

### S9 — Medical Examination
Confirm IME completed by a Panel Physician designated by IRCC. Verify: all family members included (spouse, dependent children), IME reference number recorded, results uploaded via IRCC secure portal if required, no outstanding medical inadmissibility flags noted in client file.

### S10 — Civil Status Documents
Marriage certificate (if applicable): certified copy + translation. Divorce decree (if applicable): final order, not just separation agreement. Death certificate of former spouse (if applicable). Common-law affidavit + cohabitation evidence if relevant. All documents: notarised or apostilled as required by the issuing country.

**Spouse's own document package (if spouse is accompanying):**
- Spouse passport: apply same validity rule as S7 (must not expire within 18 months of application date — best practice).
- Spouse PCC: apply same rule as S8 for each qualifying foreign country where the spouse lived 6+ months since age 18 (Canada excluded).
- Spouse language scores: required only if the EE profile claims CRS points for spouse's English or French ability. Verify test type, CLB minimums, and that the test is not expired at e-APR submission date.
- Spouse ECA: required only if the EE profile claims CRS education points for the spouse's foreign credential. Apply same 5-year validity rule as S4.
- Spouse IME: covered under S9.
- Spouse photos: covered under S12.

### S11 — Dependent Children
For each dependent child: birth certificate + certified translation, proof of relationship to applicant (DNA or adoption order if surname differs), school enrolment letter or custody order if child lives apart from applicant. Child passport validity check (same rule as S7).

### S12 — Photos
The Express Entry e-APR is submitted online. IRCC requires a **digital photo upload** — not physical prints. The "35mm × 45mm / two identical prints" specification applies to temporary resident visa applications and must not be confused with the e-APR requirements.

**Digital photo requirements for the e-APR:**
- Format: JPG
- White or off-white background; no patterns or shadows
- Taken within the last 6 months (reflects current appearance)
- No glasses
- Full face visible, neutral expression, mouth closed
- Head must fill 70–80% of the frame
- Verify pixel dimensions and file size against the current IRCC digital photo guide at canada.ca at review time — these specifications can be updated.

**PR card photos (separate, post-approval stage):** After the PR is approved, IRCC will request physical photos for the PR card — 50mm × 70mm, two identical prints. This is a distinct stage and is NOT part of the e-APR document package reviewed here.

Cross-check that one digital photo per person (including spouse and each dependent) has been prepared to the above standard.

### S13 — Forms Completeness
All required IRCC forms present and signed: e-APR forms if electronic, or paper forms (IMM 0008, IMM 5406, IMM 5562, IMM 5669, IMM 5476 if applicable, IMM 5475 if applicable). No blank mandatory fields. Dates in DD-MM-YYYY format unless the form specifies otherwise. Signatures and dates match.

### S14 — Fees & Payment Confirmation
Pay all fees — processing fee + Right of Permanent Residence Fee (RPRF) — at the time of application submission via the IRCC secure account. No advance payment or pre-payment is required or recommended before the submission date. Verify: payment receipt uploaded, amount matches current IRCC fee schedule for family size (fetch from canada.ca at review time), payment method was Visa/MC/bank draft as accepted by IRCC. No 72-hour advance rule exists — this is a common misconception.

### S15 — Consistency Cross-Check
Final layer: run a name consistency check (same spelling across all documents), date consistency check (employment dates match across reference letters, pay stubs, and EE profile), address consistency check (current address matches on all forms), and family member count consistency (same dependants listed on all forms). Flag any mismatch for correction.

### S16 — Biometrics
**Confirmed IRCC requirement:** Every PR applicant aged 14–79 must provide biometrics (fingerprints + photo) for each permanent residence application, even if biometrics were previously provided and are still within their 10-year validity window. Children under 14 are exempt.

**Pre-submission checks:**
- Confirm the biometrics fee is included in the total fee payment submitted with the e-APR (see S14). Failure to pay the biometrics fee is grounds for application return.
- Identify all accompanying family members aged 14–79 — each requires biometrics enrollment.
- If the client has previously provided biometrics for a prior Canadian application, note the prior enrollment date. Even with valid biometrics on file, IRCC currently requires re-enrollment for each new PR application.

**Post-submission process (advise client):**
- After the e-APR is submitted and deemed complete, IRCC will issue a Biometric Instruction Letter (BIL).
- The client must enroll biometrics at a designated Visa Application Centre (VAC) within **30 days** of the BIL date.
- Failure to enroll within 30 days will result in application abandonment.
- Biometrics validity: 10 years from enrollment date.

---

## 3. Database Schema

### New table: `candocReviews`

```typescript
candocReviews = pgTable('candoc_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  status: text('status').notNull().default('pending'),
  // status values: 'pending' | 'analyzing' | 'analyzed' | 'annotating' | 'complete' | 'error'
  triggeredAt: timestamp('triggered_at').notNull().defaultNow(),
  analyzedAt: timestamp('analyzed_at'),
  completedAt: timestamp('completed_at'),
  rawFindings: jsonb('raw_findings'),
  // Structured JSON from Claude — see AI output schema in Section 5
  annotatedFindings: jsonb('annotated_findings'),
  // Same structure as rawFindings, with Prash's per-finding annotations added
  signoffChecklist: jsonb('signoff_checklist'),
  // { checkedAt, checkedBy, overrideNotes, approved: boolean }
  reportBlobUrl: text('report_blob_url'),
  // URL of the final MARP-generated PDF in Vercel Blob
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**Index:** `(clientId, version)` — unique constraint to prevent duplicate version numbers per client.

No changes to existing `clients` or `clientDocuments` tables.

---

## 4. API Routes

All routes live under `/api/admin/candoc/`. All routes are server-side only. No secrets, Blob URLs, or client PII ever reach the browser.

### POST `/api/admin/candoc/trigger`
- Auth guard: session email must be `prashant@visaforte.com`
- Input: `{ clientId: string }`
- Action: Fetch client record + all `clientDocuments` for this client. Compute next version number (max(version) + 1). Insert a `candocReview` row with `status: 'pending'`. Return `{ reviewId, version }`.
- Does NOT start AI analysis — that is a separate call to avoid blocking.

### POST `/api/admin/candoc/analyze`
- Auth guard: session email must be `prashant@visaforte.com`
- Input: `{ reviewId: string }`
- Action: Set `status: 'analyzing'`. Download all documents server-side using signed Vercel Blob URLs (never exposed to browser). Build Claude Vision API call (see Section 5). On success: store raw findings in `rawFindings`, set `status: 'analyzed'`, set `analyzedAt`. On error: set `status: 'error'`, set `errorMessage`.
- **`maxDuration: 120`** — must be set in route config (Vercel function timeout).
- This route is called by the frontend immediately after trigger returns.

### GET `/api/admin/candoc/status`
- Auth guard: session email must be `prashant@visaforte.com`
- Input: `?reviewId=<uuid>`
- Returns: `{ status, version, rawFindings, annotatedFindings, signoffChecklist }`
- Used by frontend polling (every 3 seconds) to detect when analysis completes.

### PATCH `/api/admin/candoc/findings`
- Auth guard: session email must be `prashant@visaforte.com`
- Input: `{ reviewId: string, annotatedFindings: FindingsJson }`
- Action: Overwrite `annotatedFindings` column. Set `status: 'annotating'`. Return updated review.
- Called each time Prash saves partial annotations.

### POST `/api/admin/candoc/signoff`
- Auth guard: session email must be `prashant@visaforte.com`
- Input: `{ reviewId: string, overrideNotes: string, approved: boolean }`
- Action: Write `signoffChecklist`, set `status: 'complete'`, set `completedAt`. Trigger report generation (MARP → PDF). Upload PDF to Vercel Blob. Store `reportBlobUrl`. Send Resend email to client.
- Returns: `{ reportBlobUrl }` (this is the server-side Blob URL for the admin download link — not exposed to client directly).

### GET `/api/admin/candoc/report`
- Auth guard: session email must be `prashant@visaforte.com`
- Input: `?reviewId=<uuid>`
- Action: Fetch `reportBlobUrl` from DB. Generate a signed short-lived download URL from Vercel Blob. Return it to the admin browser.
- The client portal download uses a separate authenticated client-facing route that checks the client's own session.

---

## 5. AI Pipeline

### Document ingestion
All documents for the client are fetched server-side using signed Vercel Blob URLs. PDFs are sent as base64-encoded file content. Claude Vision handles both machine-readable PDFs (text layer extracted) and scanned images (OCR via vision).

### Single API call structure
One call to `claude-sonnet-4-6` with vision enabled. The prompt contains:
1. Client profile baseline (name, DOB, nationality, service tier, CRM data)
2. All 17 SOP layers (S0–S16) as a structured system prompt
3. All client documents as vision attachments
4. Output schema instructions (structured JSON)

### Output schema (stored as `rawFindings`)
```typescript
interface FindingsJson {
  reviewedAt: string          // ISO timestamp
  clientId: string
  version: number
  sopLayers: SopLayerResult[]
  overallRiskLevel: 'clear' | 'minor' | 'major' | 'critical'
  totalGaps: number
}

interface SopLayerResult {
  layer: string               // e.g. "S6"
  layerName: string           // e.g. "Proof of Funds"
  status: 'pass' | 'gap' | 'missing' | 'partial'
  findings: Finding[]
}

interface Finding {
  id: string                  // e.g. "S6-001"
  severity: 'info' | 'minor' | 'major' | 'critical'
  description: string         // plain English description of the gap
  documentRef: string         // which document the finding came from
  suggestedAction: string     // what needs to be done to fix it
  isNew?: boolean             // populated during diff comparison
  isResolved?: boolean        // populated during diff comparison
  prashAnnotation?: string    // populated by Prash during annotation step
}
```

### Diff comparison
When a re-review (v2, v3, ...) completes, compare finding IDs against the previous version. Mark `isNew: true` for findings not in the previous version, `isResolved: true` for findings in the previous version that no longer appear. This populates the diff summary shown in the UI ("3 new gaps found since Review v1").

---

## 6. Admin UI

### Entry point: CRM client record
Add a "Run CanDoc Review" button to the client detail view in `/admin/clients/[id]`. This button is only visible to `prashant@visaforte.com`. It triggers `POST /api/admin/candoc/trigger` then `POST /api/admin/candoc/analyze`.

### Main page: `/admin/candoc`
Server component at `apps/web/src/app/admin/candoc/page.tsx`:
- Auth guard: same pattern as `canvisa-pro/page.tsx`
- Fetches all candocReviews with status and client name
- Passes data as props to `CanDocTool.tsx` (client component)

Client component `CanDocTool.tsx` manages three views:
1. **Review list** — table of all reviews across all clients with status badges and "Open" links
2. **Analysis in progress** — spinner + polling status display (polls `/api/admin/candoc/status` every 3 seconds)
3. **Annotation view** — findings rendered by SOP layer; each finding has a text area for Prash's annotation; "Save annotations" button; "Sign off & Release" button

### Status badges
`pending` → grey · `analyzing` → amber (animated) · `analyzed` → blue · `annotating` → purple · `complete` → green · `error` → red

### Diff summary
At the top of the annotation view for re-reviews: "3 new gaps · 2 resolved since Review v1"

---

## 7. Report Generation

Pattern matches CanVisa Pro. MARP CLI (`@marp-team/marp-cli` v4.3.1) generates the PDF on the server side.

**Report sections:**
1. Cover page — client name, review date, version number, Prash's sign-off name
2. Executive summary — overall risk level, total gaps by severity
3. Findings by SOP layer (S0–S16) — each gap listed with severity, description, suggested action, and Prash's annotation
4. Diff summary (re-reviews only) — new gaps vs. resolved gaps vs. Review v1
5. Sign-off block — Prash's override notes, approval date, disclaimer

**Disclaimer (mandatory on every report):**
> *The information provided is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements before taking any action.*

MARP generates the PDF server-side. The PDF is uploaded to Vercel Blob (private). A signed short-lived URL is generated for admin download and for the client portal link included in the email.

---

## 8. Email Delivery

Sent via Resend after sign-off. Template:
- **To:** client email (from CRM)
- **Subject:** "Your Documentation Review Report is Ready — Visa Forte Consulting"
- **Body:** greeting, brief explanation of the report, link to download (client portal authenticated URL, 7-day expiry), Prash's name + disclaimer
- **Attachment:** PDF report attached directly as well (belt-and-suspenders)

Client portal download endpoint: `/api/client/candoc/report?token=<signed-jwt>` — validates JWT, fetches Blob URL server-side, streams PDF. JWT is signed with the server secret, embeds `clientId + reviewId + expiry`. Never exposes the raw Blob URL.

---

## 9. Security Controls

- All document fetching and Claude API calls are server-side only. No Blob URL or Claude API key ever reaches the browser.
- Admin routes check `session.user.email === 'prashant@visaforte.com'` on every request — not just on page load.
- Client PII (name, email, DOB, passport data) never appears in server logs, error messages, or console output.
- `errorMessage` column stores only technical error text, never raw client document content.
- Client portal JWT is signed with `process.env.CANDOC_JWT_SECRET` (backend only).
- `ANTHROPIC_API_KEY` stays in `.env.local`, accessed only in server-side API routes.
- No `console.log` calls in production routes.

---

## 10. Error Handling & Async Polling

**Analyze route failures:**
- Claude API timeout or error → set `status: 'error'`, store error message, return 500
- Blob download failure → same
- Partial Claude response (malformed JSON) → attempt JSON repair; if unrecoverable, set `status: 'error'`

**Frontend polling:**
- Poll every 3 seconds while `status === 'analyzing'`
- Stop polling when status transitions to `analyzed` or `error`
- On `error`: show error message with "Retry" button (re-triggers analyze route only, not trigger)
- On `analyzed`: render annotation view
- Max polling duration: 3 minutes; after that, show timeout message and ask Prash to check server logs

**Retry logic:**
- Each "Retry" creates a new review row (increments version) — no mutation of errored rows
- Errored rows are kept for audit trail

---

## 11. Testing Plan

### Unit tests (Vitest)
- Diff comparison function: `computeDiff(v1Findings, v2Findings)` → correct `isNew` / `isResolved` flags
- Findings JSON schema validator: well-formed input passes, malformed input throws
- JWT signing + verification for client portal download tokens

### Integration tests
- POST `/api/admin/candoc/trigger` with valid `clientId` → creates review row with correct version
- POST `/api/admin/candoc/trigger` twice for same client → second row has `version: 2`
- PATCH `/api/admin/candoc/findings` → updates `annotatedFindings` in DB
- POST `/api/admin/candoc/signoff` → sets `status: 'complete'`, stores `reportBlobUrl`
- Unauthenticated requests to all admin routes → 401
- Non-admin authenticated requests → 403

### Manual verification (Prashant Proof)
1. Go to `/admin/clients`, open a test client record.
2. Click "Run CanDoc Review" — confirm spinner appears.
3. Wait for analysis to complete (status badge turns blue).
4. Open annotation view — confirm findings are grouped by SOP layer.
5. Add an annotation to one finding, click "Save annotations".
6. Click "Sign off & Release" — confirm status turns green.
7. Check test email inbox — confirm report email received with PDF attached.
8. Click the portal download link in the email — confirm PDF downloads correctly.
9. Run a second review on the same client — confirm version shows v2 and diff summary appears.

---

## 12. Phased Delivery

| Phase | Deliverable |
|---|---|
| 1 | DB migration (add `candocReviews` table) |
| 2 | API routes: trigger, analyze, status |
| 3 | Admin UI: CRM button + polling status view |
| 4 | Annotation + sign-off UI |
| 5 | MARP report generation + Vercel Blob upload |
| 6 | Resend email delivery + client portal download |
| 7 | Diff comparison for re-reviews |

Each phase is independently deployable. Phase 1 is a schema migration — Halt-and-Ask before running.

---

*Design spec v1.0 — Visa Forte Consulting — 2026-05-22*
