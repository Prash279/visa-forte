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
- [x] Read `/mnt/skills/user/visa-forte-brand/SKILL.md` before writing any UI
- [x] Build site-wide nav component at `apps/web/src/components/NavBar.tsx`
- [x] Add NavBar to `apps/web/src/app/layout.tsx` (applies to all pages)
- [x] Confirm landing page still looks correct with nav added
- [x] Build `/app/about/page.tsx`
- [x] Build `/app/services/page.tsx`
- [x] Build `/app/contact/page.tsx` — mailto handler; server action deferred to Task 3B (Resend)
- [x] All pages: Visa Forte brand colours, Cormorant Garamond display, DM Sans body
- [x] All pages: standard legal disclaimer in footer

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
**Status:** ✅ COMPLETE — May 2026
**Approved:** Yes (Prash directed build)
**What this delivers:** The PR assessment tool is accessible to clients at visaforte.com/assessment.

**Architecture note (revised from original):** No FastAPI needed. The CRS engine already runs
entirely client-side via `@/lib/crs-calculator`. No backend, no Render, no Claude API key input.
The MARP download remains in the admin tool only. Staying on Vercel.

**Plan:**
- [x] Read visa-forte-brand SKILL.md before any UI work
- [x] Create `apps/web/src/app/assessment/AssessmentTool.tsx` — client component
  - Same CRS calculation engine as admin tool
  - Visa Forte brand (Prussian/Saffron/Pearl), NOT the dark consultant theme
  - Same form fields as admin, minus `strategyTitle` and `currentEmployer` (internal only)
  - Client-friendly result view: score card, eligibility, gaps, scenarios, CTA, disclaimer
  - No MARP download button (consultant-only feature stays at /admin/canvisa-pro)
- [x] Create `apps/web/src/app/assessment/assessment.css` — Visa Forte brand CSS
- [x] Create `apps/web/src/app/assessment/page.tsx` — public server component (no auth)
- [x] Add "Assessment" link to `SiteNav.tsx`
- [x] `npx tsc --noEmit` — zero errors
- [x] Commit and push → Vercel auto-deploys

**Prashant Proof:**
1. Go to visaforte.com/assessment (no login required)
2. Fill in any profile data — age, education, IELTS scores, work experience
3. Click "Check My Eligibility →" — confirm the result view appears with a CRS score
4. Scroll down — confirm the legal disclaimer block is visible at the bottom
5. Click "Book a Consultation →" — confirm it links to /booking

**Review:**
Public CRS assessment live at visaforte.com/assessment — no login required. Visa Forte brand
(Prussian/Saffron/Pearl light theme). Full form: marital status, date of birth (age auto-calculated),
education, first/second language (IELTS GT/Academic, CELPIP, TEF, TCF), Canadian work experience,
foreign work experience, certificate of qualification, job offer, sibling in Canada, spouse sub-section.
Result view: CRS score card, FSW eligibility verdict (green/red border), gap analysis, scenario
improvements, pool draw context, legal disclaimer. Post-launch polish: DOB picker replacing age input,
children section, family size and settlement funds auto-population, FSW ineligibility improvement path,
Settlement Funds card mobile alignment. FSW grid total corrected to /100. All tests passing. TypeScript clean.

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
**Status:** ✅ COMPLETE — April 2026
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
- [x] Add `portalToken` + `portalTokenExpiresAt` columns to `bookings` in schema.ts
- [x] Run `drizzle-kit generate` + `drizzle-kit migrate` → migration 0008 applied to Neon
- [x] Update `/api/payment/verify` — add token generation + client activation email
- [x] Create `/activate/page.tsx` — server component validates token, renders ActivateForm
- [x] Create `/activate/ActivateForm.tsx` — password form, calls activate API + auto-signin
- [x] Create `/api/portal/activate/route.ts` — POST: validate token, create user, create/link client row, clear token
- [x] `npx tsc --noEmit` — zero errors
- [x] Commit and push → Vercel auto-deploys

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
**Status:** ✅ COMPLETE — April 2026
**What this delivers:** The admin homepage shows a CRM pipeline funnel (client counts by stage)
and a proper month-view calendar of all bookings. Both sections replace the current flat list/table
approach with a more actionable visual format.

---

**Feature 1 — Pipeline Overview section**

A horizontal strip of 9 compact cards, one per CRM stage, inserted between the existing metric cards
and the New Leads section. Each card shows the stage name and the count of clients in that stage.
ITA Window card gets a saffron count number and border if count > 0 (reinforces urgency without
duplicating the existing ITA banner).

Server-side query: `GROUP BY stage COUNT(*)` on the `clients` table. Map to all 9 CRM_STAGES
so stages with zero clients still render as "0" (no missing card).

No new API route needed — data is fetched in the existing `/admin` server component.

---

**Feature 2 — Booking Calendar**

Replace the current "Bookings" section table (all-time flat list) with a month-view calendar.
- Custom-built: CSS Grid, 7 columns, no external calendar library.
- Navigation: ← Prev / Next → buttons to move between months.
- Each day cell: shows the day number. If any bookings fall on that date, shows a saffron count badge.
- Clicking a day with bookings reveals a detail panel below the grid: booking name, email, service
  tier, payment status badge, and amount paid.
- Today's date is highlighted (saffron day number).
- The ← Prev / Next → navigation resets the selected day.
- The "Upcoming Bookings" metric card (next 7 days count) stays in place — the calendar is a
  complement, not a replacement for that KPI.

Architecture:
- `BookingCalendar.tsx` — "use client" component (needs state: currentMonth + selectedDate)
- Server passes `bookings` array (serializable scalar fields only — no Date objects), `initialYear`,
  `initialMonth`, `today` (all derived from IST todayIST in the server component)
- The `createdAt` timestamp is excluded from the props (not needed for calendar display)

---

**Step plan:**

- [x] Step 0 — Write plan to todo.md
- [x] Step 1 — Create `apps/web/src/app/admin/BookingCalendar.tsx` ("use client")
- [x] Step 2 — Update `apps/web/src/app/admin/page.tsx` — pipeline query + calendar integration
- [x] Step 3 — Update `apps/web/src/app/admin/admin.css` — pipeline + calendar styles
- [x] Step 4 — `npx tsc --noEmit` — zero errors
- [x] Step 5 — Commit and push → Vercel auto-deployed

---

---

**Review:**
`BookingCalendar.tsx` ("use client"): month-view CSS grid calendar with prev/next navigation,
saffron count badges on booking days, today date highlighted, click-to-expand detail panel
(name / email / service / payment badge / amount). Props: `bookings[]`, `initialYear`,
`initialMonth`, `today` — all scalar/serializable (no Date objects). `admin/page.tsx`: added
`sql` GROUP BY query for pipeline stage counts, `stageCountMap` fills zero for all 9 stages,
`bookingsForCalendar` strips `createdAt` before passing to client component. New "Pipeline
Overview" section (9-card horizontal strip) inserted after metrics, before Leads. Bookings flat
table replaced with `<BookingCalendar />`. `admin.css`: pipeline strip flex layout + compact cards
with saffron ITA highlight; calendar grid, DOW headers, cell states (has-bookings, selected,
today), count badge, detail panel rows. Mobile responsive breakpoints added for both sections.
TypeScript clean. Deployed.

**Prashant Proof:**
1. Go to visaforte.com/admin — confirm the "Pipeline Overview" strip appears between metrics and New Leads
2. Count the cards — confirm all 9 stages appear, each with a number (0 or actual count)
3. If any client is in ITA Window, confirm that card has a saffron count number
4. Scroll to the Bookings section — confirm the flat table is gone and a calendar grid appears
5. Confirm the current month and year are shown in the header
6. Click ← Prev — confirm the calendar moves to the previous month
7. Click Next → — confirm it returns to the current month
8. If any day has bookings, click it — confirm a detail panel appears below the grid with booking details
9. Click the same day again — confirm the detail panel collapses

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
| Task 3 | CanVisa Pro Integration — public CRS assessment at /assessment | May 2026 |
| Task 3A | Client Intake Form — leads table + /intake + admin dashboard | April 2026 |
| Task 3B | Booking Engine — availability toggle, /booking, /admin/availability, Resend email | April 2026 |
| Task 4 | Razorpay payment — pay-first flow, HMAC verify, INR/USD toggle, admin payment columns | April 2026 |
| Task 8 | CI/CD (GitHub Actions), structured logger, /api/health, GlitchTip error tracking | April 2026 |
| Task 5 | Vercel Blob storage — uploadFile, deleteFile, generateDownloadUrl + 3 unit tests | April 2026 |
| Task P3-1 | Messaging System (Full) — threading, read receipts, unread dot, attachments, transcript, SLA indicators | May 2026 |
| Task P3-2 | Automated Email Notifications — 24h reminders + SLA breach alerts | April 2026 |
| Task P3-3 | DPDP Consent Interface + Deletion Cron — consent forms + portal deletion request + admin approve/reject + nightly purge cron | May 2026 |
| Task P3-4 | Post-Submission Monitoring — AOR tracking, IRCC queries, portal status view, deadline cron alerts | May 2026 |

---

---

## Phase 3 — Communication & Automation (Plan — Awaiting Prash Approval)

**Prerequisite:** Task P3-2B (portal access gating via magic link) is currently In Progress and must be completed before Phase 3 build begins.

**Phase 3 scope (from spec.md §8):**
1. Messaging system
2. Automated email notifications (booking confirmation, SLA reminders)
3. DPDP consent interface + automated deletion cron
4. Post-submission monitoring workflow

**Hosting:** Stays on Vercel throughout Phase 3. The deletion cron runs as a Vercel Cron job (TypeScript API route) — no FastAPI, no Render migration needed. `render.yaml` is written and ready; Render migration is deferred to when FastAPI is genuinely needed (Phase 4 or when CanVisa Pro gets a server-side Python AI component).

