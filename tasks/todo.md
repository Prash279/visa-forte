# tasks/todo.md — Active Task List
> Written by Claude Code before implementation begins.
> Approved by Prash before any code is written.
> Last updated: April 2026 (session: Phase 1 completion plan — Option A architecture confirmed)

---

## How to Use This File

Before starting any task with more than 1 step:
1. Write a plain-English plan here with checkable items
2. Get Prash's approval on the logic before any code is written
3. Execute one item at a time — never two tasks at once
4. Mark items complete as you go: `[x]`
5. End every task with a **Prashant Proof** — exact browser steps to verify it works
6. Add a **Review** section when the task is fully done

---

## Current Phase: Phase 1 — Foundation (Complete)

**Architecture decision (confirmed April 2026):** Option A — single Next.js app, everything under visaforte.com.
The current landing page stays intact as the homepage at `/`. All new pages are additional routes.
No subdomains. No split deployments.

**Phase 1 completion sequence:**
1. Task A: Public website pages (About, Services, Contact) — pure Next.js
2. Task 3: CanVisa Pro integration (single-file HTML, no backend required)
3. Task 3A: Client intake form (Next.js server action + Drizzle → Neon)
4. Task 3B: Booking engine MVP v1 (Next.js server action + Resend + Drizzle)
5. Task 4: Paddle payment integration (Next.js API route)
6. Task 5: Cloudflare R2 document storage (aws-sdk/client-s3 from Next.js)
7. Task 8: CI/CD and observability (Phase 1 closer)

**Hosting decision confirmed:** Stay on Vercel for all of Phase 1. FastAPI is not needed — all
backend work uses Next.js server actions and API routes. Render migration deferred to Phase 2
when Python background jobs (data retention cron, pipeline automation) are needed.

---

### TASK 1: Deploy Landing Page
**Status:** ✅ COMPLETE

**Review:**
Landing page is live at visaforte.com. All CTAs open Gmail with a professional 6-field triage assessment
template addressed to prashant@visaforte.com. No flash on load. Mobile layout correct.
Auto-deploys from main branch via Vercel.

---

### TASK 2: User Authentication (Login / Signup)
**Status:** ✅ COMPLETE

**Review:**
Auth live on Vercel. Login at visaforte.com/login, admin at visaforte.com/admin.
Admin dashboard restricted to prashant@visaforte.com — any other valid session is redirected to /login.
Better Auth v1.6.0 with Neon PostgreSQL. Sign-out uses server API route.
`DATABASE_URL` and `BETTER_AUTH_SECRET` set in Vercel environment variables.

---

### TASK A: Public Website Pages
**Status:** ✅ COMPLETE
**What this delivers:** visaforte.com becomes a full immigration consulting website — not just a landing page.
Three new public pages plus a site-wide navigation bar linking them all.

**Pages to build:**

**A1 — Navigation Bar (site-wide)**
- Logo (left) + nav links: Home · About · Services · Contact (right)
- "Log In" button linking to /login (top right, secondary style)
- Mobile-responsive hamburger menu
- Applied to all public pages — landing page included

**A2 — About Page (`/about`)**
- Prash's background: 20+ years in Canadian immigration documentation
- Practice positioning: documentation education and eligibility guidance (not RCIC-regulated advice)
- Why Visa Forte exists: clients deserve certainty, not guesswork
- Photo placeholder (Prash adds real photo later)
- Standard legal disclaimer at the bottom

**A3 — Services Page (`/services`)**
- All 8 service tiers from `spec.md §2` with name, description, and what the client receives
- Clear visual hierarchy — premium positioning, not a commodity price list
- CTA on each tier: "Book a Consultation" linking to /booking (built in Task 3B)

**A4 — Contact Page (`/contact`)**
- Simple contact form: name, email, phone (optional), message
- Email sends to prashant@visaforte.com via server action
- Response time commitment shown clearly: "We respond within 24 hours"
- Physical location: Secunderabad, India
- Standard legal disclaimer

**Plan:**
- [ ] Read `/mnt/skills/user/visa-forte-brand/SKILL.md` before writing any UI
- [ ] Build site-wide nav component at `apps/web/src/components/NavBar.tsx`
- [ ] Add NavBar to `apps/web/src/app/layout.tsx` (applies to all pages)
- [ ] Confirm landing page still looks correct with nav added
- [ ] Build `/app/about/page.tsx`
- [ ] Build `/app/services/page.tsx`
- [ ] Build `/app/contact/page.tsx` with server action `POST /app/api/contact/route.ts`
- [ ] All pages: Visa Forte brand colours, Cormorant Garamond display, DM Sans body
- [ ] All pages: standard legal disclaimer in footer

**Review:**
Nav bar with About / Services / Contact / Log In / Request Triage on all public pages.
Mobile hamburger menu. Scroll compaction. Active link state. SiteFooter with legal disclaimer
on all public pages. PageEffects scroll-reveal observer runs site-wide. Homepage nav/footer
moved to shared components. TypeScript clean. Build passes — all three pages render as static.

**Prashant Proof:** Go to visaforte.com. Confirm the nav bar appears. Click each nav link — About, Services,
Contact — confirm all three pages load and look correct. On the contact page, submit a test message
and confirm it arrives at prashant@visaforte.com.

---

