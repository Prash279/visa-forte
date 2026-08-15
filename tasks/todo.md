## Session 2026-08-13 — Search by Job Duties on the assessment forms (branch `feat/noc-duties-search`)

> Prash's ask: add a "Search by Job Duties / Responsibilities" section directly below the existing
> "Search by Job Title / Designation" box, where an applicant pastes the duties from their reference
> letter and the system cross-checks them against the official NOC job descriptions to identify the
> closest-matching NOC code. Plan approved 2026-08-13.

### What already existed (no new AI engine was built)

The matching engine is already live as `/tools/noc-verifier`, backed by `POST /api/tools/noc-verifier`:
deterministic TF-IDF shortlist over all 516 official NOC 2021 unit groups → Claude (claude-sonnet-4-6,
extended thinking) ranks that shortlist against each group's **real StatCan lead statement and main
duties**, judging scope of work not shared vocabulary → winning code live-verified on noc.esdc.gc.ca.
Returns top 3 with a 0–100 fit score, a one-sentence rationale and a confidence band, and carries the
domain anchors that fixed the "Data Science Engineer → Civil Engineers" failure. **This task wires that
existing engine into the two assessment forms — it touches no prompt, no dataset, and no IRCC figure.**

### Decisions Prash confirmed before any code

| Question | Decision |
|---|---|
| Engine | Reuse `/api/tools/noc-verifier` as-is — no new endpoint, no offline-only mode |
| Result handling | Show top 3, applicant clicks one — nothing auto-applied to the NOC field |
| Coexistence with title search | Both feed one NOC field, last selection wins, chip names which method found it |
| Where | Public Assessment page **and** admin CanVisa Pro, as one shared component |
| Rate limit | Public stays 20/hour per IP; **admin session exempt** so CanVisa Pro never eats the public budget |

### Tasks

- [x] 1. `NocSearch` is now controlled — it holds only the query box and dropdown, and reports the
      whole chosen entry upward (`onSelect(entry: NocEntry)`). Its private `selected` state and the
      chip that rendered it are gone. Two boxes writing to one field cannot work while that state is
      hidden inside one of them. Its dead chip CSS (16 rule blocks) was deleted, not left orphaned.
- [x] 2. `NocPicker` owns the one selection and renders both routes into it — title search on top,
      duties panel below. Whichever route the applicant picked last wins, and the chip records which
      route it was ("Matched from duties" / "Matched from job title"), so the two can never disagree.
- [x] 3. Duties panel: textarea capped at the API's own 3,000 chars, live count that shows the 30-char
      minimum until it is met, disabled button below it, duties-not-titles hint. The Occupation / Job
      Title already on the form rides along as context (trimmed to 120 chars) — never retyped.
- [x] 4. Results: top 3 cards — code, official title, TEER, fit score, rationale, collapsible official
      lead statement + main duties, ESDC deep link, "Use this code". Only that button writes to the
      form; a match whose TEER is outside 0–5 disables its own button rather than coercing a value.
- [x] 5. Degraded results labelled honestly (Lesson 5): amber caution whenever `method:"lexical"`,
      naming keyword-matching as the cause and telling the applicant to retry. Confidence chip shown
      only for AI results. The verified line names the actual confirming source, ESDC or StatCan
      (Lesson 6). Added back the "Verify on canada.ca ↗" link the old chip carried — the refactor had
      silently dropped it, leaving a title-route code with no route back to IRCC's own NOC page.
- [x] 6. Admin exemption in the route: `getCurrentAuthSession()` + ADMIN_EMAIL, checked before the
      limiter; absent/failed session falls through to the normal public 20/hour per IP.
      **`getCurrentAuthSession` was being called without being imported** — caught at this gate, not
      in production. One-line fix; it would have failed the CI typecheck.
- [x] 7. Both call sites swapped to `NocPicker` with `jobTitleContext={profile.occupationTitle}` —
      `AssessmentTool.tsx` (light) and `CanVisaProTool.tsx` (dark, still copying the NOC title into
      `occupationTitle` as before).
- [x] 8. Mobile-first CSS: 375px base, `min-width` layers at 768 and 1280, both themes, nothing below
      0.75rem, tags reusing the single site-wide style (saffron text, thin saffron border, no fill —
      Lesson 5 of the UI category).
- [x] 9. Verified: `npm test` 391/393, `tsc` clean, `eslint` clean, production build compiled ✓.
      **Honest limitation: this repo has no component-level test harness — no `.test.tsx` exists
      anywhere.** The engine's own tests cover the matching logic; the new UI is verified by build,
      typecheck and browser check, not unit tests. Three caveats, none caused by this feature:
      - The 2 failing tests (`pnp-pptx`, `ita-countdown/verify`) are 5s-default timeouts under
        cold-import contention in the full run — both pass in 1.9s when run alone. Pre-existing,
        and a latent CI flake worth a `testTimeout` bump in a separate change.
      - `next build` compiled clean but its post-compile typecheck tripped on a **0-byte
        `.next/dev/types/routes.d.ts`** left by an interrupted dev server, which `tsconfig.json:30`
        pulls into the typecheck. Local artifact only — CI checks out fresh, so it is unaffected.
        Typecheck was re-run against source alone (`.next` excluded) and came back clean.
      - The **dev server on :3000 (PID 14912) is wedged** — it does not answer `/` either, so it
        predates these changes and is the same process that truncated `routes.d.ts`. It needs a
        restart before the browser check below can run.
- [x] 10. Adversarial résumé-speak probe (Lesson 5), run against the retrieval stage directly since
      the dev server is down. Input: "Data Science Engineer" + productionising ML models, feature
      engineering, A/B lift tests, Python/SQL pipelines, feature store. Result: **raw TF-IDF still
      ranks 21300 Civil engineers #1** — the documented Lesson 5 failure reproduces exactly at the
      recall layer — while all four anchored codes reach the shortlist (21211 Data scientists at #2,
      plus 21232, 21231, 21223). That is the architecture behaving as designed: recall carries the
      right answer forward and Claude's ranking stage picks it. Titles read from the bundled StatCan
      dataset, not from memory (Lesson 5, Immigration Domain). **Still outstanding: the end-to-end
      probe through the live route, which needs the dev server back up.**

### Prashant Proof (60-second browser check)

Go to `/assessment`, Section 1. Below "Search by Job Title / Designation" you will see "Search by Job
Duties / Responsibilities". Paste three or four sentences of real duties from a client reference letter
and click "Find Matching NOC". Three NOC candidates appear, strongest first, each explaining why it
fits. Click "Use this code" and confirm the NOC chip above updates and says it was matched from duties.
Repeat at `/admin/canvisa-pro`.

---

## Session 2026-07-19 (night, follow-up) — Live-verify source: ESDC first (branch `fix/noc-verify-esdc-source`)

> Prash correction on the PR #12 result: the live check verified against Statistics Canada; it
> should be anchored to noc.esdc.gc.ca — the site IRCC's "Find your NOC" directs applicants to.
> Both publish the identical NOC 2021 classification (no wrong data was shown), but the
> verification claim must follow the user's authority chain. lessons.md Lesson 6.

- [x] `verifyCodeLive` now checks the ESDC NOC 2021 profile (`noc.esdc.gc.ca/Structure/NocProfile`,
      version 2021.0 — confirmed server-rendered, title verbatim, 404 on bogus codes) FIRST, with
      StatCan as fallback; returns which source confirmed ('esdc' | 'statcan' | null).
- [x] Public route responds `verifiedSource`; UI names the actual confirming source; hero +
      disclaimer copy re-anchored to ESDC. Admin route unchanged in behaviour (boolean from source).
- [x] 3 new unit tests pin the order (ESDC-first short-circuits, StatCan fallback, null when
      neither confirms). 393/393 · tsc · eslint · prod build. Deploy gate: production replay must
      show `verifiedSource:"esdc"`.

---

## Session 2026-07-19 (night) — NOC Verifier accuracy rework (branch `fix/noc-verifier-ai-ranking`)

> Prash correction after PR #11 went live: "Data Science Engineer" input returned Civil Engineers.
> Root cause: RT-4 shipped only the TF-IDF recall layer as the final answer (per the original
> "no Claude API call" spec). **Prash overrode that spec — accuracy over per-call cost.**
> Full post-mortem: lessons.md Lesson 5.

- [x] Public route now runs the same three-stage pipeline as the admin PNP classifier:
      retrieval shortlist (top 30) → Claude (claude-sonnet-4-6, extended thinking) ranks against
      each group's real StatCan lead statement/duties with the scope-not-vocabulary system prompt →
      `groundClassification` (model can only pick shortlisted codes; TEER/title joined from the
      dataset) → **`verifyCodeLive` checks the winning code against the official StatCan page**
      (the live canada.ca-family cross-verification Prash asked for). `verifyCodeLive` moved to
      `noc-classify.ts` and shared with the admin route (was duplicated-private there).
- [x] New DOMAIN_ANCHOR for data science/ML/AI vocabulary (21211/21232/21231/21223, all verified
      against the bundled StatCan dataset) — guarantees these codes reach the shortlist for the
      exact input class that failed; anchor-wins promotes them when Claude ranks any of them.
      Probe with the verbatim screenshot input: anchored codes present in shortlist ✓.
- [x] Graceful degradation: Claude unreachable/no key → lexical top-3 explicitly labelled
      `method:"lexical"`, UI shows an amber caution ("keyword matches only — try again"). Never
      presents keyword matches with AI-result confidence again.
- [x] Free-endpoint cost guard: per-IP in-memory rate limit 20/hour (ponytail: per serverless
      instance; shared store only if traffic demands). Input capped at 3,000 chars.
- [x] UI: confidence chip (high/medium/low), "✓ live-verified against Statistics Canada" line,
      "Why this code" rationale from the classifier, updated hero + disclaimer copy.
- [x] Tests rewritten with mocked Anthropic client: grounding rejects codes not in shortlist,
      anchor-wins promotion, lexical fallback on API failure and on missing key. 390/390, tsc,
      eslint, prod build. **Deploy gate: after deploy, POST the screenshot input to production —
      must return method:"ai" (if "lexical", ANTHROPIC_API_KEY scope in Vercel needs fixing).**

---

## Session 2026-07-19 (later still) — RT-4 NOC Verifier + RT-5 Refusal Analyser (branch `feat/noc-verifier-refusal-analyser`)

> Commissioned by Prash after PR #10 merged: "Now complete the NOC Code Verified and Refusal
> Pattern Analyser." These are the two "Coming Soon" cards on /resources, spec'd as RT-4 and RT-5
> at the bottom of this file.

**Plan:** — ALL DONE, see checkmarks
- [x] RT-4 `/tools/noc-verifier` (free, ungated, deterministic — per spec, NO Claude API call):
      `POST /api/tools/noc-verifier` wraps the existing `retrieveCandidates()` lexical scorer
      (noc-2021.json stays server-side — 1.2 MB never enters the client bundle) → top 3 matches
      with code, TEER, official title, lead statement, main duties, ESDC profile link
      (`esdcProfileUrl()` already exists). Client page clones the crs-modeller shell
      (assessment.css + tool css, JSON-LD, mobile-first). Honest confidence bands from relative
      score — labelled "strongest match / also review", never "your code is X".