**Build sequence:**
1. Complete P3-2B (open task, Phase 2 carryover)
2. P3-1: Messaging System MVP → Full
3. P3-2: Automated Email Notifications
4. P3-3: DPDP Consent Interface + Deletion Cron
5. P3-4: Post-Submission Monitoring Workflow

---

### TASK P3-1: Messaging System

**Status:** ✅ COMPLETE (Full — Steps 1–17) — May 2026
**Stack:** Next.js + Drizzle + Vercel (no FastAPI needed)

**What this delivers (MVP v1):**
Prash sends a message to any client from the admin CRM. The client sees it on their portal dashboard and can reply once. No threading, no attachments, no SLA indicators in v1.

**What this delivers (Full, built after MVP is stable):**
Threaded messages per case. Read receipts. File attachments via Vercel Blob. Transcript download via signed URL (per security.md §5). SLA indicators in Prash's admin view.

---

**Data model — new `messages` table (migration 0009):**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| clientId | uuid FK → clients.id | CASCADE on delete |
| senderRole | text NOT NULL | `'admin'` or `'client'` |
| senderId | text NOT NULL | admin email or Better Auth user.id |
| body | text NOT NULL | message content |
| isRead | boolean DEFAULT false | flips when recipient views it |
| readAt | timestamp | nullable — set when isRead flips |
| createdAt | timestamp | auto-set |

---

**MVP step plan:**

- [x] Step 1 — DB: add `messages` table to `schema.ts`, run `drizzle-kit generate` + `drizzle-kit migrate` (migration 0009)
- [x] Step 2 — API: `POST /api/admin/clients/[id]/messages` — admin sends a message (admin session required, Zod-validate body)
- [x] Step 3 — API: `GET /api/admin/clients/[id]/messages` — admin lists all messages for a client (admin session required)
- [x] Step 4 — API: `POST /api/portal/messages` — client sends a reply (client session required; derive clientId from session — never from request body; enforce one-reply-per-thread limit in MVP)
- [x] Step 5 — API: `GET /api/portal/messages` — client views their messages (session-derived clientId)
- [x] Step 6 — CRM UI: add "Message" button per client row in `CrmTable.tsx`; click opens a compose modal with a textarea + Send; after send, modal shows "Sent ✓"
- [x] Step 7 — Admin message list: in the compose modal (or a separate panel), show the full message thread for that client — admin message, then any client reply
- [x] Step 8 — Portal UI: add a "Messages" card to `PortalDashboard.tsx` — shows latest unread message from Prash (Prussian blue card, Saffron border if unread); reply textarea shown below if client has not yet replied; if replied, show "Replied ✓"
- [x] Step 9 — `portal.css` + `crm.css`: message card, compose modal, reply thread styles
- [x] Step 10 — Vitest: tests for message route Zod schemas (invalid body, missing clientId, client session impersonation attempt)
- [x] Step 11 — `npx tsc --noEmit` — zero errors; commit + push

---

**Review:**
`messages` table in Neon (8 columns, migration 0009 applied). `GET` + `POST /api/admin/clients/[id]/messages`:
admin-session-only routes — GET returns full thread ordered by `createdAt ASC`, POST inserts with
`senderRole: 'admin'`. `GET` + `POST /api/portal/messages`: client-session-only routes — `clientId`
always derived from `session.user.id` (IDOR prevention), POST enforces one-reply-per-thread in MVP.
`CrmTable.tsx`: `MsgRow` type, message state + handlers, "✉" button per row opens a compose modal
with scrollable thread (Prussian admin bubbles / Saffron-bordered client bubbles) + textarea compose form.
`PortalDashboard.tsx`: `useEffect` fetches thread on mount, Messages section shows all bubbles,
reply form appears if admin has sent at least one message and client hasn't replied; "Replied ✓"
confirmation shown after first reply. `crm.css` + `portal.css`: bubble layout, sender labels,
timestamps, reply form, "Replied ✓" badge — all Visa Forte brand. 77 Vitest tests passing (up from 65).
`messages.test.ts`: 9 tests covering admin schema validation, client reply schema, and one-reply logic.
TypeScript clean. Committed and pushed — Vercel auto-deploys.

**Prashant Proof (MVP):**
1. Go to `/admin/crm` — click "✉" on any client row
2. Type a test message → click Send — confirm modal shows "Sent ✓" and the message appears in the thread
3. Open incognito → log in as that client → go to `/portal`
4. Confirm the Messages section appears at the bottom with your message in a Prussian blue bubble
5. Type a reply → click Reply — confirm "Replied ✓" appears
6. Back in admin `/admin/crm` → open the Message modal for that client — confirm the client's reply is visible in the thread

---

**Full messaging additions (after MVP is live and tested):**

- [x] Step 12 — Threading: group messages chronologically per client; admin can reply to a client's reply; remove one-reply limit
- [x] Step 13 — Read receipts: when client opens the portal and the Messages card renders, call `PATCH /api/portal/messages/read` to mark all admin messages as read; return 204 — admin CRM shows unread count badge per client row
- [x] Step 14 — Unread badge: `CrmTable` row shows a saffron dot next to the client name if they have an unread message from the client waiting
- [x] Step 15 — File attachments: extend `POST /api/admin/clients/[id]/messages` to accept multipart with optional file; upload to Vercel Blob at `clients/{id}/messages/{filename}`; store `attachmentUrl` on message row; render download link in thread
- [x] Step 16 — Transcript download: implement `GET /api/admin/clients/[id]/messages/transcript` per security.md §5 — assembles thread, writes to temp Vercel Blob object, returns signed URL (15-min expiry), logs event to `auditLog`
- [x] Step 17 — SLA indicators: add `slaBreachedAt` computed field — in admin CRM view, if oldest unanswered client message is older than 24 hours (or 12 hours for ITA Window clients), flag the row with a red ⚠ indicator

---

**Review (P3-1 Full Messaging — Steps 12–17):**
One-reply limit removed from `POST /api/portal/messages` (Step 12 — clients can now send multiple messages).
Read receipts: `PATCH /api/portal/messages/read` marks all admin messages as read on portal mount;
`PATCH /api/admin/clients/[id]/messages/read` marks all client messages as read when admin opens the modal (Step 13).
Unread dot: `CrmTable` row shows saffron dot on the ✉ button when the client has unread messages waiting; dot clears on modal open (Step 14).
File attachments: `POST /api/admin/clients/[id]/messages` accepts multipart/form-data with optional file (Step 15);
`attachmentUrl` column added to `messages` table (migration 0013); admin and portal thread bubbles render a download link;
`GET /api/admin/clients/[id]/messages/[msgId]/attachment` and `GET /api/portal/messages/[msgId]/attachment` return signed download URLs.
Transcript: `GET /api/admin/clients/[id]/messages/transcript` assembles full thread as `.txt`, writes to Vercel Blob, returns signed URL, logs to `auditLog` (Step 16).
SLA indicators: `isSlaBreached()` in `CrmTable.tsx` compares `oldestUnreadClientMsgTs` against 12h (ITA Window) or 24h (all other stages); red ⚠ appears left of the ✉ button when breached (Step 17).
`messages.test.ts` updated: one-reply tests removed, `SLA threshold logic` describe block added with 6 tests.
TypeScript clean. Migration 0013 generated (apply with `npx drizzle-kit migrate`).

---

**Prashant Proof (MVP):**
1. Go to `/admin/crm` — click "Message" on any client row
2. Type a test message → click Send — confirm modal shows "Sent ✓"
3. Open incognito → log in as that client → go to `/portal`
4. Confirm the Messages card appears with your message text
5. Type a reply → click Reply — confirm "Replied ✓" appears
6. Back in admin `/admin/crm` → open the Message modal for that client — confirm the client's reply is visible

---

### TASK P3-2: Automated Email Notifications

**Status:** ✅ COMPLETE — April 2026
**Stack:** Next.js + Resend + Vercel Cron (no FastAPI needed)

**What this delivers:**
Three automated emails that currently do not exist or are incomplete:
1. Client booking confirmation (client currently receives no email after paying — only Prash does)
2. 24-hour appointment reminder sent to both client and Prash the day before
3. SLA breach alert sent to Prash when a message has gone unanswered past the threshold

---

**Email 1 — Client booking confirmation (surgical change to existing route):**

- [x] Step 1 — In `POST /api/payment/verify/route.ts`, after the booking insert and Prash notification email, add a second `resend.emails.send()` call addressed to `booking.email` (the client):
  - Subject: `Your Visa Forte consultation is confirmed — {serviceTier}`
  - Body: booking date, service tier, what to expect, next steps (Prash will be in touch within 24 hours), Prash's contact email
  - Visa Forte brand styling (same HTML email template pattern as existing Resend calls)

---

**Email 2 — 24-hour appointment reminder:**

**DB change (migration 0010):**
Add `reminderSent boolean NOT NULL DEFAULT false` to the `bookings` table.

**Vercel Cron setup:**
- Add `vercel.json` at the project root (or update if it exists) with:
  ```json
  { "crons": [{ "path": "/api/cron/reminders", "schedule": "30 0 * * *" }] }
  ```
  (00:30 UTC = 06:00 IST — runs daily before business hours)
- Create `GET /api/cron/reminders/route.ts`:
  - Verify `Authorization: Bearer {CRON_SECRET}` header (Vercel passes this automatically)
  - Query: bookings WHERE `bookingDate = tomorrow` AND `reminderSent = false` AND `paymentStatus = 'paid'`
  - For each: send Resend email to client + a copy to Prash; set `reminderSent = true`
  - Return `{ sent: N }` — log via `lib/logger.ts`