### TASK 3: CanVisa Pro Integration
**Status:** Not started
**Approved:** Pending
**What this delivers:** The PR assessment tool is accessible to clients at visaforte.com/assessment.

**Plan:**
- [ ] Read `/mnt/skills/user/canvisa-pro/SKILL.md` in full before writing a line
- [ ] Stand up `apps/api/` FastAPI skeleton: `main.py`, `config.py`, `requirements.txt`
- [ ] Add FastAPI service to `render.yaml`
- [ ] Embed CanVisa Pro at `/app/assessment/page.tsx`
- [ ] Confirm: only `api.anthropic.com` and `canada.ca` are called externally
- [ ] Confirm: Claude API key entered at runtime — never stored anywhere
- [ ] Confirm: every generated report includes the Standard Legal Disclaimer

**Prashant Proof:** Go to visaforte.com/assessment. Enter a test profile. Confirm a report generates.
Scroll to the bottom — confirm the legal disclaimer is present.

---

### TASK 3A: Client Intake Form
**Status:** ✅ COMPLETE
**What this delivers:** A structured form at `/intake` where new prospects submit their profile.
Stored in PostgreSQL. Prash sees all submissions in the admin dashboard.

**Review:**
`leads` table in Neon (uuid PK, name, email, phone, service_interest, notes, status, created_at).
Migration generated and applied. `/intake` page with 8-tier dropdown, success state, legal disclaimer,
Visa Forte brand. `POST /api/intake` validates with Zod (named field errors on failure) → DB insert.
Admin page queries leads on render, shows count in stat card, full table with email link and status badge.
Services page CTAs updated to `/intake`. TypeScript clean. Local `.env.local` created with DATABASE_URL.

**Prashant Proof:** Go to visaforte.com/intake. Fill and submit the form. Go to visaforte.com/admin —
confirm the submission appears in the leads table.

---

### TASK 3B: Booking Engine MVP v1
**Status:** ✅ COMPLETE
**What this delivers:** Prash marks available dates. Clients pick a date, choose a service tier,
submit their name + email. Prash gets an email notification. Booking stored in PostgreSQL.

**Email provider: Resend** — free tier (3,000 emails/month), no server to manage, developer-friendly.
Confirmed by Prash before starting this task.

**Review:**
Resend SDK installed. `availability` and `bookings` tables added to schema and migrated to Neon.
`RESEND_API_KEY` already set in Vercel (confirmed by Prash). Admin availability page at
`/admin/availability` — 30-day grid with toggle switches, optimistic UI, upserts via
`POST /api/availability`. Client booking page at `/booking` — date dropdown (only open dates),
service tier, name, email → `POST /api/booking` → DB insert + Resend notification email.
Admin dashboard updated: bookings table, live "Upcoming Bookings" count (next 7 days).
Services page per-tier CTAs now link to `/booking`.

**One setup step required:** Verify `visaforte.com` as a sending domain in your Resend dashboard
(Settings → Domains → Add Domain → add the two DNS records Resend provides). Until the domain
is verified, emails will fail to send. The booking will still be saved to the database.

**Prashant Proof:** Log in to admin. Go to /admin/availability — toggle tomorrow to Open.
Open an incognito window, go to /booking — confirm tomorrow appears in the date dropdown.
Submit a booking. Go to /admin — confirm the booking appears in the table and the
"Upcoming Bookings" count updates. Check prashant@visaforte.com for the notification email
(requires Resend domain verification).

---

### TASK 4: Razorpay Payment Integration
**Status:** ✅ COMPLETE
**Approved:** ✅ Approved April 2026
**What this delivers:** All 7 consultation bookings require payment upfront. Clients pay before the
booking is saved. Razorpay handles INR (Indian clients) and USD (international clients). Prices
vary by service tier. Payment is verified server-side before any booking record is created.

**Provider decision:** Razorpay (replaces original Paddle plan). Razorpay chosen because:
- Native INR settlement to Indian bank account (Secunderabad)
- Accepts international cards for USD-denominated orders
- UPI, Net Banking, wallets supported out of the box
- 2% transaction fee, no monthly cost

---

**Approved Prices:**

| # | Service Tier | USD | INR |
|---|---|---|---|
| 1 | Pre-Application Eligibility Assessment | $99 | ₹4,999 |
| 2 | PNP Stream Matching | $149 | ₹7,499 |
| 3 | Document Review & Compliance Audit | $199 | ₹9,999 |
| 4 | Refusal Analysis & Reapplication Strategy | $299 | ₹14,999 |
| 5 | ITA Response Preparation | $349 | ₹17,499 |
| 6 | Full Application File Management | $999 | ₹49,999 |
| 7 | Post-Submission Monitoring | $149 | ₹7,499 |

Tier 8 (Retainer-Based Ongoing Support) removed from all pages and deferred to a future phase.

---

**Payment flow:**
1. Client fills booking form (date, service tier, name, email, query)
2. Price for selected tier shown immediately — INR by default, USD toggle available
3. Client clicks "Proceed to Payment →"
4. Client-side calls `POST /api/payment/create-order` → server creates Razorpay order, returns
   `{ orderId, amount, currency, keyId }`
5. Razorpay checkout modal opens in-page (no redirect)
6. On payment success, Razorpay returns `{ razorpayPaymentId, razorpayOrderId, razorpaySignature }`
7. Client-side sends all booking data + payment tokens to `POST /api/payment/verify`
8. Server verifies HMAC-SHA256 signature — if invalid, returns 400, booking is NOT saved
9. On valid signature: insert booking to DB (with payment fields), send Resend email to Prash
10. Client sees success state