- [x] RT-5 `/tools/refusal-analyser` (premium): deterministic pattern library
      `refusal-patterns.ts` — refusal grounds keyed on the standard phrases refusal letters use
      (purpose of visit / would-not-leave, financial insufficiency, travel history, home-country
      ties, work-experience/duties mismatch, proof of funds, incompleteness, misrepresentation,
      medical, criminal/police cert, language validity, ECA) → ranked grounds + root causes +
      reapplication strategy. ponytail: rules, not Claude API — testable, zero per-run cost,
      and the letter text never needs to leave the request scope.
- [x] RT-5 gating clones the shipped premium-resources flow: `create-order` (price server-side:
      new `REFUSAL_ANALYSER_PAISE = 249700` in pricing.ts — ₹2,497, midpoint of the spec's
      ₹1,997–₹2,997 range, one constant to change) → `verify` (HMAC check first) → access token
      REUSES `premium-download-token.ts` (id "refusal-analyser", 30-day validity) → `analyse`
      route requires the token. Receipt email = re-access link only.
- [x] **Privacy deviation from RT-5 spec, deliberate:** spec said "result emailed as PDF" — NOT
      built. The refusal letter and its analysis are client case PII; emailing them through Resend
      would store case detail in a third-party mail log (security.md: never forward client PII
      beyond task scope). Instead: analysis renders on-page with Print/Save-as-PDF (RT-3 print
      pattern), letter text is never logged or stored, analyse route processes in-memory only.
- [x] /resources tools grid: both "Coming Soon" cards → live links. Sitemap: add both pages.
- [x] Tests: 16 new — noc-verifier route ×5 (incl. determinism + NOC 2021 2123x software codes;
      caught my own stale-training-data bug: I first asserted the NOC 2016-era 217x prefix),
      refusal pattern library ×7 (visitor/EE/misrep sample letters → expected top ground),
      analyse route ×4 (403 no token, 403 cross-product token, 400 short letter, 200 valid).
      `npm test` **388/388** · tsc clean · eslint clean · prod build green (both pages +
      all 4 API routes present in build output).

**Prashant Proof (browser, <60s):**
1. Go to /resources → Interactive Tools: the two "Coming Soon" cards are now live links.
2. /tools/noc-verifier: paste "I write and test software code for web applications and maintain
   existing programs" → click Find My NOC Code → NOC 21232/21234 cards appear with TEER 1 and a
   working "Confirm on the official ESDC profile" link.
3. /tools/refusal-analyser: the free fictional example is visible; the paywall shows name/email +
   "Unlock the Analyser — ₹2,497" opening Razorpay checkout. (Full flow needs a test payment;
   after payment, paste any refusal letter → grounds + strategy render + Print/Save as PDF works.)
4. Both pages at 375px: form, cards, and buttons stack cleanly.

---

## Session 2026-07-19 (later) — Free resources batch 2 (branch `feat/free-resource-pdfs-batch2`)

> Commissioned by Prash after PR #9 merged: the filter categories Application Guides, Sample Formats,
> Letter Templates, and Comparison Tables were empty — "Create downloadable PDF's for these as well
> in the same way."

- [x] Live-verified all new facts via curl (canonical URLs after redirects: `who-can-apply/*`,
      `documents/education-assessment.html`, `documents/language-test.html`, ops-manual
      completeness-check page). Confirmed: ECA 5-yr rule + 5 designated orgs + CACB/MCC/PEBC
      professional bodies (CACB designated 2024-05-20, pre-2024-10-31 grandfather note); FSW 1yr/
      1,560h in 10yrs + CLB 7 + 67/100 + PoF exemption (legal work + job offer); CEC 1yr in 3yrs +
      CLB 7 (TEER 0/1) / CLB 5 (TEER 2/3) + no education + no PoF; FST 2yr/3,120h in 5yrs + Major
      Groups 72(-726)/73/82/83/92/93(-932) + CLB 5 S/L + CLB 4 R/W + job offer OR certificate;
      reference-letter mandatory elements incl. self-employed rules (no affidavits) + T4/NOA.
- [x] 4 new builders in `generate_resource_pdfs.py`, one per empty type: `eca-application-guide`
      (guide), `employment-reference-letter-sample` (sample), `employer-request-letter-template`
      (letter), `fswp-cec-fstp-comparison` (comparison). 4 new `resources.json` free entries
      (featured: false — original 3 stay first). All 7 filter pills now have content.
- [x] Content verified via markitdown; tsc clean; `npm test` 372/372 (data-driven resources tests
      cover the new entries automatically); README updated.

**Prashant Proof:** go to /resources → Free Resources → click each filter pill (Application Guides,
Sample Formats, Letter Templates, Comparison Tables) — each now shows a card, and its "Download
Free →" saves a branded PDF.

---

## Session 2026-07-19 — Resource PDF products + premium purchase flow (branch `feat/resource-pdf-products`)

> Directly commissioned by Prash this session: "build the products for both the free resources and
> premium resources on the Resources page that the client can download after the purchase as pdf
> documents … and complete the resources page build." That instruction is the approval for this plan.

**What exists:** /resources page UI is live; `public/downloads/` is empty (free downloads 503);
premium "Buy Now" is a disabled button. `resources.json` defines 3 free + 3 premium products.

**Plan:**
- [x] 1. Verify content facts live against canada.ca via curl (CRS grid spot-checks vs `crs-rules.json`,
      IELTS→CLB equivalency chart, EE document list, post-ITA process steps). No figure enters a PDF
      without a same-session canada.ca citation or `crs-rules.json` provenance. **Done — crs-rules.json
      matched canada.ca exactly on every spot-checked figure; two guessed URLs 404'd and were replaced
      with canonical paths discovered from parent-page hrefs.**
- [x] 2. Build `scripts/generate_resource_pdfs.py` (reportlab, Visa Forte brand system, same colour/
      header/footer architecture as `generate_ee_questionnaire.py`). Cheat-sheet numbers are READ from
      `crs-rules.json` at generation time — never hand-typed. Every PDF carries the standard legal
      disclaimer + "Verified: <month year> · Source: canada.ca" header.
- [x] 3. Generate 3 free PDFs → `apps/web/public/downloads/` (served by existing download route).
      Content verified via markitdown text extraction (poppler not installed, so no page rendering).
- [x] 4. Generate 3 premium PDFs → `apps/web/private/downloads/` (NOT in public/ — paid content must
      not be URL-guessable). `outputFileTracingIncludes` added to next.config.ts so Vercel bundles
      them into the download route; verified in `route.js.nft.json` after prod build.
- [x] 5. Premium purchase flow, cloned from the proven ita-countdown pattern: `create-order` (amount
      from resources.json server-side) → `verify` (HMAC signature check before anything else) →
      stateless signed download token (`premium-download-token.ts`, HMAC over id+expiry with
      RAZORPAY_KEY_SECRET — no new env var, 30-day validity, timing-safe compare) →
      `premium/download` route streams the private PDF → purchase email + Prash sale notification
      via Resend (both non-fatal). ponytail: no new DB table — Razorpay dashboard is the purchase
      ledger; add a `resourceOrders` table later if refunds/revocation or CRM integration demand it
      (schema change = Halt-and-Ask, deliberately avoided here).
- [x] 6. Wire ResourceCard premium CTA to a client `PremiumBuyButton` (same Razorpay checkout.js flow
      as ItaCountdownTool): name+email fields → checkout → verified payment auto-starts the download
      and shows a re-download link. Free cards unchanged. `resources.json` premium entries gained
      `fileName`; `findPremiumResource()` added.
- [x] 7. Tests: 17 new (token sign/verify/expiry/tamper ×7, verify route ×4, download route auth ×4,
      resources accessors ×2) — `npm test` **372/372**, `tsc --noEmit` clean, eslint clean,
      prod build green.

**Prashant Proof (browser, <60s):**
1. Run `npm run dev` in `apps/web`, go to `/resources`.
2. Free: click "Download Free →" on the Express Entry Document Checklist card — a branded PDF saves
   to your computer (no more 503).
3. Premium: on the LOE Master Template Pack card, the disabled "coming soon" button is gone — you see
   name + email fields and a live "Buy Now →" that opens Razorpay checkout (test keys needed locally;
   on visaforte.com the live keys are already in Vercel). After a test payment the PDF downloads
   automatically and the link is emailed.
4. Confirm at 375px width the inputs and button stack cleanly inside the card.

---

## Session 2026-07-18 — CRS Section D bonuses: French + Canadian education (branch `feat/resources-inr-only`)

> Approved by Prash in-session ("Proceed"). Root finding: the CRS calculator's Section D summed only
> PNP + sibling — it never awarded the French-language bonus (25/50) or the Canadian post-secondary
> bonus (15/30), so /assessment and /admin/canvisa-pro **under-scored** French-proficient and
> Canadian-educated applicants. Fixed end-to-end, TDD, all figures verified live against canada.ca
> crs-criteria.html (date modified 2026-06-22) via the curl-through-Bash path.

- [x] `crs-rules.json` `sectionD`: added `frenchLanguageBonus` (two-tier **25/50** — 25 when English CLB ≤4/none, 50 when English CLB 5+ all four), `canadianEducation` (**15** 1–2yr / **30** 3yr+), and `maxTotal: 600` (Section D cap). All from crs-criteria.html.
- [x] `crs-calculator.ts`: new `CanadianEducationLevel` type + optional `canadianEducationLevel` on `ApplicantProfile`; `frenchBonusPoints`/`canadianEducationPoints` on `CrsBreakdown`; `frenchLanguageBonus()` (derives French vs English from test type — TEF/TCF vs IELTS/CELPIP, no new language field needed) + `canadianEducationBonus()`; Section D now `min(600, pnp+sibling+french+cdnEdu)`.
- [x] Latent bug also fixed: Section D was uncapped (PNP 600 + sibling 15 = 615 > the 600 max). Now capped.
- [x] PNP improvement scenario delta made cap-aware (600 − existing Section D points, not a flat +600).
- [x] UI: added "Canadian post-secondary credential (CRS additional points)" select (none / 1–2yr +15 / 3yr+ +30) to `/assessment` Section 7 and `/admin/canvisa-pro` Section 6, kept distinct from the existing FSW "Studied in Canada 2+yr" checkbox. French bonus needs **no** new control — derived from the language test already entered.
- [x] TDD: 11 new tests in `crs-calculator.test.ts` (French 25/25/50/0/0, Canadian edu 15/30/0, 600 cap, cap-aware PNP scenario), expected values from canada.ca. Snapshots updated — diff is ONLY the two additive `*Points: 0` fields + the rules-hash bump (2ceb4a21→9b674267); no existing score moved.
- [x] `tsc --noEmit` clean; `vitest run` **355/355** (was 344); eslint clean on changed files.
- [ ] **Prashant Proof (browser) — pending Prash:** see report. Verify the new select renders and a French/Canadian-education profile shows the higher CRS on both tools.
- [ ] Committed locally as `0e81451` on `feat/resources-inr-only` — NOT pushed, awaiting Prash's push instruction per git-workflow.md.