- Add `CRON_SECRET` to `.env.local` and Vercel environment variables

**Step plan:**
- [x] Step 1 — Client booking confirmation: already delivered in P2-3B (the portal activation email confirms the booking date and service tier — no additional email needed)
- [x] Step 2 — Add `reminderSent` column to `bookings` in `schema.ts`; run `drizzle-kit generate` + `drizzle-kit migrate` (migration 0010)
- [x] Step 3 — Create `GET /api/cron/reminders/route.ts` — CRON_SECRET header check, tomorrow's bookings query, Resend email pair, update `reminderSent`
- [x] Step 4 — Add cron schedule to `apps/web/vercel.json` (30 0 * * * = 06:00 IST daily)
- [x] Step 5 — Add `CRON_SECRET` to `.env.example` (add to Vercel dashboard + `.env.local` manually)
- [x] Step 6 — Extend cron to check SLA: unread client messages past 24h (12h for ITA Window) → digest email to Prash
- [x] Step 7 — Vitest: 6 unit tests for tomorrowIST (date boundary, month/year rollover) and slaThresholdMs in `helpers.ts`
- [x] Step 8 — `npx tsc --noEmit` — zero errors; commit + push

---

**Review:**
Email 1 (client booking confirmation) was already delivered in P2-3B — the portal activation email
confirms the booking date, service tier, and payment received. No new email needed.

`bookings.reminderSent boolean DEFAULT false` added (migration 0010 applied to Neon).
`helpers.ts` exports `tomorrowIST()` (tomorrow's date in IST as YYYY-MM-DD, handling month and year
boundaries) and `slaThresholdMs()` (12h for ITA Window, 24h for all other stages).
`GET /api/cron/reminders/route.ts`: verifies `Authorization: Bearer {CRON_SECRET}` header; queries
tomorrow's paid bookings where `reminderSent = false`; sends client reminder + Prash copy via Resend;
marks `reminderSent = true` per booking; then queries all unread client messages, joins with clients
for stage, filters by SLA threshold, groups by client (oldest message age), sends one SLA digest
email to Prash if any breaches found. Logs all outcomes via `lib/logger.ts`.
`apps/web/vercel.json` updated with `"crons": [{ "path": "/api/cron/reminders", "schedule": "30 0 * * *" }]`.
`.env.example` updated with `CRON_SECRET` documentation. 83 Vitest tests passing (up from 77). TypeScript clean.

**One manual step required:**
Add `CRON_SECRET` to Vercel dashboard → Settings → Environment Variables (generate with `openssl rand -hex 32`).
Vercel automatically passes this as `Authorization: Bearer {CRON_SECRET}` on cron invocations.
Also add to `.env.local` for local testing.

---

**Prashant Proof:**
1. Create a booking for tomorrow using test card; pay — check client email inbox for confirmation email
2. In Vercel dashboard → Deployments → Functions → trigger `GET /api/cron/reminders` manually (or set bookingDate to today and run)
3. Confirm reminder email arrives in the client's inbox + a copy at prashant@visaforte.com
4. Send a test client message from portal; wait (or manually set createdAt to 25 hours ago in DB); trigger cron — confirm SLA alert email arrives at prashant@visaforte.com

---

### TASK P3-3: DPDP Consent Interface + Automated Deletion Cron

**Status:** ✅ COMPLETE — May 2026
**Stack:** Next.js + Vercel Cron throughout — no Render migration needed for Phase 3

**Architecture decision (confirmed):** The deletion cron runs as a Vercel Cron job calling a Next.js API route in TypeScript. All operations (DB via Drizzle, blob delete via `@vercel/blob`, email via Resend) already have working implementations in this codebase. The Render + FastAPI migration is deferred to when Python is genuinely needed — most likely when CanVisa Pro gets a server-side AI component. `render.yaml` remains ready for that trigger.

**Timeout safeguard:** The deletion API route processes clients in batches of 20 per run to stay well within Vercel's 60-second serverless limit. Vercel Cron runs daily — any overflow is processed the following day.

**What this delivers:**
- DPDP-compliant consent checkbox wired to every data-collection form
- Client portal "Data & Privacy" section showing what data is held and a deletion request button
- Admin view of pending deletion requests with Approve / Reject
- Automated TypeScript cron that deletes Archived client records older than 2 years

---

**Sub-task P3-3A: Consent Interface (Next.js)**

**DB changes (migration 0011):**
Add to `clients` table:
- `consentGiven boolean NOT NULL DEFAULT false`
- `consentGivenAt timestamp` (nullable)

New `deletionRequests` table:
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| clientId | uuid FK → clients.id | CASCADE |
| requestedAt | timestamp | auto-set |
| status | text DEFAULT 'pending' | `'pending'` \| `'approved'` \| `'rejected'` |
| adminNotes | text | nullable — Prash's response note |
| processedAt | timestamp | nullable — set when approved/rejected |

New `auditLog` table (used by deletion cron and transcript download):
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| event | text NOT NULL | `'client_deleted'` \| `'transcript_downloaded'` \| `'deletion_requested'` \| `'deletion_approved'` |
| actorId | text | admin email or `'cron'` |
| targetClientId | uuid | nullable |
| metadata | jsonb | nullable — e.g. `{ filesDeleted: 12, reason: "retention_policy" }` |
| createdAt | timestamp | auto-set |

**Step plan:**
- [x] Step 8 — DB: add consent columns + `deletionRequests` table + `auditLog` table to `schema.ts`; generate + apply migration 0011
- [x] Step 9 — Build `ConsentCheckbox.tsx` component (per security.md §8.1 design) — checkbox + plain-language copy; `onConsent` callback prop
- [x] Step 10 — Wire `ConsentCheckbox` into `/intake` form — add `consentGiven` field to Zod schema; store `consentGiven + consentGivenAt` on `clients` row at creation
- [x] Step 11 — Wire `ConsentCheckbox` into `/booking` form — consent required before payment proceeds; pass `consentGiven` to `/api/payment/create-order`
- [x] Step 12 — Wire `ConsentCheckbox` into `/activate` form — consent required at portal activation; store on `clients` row when client record is created
- [x] Step 13 — Portal "Data & Privacy" section: new bottom section in `PortalDashboard.tsx`
  - Shows: name, email, service tier, document count, consent date
  - "Request Data Deletion" button → opens confirmation modal with plain-language warning
  - On confirm: `POST /api/portal/deletion-request` → insert `deletionRequests` row + log to `auditLog`
  - Button becomes "Request Submitted" after click (one request at a time)
- [x] Step 14 — `POST /api/portal/deletion-request/route.ts` — client session required; derive clientId from session; reject if existing pending request; insert row; log event
- [x] Step 15 — Admin deletion requests view: new card in `/admin` page (or tab in CRM) — lists pending deletion requests with client name, email, request date; Approve / Reject buttons with notes field
- [x] Step 16 — `PATCH /api/admin/deletion-requests/[id]/route.ts` — admin approves or rejects; on approval: immediately delete client's Vercel Blob folder + cascade-delete DB rows + log to `auditLog`
- [x] Step 17 — Vitest: 17 tests — ActionSchema (approve/reject/invalid/notes boundary), hasPendingRequest() logic, VALID_AUDIT_EVENTS (5 events), batch cap (BATCH_LIMIT=20), email gate

---

**Sub-task P3-3B: Automated Deletion Cron (TypeScript / Vercel Cron)**

- [x] Step 18 — Add deletion cron to `vercel.json` (alongside the reminders cron): `{ "path": "/api/cron/data-retention", "schedule": "30 20 * * *" }` (20:30 UTC = 02:00 IST — runs nightly)
- [x] Step 19 — Create `GET /api/cron/data-retention/route.ts`: CRON_SECRET header check; batch-20 query of Archived clients older than 2 years; blob delete + cascade-delete + auditLog per client; Resend summary email when count > 0; log via logger.ts
- [x] Step 20 — Vitest: batch cap, email gate, VALID_AUDIT_EVENTS, and hasPendingRequest tests in `deletion.test.ts` (17 tests — 100 total passing)
- [x] Step 21 — auditLog last-run indicator in admin footer: queries most recent `client_deleted` cron entry, counts records deleted on same UTC day, renders "Last retention run: {date} — {N} records deleted" or "No retention runs yet."

---

**Review:**
`deletionRequests` and `auditLog` tables added to schema + migration 0011. `consentGiven boolean DEFAULT false`
and `consentGivenAt timestamp` added to `clients` table. `ConsentCheckbox.tsx` wired into `/intake`,
`/booking`, and `/activate` — all three forms block submission if consent is not checked.
`PortalDashboard.tsx` has a new "Data & Privacy" section at the bottom: shows name, email, service tier,
consent date, and a deletion request state machine (idle → confirming → submitting → pending/done).
`GET /api/portal/deletion-request` returns `{ hasPending }`. `POST /api/portal/deletion-request` enforces
one pending request at a time, inserts row, writes auditLog event `deletion_requested`.
`DeletionRequestsPanel.tsx` renders in admin dashboard under "Data Deletion Requests" — lists pending
requests with Approve + Reject buttons and optional admin notes field.
`PATCH /api/admin/deletion-requests/[id]` approves (delete blobs + cascade-delete client row + auditLog
`deletion_approved`) or rejects (update status + auditLog `deletion_rejected`).
`GET /api/cron/data-retention`: CRON_SECRET auth, batch cap of 20, purges Archived clients older than 2 years
(blob delete → cascade → auditLog `client_deleted` per client), sends Resend summary email to Prash if count > 0.
Admin footer shows "Last retention run: {date} — {N} records deleted" (or "No retention runs yet.").
17 new Vitest tests in `deletion.test.ts` — 100 total passing. TypeScript clean. Committed.