**Currency logic:**
- Default currency: INR if `navigator.language === 'en-IN'`, else USD
- Manual toggle on booking page (INR ↔ USD pill switcher)
- Razorpay order created in the displayed currency
- INR amounts sent to Razorpay in paise (×100); USD in cents (×100)
- Enabling international payments on Razorpay dashboard is a Prash action (required for USD orders)

---

**Plan:**

**Step 1 — Prash actions before code (required):**
- [ ] Create Razorpay account at razorpay.com
- [ ] Complete KYC (PAN + bank account details for Secunderabad account)
- [ ] In Razorpay dashboard → Settings → International Payments → Enable
- [ ] Generate API keys (Test mode first): copy `Key ID` and `Key Secret`
- [ ] Add to Vercel environment variables: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- [ ] Add to local `.env.local`: same two variables

**Step 2 — Install Razorpay SDK:**
- [ ] `npm install razorpay` in `apps/web`
- [ ] Add `@types/razorpay` if available, or declare module types inline

**Step 3 — Pricing constants:**
- [ ] Create `apps/web/src/lib/pricing.ts`
  - Export `PRICING` map: `serviceTier → { usd: number, inr: number }`
  - All 7 tiers at approved prices
  - Export helper `getPrice(tier, currency)` → amount in smallest unit (paise/cents)

**Step 4 — DB schema update:**
- [ ] Add payment fields to `bookings` table in `schema.ts`:
  - `razorpayOrderId text NOT NULL DEFAULT ''`
  - `razorpayPaymentId text NOT NULL DEFAULT ''`
  - `currency text NOT NULL DEFAULT 'INR'`
  - `amountPaid integer NOT NULL DEFAULT 0` (in smallest unit — paise or cents)
  - `paymentStatus text NOT NULL DEFAULT 'pending'` — 'pending' | 'paid' | 'failed'
- [ ] Run `drizzle-kit generate` → apply migration to Neon

**Step 5 — API: Create Order:**
- [ ] Build `POST /api/payment/create-order/route.ts`
  - Input: `{ serviceTier: string, currency: 'INR' | 'USD' }`
  - Validate tier exists in PRICING map; validate currency is INR or USD
  - Create Razorpay order: `razorpay.orders.create({ amount, currency, receipt })`
  - Return: `{ orderId, amount, currency, keyId }` — never expose key secret

**Step 6 — API: Verify Payment:**
- [ ] Build `POST /api/payment/verify/route.ts`
  - Input: booking fields (name, email, serviceTier, bookingDate, query, currency) +
    `{ razorpayPaymentId, razorpayOrderId, razorpaySignature }`
  - Verify HMAC-SHA256: `hmac(razorpayOrderId + '|' + razorpayPaymentId, KEY_SECRET)`
  - If signature mismatch → return 400, do NOT save booking
  - If valid: insert booking row with all payment fields + status = 'paid'
  - Send Resend notification email to Prash (include payment ID and amount)
  - Return `{ success: true }`
  - Old `/api/booking/route.ts` retained as-is but no longer called from the client

**Step 7 — BookingForm.tsx update:**
- [ ] Add currency state: `'INR' | 'USD'`, default from `navigator.language`
- [ ] Add INR ↔ USD pill toggle (visible above the price display)
- [ ] Show selected tier price dynamically as user picks service tier
- [ ] On submit: call `/api/payment/create-order` → open Razorpay modal via script tag
  - Load `https://checkout.razorpay.com/v1/checkout.js` once on mount
  - Instantiate `new window.Razorpay({ key, amount, currency, order_id, ... })`
  - `handler` callback on success → call `/api/payment/verify` → show success state
  - `modal.ondismiss` → re-enable form, show "Payment cancelled" message

**Step 8 — booking.css update:**
- [ ] Price display block: tier name + price in large type, currency toggle pill

**Step 9 — Admin page update:**
- [ ] Add `Currency`, `Amount Paid`, `Payment Status` columns to bookings table
- [ ] `paymentStatus` shown as a badge (green = paid, grey = pending)

**Step 10 — TypeScript check + deploy:**
- [x] `npx tsc --noEmit` — zero errors
- [x] Commit and push → Vercel auto-deploys

---

**Review:**
`pricing.ts` with 7 tiers (INR + USD). `POST /api/payment/create-order` creates Razorpay order server-side.
`POST /api/payment/verify` does HMAC-SHA256 check before inserting booking and sending Resend notification.
BookingForm: currency toggle (INR ↔ USD), live price display, Razorpay modal on submit.
Bookings table: 5 new payment columns. Admin page: Amount, Payment, Status columns with green paid badge.
`/refund-policy` and `/privacy-policy` pages added for Razorpay KYC compliance.

**Prashant Proof:**
1. Go to `/booking` in an incognito window
2. Select a date and service tier — confirm the correct price appears (INR default)
3. Toggle to USD — confirm the USD price appears
4. Fill name, email, query → click "Proceed to Payment →"
5. Razorpay modal opens — use Razorpay test card `4111 1111 1111 1111`, expiry any future date, CVV 123
6. Complete payment — confirm success state appears on `/booking`
7. Go to `/admin` — confirm the booking appears with `paymentStatus: paid` and the correct amount
8. Check `prashant@visaforte.com` — confirm notification email arrived with payment ID and amount