**Follow-up closed (2026-07-19, PR #7):** Section D bonus sources now render as named line items — /assessment shows an "Additional points: …" detail line (cap note reads `sectionD.maxTotal` from crs-rules.json, per review), CanVisa Pro PDF/PPTX show per-source rows + "Additional Total (Sec. D)". Also root-caused CI-vs-Windows rules-hash flapping (CRLF) — `hash-crs-rules.mjs` now normalizes line endings; see lessons.md Workflow Lesson 6 + addendum. Live verification 2026-07-19: two production assessments cross-checked against canada.ca (draw rows vs IRCC rounds JSON, $15,263 PoF family-of-1) — all correct.

**Still open (flagged, not built):** the FSW `hasCanadianEducation` checkbox and the new Section D tier are two separate controls (each maps to a different grid — FSW adaptability vs CRS Section D). Left independent to avoid changing FSW behavior; unify later if Prash prefers a single control.

---

## Session 2026-07-11 (later) — GA4 + lead attribution (branch `feat/ga4-attribution`)

> Approved by Prash in-session ("complete the GA4 decision"). Phase 3 config steps all done: Search Console verified, sitemap submitted, indexing requested on 4 key URLs.

- [x] **GA4**: add `@next/third-parties` (Vercel's own package, matches Next 16.2.2), render `<GoogleAnalytics>` in `layout.tsx` only when `NEXT_PUBLIC_GA_ID` env var is set — so nothing loads until Prash creates the GA4 property and adds the ID in Vercel
- [x] **CSP**: allow `www.googletagmanager.com` (script-src) and `*.google-analytics.com` (connect-src) in `next.config.ts` — otherwise the browser silently blocks GA
- [x] **Lead source field**: optional "How did you hear about us?" dropdown on `/intake` form → new nullable `referral_source` column on `leads` → shown in the admin leads table
- [x] **Privacy policy**: update Section 7 (Cookies) — it currently promises "no analytics cookies", which becomes false the moment GA4 is on
- [x] **Migration**: applied to Supabase 2026-07-11 (Prash approved). Note: `drizzle.__drizzle_migrations` journal on Supabase is empty (earlier migrations were pushed, not journaled), so `drizzle-kit migrate` replays from 0000 and fails — additive migrations are applied by running the generated SQL directly; column verified via information_schema after apply
- [x] Tests (340/340) + tsc + prod build green — 2026-07-11. Note: local `.env.local` lacks `RESEND_API_KEY`/`BETTER_AUTH_SECRET`, so local `next build` needs dummy values; Vercel has the real ones
- [x] Diff summary shown → Prash approved → committed → PR #2 merged to main 2026-07-11
- [x] Follow-up: PR #3 fixed 6 pre-existing `react/no-unescaped-entities` lint errors in `page.tsx` (red since PR #1) — main CI green again (verified: run "Merge pull request #3" = success)
- [x] **Prash**: create GA4 property at analytics.google.com → add `NEXT_PUBLIC_GA_ID` in Vercel env vars → redeploy — **DONE 2026-07-11**. Property "Visa Forte" / stream "Visa Forte Web", Measurement ID **G-1PD69792T8**. Set as `NEXT_PUBLIC_GA_ID` in Vercel Production only (Preview/Dev left off so test traffic stays out of the data), redeployed. Verified live in GA4 → Realtime: 1 active user (Hyderabad), `first_visit`/`page_view`/`session_start` firing, correct page title picked up. No manual `<script>` tag needed — `layout.tsx` already renders `@next/third-parties` `GoogleAnalytics` gated on the env var. Home-screen "No data received yet" banner is just stale cache; Realtime is the authoritative signal.
- **Scoped out**: booking form source field (payment route is a halt-and-ask zone; first-touch attribution lives on the lead form — add to bookings later only if needed)

---

## Session 2026-07-11 — Secrets verification + SEO foundation (PR #1)

- [x] Phase 0: verified `.env.local` never committed on any ref (371+ commits scanned) — no rotation, no history rewrite needed; plan annotated
- [x] Phase 1: Render removed — `render.yaml` deleted, tech.md/todo.md/security.md Vercel-only
- [x] Phase 2: robots.ts, sitemap.ts, opengraph-image.tsx, metadataBase + JSON-LD in layout, `buildMetadata()` canonical/OG on all 13 public pages; build + tsc + 340/340 tests green; code-reviewed
- [x] Fixed stale test: canvisa-lite PNP cutoff now derived from live draw JSON
- [ ] **Prash: merge PR #1** → then Phase 3 runbook in `tasks/secrets-seo-launch-plan.md` (Cloudflare bot check, Search Console + sitemap submission, GA4 decision)

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

## Active Session (2026-07-05): Resources page badge colours — brand consistency fix

Prash flagged the CHECKLIST / CHEAT SHEET / TIMELINE resource-type badges on `/resources` as using
too many different colours, inconsistent with the rest of the Visa Forte site.

- [x] Found the cause: `.resource-type-badge--{type}` in `resources.css` assigned four different
      solid fill colours (Prussian, Teal, Saffron, Ink) by resource type — never established
      anywhere else on the site and in tension with the brand rule that Saffron is accent-only.
- [x] Found the site's actual established pattern: `.visas-nav-tag` / `.visas-pnp-type-tag` in
      `visas.css` — saffron uppercase text, thin saffron border, transparent fill, no per-item colour.
- [x] Replaced all four coloured badge variants with that single consistent style in `resources.css`.
- [x] Verified live via Playwright screenshot at `/resources` — all badge types now render identically.

**Prashant Proof:** Go to /resources, scroll to "Start Here. No Email Required.", confirm every
resource badge (Checklist, Cheat Sheet, Timeline, Guide, etc.) renders in the same saffron-outline
style with no solid colour fills.

**Review (2026-07-05):** Complete. See `tasks/lessons.md` → Category: UI & Brand Standards →
Lesson 5 for the rule preventing recurrence (new component-level colour choices must be checked
against an existing site-wide tag/badge pattern before introducing a new one).

---

## Active Session (2026-07-06): 60-Day Countdown Planner — consistency fix + Sample Checklist redesign

Prash flagged the `/tools/ita-countdown` form page as inconsistent with the rest of the site, and
asked for the Sample Checklist preview page to be rethought and made significantly better.

**Root causes found (reading `ItaCountdownTool.tsx` + `ita-countdown.css` + `assessment.css`):**
- `.itc-card` and `.itc-tier-pill` use `border-radius: 8px` + a left-side accent border. No other
  card/component on the site uses rounded corners (`.asx-card`, `.resource-card`, `.tools-card`,
  `.visas-stream` are all sharp, 0-radius, 1px sand border) or a left-side stripe accent — the
  established pattern for a card accent is a 3px **top** border (`.asx-funds-card`, `.asx-draws-card`).
  This is what reads as "off the rest of the site" in the screenshot.
- The "Applying with spouse" checkbox row sits visibly lower than the "Dependent Children" dropdown
  next to it. Cause: `.asx-checkbox-group` carries `margin-top: 1.25rem` (meant for when it follows
  a full-width block), but here it's placed as a grid cell next to a `.asx-field`, which has no such
  margin because its label fills that space. The checkbox needs the same label-height spacer its
  neighbour gets, not extra margin.
- The grey "See Sample Checklist →" button in the screenshot is not a bug — it's the correct
  disabled state (`asx-submit-btn:disabled`) because the consent checkbox above it was unchecked.
  Leaving this as-is; adding one small hint line so it reads as "disabled until you check the box"
  rather than "broken."
- The Sample Checklist page's blurred dates use `filter: blur(4px)` directly on real text, which
  renders as an ugly jagged smear (visible in the screenshot) rather than a clean "locked" look.

**Plan:**
- [x] Form page: restyled `.itc-card` and `.itc-tier-pill` to the site's flat/sharp convention —
      removed border-radius and the left border, added a 3px top-accent instead (matches
      `.asx-funds-card` pattern). Selected tier pill now fills solid Prussian/pearl-text, matching
      `.filter-pill.active` on `/resources`, so the choice reads as clearly "chosen."
- [x] Form page: fixed the spouse-checkbox/dependent-children row alignment with an invisible
      label spacer (`.itc-label-spacer`) matching its neighbour's `.asx-label`, reusing `.asx-field`'s
      existing label+gap structure rather than inventing new CSS.
- [x] Form page: added a one-line `.asx-submit-note` hint ("Check the box above to continue.")
      under the submit button when consent isn't checked yet.
- [x] Sample Checklist page: replaced the blurred-text placeholder with a clean redacted dash
      pattern (`.itc-locked-value`) plus a reused saffron tag (`.itc-locked-tag`, same style as
      `.visas-nav-tag`) instead of an emoji/lock icon.
- [x] Sample Checklist page: now shows the applicant's REAL personalised checklist (via
      `generateChecklist()`, correct task count including spouse/children extras) instead of a
      generic hardcoded 3-item list. Copy states the total task count, references their actual
      ITA date, and names the tier/price they're about to buy.
- [x] Sample Checklist page: cards now share the corrected `.itc-card` styling (sharp, muted
      sand top-accent to read as "locked" vs. the real result view's Prussian/saffron accent).
- [x] Added a reassurance line under the purchase CTA (secure payment via Razorpay, instant
      email delivery).
- [x] Verified at 375px / 768px / 1280px via Playwright screenshots — form and sample states
      both clean, no overflow, checkbox/dropdown alignment holds, full 10-item checklist
      (7 base + spouse + 2 children in test) renders correctly at all three widths.
- [x] Scope held to `/tools/ita-countdown` only (form + sample states) — `tsc --noEmit` and
      `eslint` both clean on the two changed files, no other page touched.

**Prashant Proof:** Go to `/tools/ita-countdown`, confirm the form's cards/pills look sharp-edged
like the rest of the site and the spouse checkbox lines up with the children dropdown next to it.
Fill the form and submit to reach "Sample Checklist" — confirm the dates read as cleanly locked
(not blurred/smeared) and the page explains what you get and what it costs before asking you to pay.

**Review (2026-07-06):** Complete. Biggest change: the Sample Checklist page used to show 3
hardcoded generic tasks regardless of the applicant's actual profile — it now calls the same
`generateChecklist()` function the paid result uses, so a spouse/children applicant sees their
real, correctly-sized checklist (task names + notes) with only the exact dates locked. This is
the "10x" lever — real personalisation instead of a generic teaser.

---

## Active Session (2026-06-25): PNP Assessment — four engine corrections (Rashmi Anupozu report review)

Prash reviewed the generated PNP report and raised four issues. Fixing each one at a time, TDD.

- [x] **3a — "requires Required" cosmetic.** The eligibility breakdown renders `requires {requirement}` for every row; binary gates (ECA, job offer) carry the requirement word `Required`, producing "requires Required". Fix: tag each eligibility check as `threshold` vs `binary`; the report shows the "requires" prefix only for threshold rows, and binary rows show the requirement word on its own.
- [x] **2 — Weak ranked matches #2/#3.** The classifier is forced to return three codes with no relevance floor, so unrelated codes (31301, 22110) appear as "close matches". Fix: the model returns a 0–100 semantic fit score per candidate; `groundClassification` shows a runner-up only if it clears an absolute floor AND is within a margin of the leader. When none qualify, the report shows a single clean match (which also lifts confidence).
- [x] **1 — Unfair "low confidence".** The classifier prompt counts verbatim/near-verbatim duty matches, which punishes well-written, paraphrased real duties. Fix: reframe the rubric to judge confidence on semantic scope containment + TEER clarity + margin to runner-up, with an explicit directive that verbatim overlap is neither expected nor required.
- [x] **3b — Province points grid (SINP pilot).** No province-specific points calculator exists. Build a verified SINP 110-point grid scorer (Factor I labour-market success + Factor II SK connection, pass mark 60) from the official saskatchewan.ca grid, computing factors derivable from the existing profile and transparently marking uncaptured factors (second-language band, SK connection) as "to confirm". Source folder: `D:\1. Projects\…\Knowledge Base\SINP`. Point values verified live against saskatchewan.ca this session.

**Prashant Proof (whole session):** Go to /admin/canvisa-pro, run a PNP assessment for a Master's-degree health-policy profile, and confirm: (1) no "requires Required" text anywhere, (2) only genuinely-close codes appear under "Ranked matches considered", (3) the Saskatchewan card shows a SINP points total out of 110 with the 60-point pass mark.

**Review (2026-06-25):**
All four issues complete; full suite 261/261 green, `tsc --noEmit` clean.
- 3a/2/1 carried in from the prior session (verified still green this session).
- 3b — New `apps/web/src/lib/sinp-points.ts` scores the SINP International Skilled
  Worker grid. Point values were read directly from the official saskatchewan.ca
  "Assess Your Eligibility" page (PDF has no text layer, so it was rendered at high
  resolution with pypdfium2 and read crop-by-crop — NOT from training data). Verified
  grid: Education 23/20/20/15/12; Work-exp(5yr) 10/8/6/4/2; First-lang 20/18/16/14/12;
  Second-lang 10/8/6/4/2; Age <18:0 / 18-21:8 / 22-34:12 / 35-45:10 / 46-50:8 / >50:0;
  Factor I max 80, Factor II max 30, total 110, pass mark 60.
  Only Factor I is derivable from the profile; Factor II (SK connection) and a missing
  second-language test render as "to confirm", never silently zero. New `SinpCard` in
  `PnpReport.tsx` shows total/110, the 60-point pass-mark marker, per-factor counted vs
  to-confirm breakdown, gated on Saskatchewan being assessed. 19 new unit tests assert
  every grid value against the source. Also fixed two pre-existing `NocCandidate` test
  fixtures (pnp-marp/pnp-pptx) missing the issue-2 `fitScore` field so tsc is clean.

**Note:** `HANDOVER.md` is stale (CVP-5, 2026-05-29) and did NOT contain the SINP render
steps the opening prompt referenced. SINP values were therefore re-verified from source
rather than trusting any recalled figures.

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
5. Task 4: Razorpay payment integration (Next.js API route) — ✅ complete, see RT-2 below
6. Task 5: Cloudflare R2 document storage (aws-sdk/client-s3 from Next.js)
7. Task 8: CI/CD and observability (Phase 1 closer)

**Hosting decision confirmed:** Stay on Vercel for all of Phase 1. FastAPI is not needed — all
backend work uses Next.js server actions and API routes.

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
**Status:** ✅ COMPLETE — ⚠️ **USD REMOVED 2026-07-17. The USD half of this task below is superseded.**
**Approved:** ✅ Approved April 2026

> **What changed and why (2026-07-17).** This task shipped USD support gated on one Prash action that
> never happened — see "Enabling international payments on Razorpay dashboard is a Prash action
> (required for USD orders)" below. International payments were never activated, so for ~3 months
> every non-Indian visitor was auto-switched to USD by `detectCurrency()` (browser locale) and routed
> into a checkout that could not complete at the gateway, on tiers up to $999. Prash confirmed on
> 2026-07-17 that international payments are still inactive, and decided: India-first, INR only, add
> USD back once the gateway is live.
>
> **Now:** INR only. USD removed from `pricing.ts`, `create-order`, `verify`, `BookingForm`,
> resources data/type/card, and CSS. The `bookings.currency` column and the admin USD display branch
> were deliberately kept so historical records stay truthful; new bookings always write `'INR'`.
> Restore path documented in `pricing.ts`. Everything below describing a currency toggle, locale
> auto-detect, or USD pricing is a historical record of what was built, not what runs.

**What this delivers:** All 7 consultation bookings require payment upfront. Clients pay before the
booking is saved. Razorpay handles INR. Prices vary by service tier. Payment is verified server-side
before any booking record is created.

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
No separate Python host is needed — background jobs (data retention cron) run as Vercel Cron jobs.

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

**Hosting:** Stays on Vercel throughout Phase 3. The deletion cron runs as a Vercel Cron job (TypeScript API route) — no separate Python host needed.

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
**Stack:** Next.js + Vercel Cron throughout

**Architecture decision (confirmed):** The deletion cron runs as a Vercel Cron job calling a Next.js API route in TypeScript. All operations (DB via Drizzle, blob delete via `@vercel/blob`, email via Resend) already have working implementations in this codebase. A separate Python host would only be revisited if CanVisa Pro ever gets a server-side AI component.

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

### TASK PNP-R: PNP Pathway Assessment — Accuracy + Relevance + Steps + Brand Redesign
**Status:** ✅ COMPLETE (code built + verified 2026-06-23) — awaiting Prash's merge/deploy authorization
**Branch:** feat/pnp-pathway-assessment (already live in prod; this refines it)
**Trigger:** Prash regenerated a real report (Rashmi Anupoju) and found four gaps: weak NOC match, all 44 streams listed, thin application steps, off-brand "AI-looking" design.

**Confirmed decisions (Prash, 2026-06-22):**
1. NOC accuracy → **Full grounding + verify** (bundle real NOC 2021 dataset; rank top-3; live-verify winner).
2. Streams → **NOC-targeted relevance shortlist (~5)**; hide the generic remainder.
3. Design → **Canonical Visa Forte light report** (Pearl ground, Prussian headers, Saffron accents, Freight/Cormorant headings).

**Non-negotiables carried through every phase:**
- Every IRCC fact (NOC code, TEER, fee, portal, deadline) verified against canada.ca / noc.esdc.gc.ca in-session before it is written. TEER is NEVER taken from the model or training data (lessons.md Immigration L4 + L5). Check `statusCode 200` and no redirect before trusting any extracted page (memory: live-verification-statuscode).
- 203/203 existing tests stay green; `tsc --noEmit` clean; add tests per phase.
- Mobile-first: base 375px → 768px → 1280px in the same commit (lessons.md Responsive L1/L2).
- One phase at a time, each committed separately. No `git push` without Prash's word.

---

**PHASE 0 — De-risk the data source (do first, reversible, no app code)**
- [ ] Verify NOC 41404 ("Health policy researchers, consultants and program officers") title + TEER live on noc.esdc.gc.ca — confirm it is genuinely TEER 1 and read its real lead statement + main duties.
- [ ] Locate an official bulk NOC 2021 v1.0 source (StatCan/ESDC) carrying, for all ~516 unit groups: code, title, TEER, lead statement, main duties, example titles. Confirm statusCode 200 + current version.
- [ ] **Gate:** if a clean bulk source exists → bundle it. If not → fall back to fetching the retrieved-candidate detail pages on demand, or a curated high-coverage subset. Report the chosen source to Prash before building Phase 1 on top of it.

**PHASE 1 — Grounded, verified NOC classifier**
- [ ] Bundle `apps/web/src/lib/noc-2021.json` from the Phase 0 source (code, title, teer, leadStatement, mainDuties[], exampleTitles[]) with a `_meta` source + verified date, mirroring the pnp-streams.json provenance pattern.
- [ ] `apps/web/src/lib/noc-retrieval.ts` — deterministic lexical retrieval: score the input duties against every unit group's text, return the top ~20 candidates. No network.
- [ ] Rewrite `app/api/admin/pnp-noc/route.ts`: feed the 20 real candidate descriptions to Claude (extended thinking) → returns a RANKED top-3 with per-candidate rationale + confidence + ambiguity. Model returns codes + reasoning only; the server joins title + TEER from `noc-2021.json` (never trusts model TEER) and rejects any code not in the dataset.
- [ ] Live-verify the winning code on noc.esdc.gc.ca (statusCode 200, no redirect; title/TEER match) → attach verification status + a deep citationUrl to the specific code.
- [ ] Extend `NocClassification`: add `candidates: { nocCode, teer, title, rationale, matchScore }[]` (ranked top-3) + `verified: boolean`. Keep `nocCode/teer/title` as the winner.
- [ ] Tests: retrieval surfaces the right neighbourhood for known duties; server rejects an out-of-dataset code; TEER always equals the dataset value; ambiguity still flags.

**PHASE 2 — NOC-targeted stream relevance shortlist (replace the 44-row dump)**
- [ ] Extend each stream in `pnp-streams.json` with `occupationTargeting: { categories?: string[]; nocCodes?: string[]; note: string; sourceVerified: boolean }`. Set targeting ONLY where verifiable against the provincial source; otherwise mark generic.
- [ ] Map a NOC → occupation category from its broad/major group (e.g. 41404 → healthcare/health-services).
- [ ] Engine: add a relevance score — NOC on a stream's verified list (high) > category match (medium) > generic-but-eligible (low) — combined with verdict strength + EE-linked strategic value. `assessPnp` returns a new `shortlist` (ranked, capped ~5, with a floor so it is never empty when an eligible stream exists) alongside the existing arrays.
- [ ] Report shows the shortlist as the primary recommendation, each with a one-line "why this fits your NOC". The full 44-row matrix moves to a secondary/collapsed "All jurisdictions" section (provenance preserved).
- [ ] Tests: shortlist caps at ~5; a healthcare NOC ranks health-targeted streams above generic ones; never empty when eligibility holds; existing eeLinked/base/ineligible behaviour unchanged.

**PHASE 3 — Thorough, verified step-by-step application guide (shortlisted streams only)**
- [ ] Expand the `roadmap[]` of each shortlist-eligible stream into detailed, stream-specific steps: where to register (EOI portal / IRCC), the documents required, the fee, nomination → ITA, and an indicative timeline. Add optional `link?` / `timeline?` to `PnpRoadmapStep` only if needed.
- [ ] Verify every factual step (portal URL, fee, deadline) against the provincial source in-session (statusCode 200). Anything unverifiable is written as a generic instruction, never invented.
- [ ] Tests: each shortlisted stream renders its full roadmap; provenance guard still passes.

**PHASE 4 — Canonical Visa Forte report redesign (in-app + downloadable)**
- [ ] Read brand references `colour-css.md` + `document-specs.md`; consult the frontend-design skill for craft.
- [ ] Rebuild `PnpReport.tsx` to the VF PR-Assessment-Report spec: Pearl ground, Prussian section headers, Saffron accent rules, Freight Display/Cormorant headings, Helvetica Neue body, Sand-striped tables, standard VF header + footer, disclaimer block (Amber fill, Saffron left border). Replace the off-brand bright-teal/near-black palette with brand tokens.
- [ ] Report order: VF header → Executive Summary → Occupation Classification (ranked candidates + verification) → Recommended Streams (shortlist, with why-relevant) → Step-by-Step Application Guide per shortlisted stream → All-Jurisdictions matrix (secondary) → Source & Verification Log → Disclaimer + VF footer.
- [ ] Rebuild `pnp-marp.ts` to the same brand spec (PPTX/PDF brand rules: Prussian title, Pearl content, Teal/Saffron chart accents).
- [ ] Mobile-first pass; screenshot audit at 1280 / 768 / 375 before marking done (lessons.md UI L4).

**Prashant Proof (final, after all phases):**
1. Go to visaforte.com/admin/canvisa-pro, hard-refresh, paste Rashmi's real duties, run the PNP assessment.
2. Confirm the classifier surfaces a ranked top-3 with NOC 41404 (TEER 1) as the lead, each with a plain-English rationale, and a "verified on noc.esdc.gc.ca" marker.
3. Confirm the report shows ~5 NOC-relevant streams (not 44), each with a "why this fits" line and a thorough step-by-step application guide.
4. Confirm the report looks like a Visa Forte document — Pearl/Prussian/Saffron, Freight headings — at desktop, tablet, and phone widths.

**Review (2026-06-23):**
All four phases built and verified locally. 231/231 Vitest pass; `tsc --noEmit` clean.
- **Phase 1 (NOC accuracy):** Bundled `noc-2021.json` (516 StatCan unit groups, authoritative TEER/title). `noc-retrieval.ts` deterministic IDF lexical retrieval ranks 41404 #1 for Rashmi's duties (score 134.4). Route rewritten: real candidates → Claude extended-thinking ranking (codes + rationale only) → server joins authoritative TEER/title → live-verify winner on noc.esdc.gc.ca (status 200 + title present). Model TEER never trusted.
- **Phase 2 (shortlist):** `noc-focus.ts` maps NOC → occupation category; `occupationFocus` tags on streams; `assessPnp` returns a `shortlist` (≤5, mismatch-filtered, RELEVANCE_BONUS lifts field-matched). Full 44-row matrix preserved as a secondary view.
- **Phase 3 (steps):** Per-shortlisted-stream application guide — before-you-apply conditions, derived document list, numbered roadmap, processing/fee/source.
- **Phase 4 (brand):** `PnpReport.tsx` + `pnp-report.css` rebuilt to canonical VF light report (Pearl ground, Prussian headers, Saffron accents, Cormorant headings, Sand-striped tables, Amber/Saffron disclaimer). `pnp-marp.ts` mirrors it for PPTX/PDF. Mobile-first; visual audit passed at 1280 / 768 / 375.
- **Deferred to prod proof:** the live Claude ranking could not run locally (ANTHROPIC_API_KEY is Vercel-only). All deterministic logic is tested green; model-ranking validation happens on the first production run.

---

### TASK CVP-9: PNP Assessment — Three Accuracy Fixes (grilled 2026-07-01)

**Status:** 🔲 IN PROGRESS
**Approved:** ✅ All three decisions locked via grilling session (2026-07-01)
**Trigger:** Real-world report review (Rashmi Anupoju follow-up) surfaced three classes of error.

---

**Three problems and their fixes:**

**Problem 1 — Wrong NOC despite manual selection (DECIDED)**
Root cause: `generatePnp()` in `CanVisaProTool.tsx` (~line 1108) short-circuits the duties classifier entirely when any 5-digit NOC is set in the form. If the consultant accidentally typed the wrong NOC code, the tool uses it with full confidence and the entire PNP report is wrong.

Decision: Always run the classifier when duties are provided (≥20 chars). The manually entered NOC becomes a hint passed to the route. If classifier result differs from the hint, auto-correct to the classifier and flag the discrepancy visibly in the report.

**Problem 2 — SINP shown as top stream despite no draws since Sep 2024 (DECIDED: Option C)**
Root cause: `pnp-streams.json` stream `sk-isw-ee` has `status: "open"` which gives it `openStatus: 20/20` in the ranking score. The engine has no concept of draw dormancy — only intake status. SINP EOI draws have been paused since 2024-09-12 (verified), which is 9+ months with no restart date.

Decision (Option C): Exclude from shortlist when a stream's draws have been paused ≥6 months. It stays in the full pathway matrix with a stale-draw notice. Implementation: add a `drawPausedSince` field to `PnpStream` type and set it on `sk-isw-ee`; filter in `assessPnp()`.

**Problem 3 — Hard-to-get nominations shown with no difficulty signal (DECIDED)**
Root cause: Verdict logic checks hard gates and conditional requirements only. It has no concept of practical selectivity, draw competitiveness, employer difficulty, or annual cap risk. Four categories of difficulty exist: hyper-competitive draws, employer-required streams, low-draw-frequency streams, and annual-cap-risk streams.

Decision: Add a `difficultyTags` array to each stream in `pnp-streams.json`. Tags: `high_competition`, `low_draw_frequency`, `annual_cap_risk`. Employer-required is derived at render time from existing `criteria.jobOfferRequired === 'required'` (no duplication needed). Tags render as small chip badges on each stream card in `PnpReport.tsx`. Employer-required streams stay in the shortlist, just tagged.

---

**Step plan:**

**Step 1 — `pnp-eligibility.ts`: extend `PnpStream` type**
- [ ] Add `drawPausedSince?: string` (ISO date, e.g. `"2024-09-12"`) — when set, stream is excluded from shortlist if months elapsed ≥ 6
- [ ] Add `difficultyTags?: ReadonlyArray<'high_competition' | 'low_draw_frequency' | 'annual_cap_risk'>` — static chips shown on stream card
- [ ] Add `nocOverrideConflict?: { yourSelection: string; correctedTo: string }` to `NocClassification` — populated by the route when classifier corrects a manual entry
- [ ] Add private helper `monthsSinceIso(isoDate: string, today?: Date): number` — computes full months elapsed (testable via `today` param)

**Step 2 — `pnp-eligibility.ts`: SINP shortlist filter in `assessPnp()`**
- [ ] After `rankedPathways` is built (line ~602), before `.slice(0, SHORTLIST_MAX)`:
  - Filter out any stream where `stream.drawPausedSince` is set AND `monthsSinceIso(stream.drawPausedSince) >= 6`
  - If any stream was excluded, push a flag: `"${province} — ${streamName} excluded from shortlist: no EOI draws since ${drawPausedSince} (${N} months). Shown in full pathway matrix — re-check when draws resume."`

**Step 3 — `pnp-streams.json`: tag `sk-isw-ee` + curate difficulty tags across all streams**
- [ ] Add `"drawPausedSince": "2024-09-12"` to `sk-isw-ee`
- [ ] Add `difficultyTags` to every stream (empty array `[]` for most; populated for known difficult streams):
  - `high_competition`: AB AAIP streams (Alberta routinely sees CRS 300+ cutoffs in provincial draws)
  - `low_draw_frequency`: `sk-isw-ee` and any other streams with documented infrequent or paused draws
  - `annual_cap_risk`: Streams from provinces known to fill their annual nomination cap mid-year (MB MPNP, NB SNB, PE PEI)
- [ ] Note: `employer_required` is NOT stored in `difficultyTags`; it is derived at render time from `stream.criteria.jobOfferRequired === 'required'` (data already present)

**Step 4 — `/api/admin/pnp-noc/route.ts`: accept `manualNocHint`, return conflict flag**
- [ ] Add `manualNocHint?: string` to the request body Zod schema
- [ ] After the classifier picks its winning code: if `manualNocHint` is set and differs from the winner's `nocCode`, attach `nocOverrideConflict: { yourSelection: manualNocHint, correctedTo: winner.nocCode }` to the response alongside the normal NOC classification fields

**Step 5 — `CanVisaProTool.tsx`: remove the `useManual` short-circuit in `generatePnp()`**
- [ ] Current guard at ~line 1108–1130: if `useManual` (valid 5-digit code set), skip the classifier entirely
- [ ] New logic:
  - If `duties.length < 20` AND no valid manual code → show "Enter duties or set a NOC code" error (unchanged)
  - If `duties.length >= 20` → ALWAYS call `/api/admin/pnp-noc`; if a manual code is set, include `manualNocHint` in the request body
  - If no duties (`duties.length < 20`) BUT valid manual code → use `manualNocClassification()` as before (no duties to classify)
- [ ] On API response: store `noc` as before; `noc.nocOverrideConflict` is passed through transparently (already on the type)

**Step 6 — `PnpReport.tsx`: show NOC correction notice + difficulty tag chips**
- [ ] At the top of the occupation classification section: if `noc.nocOverrideConflict` is set, render a visible notice:
  `"NOC auto-corrected: your selection [22110] → [41404] based on duties analysis. Duties were used to determine the correct code."`
- [ ] On each stream card (shortlist cards AND full matrix rows): after the stream name, render difficulty chips for:
  - All tags in `stream.difficultyTags` (mapped to human labels: `high_competition` → "Highly Competitive", `low_draw_frequency` → "Low Draw Frequency", `annual_cap_risk` → "Annual Cap Risk")
  - If `stream.criteria.jobOfferRequired === 'required'`: also render "Employer Required" chip (derived, not from JSON)

**Step 7 — `pnp-report.css`: style difficulty chips**
- [ ] `.cvp2-difficulty-tag` base style: small, pill-shaped, 0.7rem, uppercase
- [ ] Four colour variants: `--tag-competition` (amber), `--tag-employer` (slate), `--tag-frequency` (violet), `--tag-cap` (rose)
- [ ] Mobile breakpoint: chips wrap to next line cleanly on 375px (fit inside `.cvp2-card`)

**Step 8 — Tests**
- [ ] `pnp-eligibility.test.ts`: add test — sk-isw-ee excluded from shortlist when `drawPausedSince` is 7 months ago; present in `rankedPathways`; flag message added
- [ ] `pnp-eligibility.test.ts`: add test — `monthsSinceIso` returns correct value for a known date pair
- [ ] `pnp-golden-cases.test.ts`: add test — when `manualNocHint` differs from classifier result, `nocOverrideConflict` fields are populated

**Step 9 — TypeScript check + deploy**
- [ ] `cd apps/web && npx tsc --noEmit` — zero errors
- [ ] `npx vitest run` — all tests pass, zero regressions
- [ ] Commit: `fix(canvisa-pro): noc auto-correct, sinp shortlist exclusion, pnp difficulty tags`
- [ ] `git push origin main` after Prash gives the word

---

**Prashant Proof:**
1. Go to `/admin/canvisa-pro` — enter Rashmi's health policy duties with NOC manually set to `22110` (wrong code). Run PNP assessment.
2. Confirm the report shows a NOC correction notice: "Your selection: 22110 → Corrected to: 41404 based on duties analysis."
3. Confirm the shortlist does NOT include SINP ISW Express Entry. Confirm SINP still appears in the full pathway matrix with a "Draws paused since Sep 2024" notice.
4. Confirm stream cards show difficulty chips where applicable (e.g., Alberta AAIP shows "Highly Competitive", any employer-required stream shows "Employer Required").
5. Enter a profile with duties only (no manual NOC) — confirm the classifier still runs normally and no correction notice appears.

---

---

## Resources Tools — Phase 1 (Plan written 2026-07-02, awaiting Prash approval)

**Context:** Full product strategy grilled and locked 2026-07-01 (see HANDOVER.md). No code written yet. All decisions below are approved — this plan translates them into build steps.

**Goal:** Five interactive tools at `/tools/*` that convert free traffic into consultation leads and direct premium revenue. A trust-first funnel: free tools give real value, post-result capture drives leads, premium tools charge upfront.

**Three new DB tables shipped with RT-1 (all tools share them):**
- `tool_events` — custom analytics: tool name, event type, user CRS/category, timestamp
- `settings` — key/value flags (e.g., `posthog_enabled: false`); PostHog auto-activates via daily cron at 500 subscribers
- `draw_alert_subscribers` — name, email, CRS score, Express Entry category, enrolled_at

**Build sequence (each task approved before code is written for that task):**
1. RT-1: CanVisa Pro lite — `/tools/canvisa` (free, ungated)
2. RT-2: CRS What-If Modeller — `/tools/crs-modeller` (free, ungated)
3. RT-3: 60-Day Countdown Planner — `/tools/ita-countdown` (premium ₹2,997–₹3,997)
4. RT-4: NOC Code Verifier — `/tools/noc-verifier` (free, ungated)
5. RT-5: Refusal Pattern Analyser — `/tools/refusal-analyser` (premium ₹1,997–₹2,997)

**Resources page update (done at RT-1):** `/resources` gets a new "Tools" section above the existing PDFs — CanVisa Pro lite hero (full-width card) + 2×2 grid of the four remaining tools with "Launch Tool →" links.

---

### TASK RT-1: CanVisa Pro Lite — `/tools/canvisa`
**Status:** ⚠️ SUPERSEDED (as of 2026-07-19 review) — no `/tools/canvisa` route was ever built. The /resources Tools-section hero card links to the existing `/assessment` tool instead, and only `lib/canvisa-lite-logic.ts` (+ tests) exists from this plan. Build the dedicated route only if Prash still wants it separate from /assessment.
**What this delivers:** A public, ungated CRS assessment tool at visaforte.com/tools/canvisa. It gives the applicant their CRS score, the top 2–3 reasons their score is lower than the last draw cutoff, and the single highest-probability pathway. It withholds the multi-pathway comparison table, full action plan, and MARP download — those stay admin-only. After the result, a lead capture form offers "Email me my results" and "Alert me when my draw opens". Both offers have their own API routes and DB tables.

**What is NOT included in this tool:**
- Multi-pathway comparison table (admin tool only)
- Full action plan (admin tool only)
- MARP / PPTX download (admin tool only)
- PNP Pathway Assessment section (admin tool only)
- NOC auto-population search (admin tool has it; this tool uses a manual NOC field for simplicity)

**What IS included:**
- Full CRS form (identical fields to public `/assessment` tool — DOB, education, language, CWE, FWE, etc.)
- CRS score hero card (score number + pool eligibility badge)
- Top 2–3 weakness chips (e.g., "Language: CLB 7 → CLB 9 adds +32 pts")
- Single best pathway card (highest-probability draw category + most recent cutoff + gap)
- Contextual handoff copy below result, e.g. "23 pts below the last draw → See what moves your score fastest →" linking to `/tools/crs-modeller`
- Lead capture (post-result, never gated): "Email me my results" + "Alert me when my draw opens"
- Standard legal disclaimer
- Visa Forte brand: Pearl ground, Prussian headers, Saffron accents, Cormorant/DM Sans typography

**Key reuse decisions:**
- Import `calculateCRS` from `@/lib/crs-calculator` — do NOT copy the engine
- Import `getEligibleDrawCategories` logic pattern from `AssessmentTool.tsx` — lift it as a local function
- Import `crs-draw-history.json` from `@/lib/crs-draw-history.json`
- The form state shape mirrors `AssessmentTool.tsx` — adapt, do not duplicate

**Step plan:**

**Step 0 — Plan committed (Task 0 rule)**
- [ ] Commit this plan to git before any code: `docs: add resources tools phase 1 plan`

**Step 1 — DB: three shared tables (migration 0014)**
- [ ] Add to `apps/web/drizzle/schema.ts`:
  - `toolEvents`: id (uuid PK), toolName (text), eventType (text, e.g. 'result_shown' | 'lead_captured' | 'draw_alert_subscribed'), crsScore (integer, nullable), eeCategory (text, nullable), createdAt (timestamp)
  - `settings`: key (text PK), value (text), updatedAt (timestamp)
  - `drawAlertSubscribers`: id (uuid PK), name (text), email (text), crsScore (integer), eeCategory (text), enrolledAt (timestamp)
- [ ] Run `drizzle-kit generate` → review SQL → `drizzle-kit migrate`

**Step 2 — API: lead capture (`POST /api/tools/lead-capture`)**
- [ ] Create `apps/web/src/app/api/tools/lead-capture/route.ts`
  - Input (Zod): `{ name: string, email: string, crsScore: number, eeCategory: string, toolName: string }`
  - Insert into `drawAlertSubscribers` (if `wantsDrawAlert: true`)
  - Insert `toolEvents` row: `{ toolName, eventType: 'lead_captured', crsScore, eeCategory }`
  - Send Resend email to the subscriber: "Your CanVisa Pro results — CRS [score]" with the score, weakness summary, and pathway — plain-text template, not a PDF (PDF delivery is a future enhancement)
  - Send Resend notification to prashant@visaforte.com: new lead from tools page
  - Return `{ success: true }`
  - No auth required (public tool)

**Step 3 — API: draw alert subscribe (`POST /api/tools/draw-alert`)**
- [ ] Create `apps/web/src/app/api/tools/draw-alert/route.ts`
  - Input (Zod): `{ name: string, email: string, crsScore: number, eeCategory: string }`
  - Upsert into `drawAlertSubscribers` (unique on email — if already subscribed, update CRS and category)
  - Insert `toolEvents` row: `{ toolName: 'canvisa-lite', eventType: 'draw_alert_subscribed', crsScore, eeCategory }`
  - Return `{ success: true, alreadySubscribed: boolean }`

**Step 4 — Component: `CanVisaLite.tsx`**
- [ ] Create `apps/web/src/app/tools/canvisa/CanVisaLite.tsx` ("use client")
  - Same form fields as `AssessmentTool.tsx` (DOB, education, language, CWE, FWE, partner section, additional factors)
  - On submit: call `calculateCRS(profile)` client-side — no server round-trip needed
  - Fire `POST /api/tools/tool-event` (or inline in lead-capture) with `eventType: 'result_shown'` after score renders
  - Result view renders four sections:
    1. **CRS Score hero card** — large score number, pool eligibility badge (Eligible / Not Yet Eligible)
    2. **Top weaknesses** — up to 3 chips derived from `result.improvements`, each showing: factor name + "→ +N pts". Logic: sort `improvements` by point gain descending, take top 3
    3. **Best pathway card** — from `getEligibleDrawCategories()` logic, pick the category where gap is smallest (or positive). Show: category name, most recent cutoff, draw date, applicant gap, 3-month cutoff range
    4. **Contextual handoff** — if gap > 0: "Your score is [N] pts below the last [category] draw cutoff. → See what moves your score fastest" linking to `/tools/crs-modeller`
  - **Lead capture block** (below result, always visible after score renders):
    - Heading: "Want a copy in your inbox?"
    - Two-field form: Name + Email
    - Two checkboxes (both pre-checked): "Email me my results" + "Alert me when a [category] draw opens"
    - Submit button: "Send My Results →"
    - On submit: POST to `/api/tools/lead-capture`; success state shows "Check your inbox ✓"
  - Legal disclaimer block (same text as all other tools — extract to a shared component `LegalDisclaimer.tsx` if one doesn't already exist)

**Step 5 — CSS: `canvisa-lite.css`**
- [ ] Create `apps/web/src/app/tools/canvisa/canvisa-lite.css`
  - Base styles: mobile-first (375px base)
  - Breakpoints: `@media (min-width: 768px)` and `@media (min-width: 1280px)` in same file
  - Brand tokens (already in globals.css: `--prussian`, `--saffron`, `--pearl`, `--ink`)
  - Score hero: large Cormorant Garamond score number in `--prussian`, Saffron eligibility badge
  - Weakness chips: small pill badges, Saffron fill for top chip, Prussian fill for secondary chips
  - Best pathway card: Pearl card, Prussian border-left 4px, DM Sans body
  - Handoff copy: Saffron link, understated styling
  - Lead capture block: Pearl card, Prussian CTA button, input styling matching booking form
  - All text ≥ 0.75rem (brand floor — lessons.md UI L1)
  - Eyebrows on dark sections get `color: var(--saffron)` scoped override (lessons.md UI L2)

**Step 6 — Page: `apps/web/src/app/tools/canvisa/page.tsx`**
- [ ] Create the server component (no auth, no dynamic = no `export const dynamic`)
  - Import `./canvisa-lite.css`
  - SEO metadata: title "Free CRS Score Check — Visa Forte | CanVisa Pro Lite"
  - Render `<CanVisaLite />`

**Step 7 — Resources page: add Tools section**
- [ ] Edit `apps/web/src/app/resources/page.tsx` — insert a new `<section>` between the hero and the existing Free Resources section:
  - Hero sub-section (full-width): CanVisa Pro Lite — headline, 2-line description, "Check My Score Free →" CTA linking to `/tools/canvisa`
  - 2×2 tool grid below: CRS What-If Modeller · NOC Verifier · 60-Day Countdown Planner · Refusal Analyser — each as a card with tool name, one-line description, and "Coming Soon" or "Launch Tool →" badge
- [ ] Edit `apps/web/src/app/resources/resources.css` — add styles for the new tools section (mobile-first)

**Step 8 — Nav: add "Tools" link**
- [ ] In `apps/web/src/components/SiteNav.tsx` (or NavBar.tsx), add "Tools" link pointing to `/resources#tools` (or `/tools` if we want a dedicated tools index — keep it simple: anchor on resources page for now)

**Step 9 — Tests**
- [ ] `apps/web/src/app/api/tools/lead-capture/route.test.ts`: 4 tests — valid input inserts subscriber + event + sends email; missing email returns 400; invalid CRS returns 400; duplicate email on draw-alert upserts cleanly
- [ ] `apps/web/src/lib/canvisa-lite-logic.test.ts`: 3 tests — weakness extraction returns top 3 sorted by point gain; best pathway picks closest-gap category; handoff copy renders correct gap number

**Step 10 — TypeScript check + commit**
- [ ] `cd apps/web && npx tsc --noEmit` — zero errors
- [ ] `npx vitest run` — all tests pass, zero regressions
- [ ] Commit: `feat(tools): CanVisa Pro lite at /tools/canvisa + lead capture + draw alert subscribe`

**Prashant Proof:**
1. Go to visaforte.com/tools/canvisa (no login required)
2. Fill in a profile: age 34, Master's degree with ECA, IELTS 7.0/7.0/7.5/7.0, 2yr Canadian WE TEER 1, single, family of 1
3. Click "Check My Score →" — confirm the result appears with:
   - A CRS score card showing the score and pool eligibility badge
   - Up to 3 weakness chips showing the top improvement opportunities
   - A "Best Pathway" card with the most relevant draw category, its last cutoff, and your gap
   - A contextual handoff line (if gap > 0) with a link to /tools/crs-modeller
4. Enter name and email in the lead capture form, leave both checkboxes ticked, click "Send My Results →"
5. Confirm "Check your inbox ✓" appears
6. Check your email inbox — confirm an email arrives with your CRS score and weakness summary
7. Check prashant@visaforte.com — confirm a lead notification email arrived
8. Go to visaforte.com/resources — confirm the new Tools section is visible above the Free Resources section, with CanVisa Pro Lite as the hero card and four tool preview cards below it
9. On mobile (375px) — confirm score card, weakness chips, and lead capture form are all readable and not clipped

---

### TASK RT-2: CRS What-If Modeller — `/tools/crs-modeller`
**Status:** ✅ COMPLETE — 2026-07-03 (visual confirmation of age alert redesign pending Prash's proof below)
**What this delivers:** An interactive score simulator. The applicant starts from their base CRS score (entered manually or pre-filled via URL params from the /assessment handoff) and adjusts four live levers — language band (CLB per ability), education level, Canadian WE years, and foreign WE years — to see the score and point-delta update in real-time. Shows which lever combination clears the most recent draw cutoff for their pool category. Free, ungated, no login.

---

#### Step 0 — Route + skeleton (commit: `feat: scaffold /tools/crs-modeller route`)
- Create `apps/web/src/app/tools/crs-modeller/page.tsx` — server component shell, imports `CrsModeller` client component
- Create `apps/web/src/app/tools/crs-modeller/CrsModeller.tsx` — `'use client'` component, empty for now
- Create `apps/web/src/app/tools/crs-modeller/crs-modeller.css` — empty, imported at top of `CrsModeller.tsx`
- Verify: `tsc --noEmit` passes, route loads at `/tools/crs-modeller`

#### Step 1 — State model (commit: `feat: rt-2 state model + url param handoff`)
- State interface: `{ age, maritalStatus, education, ecaCompleted, langL, langR, langW, langS, canadianWE, foreignWE }` — mirrors the subset of `AssessmentProfile` used by the CRS calculator
- Read URL params on mount: `?age=34&edu=6&l=7&r=7&w=7.5&s=7&cwe=2` — pre-fill state if present (handoff from /assessment)
- Update `/assessment/AssessmentTool.tsx`: in the "How to Improve Your Score" section, wire the existing "Try the What-If Modeller →" handoff link (already present in the UI) to `/tools/crs-modeller?age=…&edu=…&l=…&r=…&w=…&s=…&cwe=…&fwe=…`
- Verify: navigating from /assessment to /crs-modeller pre-fills the form

#### Step 2 — Live score engine (commit: `feat: rt-2 real-time delta engine`)
- Import `calculate()` from `apps/web/src/lib/crs-calculator.ts` — no new logic, pure reuse
- On every lever change: call `calculate(baseProfile)` → `calculate(adjustedProfile)` → delta = adjusted − base
- Track per-lever delta: run `calculate()` once per lever with only that lever changed to isolate its contribution
- Read latest draw cutoff from `crs-draw-history.json` for the applicant's likely pool category (CEC if cwe ≥ 1, else All-Programs)
- State: `{ baseScore, adjustedScore, deltaTotal, perLeverDelta, cutoff, gapToCutoff }`

#### Step 3 — Lever UI (commit: `feat: rt-2 lever controls`)
Four lever groups, each with a label, current-value badge, and a point-delta chip that updates live:

| Lever | Control | Range |
|---|---|---|
| Listening (CLB) | `<input type="range">` + number | 4–12 |
| Reading (CLB) | `<input type="range">` + number | 4–12 |
| Writing (CLB) | `<input type="range">` + number | 4–12 |
| Speaking (CLB) | `<input type="range">` + number | 4–12 |
| Education | `<select>` | same 8 options as /assessment |
| Canadian WE | `<input type="range">` + number | 0–5 (capped at 5 for scoring) |
| Foreign WE | `<input type="range">` + number | 0–5 |

- CLB inputs: the lever stores CLB directly (integer 4–12). Conversion from IELTS band → CLB already exists in `crs-calculator.ts` (`scoresToClb`) — use it in reverse: display CLB on the lever, compute points from CLB.
- Education + marital status: dropdowns matching /assessment options exactly. Age and marital status are read from URL params and shown as read-only context (not editable here — full profile editing stays on /assessment).

#### Step 4 — Score display (commit: `feat: rt-2 score display + cutoff comparison`)
Layout (top to bottom):
1. **Score hero row** — Base: `NNN` → Adjusted: `NNN` (+/- delta in saffron/green/red)
2. **Cutoff bar** — horizontal bar showing base and adjusted vs. most recent cutoff. Green fill if adjusted ≥ cutoff, amber if within 20 pts, red if further.
3. **Per-lever delta table** — one row per lever: lever name | current value | points this lever is worth | if maxed, projected score. Sorted highest-gain first.
4. **"What clears the cutoff?"** — auto-computed: minimum combination of lever improvements that reaches cutoff (greedy, highest-gain first). Plain-English sentence: "Raising language to CLB 10 across all abilities (+23 pts) would put you at 482 — still 34 pts short. Adding 1 more year of foreign WE (+13 pts) would reach 495 — 21 pts short. A Provincial Nomination clears it."
5. **Draw context footer** — same data as /assessment: last draw type, cutoff, date, source link.

#### Step 5 — Lead capture (commit: `feat: rt-2 lead capture`)
- Same "Want a copy in your inbox?" block as /assessment — copy the component markup from `AssessmentTool.tsx`, not the full component (avoid premature abstraction)
- Same `/api/tools/lead-capture/route.ts` API endpoint — no new endpoint needed
- Payload addition: include `toolSource: 'crs-modeller'` alongside the score so admin emails are labelled correctly
- Verify: "Check your inbox ✓" appears after valid name + email submitted

#### Step 6 — Resources page card (commit: `feat: rt-2 resources page card`)
- In `apps/web/src/app/resources/page.tsx`, add a second tool card in the "Interactive Tools" section below the CanVisa Pro Lite card:
  - Title: "CRS What-If Modeller"
  - Tagline: "Move one lever. See the exact point gain. Find the fastest path to the cutoff."
  - Badge: Free · No Login Required
  - CTA: "Try the Modeller →" → `/tools/crs-modeller`

#### Step 7 — Polish + mobile (commit: `fix: rt-2 mobile responsive pass`)
- All range inputs: min touch target 44px height, thumb large enough to drag on mobile
- Lever table: collapses to card-per-lever at 480px
- Score hero: stacks vertically at 480px
- Run through 375px → 768px → 1280px before marking done

#### Step 8 — Tests + verification (commit: `test: rt-2 unit tests`)
- Unit tests in `apps/web/src/lib/__tests__/crs-modeller.test.ts`:
  - `calculate()` called with maxed language returns expected delta (verify against IRCC table)
  - `calculate()` called with 3yr foreign WE returns +25 vs 0yr foreign WE
  - URL param parsing: `?cwe=2&l=8` populates state correctly
- `vitest run` must pass (currently 328/328 — must stay green)
- `tsc --noEmit` must pass

#### Prashant Proof (RT-2)
1. Go to `visaforte.com/assessment`, fill a profile, submit → on the result page click "Try the What-If Modeller →" — confirm you land on `/tools/crs-modeller` with the form pre-filled
2. Move the Listening slider from CLB 8 to CLB 10 — confirm the adjusted score updates and the per-lever delta shows the correct point gain
3. Set Canadian WE to 3 years — confirm score updates
4. Confirm the cutoff bar turns green when adjusted score meets/exceeds the cutoff
5. Enter name + email → click "Send My Results →" → confirm "Check your inbox ✓"
6. On mobile (375px): confirm sliders are draggable, score hero readable, table not clipped
7. Go to `visaforte.com/resources` — confirm the CRS What-If Modeller card is visible in the Interactive Tools section

---

#### Review — RT-2 (2026-07-03)
Three bug-fix commits shipped after initial build, all merged to main and auto-deployed to visaforte.com:

- `1fe8976` — **Modeller link visibility fix**: "Try the CRS What-If Modeller →" pill was hidden on profiles with 0 Canadian WE (the condition only surfaced the link for CEC pool members). Fixed so the pill shows for all profiles.
- `447514d` — **getRelevantDraw fallback removed**: `draws[0]` was returned as a catch-all when no CEC or PNP draw existed in history. That fallback used the wrong draw category (often an All-Programs draw) producing a misleading "no matching draw" message. Removed entirely — the function now returns `null` and the UI shows an honest "no recent draw found" note.
- `32913eb` — **Age alert brand redesign**: The old age-band warning was an amber system-warning bar with emoji. Redesigned to a saffron left-border advisory card with "AGE ALERT" small-caps label and Prussian body text — consistent with the Visa Forte brand colour system.

Visual confirmation of the age alert redesign is pending (Prashant Proof above). All other RT-2 steps were verified at completion.

---

### TASK RT-3: 60-Day Countdown Planner — `/tools/ita-countdown`
**Status:** ✅ COMPLETE — 2026-07-04
**What this delivers:** A premium tool for post-ITA applicants. Accepts ITA date → generates a personalised 60-day document checklist with exact start-by and deadline dates per task, based on citizenship country, residence countries, and family size. Gated: free fictional sample preview → Razorpay inline pay (₹2,997 standard / ₹3,997 premium) → tool unlocks immediately. Result delivered as: (a) printable result page with `window.print()` button and (b) HTML email via Resend. Token stored in DB; result accessible at `/tools/ita-countdown/result?token=<uuid>`. Premium tier triggers a Resend notification to Prash to manually schedule a 30-min document review consultation.
**Price:** ₹2,997 (standard) / ₹3,997 (+ document review consultation slot)

---

**Key logic decisions (locked):**
- Police certificates: start Day 0 — longest lead time. India/Pakistan flagged as 6–8 weeks.
- Medical exams: start Day 3 (book appointment). Deadline Day 40.
- Language test: verify still valid (≤ 2 years from ITA date). Action due Day 7.
- Employment reference letters: start Day 7. Deadline Day 30.
- Document translations: Deadline Day 42.
- Biometrics: check if previously enrolled. Deadline Day 45.
- Final upload and submit: Days 50–58. Submission deadline = ITA date + 58 (2-day buffer before Day 60).
- No PDF library: HTML email from Resend + `@media print` CSS + `window.print()` button on result page.
- Premium ₹3,997: triggers Resend notification to prashant@visaforte.com to manually schedule the doc review call.

**DB table: `itaCountdownOrders`**
Columns: id (uuid PK), name (text), email (text), itaDate (date), citizenshipCountry (text), residenceCountries (text array), hasSpouse (boolean), numDependentChildren (integer), tier (text: 'standard' | 'premium'), token (uuid, unique), razorpayOrderId (text), razorpayPaymentId (text), paymentStatus (text: 'pending' | 'paid'), emailSent (boolean), createdAt (timestamp)

---

**Step plan:**

**Step 0 — Commit plan (Task 0 rule)**
- [x] Commit this plan to git before any code: `docs: add rt-3 ita-countdown plan` (already committed in de9e6cf)

**Step 1 — Logic function: `ita-countdown-logic.ts`**
- [x] Create `apps/web/src/lib/ita-countdown-logic.ts`
  - Types: `ItaInput { itaDate, citizenshipCountry, residenceCountries, hasSpouse, numDependentChildren, tier }`, `ChecklistItem { id, task, startByDate, deadlineDate, notes }`
  - Pure function: `generateChecklist(input: ItaInput): ChecklistItem[]`
  - Per-country police cert notes: India/Pakistan flagged "6–8 weeks — start immediately"; all other countries get standard "4–6 weeks" note
  - Family branching: spouse adds "Sponsor's letter of support" item; each child adds "Birth certificate + translation" item
  - Delivery method: HTML email (Resend) + printable result page — no PDF library
- [x] Unit tests in `apps/web/src/lib/__tests__/ita-countdown-logic.test.ts` (7 tests):
  - India profile: police cert item exists with "6–8 weeks" note, startByDate = ITA date
  - With-spouse profile: sponsor letter item present
  - No-children profile: no birth certificate item
  - All items have startByDate ≤ deadlineDate
  - Submission deadline = itaDate + 58 days

**Step 2 — DB migration: `itaCountdownOrders`**
- [x] Add `itaCountdownOrders` table to `apps/web/drizzle/schema.ts` (columns listed above)
- [x] Run `drizzle-kit generate` → review SQL → `drizzle-kit migrate` — landed as migration **0020** (0015 was already taken by the time this task started; purely additive `CREATE TABLE`, no existing columns touched)
- [x] Verify: table exists in Supabase (confirmed via successful `drizzle-kit migrate` run)

**Step 3 — Pricing constants**
- [x] Added to `apps/web/src/lib/pricing.ts` (no standalone `constants.ts` exists in this repo yet — pricing.ts is the established home for pricing values, so the two constants were added there instead of creating a new file):
  - `ITA_COUNTDOWN_STANDARD_PAISE = 299700` (₹2,997)
  - `ITA_COUNTDOWN_PREMIUM_PAISE = 399700` (₹3,997)

**Step 4 — API: `POST /api/tools/ita-countdown/create-order`**
- [x] Create `apps/web/src/app/api/tools/ita-countdown/create-order/route.ts`
  - Input (Zod): `{ tier: 'standard' | 'premium' }` — amount resolved server-side from the pricing constants; name/email aren't needed until `/verify`
  - Create Razorpay order for the matching price constant, currency fixed to INR
  - Return `{ orderId, amount, currency, keyId }`
  - No auth required

**Step 5 — API: `POST /api/tools/ita-countdown/verify`**
- [x] Create `apps/web/src/app/api/tools/ita-countdown/verify/route.ts`
  - Input (Zod): flat body — `{ name, email, itaDate, citizenshipCountry, residenceCountries, hasSpouse, numDependentChildren, tier, razorpayOrderId, razorpayPaymentId, razorpaySignature }` (matches the existing `/api/payment/verify` flat-body convention rather than a nested `itaInput` object)
  - HMAC-SHA256 verify Razorpay signature — reject on mismatch (400)
  - Generate `token = crypto.randomUUID()`
  - Call `generateChecklist(itaInput)` — produce the checklist
  - Insert row into `itaCountdownOrders` with `paymentStatus: 'paid'`
  - Send HTML checklist email to subscriber via Resend (brand-styled, includes all items, print CTA)
  - If `tier === 'premium'`: send Resend notification to prashant@visaforte.com
  - Update DB row: `emailSent: true`
  - Return `{ token }`

**Step 6 — API: `GET /api/tools/ita-countdown/result`**
- [x] Create `apps/web/src/app/api/tools/ita-countdown/result/route.ts`
  - Query param: `token` (uuid)
  - Look up `itaCountdownOrders` by token — 404 if not found or `paymentStatus !== 'paid'`
  - Regenerate checklist from stored inputs via `generateChecklist()`
  - Return `{ checklist: ChecklistItem[], name, itaDate, tier }`

**Step 7 — Component: `ItaCountdownTool.tsx`**
- [x] Create `apps/web/src/app/tools/ita-countdown/ItaCountdownTool.tsx` (`'use client'`)
  - States: `'form' | 'sample' | 'processing' | 'result' | 'error'` (the plan's separate `'payment'` state is handled inline inside the `sample` CTA's purchase handler — Razorpay's modal is a blocking overlay, not a distinct page state, matching how `BookingForm.tsx` already does this)
  - **form**: ITA date, citizenship country dropdown (India, Pakistan, Philippines, Nigeria, UK, Other), residence countries (comma-separated text), spouse toggle, dependent children (0–5), tier pills (standard/premium with price) — plus name + email (required by `/verify` and not listed elsewhere in the plan, so added here) and the DPDP `ConsentCheckbox`
  - **sample**: 3 fictional checklist items with blurred placeholder dates — "Preview only" note. CTA opens Razorpay directly (loads checkout.js → create-order → modal → verify → fetch result)
  - **result**: full checklist, sorted by deadline, saffron accent on items due ≤10 days from the ITA date. "Print / Save as PDF" button, "✓ emailed" note, reused directly by the `/result` page via an `initialToken` prop

**Step 8 — CSS: `ita-countdown.css`**
- [x] Create `apps/web/src/app/tools/ita-countdown/ita-countdown.css`
  - Mobile-first (375px base): cards stack; a `768px` breakpoint switches the card layout to a 3-column grid
  - Urgency accent: saffron left-border on items with deadline ≤10 days from the ITA date (simpler than an explicit "phase" grouping, since the logic module doesn't define phases — the accent alone satisfies the underlying goal of surfacing what's urgent)
  - `@media print`: `.itc-no-print` hides nav/toolbar/print-button/email-note; blur filter removed so real dates print clearly

**Step 9 — Page: `apps/web/src/app/tools/ita-countdown/page.tsx`**
- [x] Server component, no auth required, renders `<ItaCountdownTool />`, standard metadata

**Step 10 — Result page: `apps/web/src/app/tools/ita-countdown/result/page.tsx`**
- [x] Async server component reads `token` from `searchParams` and passes it straight to `<ItaCountdownTool initialToken={token ?? null} />` — reuses the tool component's own fetch/error/result handling instead of duplicating that markup in a second place (the plan asked for "same markup as the result state", which this achieves by literally being the same component)

**Step 11 — Resources page card**
- [x] In `apps/web/src/app/resources/page.tsx`, RT-3 card pulled out of the "Coming Soon" map into its own linked card, badge now reads "₹2,997 · Launch Tool →", links to `/tools/ita-countdown`

**Step 12 — Tests + verification**
- [x] Logic tests in Step 1 pass (`vitest run`)
- [x] Verify route unit test in `apps/web/src/app/api/tools/ita-countdown/verify/route.test.ts` (co-located with the route, matching this repo's existing test convention rather than a separate `__tests__` folder):
  - Rejects invalid HMAC (returns 400)
  - Valid HMAC → returns `{ token }` (mocked Razorpay signature math, `@/lib/db`, and `resend`)
- [x] `tsc --noEmit` — zero errors
- [x] `vitest run` — 340/340 passing (was 328/328 before this task; +12 new tests: 7 logic + 2 verify + 3 already added by an untracked prior change)
- [x] `npx eslint` clean on all new/changed files (one `react-hooks/set-state-in-effect` suppressed with the same established pattern already used in `BookingForm.tsx` for a one-time fetch-on-mount)
- [ ] Commit each step with scoped prefix (`feat:`, `fix:`, `test:`) — landed as fewer, larger commits instead (schema+pricing, API routes, UI+docs) since the whole feature was built and verified together in one sitting
- [ ] Push only after Prash gives the word — **not pushed**, awaiting explicit push instruction per git-workflow.md

**Review (2026-07-04):**
Full RT-3 flow built end-to-end: `ita-countdown-logic.ts` (pure checklist generator, 7 unit
tests), migration 0020 (`ita_countdown_orders`, purely additive), pricing constants in
`pricing.ts`, three API routes (`create-order`, `verify` with HMAC + Resend email + premium
notification, `result`), `ItaCountdownTool.tsx` (form → sample preview → Razorpay → result,
reused directly by the `/result` share-link page via an `initialToken` prop), and mobile-first
`ita-countdown.css` with print styles. Resources page card is now live. `tsc --noEmit` clean,
`eslint` clean, `vitest run` 340/340 green. Not pushed — commits are local only, awaiting the
word per git-workflow.md. Visual/browser verification (Razorpay test-mode payment, email
delivery, print layout, mobile at 375px) has **not** been done and requires the Prashant Proof
steps below — this is a code-complete, not a visually-verified, delivery.

#### Prashant Proof (RT-3)
1. Go to `visaforte.com/tools/ita-countdown`
2. Fill the form with: ITA date = today + 5 days, India citizenship, standard tier
3. Confirm the sample preview shows 3 blurred items with a "Purchase to unlock" CTA
4. Complete Razorpay payment (use test mode)
5. Confirm the full checklist loads with correct dates (police cert = today, medical = today + 3, etc.)
6. Click "Print / Save as PDF" — confirm a clean print-layout appears
7. Check prash.279@gmail.com — confirm the HTML checklist email arrived
8. Copy the result URL and open in a new tab — confirm checklist reloads from DB
9. Repeat with premium tier — confirm prashant@visaforte.com receives the consultation notification
10. On mobile (375px): confirm checklist cards readable, dates not clipped

---

### TASK RT-4: NOC Code Verifier — `/tools/noc-verifier`
**Status:** 🔲 NOT STARTED — step plan written when RT-3 is complete
**What this delivers:** The applicant enters their job title and a brief duty description. The tool returns the most likely NOC 2021 code, TEER level, official occupation title, and a direct link to the ESDC page. Uses the existing `noc-2021.json` index (already committed) + the `noc-retrieval.ts` deterministic lexical scorer. No Claude API call needed — deterministic output only. Free, ungated.
**Reuse:** `noc-2021.json` + `noc-retrieval.ts` already in the codebase. Zero new ML costs.
**Step plan:** Written after RT-3 is shipped.

---

### TASK RT-5: Refusal Pattern Analyser — `/tools/refusal-analyser`
**Status:** 🔲 NOT STARTED — step plan written when RT-4 is complete
**What this delivers:** A premium tool for applicants with a previous refusal. The applicant uploads or pastes their refusal letter. The tool classifies the refusal type against a pattern library (initially prompt-encoded; Prash adds 3–5 real cases/month), identifies the most likely root cause, and recommends the strongest reapplication strategy. Gated: free fictional example → Razorpay pay (₹1,997–₹2,997) → tool unlocks. Result emailed as PDF.
**Knowledge source (initial):** Heuristics rules prompt-encoded + common IRCC refusal code library built by Claude Code from documented patterns. Prash sharpens with real anonymised cases over time.
**Step plan:** Written after RT-4 is shipped.

---

*todo.md is the single source of task truth. If it's not here, it's not in scope.*