**One manual step required before cron fires:**
Add `CRON_SECRET` to Vercel dashboard → Settings → Environment Variables (generate with `openssl rand -hex 32`).
Also add to `.env.local` for local testing.
Also apply migration 0011 to Supabase: run `npx drizzle-kit migrate` from `apps/web/` after confirming `DATABASE_URL` is set in `.env.local`.

**Prashant Proof:**
1. Go to `/intake` — confirm consent checkbox appears at the bottom; try to submit without checking it — form should not proceed
2. Go to `/booking` — confirm consent checkbox appears; try to proceed to payment without checking it — button should be disabled
3. Log in as a test client → go to `/portal` → scroll to the bottom → confirm "Data & Privacy" section shows your name, email, service tier, and consent date
4. Click "Request Data Deletion" → confirm confirmation step appears → click Confirm → button should change to "Request Pending"
5. Go to `/admin` → scroll to "Data Deletion Requests" section → confirm the request appears with client name and date
6. Click "Approve & Delete" — confirm client disappears from `/admin/clients` and files disappear from Vercel Storage dashboard
7. Go back to `/admin` → scroll to the footer → confirm "Last retention run:" or "No retention runs yet." appears
8. In Vercel dashboard → Settings → Cron Jobs → confirm `data-retention` cron is listed at `30 20 * * *`

---

### TASK P3-4: Post-Submission Monitoring Workflow

**Status:** ✅ COMPLETE — May 2026
**Stack:** Next.js + Drizzle (admin UI + portal view); Vercel Cron for deadline alerts

**What this delivers:**
An operational tracking layer for clients whose applications have been submitted to IRCC. Prash can log the AOR number, submission date, expected decision date, and any IRCC queries (Additional Documents Requests) with response deadlines. Clients in "Submitted" or "Decision Pending" stages see a read-only status summary in their portal. Prash gets an alert email when an IRCC query deadline is approaching.

This directly supports Tier 7 (Post-Submission Monitoring) and all Tier 5/6 clients who have submitted.

---

**Data model — new `applicationMonitoring` table (migration 0012):**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| clientId | uuid FK → clients.id | CASCADE — one record per client |
| aorNumber | text | IRCC Acknowledgement of Receipt number |
| submittedAt | date NOT NULL | date application was submitted |
| expectedDecisionDate | date | nullable — estimated by Prash |
| lastStatusCheck | date | nullable — last time Prash checked IRCC portal |
| irccPortalStatus | text | nullable — free-text note from IRCC portal (e.g., "In Progress") |
| monitoringNotes | text | nullable — Prash's private observations (never client-visible) |
| createdAt | timestamp | auto-set |

**New `irccQueries` table:**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| clientId | uuid FK → clients.id | CASCADE |
| queryType | text NOT NULL | e.g., "Additional Documents Request", "Medical Update", "Background Check" |
| receivedAt | date NOT NULL | date query arrived from IRCC |
| responseDeadline | date NOT NULL | last date to respond |
| responseSubmittedAt | date | nullable — date response was sent to IRCC |
| status | text DEFAULT 'Open' | `'Open'` \| `'Responded'` \| `'Overdue'` |
| notes | text | nullable — Prash's internal notes on this query |
| createdAt | timestamp | auto-set |

---

**Step plan:**

- [x] Step 1 — DB: add `applicationMonitoring` + `irccQueries` tables to `schema.ts`; migration 0012 generated
- [x] Step 2 — API: `GET+POST /api/admin/clients/[id]/monitoring` — upsert via onConflictDoUpdate on clientId
- [x] Step 3 — API: `POST /api/admin/clients/[id]/queries` — log a new IRCC query
- [x] Step 4 — API: `PATCH /api/admin/clients/[id]/queries/[queryId]` — update query status
- [x] Step 5 — Admin monitoring page at `/admin/monitoring` + `MonitoringPanel.tsx` + `monitoring.css`
- [x] Step 6 — Admin dashboard: Monitoring stat card + Post-Submission Monitoring tool card
- [x] Step 7 — Portal: Application Status section in PortalDashboard (submission date, IRCC status, open query notice; AOR/notes never exposed)
- [x] Step 8 — Cron: Email 4 — IRCC deadline digest for queries due within 3 days
- [x] Step 9 — 22 new Vitest tests in monitoring.test.ts — 122 total passing, 0 failures
- [x] Step 10 — `npx tsc --noEmit` zero errors; committed (a710ee1)

---

**Prashant Proof:**
1. Go to `/admin/monitoring` — confirm the page loads showing any clients in Submitted/Decision Pending stage
2. Click "Edit" on a client — fill AOR number, submission date, expected decision date → Save; confirm values persist on refresh
3. Add an IRCC query (type: "Additional Documents Request", received today, deadline in 2 days) → confirm it appears in the query log with status "Open"
4. Log in as that client in an incognito window → go to `/portal` → confirm "Application Status" section appears with submission date and IRCC portal status; confirm AOR number is NOT visible
5. Mark the query as Responded → confirm status changes to "Responded" in the admin view
6. Trigger the reminders cron manually — confirm Prash receives the deadline alert email if any queries are within 3 days

---

**Review (P3-4):**
`applicationMonitoring` (unique FK per client) + `irccQueries` tables added; migration 0012 generated.
`monitoring-schemas.ts`: `CreateMonitoringSchema`, `CreateQuerySchema`, `UpdateQuerySchema` + `isOverdue`/`isDeadlineWithin` helpers.
`GET+POST /api/admin/clients/[id]/monitoring`: upsert via `onConflictDoUpdate` on `clientId`.
`POST /api/admin/clients/[id]/queries`: log new IRCC query.
`PATCH /api/admin/clients/[id]/queries/[queryId]`: update status (Open → Responded/Overdue) with optional `responseSubmittedAt`.
`/admin/monitoring`: server component fetches Submitted+Decision Pending clients + monitoring + queries;
`MonitoringPanel` client component: table with inline Edit panel (all monitoring fields, private notes), IRCC query log
with overdue row highlights and "Mark Responded" button, and new query form (type dropdown, dates, notes).
Admin dashboard: "Monitoring" stat card (client count + open query count); "Post-Submission Monitoring" tool card.
`portal/page.tsx`: fetches `applicationMonitoring` + checks open `irccQueries` for Submitted/Decision Pending clients.
`PortalDashboard.tsx`: "Application Status" section — submittedAt, IRCC portal status, last check date, open query notice.
AOR number and monitoring notes intentionally excluded from portal view.
Cron extended with Email 4: digest to Prash for open queries with deadline ≤ today+3, sorted by urgency with days-left column.
22 new Vitest tests — 122 total passing. TypeScript clean.

**One manual step required:**
Run `npx drizzle-kit migrate` from `apps/web/` with `DATABASE_URL` set in `.env.local` to apply migration 0012 to Supabase.

**Prashant Proof:**
1. Go to `/admin/monitoring` — confirm the page loads showing any clients in Submitted/Decision Pending stage
2. Click "Edit" on a client — fill AOR number, submission date, expected decision date → Save; confirm values persist on refresh
3. Add an IRCC query (type: "Additional Documents Request", received today, deadline in 2 days) → confirm it appears in the query log with status "Open"
4. Log in as that client in an incognito window → go to `/portal` → confirm "Application Status" section appears with submission date and IRCC portal status; confirm AOR number is NOT visible
5. Mark the query as Responded → confirm status changes to "Responded" in the admin view
6. Trigger the reminders cron manually — confirm Prash receives the deadline alert email if any queries are within 3 days
7. Go to `/admin` — confirm the Monitoring stat card shows the client count and open query count; confirm the "Post-Submission Monitoring" tool card links to `/admin/monitoring`

---

---

## P4-1 — canada.ca Monitoring Pipeline

**Status:** COMPLETE (local build verified; live end-to-end test via GitHub Actions `workflow_dispatch` required — see Prashant Proof)

**Delivers:** A scheduled Python pipeline (`pipeline/`) that scrapes four canada.ca data sources every 6 hours via GitHub Actions and writes results to the Supabase DB. Enables the frontend to read live IRCC data from the DB instead of static JSON files.

**Scrapers:**
- `ee_draws` — Express Entry draw history (JSON feed, append-only)
- `processing_times` — PR processing times (SPA page, graceful skip)
- `proof_of_funds` — LICO/proof-of-funds table (HTML, upsert snapshot)
- `fee_schedule` — IRCC fee schedule (HTML, upsert snapshot)

**Plan:**
- [x] Step 1 — `pipeline/scraper/base.py`: abstract base with httpx client, 60s timeout, 3-retry exponential backoff, context manager
- [x] Step 2 — `pipeline/scraper/ee_draws.py`: JSON feed parser, `_clean_int` strips commas, draws → list of dicts
- [x] Step 3 — `pipeline/scraper/processing_times.py`: HTML parser, returns None gracefully (SPA page)
- [x] Step 4 — `pipeline/scraper/proof_of_funds.py`: HTML parser, extracts LICO by family size
- [x] Step 5 — `pipeline/scraper/fee_schedule.py`: HTML parser, section-keyed fee dict; URL corrected to `ircc.canada.ca/english/information/fees/fees.asp`; `_clean_amount` uses regex to extract first numeric token (handles annotations like "increased April 30, 2026")
- [x] Step 6 — `pipeline/db.py`: `upsert_ee_draws` (ON CONFLICT DO NOTHING) + `upsert_snapshot` (ON CONFLICT DO UPDATE); psycopg2-binary + `psycopg2.extras.Json`
- [x] Step 7 — `pipeline/main.py`: orchestrator; loads `.env.local` from repo root then `pipeline/.env`; exits 1 on any failure
- [x] Step 8 — `pipeline/requirements.txt`: httpx, beautifulsoup4, lxml, psycopg2-binary, python-dotenv
- [x] Step 9 — `.github/workflows/canada-monitor.yml`: runs every 6 hours + `workflow_dispatch`; `DATABASE_URL` from GitHub Secrets
- [x] Step 10 — `pipeline/.env.example`: angle-bracket placeholder only, never committed with real value