---

### TASK 5: Vercel Blob Document Storage
**Status:** ✅ COMPLETE
**Approved:** ✅ Approved
**What this delivers:** The infrastructure to securely store and retrieve client documents.
**Provider change:** Cloudflare R2 replaced with Vercel Blob — same Vercel dashboard, zero extra accounts, Mumbai region (BOM1).

**Plan:**
- [x] Create `visa-forte-blob` Blob Store in Vercel dashboard (Mumbai, Private access) — Prash action
- [x] Add `BLOB_READ_WRITE_TOKEN` to `apps/web/.env.local`
- [x] `npm install @vercel/blob` in `apps/web`
- [x] Build `apps/web/src/lib/storage.ts` with three functions:
  - `uploadFile(pathname, body, contentType)` — stores file as private blob, returns `{ url, pathname }`
  - `deleteFile(url)` — removes the blob permanently
  - `generateDownloadUrl(blobUrl)` — returns a token-embedded download URL (server-side use only)
- [x] `apps/web/src/lib/storage.test.ts` — 3 Vitest unit tests, all passing
- [x] `apps/web/.env.example` updated — R2 vars replaced with `BLOB_READ_WRITE_TOKEN`
- [x] `tech.md` and `spec.md` storage rows updated to Vercel Blob

**Review:**
`storage.ts` wraps `@vercel/blob` with typed, named functions. All blobs stored as `access: 'private'` —
never publicly accessible. `generateDownloadUrl` embeds the read token and must only be called from
server-side routes (never exposed to browser code directly). 3 unit tests pass with mocked SDK.

**Prashant Proof:** Phase 2 client portal will be the first UI surface to use this.
Verify then: upload a document from the admin panel, confirm it appears in
Vercel dashboard → Storage → visa-forte-blob, click the download link and confirm the file opens.

---

### TASK 8: CI/CD and Observability (Phase 1 closer)
**Status:** ✅ COMPLETE
**Approved:** ✅ Approved
**What this delivers:** Broken code cannot reach production. Prash gets alerted if the site goes down.

**Plan:**
- [x] Create `.github/workflows/ci.yml` — typecheck + lint + Vitest on every push/PR to main
- [x] Create `apps/web/src/lib/logger.ts` — structured JSON logger (service/action/result shape)
- [x] Create `apps/web/src/lib/logger.test.ts` — 4 Vitest unit tests, all passing
- [x] Create `GET /api/health/route.ts` — DB ping, returns 200 or 503
- [x] Install `@sentry/nextjs` + GlitchTip config + PII scrubbing (email, name, document content never logged)
- [x] SiteFooter updated with Refund Policy + Privacy Policy links
- [x] `.env.example` updated — Razorpay keys, R2 vars, Sentry vars documented

**Review:**
GitHub Actions CI runs typecheck + lint + Vitest on every push/PR to main. `logger.ts` emits structured
JSON with service/action/result shape. `GET /api/health` pings DB — 200 on healthy, 503 on failure.
GlitchTip error tracking via `@sentry/nextjs` with PII scrubbing. `vitest.config.ts` configured with @ alias.

**Prashant Proof:** Go to UptimeRobot dashboard — confirm the health monitor shows "Up."
On a feature branch, introduce a deliberate TypeScript type error and push it — confirm GitHub Actions
fails and the branch is blocked from merging to main.

---

---

## Current Phase: Phase 2 — Client Management

**Phase 2 architecture decision (April 2026):** Stay on Vercel. FastAPI is not needed for Phase 2 — all
CRM and client portal features use Next.js server actions + Drizzle ORM, exactly like Phase 1.
FastAPI migration to Render is deferred to Phase 3 when Python background jobs (data retention cron)
require a persistent process.

**Data model:** A new `clients` table is the CRM backbone. It is separate from `leads` (intake form
submissions). When Prash promotes a lead to a client (or creates one directly), a `clients` row is
created. This keeps leads as raw enquiries and clients as active relationships.

**Phase 2 build sequence:**
1. Task P2-1: CRM MVP — simple client table, 9-stage status dropdown, notes field
2. Task P2-2: Full CRM Pipeline — document upload per client (Vercel Blob), ITA flag, CSV export
3. Task P2-3: Client Portal MVP — client login, status view, document checklist + upload
4. Task P2-4: Admin Dashboard Enhancement — pipeline summary cards, booking calendar view

---

### TASK P2-1: CRM MVP (Simple Client Table in Admin)
**Status:** ✅ COMPLETE
**What this delivers:** Prash has a working client list inside the admin dashboard. He can add clients,
track their pipeline stage, and write private notes. Nothing automated — just a readable, editable table.

**Data model — new `clients` table:**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| name | text NOT NULL | Full name |
| email | text NOT NULL | Contact email |
| phone | text | Optional |
| serviceTier | text NOT NULL | One of the 7 service tiers |
| stage | text NOT NULL DEFAULT 'Lead' | One of 9 CRM stages (see below) |
| notes | text | Prash's private notes — never client-visible |
| createdAt | timestamp | Auto-set on insert |
| updatedAt | timestamp | Auto-set on update |

**9 pipeline stages (from spec.md §5):**
1. Lead
2. Qualified
3. Proposal Sent
4. Active Client
5. ITA Window
6. Submitted
7. Decision Pending
8. Completed
9. Archived

