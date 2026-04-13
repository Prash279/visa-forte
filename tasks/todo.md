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
**Status:** Not started
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
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Commit and push → Vercel auto-deploys

---

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

### TASK 5: Cloudflare R2 Document Storage
**Status:** Not started
**Approved:** Pending
**What this delivers:** The infrastructure to securely store and retrieve client documents.

**Plan:**
- [ ] Create R2 bucket in the Cloudflare dashboard (Prash action — 5 minutes)
- [ ] Build `apps/web/src/lib/storage.ts` with three functions:
  - `uploadFile(key, buffer, contentType)` — stores a file in R2
  - `deleteFile(key)` — removes a file
  - `generateSignedUrl(key)` — returns a 15-minute expiry download URL
- [ ] Add to Render environment: `CLOUDFLARE_R2_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_KEY`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ENDPOINT`
- [ ] Write Vitest unit tests for the storage utility functions

**Prashant Proof:** Upload a test PDF through the admin dashboard. Confirm it appears in the
Cloudflare R2 dashboard. Generate a signed download link — confirm it opens the file and
expires after 15 minutes.

---

### TASK 8: CI/CD and Observability (Phase 1 closer)
**Status:** Not started
**Approved:** Pending
**What this delivers:** Broken code cannot reach production. Prash gets alerted if the site goes down.

**Plan:**
- [ ] Create `.github/workflows/ci.yml` — typecheck, lint, Vitest, PyTest per `tech.md §11`
- [ ] Create `apps/web/src/lib/logger.ts` — structured JSON logger per `tech.md §12`
- [ ] Create `apps/api/config/logger.py` — Python structured logger
- [ ] Create `GET /app/api/health/route.ts` — checks DB connectivity, returns 200 or 503
- [ ] Install `@sentry/nextjs` + configure PII scrubbing (email, name, document content never logged)
- [ ] Install `sentry-sdk[fastapi]`
- [ ] Set up UptimeRobot monitors: `/api/health` and `/`

**Prashant Proof:** Go to UptimeRobot dashboard — confirm the health monitor shows "Up."
On a feature branch, introduce a deliberate TypeScript type error and push it — confirm GitHub Actions
fails and the branch is blocked from merging to main.

---

## Deferred — Phase 2

### TASK 7: MVP CRM (Simple Client Table)
**Status:** Deferred to Phase 2
Per `spec.md §8`, CRM pipeline is Phase 2 scope. Do not build during Phase 1.

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

---

*todo.md is the single source of task truth. If it's not here, it's not in scope.*