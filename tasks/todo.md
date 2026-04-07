# tasks/todo.md — Active Task List
> Written by Claude Code before implementation begins.
> Approved by Prash before any code is written.
> Last updated: April 2026

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
**Status:** In Progress — code complete, deployment pending
**Approved:** Pending
**What this delivers:** visaforte.com is live and accessible to the world.

**Plan:**
- [x] Initialise Next.js 15 App Router project with TypeScript strict mode
- [x] Configure Tailwind CSS and brand tokens (Prussian `#0C2340`, Saffron `#C97B1E`, Pearl `#F8F4EE`)
- [x] Build landing page using Stakes → Difference → Evidence → Objections → Offer → CTA structure
- [x] Apply brand system per `/mnt/skills/user/visa-forte-brand/SKILL.md`
- [x] Set up ESLint, directory structure per tech.md §3, constants.ts, .env.example
- [x] Create `render.yaml` Blueprint (web service + managed PostgreSQL defined in code)
- [ ] Connect GitHub repo on Render dashboard (one-time manual step — see deploy guide below)
- [ ] Configure custom domain `visaforte.com` in Render dashboard (after first deploy succeeds)

**Render Deploy Guide (one-time, 5 minutes):**
1. Go to [render.com](https://render.com) → sign in with GitHub
2. Click **New → Blueprint** → select the `visaforte` GitHub repo
3. Render reads `render.yaml` and creates: `visaforte-web` (Next.js) + `visaforte-db` (PostgreSQL) — click **Apply**
4. First build takes ~3 minutes. Watch the build log — confirm it ends with `✓ Ready`
5. Render gives you a URL like `visaforte-web.onrender.com` — use this to test before pointing the real domain

**Prashant Proof:** Open the Render-provided URL in your browser. Confirm the tagline "Engineered for Passage." is visible, the page loads, and the colours match the Visa Forte brand.

---

### TASK 2: User Authentication (Login / Signup)
**Status:** Code built locally — uncommitted. Needs commit + Render DB setup before it is live.
**Approved:** Pending
**What this delivers:** Prash can log in to an admin dashboard. Clients can create accounts.

**Plan:**
- [x] Commit all auth work to `main`
- [x] Create full database schema: `users`, `session`, `account`, `verification` tables (Better Auth compatible)
- [x] Regenerate Drizzle migration from final schema
- [x] Install Better Auth, configure with all 4 tables in drizzle adapter
- [x] Create login page at `/login`
- [x] Create signup page at `/signup`
- [x] Create lightweight Edge-safe middleware (cookie check only — no DB calls)
- [x] Create protected admin dashboard at `/admin`
- [x] Add `zod` to dependencies (was missing — login/signup would not build)
- [ ] Provision Neon PostgreSQL database (see DB Setup Guide below)
- [ ] Add `DATABASE_URL` and `BETTER_AUTH_SECRET` to Vercel environment variables
- [ ] Run `npx drizzle-kit migrate` to apply schema to live DB
- [ ] Sign up at /signup, then promote account to admin role in Neon console

**DB Setup Guide (one-time, ~10 minutes):**

**Step 1 — Create the database on Neon:**
1. Go to [neon.tech](https://neon.tech) → sign up / log in with GitHub
2. Click **New Project** → name it `visaforte` → select region closest to you → **Create**
3. On the dashboard, copy the **Connection string** — looks like `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

**Step 2 — Connect Neon to Vercel:**
1. In Vercel → your project → **Settings → Environment Variables**
2. Add `DATABASE_URL` = the connection string from Step 1
3. Add `BETTER_AUTH_SECRET` = run `openssl rand -hex 32` in your terminal and paste the output
4. Set `NEXT_PUBLIC_SITE_URL` = `https://visaforte.com` (or your current Vercel URL if domain not connected yet)
5. Click **Save** — then go to **Deployments** and **Redeploy** the latest deployment

**Step 3 — Run the migration (creates all DB tables):**
```bash
# In apps/web/ — run this once with the real DATABASE_URL
cd apps/web
DATABASE_URL="postgresql://..." npx drizzle-kit migrate
```

**Step 4 — Create your admin account:**
1. Go to your Vercel URL → `/signup` → create your account with your email
2. In the Neon console → **SQL Editor** → run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'prashant@visaforte.com';
   ```

**Prashant Proof:** Go to visaforte.com/login. Log in with your admin email. Confirm you land on the admin dashboard. Log out. Try accessing /admin directly — confirm you are redirected to the login page.

**Review:**
- Auth routes are now served at `/api/auth` using Better Auth.
- Login and signup screens are implemented.
- Admin dashboard protects `/admin` using server-side session validation.
- A dedicated logout route now exists at `/logout`, and the admin sign-out button uses it.
- `BETTER_AUTH_SECRET` is documented in `apps/web/.env.example`.
- The codebase is auth-ready; deployment still requires setting `DATABASE_URL` and `BETTER_AUTH_SECRET` in the hosting environment.

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

*None yet. Move completed task blocks here when done, with a Review section appended.*

---

*todo.md is the single source of task truth. If it's not here, it's not in scope.*
