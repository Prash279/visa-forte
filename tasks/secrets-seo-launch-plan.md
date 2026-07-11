# Visa Forte Website — Secrets Remediation, SEO Foundation & Launch Plan

> Generated 2026-07-10 from a codebase audit (three exploration agents: SEO/rendering, security posture, site structure). Saved here for execution inside the Visa Forte project. No secret values are recorded in this file — only the names of secrets that must be rotated.

## Context

visaforte.com is **live** (Vercel, fronted by Cloudflare) and — contrary to the initial assumption — **complete on every core page**: home, about, services, visas, assessment, CRS modeller, ITA countdown, booking, contact, processing-times, and legal pages all have real, finished content. The only unfinished items are two premium tools already shown as graceful "Coming Soon" cards (NOC Verifier, Refusal Pattern Analyser), more resources to add, and VisitVisa Pro (not in the code).

**Decision (Prash):** launch the finished site publicly now with full SEO, and gate only the unfinished bits — the site is launch-ready and every week hidden is lost SEO aging on a new domain.

The codebase is **already well-secured** (strict security headers in `next.config.ts` + `vercel.json`, Zod validation on all 46 API routes, correct Razorpay HMAC signature verification, Drizzle parameterized queries, Better Auth + `requireAdmin` + IDOR checks, cron bearer secrets, a thorough `security.md`). The real gaps: a committed-secrets emergency, missing SEO plumbing, and leftover Render references.

All work happens on a **feature branch**, never `main`.

---

## Phase 0 — Secrets remediation (P0 — before anything else)

> **✅ RESOLVED 2026-07-11 — premise was false.** Full scan of all 371+ commits on every local and remote ref (post-fetch): `apps/web/.env.local` was **never committed** on any ref, and no secret value patterns (DB connection strings with embedded credentials, Blob tokens, Vercel tokens, cron secrets, admin passwords) appear in any tracked file in any commit — the only grep hits are a CI placeholder and a docs example. `.gitignore` covers `.env*.local` at repo root and `.env*` in `apps/web/`. The file exists only in the local working tree, untracked. **No rotation, no history rewrite, no force-push needed.** The 2026-07-10 audit agent likely misread the untracked file as tracked.

`apps/web/.env.local` is **committed to a private remote** with real secrets: `DATABASE_URL` (Supabase password), `VERCEL_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_DELETE_PASSWORD`, `CRON_SECRET`, `SENTRY_DSN`. Razorpay is still a placeholder (safe). `.gitignore` already lists `.env*.local`, but the file was tracked before that rule. Real config already lives in Vercel dashboard env vars, so the committed file is redundant.