**Key constraints learned:**
- Pipeline uses httpx + BeautifulSoup only (no Playwright, no MCPs — those belong to ProScrape/AXIOM)
- canada.ca rate-limits local IPs after ~6 requests; live tests must run via GitHub Actions
- `python -m pipeline.main` (not `python pipeline/main.py`) — required for absolute imports from repo root
- Fee schedule URL lives at `ircc.canada.ca`, not `canada.ca`

---

**Prashant Proof:**
1. Go to `github.com/[your-repo]/actions` → find "canada.ca Monitor" workflow → click "Run workflow" → confirm it triggers
2. Wait ~2 minutes for the run to complete → click the run → confirm all 4 steps show green (ee_draws, proof_of_funds, fee_schedule succeed; processing_times logs a warning but does NOT fail)
3. Connect to Supabase and run: `SELECT data_key, last_scraped FROM content_snapshots ORDER BY last_scraped DESC LIMIT 5;` — confirm `proof_of_funds` and `fee_schedule` rows appear with today's timestamp
4. Run: `SELECT COUNT(*) FROM ee_draws;` — confirm row count matches (or exceeds) the prior static JSON draw count

---

**Review (P4-1):**
`pipeline/scraper/base.py`: abstract `BaseCanadaScraper` with httpx, retry, context manager.
`pipeline/scraper/ee_draws.py`: JSON feed at `canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json`.
`pipeline/scraper/proof_of_funds.py`: LICO by family size from proof-of-funds HTML page.
`pipeline/scraper/fee_schedule.py`: section-keyed fee dict; URL corrected to `ircc.canada.ca/english/information/fees/fees.asp`; `_clean_amount` regex-extracts first numeric token.
`pipeline/db.py`: `upsert_ee_draws` (DO NOTHING on conflict) + `upsert_snapshot` (DO UPDATE on conflict) using psycopg2-binary.
`pipeline/main.py`: loads `.env.local` at repo root first; exits 1 on failure; processing_times is warn-only.
`.github/workflows/canada-monitor.yml`: 6-hour cron + manual dispatch; DATABASE_URL from GitHub Secrets.
No Playwright, no MCPs, no hardcoded credentials.

---

---

## Current Phase: CanVisa Pro Assessment Tool — Feature Enhancement (Approved May 2026)

**What this phase delivers:**
A fully upgraded Admin Assessment Tool at `/admin/canvisa-pro` that exceeds the public tool's capabilities with three exclusive differentiating features — a Category Draw Eligibility Matrix, an Age-Sensitive Timeline Alert, and a Plain-Language Narrative Verdict — plus NOC auto-population for both tools. The result view is rebuilt to match the public tool section-for-section (minus Lead Capture and Booking CTA), adapted to the dark admin theme. All changes confirmed and approved by Prash before any code is written.

**Decisions confirmed before this phase starts:**
- Feature 1 (Category Draw Matrix): Admin tool only
- Feature 2 (Age Timeline Alert): Both public and admin tools (Prash accepted this recommendation)
- Feature 3 (Narrative Verdict): Admin tool only
- NOC auto-population: Both tools — the `NocSearch` component is built once and wired into both
- Job offer field: Restored to admin tool — it feeds the FSW 67-point Arranged Employment factor (+5 pts), which is still live despite the March 2025 CRS bonus-point removal
- Lead capture + Booking CTA: NOT added to admin tool
- MARP export toolbar: Retained unchanged on admin tool

**Build sequence (each task approved before any code is written for that task):**
1. CVP-1: NOC 2021 Data Foundation — research + verified JSON build, no UI code
2. CVP-2: NOC Auto-Population Component — `NocSearch.tsx` with Fuse.js, wired into both tools
3. CVP-3: Admin Tool Form Upgrades — marital status radio, spouse language section, job offer field
4. CVP-4: Admin Tool Result View — base replication of public tool result sections in dark theme
5. CVP-5: Feature 2 — Age-Sensitive Timeline Alert — public tool + admin tool
6. CVP-6: Feature 1 — Category Draw Eligibility Matrix — admin tool only
7. CVP-7: Feature 3 — Plain-Language Narrative Verdict — admin tool only
8. CVP-8: Final TypeScript check, visual verification, deploy

---

### TASK CVP-1: NOC 2021 Data Foundation

**Status:** ✅ COMPLETE — May 2026
**Approved:** ✅ Approved by Prash — May 2026

**What this delivers:**
A verified, committed `noc-2021.json` search index built from the official Statistics Canada NOC 2021 dataset and ESDC unit group pages. Every NOC code, TEER level, occupation title, and example alias in this file is sourced directly from official government data — no training data used. This file is the foundation for the NOC auto-population feature (CVP-2) and is a one-time build that remains authoritative for years.

**Why a local file and not a live API:**
IRCC and Statistics Canada do not expose a public REST API for NOC lookups. Any live scraping would be too slow for a form field (2–3 seconds per keystroke), fragile, and subject to rate limiting. A local JSON index is near-instantaneous (client-side), reliable, and authoritative until IRCC adopts a new NOC version (a decade-level event).

**Anti-hallucination gate:** All NOC codes and TEER classifications in this file must be sourced from the official Statistics Canada or ESDC pages via Firecrawl. No values are derived from training data. If a mapping cannot be verified against canada.ca in this session, it is not included.

**Plan:**
- [x] Use Firecrawl to access the Statistics Canada NOC 2021 standard publication page and extract all unit group records — each record needs: 5-digit code, TEER level (0–5), and official occupation title
- [x] For each unit group, use Firecrawl to access the ESDC noc.esdc.gc.ca detail page and extract the "example titles" list — these aliases are what make job-title search work in practice (e.g., "software developer" mapping to "Software developers and programmers")
- [x] Build `apps/web/src/lib/noc-2021.json` with this structure:
  ```
  {
    "version": "NOC-2021",
    "source": "Statistics Canada NOC 2021 / ESDC noc.esdc.gc.ca",
    "builtDate": "YYYY-MM-DD",
    "occupations": [
      { "code": "21232", "teer": 2, "title": "Software developers and programmers", "aliases": ["software developer", "web developer", "programmer", "application programmer"] }
    ]
  }
  ```
- [x] Spot-check TEER classification and title for the following codes before committing — all 6 TEER levels must be represented in the verification sample:
  - TEER 0: corporate senior manager (10010 or equivalent)
  - TEER 1: registered nurse (31301), general practitioner (31102)
  - TEER 2: ~~software developer (21232)~~ **CORRECTED: NOC 21232 is TEER 1** (see Review), early childhood educator (42202)
  - TEER 3: cook (63200), administrative assistant (13110)
  - TEER 4: retail sales associate (64100)
  - TEER 5: ~~food service counter attendant (65200)~~ **CORRECTED: NOC 65200/65201 are TEER 5** (see Review), labourer (95100 or equivalent)
  - Plus 20 more common titles across TEER 1–3 (highest Express Entry volume)
- [x] Confirm the file uses NOC 2021 codes — NOT NOC 2016. The two systems have different code numbering; IRCC Express Entry uses NOC 2021 exclusively
- [x] Commit `noc-2021.json` to the repository before writing any component code for CVP-2

**Prashant Proof:**
This task has no UI — verification is the spot-check above. Before marking complete:
confirm that the JSON entry for NOC 31301 shows `teer: 1` and `title: "Registered nurses..."` ✅ — VERIFIED.
Note: NOC 21232 correctly shows `teer: 1` (not TEER 2 as the original plan stated) — both verified against Statistics Canada TEER variant CSV. See Review below.

**Review:**
`apps/web/src/lib/noc-2021.json` built from 3 official Statistics Canada CSVs (classification-structure, elements, TEER-variant). 516 unit groups, TEER 0–5, 27,935 example title aliases. 30/30 spot-check passed. TEER assignments sourced by hierarchy traversal of the TEER variant CSV — not from code digits or training data. Committed: `08754b5 feat(cvp): NOC 2021 data foundation — 516 unit groups, TEER 0-5, 27935 aliases`.

**Two TEER corrections found during build vs. plan's spot-check sample:**
- NOC 21232 (Software developers and programmers) = **TEER 1** (plan listed TEER 2 — training data error)
- NOC 65200/65201 (Food servers / Food counter attendants) = **TEER 5** (plan listed TEER 4 — training data error)

Both are correct in `noc-2021.json` per the official TEER variant CSV.

---

### TASK CVP-2: NOC Auto-Population Component

**Status:** ✅ COMPLETE — May 2026
**Approved:** ✅ Approved by Prash — May 2026
**Depends on:** CVP-1 complete and `noc-2021.json` committed

**What this delivers:**
A reusable `NocSearch` typeahead component that auto-populates the NOC code and TEER fields in both the admin and public assessment forms when an applicant types their job title or designation. Uses Fuse.js fuzzy search against the local `noc-2021.json` index. Built once; wired into both tools.

