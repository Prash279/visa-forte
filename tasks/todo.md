# tasks/todo.md — Active Task List
> Written by Claude Code before implementation begins.
> Approved by Prash before any code is written.
> Last updated: April 2026 (session: landing page FOUC fix, admin restriction, CTA mailto wiring)

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

## Current Phase: Phase 1 — Foundation (MVP First)

**Rule:** Build what Prash can see and test in his browser first. Infrastructure is built when a feature requires it — not as standalone tasks before features. Every task ends with a Prashant Proof.

---

### TASK 1: Deploy Landing Page
**Status:** ✅ COMPLETE
**What this delivers:** visaforte.com is live and accessible to the world.

**Plan:**
- [x] Initialise Next.js 15 App Router project with TypeScript strict mode
- [x] Configure Tailwind CSS and brand tokens (Prussian `#0C2340`, Saffron `#C97B1E`, Pearl `#F8F4EE`)
- [x] Build landing page using Stakes → Difference → Evidence → Objections → Offer → CTA structure
- [x] Apply brand system per visa-forte-brand skill
- [x] Deploy to Vercel — live at visaforte.com
- [x] Fix FOUC (Flash of Unstyled Content) — moved all CSS to `home.css`, imported as CSS file not styled-jsx
- [x] Fix font flash — `display: "optional"` on Cormorant Garamond and DM Sans
- [x] Fix mobile hero vertical line cutting through headline text
- [x] Wire all 3 CTA buttons to mailto handler with professional email template
- [x] Update default email to prashant@visaforte.com across all CTAs and footer links

**Review:**
Landing page is live at visaforte.com. All CTAs open Gmail with a professional 6-field triage assessment template addressed to prashant@visaforte.com. No flash on load. Mobile layout correct. Auto-deploys from main branch via Vercel.

---

### TASK 2: User Authentication (Login / Signup)
**Status:** ✅ COMPLETE
**What this delivers:** Prash can log in to the admin dashboard. Admin access is locked to prashant@visaforte.com only.

**Plan:**
- [x] Commit all auth work to `main`
- [x] Create full database schema: `users`, `session`, `account`, `verification` tables (Better Auth compatible)
- [x] Regenerate Drizzle migration from final schema
- [x] Install Better Auth v1.6.0, configure with Drizzle adapter
- [x] Create login page at `/login` with Visa Forte brand
- [x] Create signup page at `/signup` with Visa Forte brand
- [x] Create lightweight Edge-safe middleware (cookie check only — no DB calls)
- [x] Create protected admin dashboard at `/admin`
- [x] Restrict admin access to prashant@visaforte.com via server-side email check
- [x] Fix sign-out to use Better Auth v1.x server API directly

**Review:**
- Auth live on Vercel. Login at visaforte.com/login, admin at visaforte.com/admin.
- Admin dashboard restricted to prashant@visaforte.com — any other valid session is redirected to /login.
- Better Auth v1.6.0 with Neon PostgreSQL. Sign-out uses server API route.
- `DATABASE_URL` and `BETTER_AUTH_SECRET` set in Vercel environment variables.

---

### TASK 3: CanVisa Pro Integration
**Status:** Not started
**Approved:** Pending
**What this delivers:** The PR assessment tool is accessible to clients on the platform.

**Plan:**
- [ ] Review `/mnt/skills/user/canvisa-pro/SKILL.md` in full before starting
- [ ] Embed CanVisa Pro in the platform at `/app/assessment/page.tsx`
- [ ] Ensure single-file constraint is maintained
- [ ] Confirm: Only `api.anthropic.com` and `canada.ca` are called externally
- [ ] Confirm: Claude API key entered at runtime — never stored anywhere
- [ ] Confirm: Every generated report includes the Standard Legal Disclaimer

**Prashant Proof:** Go to visaforte.com/assessment. Enter a test profile. Confirm a report is generated. Scroll to the bottom of the report and confirm the legal disclaimer is present.

---

### TASK 4: Paddle Payment Integration
**Status:** Not started
**Approved:** Pending
**What this delivers:** Clients can pay for services online.