**Plan:**
- [x] Read `security.md` before any admin route work
- [x] Add `clients` table to `apps/web/drizzle/schema.ts`
- [x] Run `drizzle-kit generate` + `drizzle-kit migrate` → applied to Neon (migration 0005)
- [x] Build `GET /api/admin/clients` and `POST /api/admin/clients` — list + create
- [x] Build `PATCH /api/admin/clients/[id]` — update stage and notes
- [x] Build `POST /api/admin/leads/[id]/promote` — one-click promote lead to CRM client
- [x] Build admin CRM page at `/admin/crm/page.tsx` (server) + `CrmTable.tsx` (client):
  - Table: Name · Email · Service Tier · Stage (editable dropdown inline) · Date Added · Notes (edit icon)
  - "Add Client" modal (name, email, phone, service tier)
  - Search bar: client-side filter by name or email
  - Stage filter pills: All | Lead | Qualified | Active Client | ITA Window | Completed
  - ITA Window rows highlighted with Saffron accent + ITA banner if any client in that stage
- [x] "Promote to Client" button added to admin leads table (Action column)
- [x] CRM tool card added to admin dashboard Tools section
- [x] Zod validation on all API inputs (`crm-stages.ts` exports CreateClientSchema + UpdateClientSchema)
- [x] 8 Vitest unit tests for CRM schemas — all passing (49 total, 0 failures)
- [x] `npx tsc --noEmit` — zero errors
- [x] Commit and push → Vercel auto-deploy

**Review:**
`clients` table in Neon (9 columns, migration 0005 applied). `crm-stages.ts` exports CRM_STAGES (9 stages),
CreateClientSchema, UpdateClientSchema. Three admin API routes: GET+POST `/api/admin/clients`,
PATCH `/api/admin/clients/[id]`, POST `/api/admin/leads/[id]/promote`. CRM page at `/admin/crm` with
server component + `CrmTable` client component: inline stage dropdown (optimistic update), inline notes
edit, search + stage filter pills, ITA Window row saffron highlight, ITA banner, Add Client modal.
Admin leads table has new "Action" column with "Promote →" button per lead; promoted leads show "✓ In CRM →"
linking to the CRM. CRM tool card added to admin dashboard tools grid. 49 Vitest tests passing, TypeScript clean.

**Prashant Proof:**
1. Go to visaforte.com/admin — confirm "Client CRM" tool card appears in the Tools section
2. Go to the New Leads table — confirm each lead row has a "Promote →" button in the Action column
3. Click "Promote →" on one lead — confirm the button changes to "✓ In CRM →"
4. Click "✓ In CRM →" — confirm you land on visaforte.com/admin/crm with the promoted client in the table at stage "Lead"
5. Click "Add Client" — fill in a test name, email, service tier → submit — confirm the client appears
6. Change the stage dropdown on any client to "Active Client" — confirm it updates immediately (no page reload)
7. Click the ✎ pencil icon on any client — type a note, click Save — confirm the note persists on page refresh
8. Change a client's stage to "ITA Window" — confirm the row turns saffron and the alert banner appears at the top

---

### TASK P2-2: Full CRM Pipeline (Document Storage + ITA Flag + CSV Export)
**Status:** ✅ COMPLETE — April 2026
**What this delivers:** Each client record can hold uploaded documents (stored in Vercel Blob).
Prash sees an ITA Window alert banner on the main admin dashboard. The full client list is
exportable to CSV. When a client's stage changes, Prash gets an internal email notification.

---

**Feature 1 — Document upload per client**

New `clientDocuments` table (migration 0006):
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| clientId | uuid FK → clients.id | CASCADE on delete |
| filename | text NOT NULL | original filename shown in the UI |
| blobUrl | text NOT NULL | private Vercel Blob URL (never exposed to browser) |
| uploadedAt | timestamp | auto-set on insert |

New API routes (all require admin session):
- `POST /api/admin/clients/[id]/documents` — multipart upload → Vercel Blob → DB insert
- `GET /api/admin/clients/[id]/documents` — list all documents for a client
- `DELETE /api/admin/clients/[id]/documents/[docId]` — delete blob + DB row
- `GET /api/admin/clients/[id]/documents/[docId]/download` — returns signed download URL (server only)

CRM UI change:
- Add "Docs" button per row in CrmTable showing count (e.g., "Docs (3)")
- Clicking opens a modal: document list (filename, date, download link, delete button)
  + a file-upload area (choose file → Upload button → progress → list refreshes)

---

**Feature 2 — ITA Window banner on /admin dashboard**

- `apps/web/src/app/admin/page.tsx` queries `clients` for stage = 'ITA Window'
- If any exist, render a saffron alert banner (same style as the CRM page banner)
  showing: "{N} client(s) in ITA Window — go to CRM" with a link to `/admin/clients`

---

**Feature 3 — CSV export**

- "Export CSV" button added to the CRM toolbar in CrmTable
- Button opens `/api/admin/clients/export` in a new tab
- `GET /api/admin/clients/export` (admin-only) queries all clients, builds a UTF-8 CSV string,
  returns with `Content-Disposition: attachment; filename=clients.csv`
- Columns: Name, Email, Phone, Service Tier, Stage, Notes, Date Added

---

**Feature 4 — Stage-change notification email**