**Plan:**
- [x] Install Fuse.js: `npm install fuse.js` in `apps/web`
- [x] Create `apps/web/src/components/NocSearch.tsx` ("use client"):
  - Props: `onSelect: (code: string, teer: 0|1|2|3|4|5) => void`, `theme: 'light' | 'dark'`
  - Internal state: `query` (typed text), `results` (matched entries), `isOpen` (dropdown visible), `selected` (chosen entry or null)
  - On mount: dynamically `import('@/lib/noc-2021.json')` — lazy load, not bundled in main chunk
  - On input change debounced 250ms: run Fuse.js search on `title + aliases`, return top 5 results
  - Fuse.js config: `keys: [{ name: 'title', weight: 0.6 }, { name: 'aliases', weight: 0.4 }]`, `threshold: 0.35`, `minMatchCharLength: 3`, `distance: 100`
  - Dropdown renders each result as: `"{title} — {code} · TEER {teer}"`
  - On result click: set selected, call `onSelect(code, teer)`, close dropdown
  - After selection: show selected result text + a "Clear" link that resets both the input and the downstream NOC/TEER fields
  - Below the input (after selection): "Verify on canada.ca/noc ↗" link that opens the official ESDC search in a new tab
  - If query ≥ 3 chars and no results: show "No match found — enter NOC code manually below"
- [x] Create `apps/web/src/components/NocSearch.css`:
  - Light theme (public tool): white dropdown, Prussian accent on hover, standard Visa Forte input styles
  - Dark theme (admin tool): dark navy dropdown, teal accent on hover, matches canvisa-pro.css tokens
  - Dropdown positioned absolute below the input, z-index 50, max-height 5 results, rounded corners
- [x] Wire `NocSearch` into admin tool (`CanVisaProTool.tsx`):
  - Place above the existing NOC code text input and TEER dropdown in the Identity section
  - Label: "Search by Job Title / Designation (optional)"
  - `onSelect` callback: `setProfile(prev => ({ ...prev, nocCode: code, nocTeer: teer }))`
  - Existing NOC code and TEER fields remain for manual override — they are pre-populated by the component but always editable
- [x] Wire `NocSearch` into public tool (`AssessmentTool.tsx`):
  - Same placement (above NOC code field in the Identity section, Section 1)
  - Same `onSelect` pattern, `theme="light"`
- [x] `npx tsc --noEmit` — zero errors
- [x] Commit: `feat(assessment,canvisa-pro): NOC auto-population component with Fuse.js typeahead`

**Review:**
`NocSearch.tsx` (138 lines) — "use client" component. Lazy-loads `noc-2021.json` + Fuse.js via `Promise.all` on mount. Fuse.js config: keys `[title 0.6, aliases 0.4]`, threshold 0.35, minMatchCharLength 3, distance 100, top 5 results, 250ms debounce. Dropdown shows `"{title} — {code} · TEER {teer}"`. On select: calls `onSelect(code, teer, title)`, shows selection + Clear link + canada.ca/noc verify link. `NocSearch.css` (204 lines): `.noc-light` (white dropdown, Prussian `#1e3a5f` accents) and `.noc-dark` (dark `#0f1b2d` background, teal `#00A896` accents). Wired into `CanVisaProTool.tsx` with `theme="dark"` and `AssessmentTool.tsx` with `theme="light"` — both populate `nocCode` + `nocTeer` via `setProfile`. TypeScript clean (zero `tsc --noEmit` errors). Both files committed.

**Prashant Proof:**
1. Go to `/admin/canvisa-pro` — in the Identity section, type "nurse" in the new job title search field
2. Confirm dropdown appears within 300ms showing results including "Registered nurses and registered psychiatric nurses — 31301 · TEER 1"
3. Click that result — confirm the NOC Code field populates with "31301" and TEER dropdown selects "1"
4. Confirm the "Verify on canada.ca/noc ↗" link appears and opens the ESDC search in a new tab
5. Click "Clear" — confirm both the search field and the NOC/TEER fields reset
6. Type "xyz123" — confirm "No match found — enter NOC code manually below" appears after 250ms
7. Repeat steps 1–4 on `/assessment` (public tool) — confirm same behaviour with light theme styling

---

### TASK CVP-3: Admin Tool Form Upgrades

**Status:** ✅ COMPLETE — May 2026
**Approved:** ✅ Approved by Prash — May 2026
**Depends on:** Nothing — independent of CVP-1 and CVP-2; can proceed in parallel if needed

**What this delivers:**
Three surgical changes to the admin assessment form that fix data collection gaps affecting calculation accuracy:
1. Marital status three-way radio replacing the current single spouse checkbox
2. Spouse language test section (conditional on married/common-law) — currently absent, causing Factor B language points to be silently zeroed for all married applicants
3. Job offer field restored — currently absent, causing the FSW 67-point Arranged Employment factor to always score zero

**Why these matter for calculation accuracy:**
Without the spouse language section, a married applicant with a spouse scoring CLB 9+ across all four bands loses up to 20 CRS points silently — a material error in a professional consultant tool. Without job offer, the FSW 67-point grid cannot award Arranged Employment points, understating the FSW score for applicants with valid job offers.

**Plan:**
- [ ] Read `CanVisaProTool.tsx` in full before any edit
- [ ] A1 — Marital status radio:
  - In the `INITIAL` state object: replace `hasSpouse: false` with `maritalStatus: 'single'` typed as `'single' | 'married' | 'separated'`
  - In the Partner section of the form: replace the current checkbox with a three-option radio group labelled "Marital Status": Single / Married or Common-Law Partner / Legally Separated
  - Spouse sub-section (education + CWE inputs) shows only when `maritalStatus === 'married'`
  - Before calling `calculate()`: derive `hasSpouse: maritalStatus === 'married'` — the `ApplicantProfile` type from `crs-calculator.ts` is not modified
  - The marital status string value is stored in a local state field and passed into the MARP report's Applicant Data Profile card text
- [ ] A2 — Spouse language section:
  - Directly below spouse education and spouse CWE inputs (visible only when `maritalStatus === 'married'`): add a checkbox "Partner has an official language test result"
  - When checked: test type selector (IELTS GT / IELTS Academic / CELPIP / TEF / TCF) + four score inputs (L/R/W/S) + live CLB colour display using the existing `CLB_COLOR` helper
  - Form state: `spouseLanguageScores?: LanguageScores` — this field already exists in `ApplicantProfile`; it just needs the form inputs to populate it
  - When unchecked: `spouseLanguageScores` is set to `undefined`
- [ ] A3 — Job offer field:
  - In the Additional Factors section, below the four checkboxes: add a three-option radio group "Valid Job Offer in Canada?": No job offer / Yes — LMIA-supported / Yes — LMIA-exempt
  - Hint text: "Counts toward FSW 67-point Arranged Employment factor (+5 pts). Does not add CRS bonus points (removed March 2025)."
  - Form state: `hasJobOffer: 'none' | 'lmia' | 'exempt'` — this field already exists in `ApplicantProfile`; it just needs the UI inputs
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(canvisa-pro): marital status radio, spouse language section, job offer field`

**Prashant Proof:**
1. Go to `/admin/canvisa-pro` — in the Partner section, confirm three radio options: Single, Married or Common-Law Partner, Legally Separated
2. Select "Single" — confirm the entire spouse sub-section (education, CWE, language) is hidden
3. Select "Married or Common-Law Partner" — confirm the spouse sub-section appears
4. Check "Partner has an official language test result" — confirm test type selector and four score inputs appear
5. Enter IELTS scores (e.g., all 7.0) — confirm CLB colour indicators appear showing CLB 8
6. In Additional Factors, confirm the Job Offer radio appears with three options and the hint text about FSW (+5 pts / not CRS)
7. Enter a profile: married applicant, spouse with IELTS 7.0/7.0/7.0/7.0, then generate report — confirm the CRS score is higher than the same profile with no spouse language (proving Factor B language is now being calculated)

---

### TASK CVP-4: Admin Tool Result View — Base Replication

**Status:** ✅ COMPLETE — May 2026
**Approved:** ✅ Approved by Prash — May 2026
**Depends on:** CVP-3 (form state must be correct before the result view is built)

**What this delivers:**
The admin tool result view is rebuilt to match the public tool's section structure, adapted to the dark admin theme (canvisa-pro.css). The existing MARP export toolbar ("Print / Save PDF" + "Download PPTX Source") is retained unchanged at the top of the result. Lead capture and booking CTA are not added.

**Sections to build (in order, mirroring public tool):**
1. Hero CRS Score Card — large score number, Express Entry pool eligibility badge (Eligible / Not Yet Eligible), styled in dark theme
2. Recent Draw Context Card — most relevant draw from `crs-draw-history.json` based on profile, showing cutoff, ITAs issued, draw date, and applicant's gap
3. Program Eligibility Table — four rows (Express Entry Pool, FSW, CEC, FST) with status badge (green pass / amber partial / red fail) and plain-English reason per row
4. CRS Breakdown Grid — four tiles: Core Human Capital / Transferability / Additional / Total
5. FSW 67-Point Grid — all 6 selection factors including Arranged Employment (now populated from CVP-3 job offer field)
6. Settlement Funds Card — declared amount vs. required minimum for family size, pass/fail status
7. Dual Improvement Paths:
   - Path A (shown when FSW total < 67): FSW 67-point improvement scenarios ranked by point gain
   - Path B (shown when pool-eligible): CRS improvement scenarios ranked by point gain, each showing new projected score vs. most recent draw cutoff with a "competitive / not yet" verdict
8. Legal Disclaimer — full IRCC disclaimer, identical text to the public tool

**What is NOT added in this task:**
- Contact capture (name, email, phone, consent)
- Lead capture API call
- Booking CTA or pricing anchor
- Category Draw Matrix (added in CVP-6)
- Age Alert (added in CVP-5)
- Narrative Verdict (added in CVP-7)

**MARP export toolbar retained unchanged** — stays exactly as-is at the top of the result view.

**Plan:**
- [ ] Read `AssessmentTool.tsx` result view section fully — understand every helper function, draw-selection logic, and scenario-rendering pattern
- [ ] Read `canvisa-pro.css` fully — understand existing dark theme tokens (navy, teal, amber) before writing any new CSS
- [ ] Import `drawData` from `@/lib/crs-draw-history.json` and `fundsData` from `@/lib/proof-of-funds.json` into `CanVisaProTool.tsx` (same imports as the public tool)
- [ ] Lift the `getEligibleDrawCategories()`, `shortType()`, and `fmtDate()` helper functions from `AssessmentTool.tsx` into `CanVisaProTool.tsx` — keep them as local functions in the component file (Karpathy: no premature extraction)
- [ ] In `CanVisaProTool.tsx`, when `view === 'report'`, render sections 1–8 above the existing MARP markdown section, in the same DOM structure as the public tool but with dark-theme class names
- [ ] `canvisa-pro.css`: add dark-theme CSS for each new section:
  - Hero card: teal score number, navy card bg, badge colours (teal = eligible, amber = not yet)
  - Draw context card: navy card, border-left colour-coded by gap severity
  - Eligibility table: dark rows, status badge palette matching public tool semantics in dark tones
  - CRS breakdown grid: four dark tiles with section labels and point totals
  - FSW grid: dark table, pass threshold highlighted, pass/fail badge
  - Settlement funds card: dark card, green/red status badge
  - Improvement paths: dark scenario cards, delta point indicator, cutoff comparison badge
  - Legal disclaimer: subdued dark card, small text
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(canvisa-pro): base result view replication — draw context, eligibility, breakdown, FSW, funds, improvements, disclaimer`