1. **Confirm scope**: `git ls-files | grep .env.local`, `git remote -v`, `git log --all -- apps/web/.env.local`.
2. **Rotate every exposed secret at its source** (treat all as compromised — they're in remote history):
   - Supabase DB password (Dashboard → Settings → Database → reset) → update `DATABASE_URL` in Vercel env.
   - `VERCEL_TOKEN` — revoke in Vercel Account → Tokens; reissue only if something needs it.
   - `BLOB_READ_WRITE_TOKEN` — rotate in Vercel Blob store.
   - `ADMIN_DELETE_PASSWORD`, `CRON_SECRET` — regenerate, update Vercel env.
   - `SENTRY_DSN` — rotate (lower risk, but the ingest key is exposed).
3. **Untrack**: `git rm --cached apps/web/.env.local` (keep the local copy), confirm `.gitignore` covers it.
4. **Purge history**: `git filter-repo --path apps/web/.env.local --invert-paths` (or BFG), then **force-push to the private remote** and re-clone on any other machine. Confirm the exact commands before the history rewrite / force-push.
5. **Verify**: `git log --all -- apps/web/.env.local` returns nothing; the site still runs on Vercel with the rotated values; the old DB password is rejected.

---

## Phase 1 — Render removal (clean Vercel-only)

Files: **delete** `render.yaml`; edit `tech.md` (hosting tables + "Long-term default: Render" + Phase-2 migration sections, ~8 refs → rewrite Vercel-only), `tasks/todo.md` (remove ~5 deferred-Render task lines — **leave `todo.md:770` "Render PortalDashboard"**, that's React rendering, not the host), `security.md:320` (clarify wording). Verify: `grep -ri "render.yaml\|render auto-deploy\|migrate to render\|long-term default: render"` returns nothing.

---

## Phase 2 — SEO foundation

**New files** (App Router conventions, under `apps/web/src/app/`):
- `robots.ts` — allow all crawlers, reference the sitemap.
- `sitemap.ts` — enumerate public routes only (`/`, about, services, visas, resources, assessment, tools/crs-modeller, tools/ita-countdown, processing-times, contact, booking, privacy-policy, refund-policy). Exclude admin, portal, login, signup, api.
- `opengraph-image.tsx` — brand-consistent default OG card via `next/og` (uses the design tokens in `globals.css`).

**Edits:**
- `layout.tsx` — add `metadataBase` (from `NEXT_PUBLIC_SITE_URL`), a title `template`, default `openGraph` + `twitter` (summary_large_image), and a global `robots: index,follow`. Inject **Organization + WebSite JSON-LD**.
- **Per-page metadata** on every public page — unique `title` + `description` + `alternates.canonical` + page-level OG. Use one small helper `src/lib/seo.ts` (`buildMetadata()`) to stay DRY across ~12 pages.
- **Per-page JSON-LD** where it earns rich results: `Service` on `/services`, `WebApplication` on the tool pages, `BreadcrumbList` site-wide, `FAQPage` where FAQ content exists.

Verify: `next build`; fetch `/robots.txt` and `/sitemap.xml` locally; Google Rich Results Test on deployed pages; confirm canonical + OG tags render.

---

## Phase 3 — Launch enablement (config, not code)

> **Status 2026-07-11:** Phases 1–2 are complete on PR #1 (`feat/seo-launch`). Live-site probes: Googlebot and Bingbot user agents both receive **200** from visaforte.com (the "403-to-bots" premise looks stale), and Cloudflare is already serving a managed robots.txt that blocks AI crawlers (GPTBot, ClaudeBot, CCBot, etc.) while leaving search open. **GA4 is not installed in the codebase at all** (analytics = Cloudflare Insights only) and there is no "how did you hear about us" field — both are build decisions for Prash, not config checks. Runbook for Prash, in order:
> 1. **Merge PR #1** → Vercel auto-deploys → verify visaforte.com/robots.txt and /sitemap.xml load (robots.txt should show the Cloudflare managed block *plus* the site's own rules).
> 2. **Cloudflare dashboard** → Security → Bots: confirm "Allow verified bots" is on / Bot Fight Mode isn't challenging search engines (probes suggest it already is fine).
> 3. **Google Search Console** → Add property `visaforte.com` (Domain) → copy the DNS TXT record → add it in Cloudflare DNS → verify → submit `https://visaforte.com/sitemap.xml` → URL-Inspect the homepage and request indexing on /, /services, /visas, /assessment.
> 4. **Decide**: add GA4 (+ intake source field)? Both are new code with privacy-policy implications — separate task if yes.

- **Cloudflare**: turn on "Allow verified bots" / ensure Bot Fight Mode isn't challenging Googlebot & Bingbot (the current 403-to-bots is what's blocking indexing). Keep the AI-crawler `Disallow` rules if desired.
- **Google Search Console**: verify domain (DNS TXT), submit `sitemap.xml`, run URL Inspection on the homepage, request indexing on the key URLs.
- **GA4 + attribution**: confirm GA4 is recording; define UTM conventions; ensure the booking/contact intake has a "how did you hear about us?" source field. Verify: Search Console reports "URL is available to Google."

---

## Phase 4 — Security hardening polish (baseline already strong)

- **Rate-limit public lead endpoints** — `intake`, `assessment-lead`, `booking`, `tools/lead-capture` currently have none (Better Auth already limits auth to 8/60s). Add a lightweight per-IP limiter. **Highest-value hardening item.**
- **CSP tightening** (optional/deferred): `script-src` currently allows `'unsafe-inline' 'unsafe-eval'` (Razorpay/Next need care) — evaluate a nonce-based CSP later without breaking Razorpay.
- **`npm audit`** — run, patch anything flagged; add to CI.
- Verify: securityheaders.com **A+** after deploy; `npm audit` clean.

---

## Phase 5 — Content & products (after 0–4)

- **Resources**: content is `src/lib/resources.json` + PDFs in `public/resources/` served via `/api/resources/download/[id]`. Adding a resource = edit JSON + drop a PDF.
- **⚠️ Scope fork to decide before Phase 5**: there is **no blog/MDX/article system** — but the business strategy makes an SEO-compounding blog the *primary* channel. A real blog is a **distinct build** (MDX or DB-backed articles + `/blog` routes + Article JSON-LD). Decide this before starting content.
- **Products**: build the two "Coming Soon" tools when ready; VisitVisa Pro is a separate greenfield build.

---

## Sequencing & guardrails
- Phase 0 first, always. Feature branch, not `main`. Each phase verified before the next.
- **Two decision gates**: (1) before the git history rewrite / force-push in Phase 0; (2) before starting Phase 5, on the blog-system decision.

## Verification (end-to-end)
- **Secrets**: `git log --all -- apps/web/.env.local` empty; rotated secrets work on Vercel; old DB password rejected.
- **Render**: grep clean (excluding React-render matches).
- **SEO**: `/robots.txt` + `/sitemap.xml` serve correctly; Rich Results Test passes; Search Console indexes the homepage.
- **Security**: securityheaders.com A+; `npm audit` clean; lead endpoints rate-limited.
- **Launch**: site publicly reachable, Googlebot can fetch (URL Inspection green), sitemap submitted.