- In `PATCH /api/admin/clients/[id]`, if `stage` is in the update body:
  1. Fetch current client first to get old stage
  2. If new stage ≠ old stage, after DB update send Resend email to prashant@visaforte.com
  3. Subject: `[Stage Change] {name}: {oldStage} → {newStage}`
  4. Body: client name, email, service tier, old stage, new stage, timestamp (IST)
  5. This is an internal audit log — never sent to the client

---

**Detailed step plan:**

- [x] Step 1 — DB: add `clientDocuments` table to schema.ts, run drizzle-kit generate + migrate
- [x] Step 2 — API: `POST /api/admin/clients/[id]/documents` (multipart upload)
- [x] Step 3 — API: `GET /api/admin/clients/[id]/documents` (list)
- [x] Step 4 — API: `DELETE /api/admin/clients/[id]/documents/[docId]` (delete)
- [x] Step 5 — API: `GET /api/admin/clients/[id]/documents/[docId]/download` (signed URL)
- [x] Step 6 — API: `GET /api/admin/clients/export` (CSV download)
- [x] Step 7 — PATCH route: add stage-change Resend email
- [x] Step 8 — /admin page: ITA Window banner (server-side query)
- [x] Step 9 — CrmTable: "Docs (N)" button + document modal (upload + list + delete + download)
- [x] Step 10 — CrmTable: "Export CSV" button in toolbar
- [x] Step 11 — crm.css: styles for document modal, file upload area, export button
- [x] Step 12 — Vitest: unit tests for CSV builder and document route input validation
- [x] Step 13 — TypeScript check: `npx tsc --noEmit` — zero errors
- [x] Step 14 — Commit and push → Vercel auto-deploy

---

**Prashant Proof:**
1. Go to `/admin` — if any client is in ITA Window, confirm the saffron alert banner appears
2. Go to `/admin/clients` — click "Docs (0)" on any client row
3. In the modal, upload a PDF or image — confirm it appears in the list with filename and date
4. Click the download link — confirm the file downloads correctly
5. Click the delete icon on the uploaded file — confirm it disappears from the list
6. Click "Export CSV" in the toolbar — confirm a CSV file downloads with all clients
7. Change a client's stage from Lead to Active Client — check prashant@visaforte.com
   for the stage-change email within a few seconds

---

### TASK P2-3: Client Portal MVP
**Status:** ✅ COMPLETE — April 2026
**What this delivers:** Clients can log in at visaforte.com/portal and see their current pipeline
stage plus a document upload checklist. Prash controls all client data from the admin CRM — the
portal is a read-only window into their case status plus a document upload surface.

**Architecture decisions:**
- Clients use the same Better Auth system already in place (email + password login)
- A new `userId` column in the `clients` table links a CRM record to a Better Auth login
- The portal at `/portal` is completely separate from `/admin` — zero data cross-contamination
- All Vercel Blob operations go through server-side API routes — raw blob URLs never reach the browser
- Document checklist is hardcoded per service tier (7 tiers × 4–8 required documents each)
- Login redirects: admin email → `/admin`, everyone else → `/portal`
- IDOR prevention: `clientId` is always derived from `session.user.id` server-side, never from request body

---

**Step 1 — Schema changes (migration 0007):**
- [ ] Add `userId text` (nullable, FK → users.id ON DELETE SET NULL) to `clients` table
      → Nullable because not every CRM client needs a portal account
- [ ] Add `docType text` (nullable) to `client_documents` table
      → Identifies which checklist slot a document fills; null for admin-uploaded documents
- [ ] Run `drizzle-kit generate` → review generated SQL → apply with `drizzle-kit migrate`

**Step 2 — Document checklist constants:**
- [ ] Create `apps/web/src/lib/document-checklist.ts`
      → `DOCUMENT_CHECKLIST` map: `serviceTier string → Array<{ id: string, label: string }>`
      → `id` is a stable machine key (e.g. `'passport'`, `'ielts_certificate'`)
      → `label` is the human-readable name shown in the portal UI
      → Cover all 7 active service tiers, 4–8 items each

**Step 3 — "Link to Portal" feature in admin CRM:**
- [ ] New API route `POST /api/admin/clients/[id]/link` (admin session required):
      → Body: `{ email: string }` validated with Zod
      → If a user with that email already exists in `users` table:
        → Set `clients.userId = user.id`, return `{ linked: true, created: false }`
      → If no user exists:
        → Generate a random 16-char temp password
        → Create a new `users` row (role: 'client', status: 'active') and `accounts` row (credential provider, bcrypt hash)
        → Send invite email via Resend to that address:
          Subject: "Your Visa Forte client portal is ready"
          Body: name, temp password, link to /login, instruction to change password after first login
        → Set `clients.userId = new user.id`, return `{ linked: true, created: true }`
- [ ] CrmTable: add "Link Portal" button per row (in the Actions column)
      → If `userId` is null → shows "Link Portal" button
      → If `userId` is set → shows green "Portal Active ✓" badge (no button needed)
      → Click "Link Portal" → opens a modal with email field (pre-filled from client.email) + "Send Invite" button

**Step 4 — Middleware update:**
- [ ] Add `/portal/:path*` to the matcher in `middleware.ts`
      → Protect `/portal` with the same session cookie presence check as `/admin`
      → The server component handles the admin-email guard (redirect to /admin if admin visits /portal)