**Prashant Proof:**
1. Go to `/admin/canvisa-pro` — enter a complete profile: married, CLB 8 IELTS, 2yr Canadian WE TEER 1, Master's with ECA, $30,000 funds, family of 2, no job offer
2. Click "Generate Report" — confirm in sequence:
   - CRS score card with score number and pool eligibility badge appears
   - Draw context card with a recent draw, cutoff, and applicant gap appears
   - Program Eligibility Table shows all four rows (EE Pool, FSW, CEC, FST) with status and reason
   - CRS Breakdown Grid shows four tiles
   - FSW 67-Point Grid shows all 6 factors; confirm Arranged Employment shows 0 pts (no job offer selected)
   - Settlement Funds card shows $30,000 vs. required minimum with a status badge
   - Improvement paths section appears (Path A or B depending on pool eligibility)
   - Legal disclaimer block appears at the very bottom
3. Confirm "Print / Save PDF" and "Download PPTX Source" buttons are still present and work
4. Confirm NO contact form, NO booking button, NO $99 CTA appears anywhere in the result
5. Now select LMIA job offer and regenerate — confirm Arranged Employment row in FSW grid shows 5 pts

---

### TASK CVP-5: Feature 2 — Age-Sensitive Timeline Alert (Public + Admin)

**Status:** ✅ COMPLETE — May 2026
**Approved:** ✅ Approved by Prash — May 2026 (accepted recommendation to add to both tools)
**Depends on:** CVP-4 for admin result placement; no dependency for the public tool change

**What this delivers:**
An amber alert banner that fires automatically when the applicant is within 12 months of a CRS age bracket change. Shows exact months until the change, points lost, and the strategic implication. On the public tool, it fires at the highest-urgency moment (right after seeing the score) to drive consultation bookings. On the admin tool, it is documented as a formal "Strategic Consideration" card for the client report.

**Source of truth for age bracket thresholds:** The `crs-rules.json` age points table — not training data. The function reads bracket boundaries and point values from the JSON at runtime. Any spot-check of bracket values must verify against canada.ca/crs-grid before using.

**Admin tool note:** The admin form currently captures `age` as an integer, not a full date of birth. To calculate months precisely, the form needs birth year and birth month (day is not required for month precision). Two optional fields are added to the Identity section. If not entered, the alert falls back to a generic age-bracket note using the integer age.

**Plan:**
- [ ] Read the `agePoints` structure in `crs-rules.json` — identify all bracket boundaries and their associated point values (do not derive from training data; read from the file directly)
- [ ] Write a pure function `getAgeAlert(input: { dob?: string, birthYear?: number, birthMonth?: number } | null, agePointsTable: Record<string, number>): { monthsUntilChange: number, pointsLost: number, currentPts: number, nextPts: number } | null`:
  - Returns `null` if no bracket change within 12 months of today's date
  - Returns the alert object if the next birthday crosses into a lower point bracket within 12 months
  - When `dob` is provided (public tool, full date): computes exact calendar months
  - When `birthYear` + `birthMonth` is provided (admin tool): computes months to the birthday in that month/year combination, accurate to the month
  - When neither is available: returns `null` (caller renders the generic note)
- [ ] Public tool (`AssessmentTool.tsx`):
  - The DOB is already fully captured — pass it to `getAgeAlert()` in the result view
  - Render the alert banner as the first visible element of the result, above the draw context card
  - Style: amber background (`#FDE68A`), warning icon, plain-language text
  - Text format: "Age Alert: You turn [age] in [N] months ([month year]). Your CRS age points decrease by [X] — from [current] to [next]. Improving your score or submitting your profile before this date preserves those points."
  - Alert CSS added to `assessment.css`
- [ ] Admin tool (`CanVisaProTool.tsx`):
  - Add two optional fields to the Identity section, below the existing age input:
    - "Birth Year" (number input, 4-digit year, optional)
    - "Birth Month" (dropdown: Jan–Dec, optional)
    - Label group: "For age bracket analysis (optional — improves alert precision)"
  - In the result view, render the alert card above the hero score card (highest position in the result)
  - Admin alert style: amber card, teal accent border-left, more formal tone
  - Text format: "Strategic Consideration: Applicant approaches a CRS age bracket change in [N] months ([month year]). Current bracket: [X] points. Next bracket: [Y] points. Difference: −[Z] points. Recommend prioritising pathway progression before [month year]."
  - If birth year/month not entered: render a generic note: "Age Bracket Note: Confirm whether this applicant is within 12 months of a CRS age bracket change. Age bracket boundaries have material point implications at ages 30, 36–45."
  - Alert CSS added to `canvisa-pro.css`
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(assessment,canvisa-pro): age-sensitive timeline alert on both tools`

**Prashant Proof (Public Tool):**
1. Go to `/assessment` — enter DOB placing applicant at 29 years 10 months old (e.g., born 2 months before turning 30)
2. Complete the form and calculate — confirm an amber banner appears at the top of the result stating the 30th birthday month and the 10-point reduction
3. Enter DOB for a 25-year-old — confirm no alert appears (not within 12 months of any bracket boundary)
4. Enter DOB for a 44-year-old with 8 months remaining — confirm the alert fires with the age-45 bracket information

**Prashant Proof (Admin Tool):**
1. Go to `/admin/canvisa-pro` — confirm "Birth Year" and "Birth Month" optional fields appear in the Identity section
2. Enter birth year and month placing the applicant 3 months from their 30th birthday
3. Generate report — confirm the amber Strategic Consideration card appears above the hero score card
4. Clear birth year and month and regenerate — confirm the generic age bracket note appears instead
5. Enter a profile for a 25-year-old (no bracket change within 12 months) — confirm no alert appears

---

### TASK CVP-6: Feature 1 — Category Draw Eligibility Matrix (Admin Only)

**Status:** ✅ COMPLETE — May 2026
**Approved:** ✅ Approved by Prash — May 2026 (admin only)
**Depends on:** CVP-4 (result view base must exist before adding this section to it)

**What this delivers:**
A structured eligibility matrix in the admin result view showing every IRCC draw category the applicant qualifies for — with the most recent cutoff per category, the applicant's score gap vs. each cutoff, and the 6-month historical cutoff range. This is the most differentiating feature of the admin report. It reveals multiple invitation pathways that a single-draw view misses — for example, a Healthcare professional at CRS 467 who appears 47 points below the CEC cutoff but is exactly at the Healthcare Worker draw cutoff.

**Draw categories detected (based on profile):**
- CEC — requires ≥ 1yr Canadian work experience in TEER 0–3
- French Language — requires French test (TEF or TCF) with CLB ≥ 7 in all four bands
- Healthcare & Social Services — NOC code in the range 30010–35109
- Trades Occupations — NOC code in trades ranges (72000–75199, 82000–82099, 92000–95199)
- Education Occupations — NOC code 40000–41499
- Senior Managers with CWE — requires Canadian WE + senior management NOC (verify IRCC eligibility criteria before coding)
- Physicians with CWE — NOC-specific (verify exact codes against IRCC)
- PNP — applicant already holds a provincial nomination

**Matrix columns:** Draw Category | Eligible? | Most Recent Cutoff | Draw Date | Your Score | Gap | 6-Month Range

**Gap column values:**
- Positive or zero: "At cutoff" or "+[N] pts above"
- Negative: "−[N] pts"
- French with no French test but CRS above French cutoff: "Would qualify — add French test (CLB 7+)"
- Not eligible: "—"

**6-Month Range:** Min and max cutoff for draws of that category in the past 183 days from `crs-draw-history.json`. If only one draw in 6 months: "Single draw". If no draws: "No recent draws".

**Plan:**
- [ ] Read `getEligibleDrawCategories()` in `AssessmentTool.tsx` fully — understand all eligibility conditions and NOC number range logic before reusing it
- [ ] Verify the Senior Manager and Physician NOC eligibility criteria against canada.ca IRCC pages (these are specialised category draws with additional requirements beyond a NOC range) — do not derive eligibility rules from training data
- [ ] Write a local function `buildDrawMatrix(profile, elig, secondLangBands, drawData, applicantCrs)` that returns `DrawCategoryRow[]`:
  - For each draw category: determine eligibility, filter `drawData.draws` for matching draw types, compute most recent cutoff + draw date + 6-month range
  - French special case: if applicant has no French test but their CRS already exceeds the most recent French cutoff, show "Would qualify with CLB 7+ French test" with the cutoff as context
  - Use the same keyword matching logic from `shortType()` / `getEligibleDrawCategories()` to connect draw types to categories
- [ ] In `CanVisaProTool.tsx` result view: place the matrix after the draw context card (Section 2) and before the Program Eligibility Table (Section 3)
- [ ] Matrix renders as a dark-themed table:
  - Row background: teal tint (eligible + at/above cutoff), amber tint (eligible + below by <50 pts), neutral (eligible + below by ≥50 pts), muted grey (not eligible)
  - Note below the table: "Data sourced from canada.ca Express Entry draw history. Draw frequency, cutoffs, and eligibility categories are subject to change without notice."
- [ ] `canvisa-pro.css`: matrix table styles (column widths, row colour states, gap badge colours)
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(canvisa-pro): category draw eligibility matrix`