**Plan:**
- [ ] Create Paddle webhook handler at `/app/api/webhooks/paddle/route.ts`
- [ ] Implement HMAC-SHA256 verification per `security.md §2` using Node.js built-in `crypto` module
- [ ] Read raw body as text before parsing (critical — prevents signature verification failure)
- [ ] Handle event types: `subscription.created`, `payment.completed`
- [ ] Return HTTP 400 for unverified signatures
- [ ] Add `PADDLE_SECRET_KEY` and `PADDLE_WEBHOOK_SECRET` to Render environment variables

**Prashant Proof:** In Paddle sandbox dashboard, trigger a test payment. Confirm the webhook is received (check Paddle's webhook log — it should show a 200 response).

---

### TASK 5: Cloudflare R2 Document Storage
**Status:** Not started
**Approved:** Pending
**What this delivers:** Client documents can be securely uploaded and stored.

**Plan:**
- [ ] Create R2 bucket in Cloudflare dashboard
- [ ] Create storage utility in `apps/api/services/storage.ts` with: `uploadFile`, `deleteFile`, `generateSignedUrl`
- [ ] Implement transcript download flow per `security.md §5`
- [ ] Add R2 credentials to Render environment variables

**Prashant Proof:** Upload a test PDF through the admin dashboard. Confirm it appears in the Cloudflare R2 dashboard. Generate a signed download link — confirm it opens the file and expires after 15 minutes.

---

### TASK 6: DPDP Compliance Automations
**Status:** Not started
**Approved:** Pending
**What this delivers:** Platform meets India's data protection requirements from day one.

**Plan:**
- [ ] Build `ConsentCheckbox` component per `security.md §8.1` — renders before any data collection
- [ ] Store consent with timestamp in `users` table
- [ ] Build data deletion request page in client portal (`/portal/privacy`)
- [ ] Write deletion cron job (`apps/api/jobs/data_retention.py`) per `security.md §8.3`
- [ ] Schedule cron job at 02:00 IST daily via Render's cron job feature

**Prashant Proof:** Create a test account. Go through signup — confirm the consent checkbox appears before you can proceed. Go to /portal/privacy — confirm you can see what data is stored and submit a deletion request.

---

### TASK 7: MVP CRM (Simple Client Table)
**Status:** Not started
**Approved:** Pending
**What this delivers:** Prash can see all clients, their status, and add notes — in one simple table.

**Plan:**
- [ ] Add `clients` table to database schema (id, user_id, service_tier, status, notes, created_at)
- [ ] Generate and apply Drizzle migration
- [ ] Build admin CRM page at `/app/admin/clients/page.tsx` — a table showing all clients
- [ ] Add ability to: update client status (dropdown), add a private note, view uploaded documents
- [ ] No automated triggers, no email sends, no pipeline animations in v1

**Prashant Proof:** Log in to admin dashboard. Go to /admin/clients. Add a test client manually. Change their status. Add a note. Confirm everything saves and displays correctly on page refresh.

---

### TASK 8: CI/CD and Observability Setup
**Status:** Not started
**Approved:** Pending
**What this delivers:** Broken code cannot reach production. Prash gets alerted if the site goes down.

**Plan:**
- [ ] Create `.github/workflows/ci.yml` per `tech.md §11` — Claude Code owns and maintains this file
- [ ] Install Sentry: `@sentry/nextjs` + configure PII scrubbing per `tech.md §12`
- [ ] Create `apps/web/lib/logger.ts` and `apps/api/config/logger.py` per `tech.md §12`
- [ ] Create `/app/api/health/route.ts` health check endpoint
- [ ] Set up UptimeRobot monitoring on `/api/health` and `/` [VERIFY free tier limits]
- [ ] Confirm Render auto-deploy is working: push a small change to `main`, confirm it deploys automatically

**Prashant Proof:** Go to your UptimeRobot dashboard — confirm the health monitor shows "Up." Make a deliberate typo in a test file, push to a feature branch — confirm GitHub Actions fails and blocks the merge.

---

## Completed Tasks

Tasks 1 and 2 are complete. Their full records are in the active section above marked ✅ COMPLETE.

---

*todo.md is the single source of task truth. If it's not here, it's not in scope.*