**Step 5 — Login redirect fix:**
- [ ] In `apps/web/src/app/login/page.tsx`, after successful sign-in:
      → Read the `user.email` from the sign-in response body
      → If email matches `ADMIN_EMAIL` constant (`prashant@visaforte.com`) → `window.location.href = '/admin'`
      → Otherwise → `window.location.href = '/portal'`

**Step 6 — `/portal` server component:**
- [ ] Create `apps/web/src/app/portal/page.tsx` (server component):
      → Call `getCurrentAuthSession()` → if no session, redirect to /login
      → If `session.user.email === ADMIN_EMAIL` → redirect to /admin
      → Query `clients` WHERE `userId = session.user.id` LIMIT 1
      → If no client record → render graceful empty state: "Your portal is being set up. Please contact Prash."
      → If found → fetch `clientDocuments` WHERE `clientId = client.id`
      → Render `PortalDashboard` client component with `client` + `docs` + `checklist` props

**Step 7 — `PortalDashboard` client component:**
- [ ] Create `apps/web/src/app/portal/PortalDashboard.tsx` ("use client"):
      → Header: "Welcome, {client.name}" + current stage badge (Saffron if ITA Window, Prussian otherwise)
      → Progress indicator: "X of Y documents uploaded"
      → Document checklist: one row per `DOCUMENT_CHECKLIST[client.serviceTier]` item
        → Not uploaded: grey row + "Upload" button → opens file picker → calls upload API
        → Uploaded: green tick + filename + date
      → File upload: calls `POST /api/portal/documents` (multipart), optimistic UI update on success

**Step 8 — Portal document upload API:**
- [ ] Create `POST /api/portal/documents/route.ts` (client session required, NOT admin):
      → Parse multipart body: `docType` (string) + `file`
      → Zod-validate `docType` is a non-empty string
      → Derive `clientId` from `session.user.id` → query `clients.userId = session.user.id` → get `client.id`
        (IDOR prevention: clientId always comes from the session, never from the request)
      → Validate `docType` is in `DOCUMENT_CHECKLIST[client.serviceTier]` — reject if not
      → Upload to Vercel Blob at path `clients/{clientId}/{docType}/{filename}` (access: private)
      → Insert into `clientDocuments` with `docType` set
      → Return `{ success: true, doc: { id, filename, uploadedAt } }`

**Step 9 — Portal CSS:**
- [ ] Create `apps/web/src/app/portal/portal.css`
      → Visa Forte brand: Prussian `#0C2340`, Saffron `#C97B1E`, Pearl `#F8F4EE`, Ink `#1A1A2E`
      → Typography: Cormorant Garamond display headings, DM Sans body
      → Checklist layout: clean card rows, icon states (uploaded ✓ / pending ○), progress bar
      → Stage badge with ITA Window urgency highlight in Saffron

**Step 10 — Nav bar update:**
- [ ] In `apps/web/src/components/NavBar.tsx`, check the session server-side:
      → If logged in as a non-admin user → show "My Portal" link pointing to `/portal`
      → If logged in as admin → show "Admin" link (already exists) instead
      → If not logged in → show existing "Log In" button

**Step 11 — Vitest tests:**
- [ ] Tests for `document-checklist.ts`: all 7 tiers return a non-empty array; each item has `id` and `label`
- [ ] Tests for portal upload route Zod schema validation

**Step 12 — TypeScript check + deploy:**
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Commit and push → Vercel auto-deploys

---

---