**Prashant Proof:**
1. Go to `/admin/canvisa-pro` — enter a Healthcare profile: NOC 31301 (registered nurse), TEER 1, 1yr Canadian WE, no French test, CRS around 467
2. Generate report — confirm the Category Draw Matrix appears between the draw context card and the Program Eligibility Table
3. Confirm CEC row shows as eligible with gap vs. recent CEC cutoff (should be around −47 pts based on current draw data)
4. Confirm Healthcare row shows as eligible with its most recent cutoff (Feb 20, 2026: 467) and gap ("At cutoff" or similar)
5. Confirm French Language row shows "Would qualify — add French test (CLB 7+)" with the most recent French cutoff shown (~400)
6. Confirm Trades, Education, Senior Managers, Physicians show as "Not eligible" (wrong NOC)
7. Spot-check: manually count Healthcare draws in `crs-draw-history.json` — confirm the matrix shows the correct most recent cutoff and 6-month range for Healthcare
8. Enter a profile with no Canadian WE — confirm CEC row shows "Not eligible"

---

### TASK CVP-7: Feature 3 — Plain-Language Narrative Verdict (Admin Only)

**Status:** ✅ COMPLETE — May 2026
**Approved:** ✅ Approved by Prash — May 2026 (admin only)
**Depends on:** CVP-4, CVP-5, CVP-6 — the narrative references data from the draw matrix and age alert, so those sections must be built first

**What this delivers:**
A 4–6 sentence plain-English "Consultant Summary" card that appears at the very top of the admin result view, before all other sections. It is template-based conditional logic — not AI-generated, no Anthropic API call. It reads like the opening two minutes of a professional consultation: score status, most favourable draw pathway, fastest improvement, and one strategic consideration (age or PNP).

**Why admin-only:**
This narrative is the core consulting insight. Delivering it on the free public tool removes the primary reason to book a consultation. On the admin report, it is the professional opinion that clients are paying for. The public tool continues to show tables and grids — the narrative is exclusively in the report Prashant shares.

**Narrative structure (four components, some conditional):**
1. **Score + Pool Status:** "[Applicant name]'s CRS score of [X] places them [in / does not yet place them in] the Express Entry pool." (Always present)
2. **Best Pathway Statement:** The most favourable draw category from the matrix (where the applicant is closest to or above the cutoff). If pool-eligible: "Their most competitive pathway is [draw type], where the most recent cutoff of [N] is [X points above / below / exactly at] their current score." If not pool-eligible: "Their primary pathway is the FSW stream, currently [X points below / at] the 67-point selection threshold." (Always present)
3. **Fastest Improvement:** "The highest-impact improvement within the shortest timeframe is [action]: [e.g., improving their writing band from CLB 7 to CLB 9 via IELTS retake, estimated 4–6 weeks, would add approximately [N] CRS points / a French language test at CLB 7+ would open the French draw pathway where recent cutoffs have been [N] / the spouse completing an official language test would add [N] points via the Factor B language component]." (Always present — derived from top-ranked improvement scenario)
4. **Strategic Consideration:** If age alert active: "Note: applicant turns [age] in [N] months. CRS age points decrease by [X] at that birthday. Timeline is strategically significant." OR if no age alert and PNP appears plausible (TEER 0–3, CLB 7+, post-secondary education, no current nomination): "A provincial nomination pathway — such as OINP Human Capital Priorities or BCPNP Tech Pilot — would add 600 CRS points and immediately resolve the draw gap. Eligibility assessment is recommended." (Conditional — shown when relevant)
5. **Closing line (always present):** "A full pathway assessment is recommended to confirm the optimal strategy and provincial eligibility."

**Plan:**
- [ ] Write `buildNarrative(result, profile, drawMatrix, ageAlert): string` as a local function inside `CanVisaProTool.tsx`:
  - Component 1: read `result.totalScore` and `result.streamEligibility.expressEntry.eligible`
  - Component 2: select the most favourable row from `drawMatrix` (eligible + smallest negative gap or positive gap); if none eligible, check FSW 67-point verdict
  - Component 3: read `result.improvements[0]` (highest point gain scenario); map scenario type to plain-English action description; estimate time/effort by scenario type (language retake → 4–6 weeks; spouse language → 4 weeks; CWE → 12+ months)
  - Component 4: age alert (`ageAlert !== null`) takes priority over PNP signal; PNP signal fires if `profile.nocTeer <= 3 && firstLangClbMin >= 7 && profile.education !== 'less_than_secondary' && profile.education !== 'secondary' && !profile.hasProvincialNomination`
  - Component 5: append the fixed closing sentence
- [ ] In the admin result view: render the narrative in a styled card at the very top — above the age alert card, above the hero score card
  - Card label: "Consultant Summary" in small uppercase
  - Narrative text: larger line-height, DM Sans body font, not a table or list — flowing sentences
  - A small subdued note: "System-generated from applicant profile data. Review and supplement with professional assessment."
- [ ] `canvisa-pro.css`: narrative card styles — Prussian navy background, teal border-left (4px), slightly larger font size and line-height than standard body text
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(canvisa-pro): plain-language narrative verdict`

**Prashant Proof:**
1. Go to `/admin/canvisa-pro` — enter a Healthcare profile (NOC 31301, 1yr CWE, CLB 7 writing, Master's, married with spouse CLB 8, 3 months from 30th birthday)
2. Generate report — confirm a "Consultant Summary" card appears at the very top, before all other sections
3. Read the narrative carefully — confirm it:
   - Names the CRS score and pool status
   - Identifies Healthcare draws as the most relevant pathway (or CEC if score permits)
   - Identifies writing band improvement or spouse language as the fastest improvement
   - Notes the upcoming 30th birthday as a strategic consideration
   - Ends with the fixed closing sentence
4. Enter a profile below FSW 67 points — confirm Component 2 references the FSW pathway and FSW threshold instead of a draw category
5. Enter a TEER 1 profile, CLB 8+, Master's, no nomination, no age alert — confirm the PNP signal appears as Component 4
6. Confirm no factual contradiction between the narrative and the data in the sections below it (if narrative says "Healthcare cutoff 467", that cutoff must match what the matrix shows)

---

### TASK CVP-8: Final Integration — TypeScript Check + Deploy

**Status:** ✅ COMPLETE — May 2026
**Approved:** ✅ Approved by Prash — May 2026
**Depends on:** CVP-1 through CVP-7 all complete

**What this delivers:**
A clean TypeScript build with all existing tests passing, a visual end-to-end verification of both tools on localhost, and a production deploy to visaforte.com.

**Plan:**
- [ ] Run `npx tsc --noEmit` from `apps/web/` — fix any type errors before proceeding; zero errors required
- [ ] Run `vitest run` — all existing tests must pass; zero regressions acceptable
- [ ] Visual check — public tool (`/assessment` on localhost):
  - Enter a 29-year-old profile with 10 months before their birthday → confirm age alert fires
  - Use NOC search → type "software developer" → confirm NOC 21232 TEER 2 auto-populates
  - Calculate the full result → confirm the rest of the result view is unchanged from before this phase
- [ ] Visual check — admin tool (`/admin/canvisa-pro` on localhost):
  - Enter a married Healthcare professional profile (NOC 31301, 1yr CWE, CLB 7 writing, Master's, spouse IELTS 7.0, LMIA job offer, birth year/month 3 months before 30th birthday, $30k funds, family of 2)
  - Confirm result appears in this exact order: Consultant Summary → Age Alert → Hero Score Card → Draw Context Card → Category Draw Matrix → Program Eligibility Table → CRS Breakdown Grid → FSW 67-Point Grid → Settlement Funds Card → Improvement Paths → Legal Disclaimer
  - Confirm Consultant Summary narrative is factually consistent with the sections below it
  - Confirm Arranged Employment in FSW grid shows 5 pts (LMIA job offer selected)
  - Confirm MARP export buttons still function — click "Download PPTX Source" and verify a .md file downloads
- [ ] Run `vercel whoami` — confirm it returns `prash279` before any deploy command
- [ ] Run `gh auth status` — confirm it shows `Prash279 (keyring)` with a valid token
- [ ] Commit all remaining changes: `feat(canvisa-pro): complete CVP assessment tool enhancement — NOC search, form upgrades, result replication, age alert, draw matrix, narrative verdict`
- [ ] Push to `origin main` → Vercel auto-deploys to visaforte.com
- [ ] Verify live at visaforte.com/admin/canvisa-pro — run the same profile test as the localhost visual check above

**Prashant Proof:**
1. Go to visaforte.com/admin/canvisa-pro (live)
2. Run the full married Healthcare professional profile as described in the visual check above
3. Confirm ALL sections appear in the correct order with correct data
4. Go to visaforte.com/assessment (live) — confirm the age alert fires for a 29-year-old and the NOC search works
5. Confirm nothing is visually broken on the public assessment tool — scroll through the full result for a clean profile

---

*todo.md is the single source of task truth. If it's not here, it's not in scope.*