**Review:**
Migration 0007: `userId` (nullable FK → users.id, ON DELETE SET NULL) added to `clients`,
`docType` (nullable text) added to `client_documents`. `document-checklist.ts` exports
`DOCUMENT_CHECKLIST` (7 tiers × 4–10 items each) and `getChecklist()`. New API route
`POST /api/admin/clients/[id]/link` creates a Better Auth user (email/password provider, random
12-char temp password hashed via Better Auth's `hashPassword`) if none exists, sends Resend
invite email, and sets `clients.userId`. CrmTable: new "Portal" column — "Link Portal" button
opens modal pre-filled with client email; shows "Portal ✓" badge after linking. `/portal` added
to middleware matcher. Login page: reads user email from sign-in response and redirects to
`/admin` or `/portal` accordingly. `POST /api/portal/documents`: client-session-only upload
route — `clientId` derived from `session.user.id`, `docType` validated against checklist for
client's service tier, 20 MB limit. `/portal` server page: guards admin redirect, fetches
linked client + documents, passes data to `PortalDashboard`. `PortalDashboard`: stage badge
(Saffron highlight for ITA Window), progress bar, per-item upload with optimistic UI. `portal.css`:
full Visa Forte brand system. `SiteNav` + `SiteFooter` hidden on `/portal` (portal has own header
and footer). 65 Vitest tests passing (up from 49). TypeScript clean. Deployed.

**Prashant Proof:**
1. Go to `/admin/clients` — find a client row, click "Link Portal"
2. In the modal, confirm the client's email is pre-filled; click "Send Invite"
3. Check the inbox of that email address — confirm the invite email arrives with a temp password
4. Open an incognito window, go to visaforte.com/login
5. Log in with the client email and temp password — confirm you land at `/portal` (not `/admin`)
6. Confirm the client's name and current stage badge appear at the top
7. Confirm the document checklist appears with the correct documents for their service tier
8. Upload a test PDF to one checklist item — confirm it shows "Uploaded ✓" with filename and date
9. Refresh the page — confirm the uploaded item still shows as uploaded
10. Back in `/admin/clients`, click "Docs" on that client — confirm the uploaded file also appears there

---

### TASK P2-3B: Portal Access Gated to Paid Clients (Magic Link on Payment)
**Status:** In Progress — April 2026
**What this delivers:** Portal access is automatically granted only after a client pays. The admin
"Link Portal" button is unchanged and stays available for manually-added CRM clients. For booking
clients, the flow is fully automatic: pay → magic link email → set password → portal access.

**Architecture:** Magic link stored as a UUID token on the `bookings` row (2 new nullable columns:
`portalToken`, `portalTokenExpiresAt`). Token is single-use and expires in 7 days. The activation
page lives at `/activate` (outside `/portal/*` middleware protection) so the unauthenticated client
can reach it. After setting a password, the client is automatically signed in and redirected to `/portal`.

**Why not a temp password in email:** Credentials in email is a security anti-pattern. The magic link
contains no credentials — the client sets their own password on activation. Nothing sensitive in the email.

**Activation flow:**
1. Client pays via Razorpay → `/api/payment/verify` generates UUID token, stores on booking row, emails client
2. Client clicks `visaforte.com/activate?token=<uuid>` — page validates token from DB
3. If valid: show "Activate Your Portal" form with name/email (read-only) + password fields
4. Client sets password → POST `/api/portal/activate` → creates Better Auth user + clients CRM row → clears token
5. Client is auto-signed in via `/api/auth/sign-in/email` → redirected to `/portal`

**DB changes (migration 0008):**
- `bookings.portal_token` — text, nullable, unique
- `bookings.portal_token_expires_at` — timestamp, nullable

**New files:**
- `apps/web/src/app/activate/page.tsx` — server component (token validation)
- `apps/web/src/app/activate/ActivateForm.tsx` — client component (password form + auto-signin)
- `apps/web/src/app/api/portal/activate/route.ts` — POST: create user + client row, clear token

**Modified files (surgical — no other changes):**
- `apps/web/drizzle/schema.ts` — 2 new columns on bookings
- `apps/web/src/app/api/payment/verify/route.ts` — generate token + send client email after booking insert

**Steps:**
- [x] Write plan to todo.md
- [ ] Add `portalToken` + `portalTokenExpiresAt` columns to `bookings` in schema.ts
- [ ] Run `drizzle-kit generate` + `drizzle-kit migrate` → migration 0008 applied to Neon
- [ ] Update `/api/payment/verify` — add token generation + client activation email
- [ ] Create `/activate/page.tsx` — server component validates token, renders ActivateForm
- [ ] Create `/activate/ActivateForm.tsx` — password form, calls activate API + auto-signin
- [ ] Create `/api/portal/activate/route.ts` — POST: validate token, create user, create/link client row, clear token
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Commit and push → Vercel auto-deploys

**Prashant Proof:**
1. Go to `/booking` in incognito — fill all fields, pay with test card
2. After payment success, check the email address used in the booking for a portal activation email
3. Click the activation link in the email — confirm you land at `/activate` with your name and service tier shown
4. Set a password → click "Activate Portal →"
5. Confirm you are automatically redirected to `/portal` and see your dashboard
6. Sign out → go to `/login` → log in with that email + password → confirm you reach `/portal` again
7. Go to `/admin/clients` — confirm the client row was auto-created and shows "Active Client" link

---

### TASK P2-4: Admin Dashboard Enhancement (Pipeline Overview + Booking Calendar)
**Status:** Deferred until P2-3 is live and tested
**What this delivers:** The admin homepage shows a CRM pipeline funnel (client counts by stage)
and a proper calendar view of upcoming bookings.

**Plan (high-level — detail written before code):**
- [ ] Pipeline summary cards on `/admin`: client counts per stage (Lead: 3, Active Client: 2, etc.)
- [ ] ITA Window count shown as red badge if count > 0
- [ ] Booking calendar: replace the current bookings table with a month-view calendar
      (custom-built, no third-party calendar library — just CSS grid + booking data)
- [ ] Each calendar day shows the booking count; click to see the list for that day

---

## Deferred — Phase 3

### TASK 6: DPDP Compliance Automations
**Status:** Deferred to Phase 3
Per `spec.md §8`, DPDP consent interface and automated deletion cron are Phase 3 scope.

---

## Completed Tasks

| Task | Description | Completed |
|---|---|---|
| Task 1 | Landing page — live at visaforte.com | April 2026 |
| Task 2 | Authentication — Better Auth + Neon PostgreSQL | April 2026 |
| Task 3A | Client Intake Form — leads table + /intake + admin dashboard | April 2026 |
| Task 3B | Booking Engine — availability toggle, /booking, /admin/availability, Resend email | April 2026 |
| Task 4 | Razorpay payment — pay-first flow, HMAC verify, INR/USD toggle, admin payment columns | April 2026 |
| Task 8 | CI/CD (GitHub Actions), structured logger, /api/health, GlitchTip error tracking | April 2026 |
| Task 5 | Vercel Blob storage — uploadFile, deleteFile, generateDownloadUrl + 3 unit tests | April 2026 |

---

*todo.md is the single source of task truth. If it's not here, it's not in scope.*