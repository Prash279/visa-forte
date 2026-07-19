# tasks/lessons.md — Self-Improvement Log
> Updated by Claude Code after every correction from Prash.
> Reviewed at the START of every session before any work begins.
> Last updated: May 2026

---

## How to Use This File

After Prash corrects a mistake or redirects the work:
1. Add a new entry under the relevant category below
2. Write in plain English — no technical jargon. If Prash cannot understand the lesson, it is not useful.
3. Use this exact format:
   - **What went wrong:** One plain-English sentence describing the mistake
   - **Why it happened:** One plain-English sentence explaining the cause
   - **The rule going forward:** One plain-English sentence stating what changes

If the lesson contains words like "useEffect", "state mismatch", "hydration error", or any other developer term without explanation, rewrite it until a non-coder can understand it.

---

## Category: CLAUDE.md & Configuration

**Lesson 1**
- **What went wrong:** I wrote a specific immigration policy date directly into CLAUDE.md as something to act on, instead of using it as an example.
- **Why it happened:** I confused a domain fact (a specific date when a rule changed) with a behavioural instruction (how to handle rule changes).
- **The rule going forward:** CLAUDE.md only contains rules about how to behave. Facts about immigration policy, technology, or pricing belong in the skill files or reference documents — CLAUDE.md just points to those files.

**Lesson 2**
- **What went wrong:** CLAUDE.md grew to over 230 lines by copying detailed information (stack tables, immigration rules, brand colours, security specs) directly into it.
- **Why it happened:** It felt safer to have everything in one place. But CLAUDE.md is meant to be a short behavioural guide, not an encyclopedia.
- **The rule going forward:** CLAUDE.md should stay under 130 lines and only describe how to behave. Everything else lives in `tech.md`, `spec.md`, `security.md`, or skill files — and CLAUDE.md points to those.

**Lesson 3**
- **What went wrong:** When comparing different versions of CLAUDE.md, I kept the new additions from the competitor's version but accidentally dropped important rules from the previous version.
- **Why it happened:** It is easy to notice what was added but hard to notice what was removed.
- **The rule going forward:** When merging or comparing two versions of any file, always check what was deleted, not just what was added. A missing rule is invisible — run a full comparison before declaring the merge complete.

---

## Category: Immigration Domain

**Lesson 1 — Factor B (spouse points) must use its own IRCC tables, not the applicant's tables**
- **What went wrong:** The spouse scoring block called the applicant's education constant (`EDU_SINGLE`) and applicant's full language function (`firstLanguagePoints`). A spouse with a Master's received 135 education points instead of 10, and 109 language points instead of 14 — inflating every with-spouse score by ~177 points.
- **Why it happened:** IRCC has two completely separate scoring systems. Factor A (applicant core) and Factor B (spouse contribution) both score education and language, but with different maximum values and different tables. The initial build used the same functions for both, treating them as identical.
- **The rule going forward:** Any time a spouse/partner score is calculated, it must use the Factor B constants and functions (`SPOUSE_EDU`, `spouseLangPointsPerBand`, `spouseCwePoints`). Never pass spouse data into Factor A functions. Factor B education max is 10, language max is 5 per ability, CWE max is 10 — completely different from Factor A.

**Lesson 2 — Education constants must be checked against the specific WITH/WITHOUT SPOUSE column**
- **What went wrong:** `EDU_SINGLE` (no spouse) contained the WITH-spouse values, and `EDU_WITH_SPOUSE` contained values lower than either official table. All entries were wrong.
- **Why it happened:** The tables were built without cross-checking each value against the correct column header on the IRCC CRS grid page.
- **The rule going forward:** Whenever setting up or reviewing any CRS lookup table, explicitly label which IRCC column each row corresponds to, then verify a minimum of 3 spot-check values against canada.ca before declaring the table correct.

**Lesson 3 — Skill transferability CWE combinations have a 2-tier structure (1yr vs 2+yr)**
- **What went wrong:** `eduCanadianExpTransfer` and `foreignExpCanadianExpTransfer` returned a flat value (25 or 13) regardless of whether the applicant had 1 year or 2+ years of Canadian experience. The IRCC tables have a higher tier for 2+ years (50 and 25 respectively).
- **Why it happened:** The functions were written as if each combination had only one point value, missing the two-row structure on the official IRCC transferability table.
- **The rule going forward:** Every skill transferability function must handle both the 1-year CWE tier and the 2+-year CWE tier as separate return values. Always cross-check the function's maximum output against the official IRCC cap for that combination.

**Lesson 5 — NOC TEER levels require the official Statistics Canada TEER variant CSV; code digits are not a reliable indicator**
- **What went wrong:** The CVP-1 spot-check sample in the plan had two TEER errors: NOC 21232 (Software developers and programmers) was listed as TEER 2 (it is TEER 1), and NOC 65200/65201 (Food servers / Food counter attendants) was listed as TEER 4 (they are TEER 5). Both errors came from training data.
- **Why it happened:** The second digit of a 5-digit NOC 2021 code looks as if it might signal the TEER level, but this is a coincidence, not a rule. The actual TEER classification is assigned by traversing the Statistics Canada TEER variant CSV: TEER class → broad category → major group → minor group → unit group. Training data cannot reliably reproduce this mapping.
- **The rule going forward:** Never derive a NOC TEER level from the digits of the NOC code or from training-data recall. The only authoritative source is the Statistics Canada TEER variant CSV (or the ESDC noc.esdc.gc.ca detail page for each specific code). Any spot-check must cross-reference one of these two sources directly.

**Lesson 4 — High confidence in training data is exactly when the verification gate fails**
- **What went wrong:** The Anti-Hallucination Gate in CLAUDE.md says to verify facts that "could have changed in the past 12 months." Multiple immigration policy facts were stated as current and correct — PCC validity windows, photo specifications, language test timing benchmarks, job offer CRS points — all from training data. Several were wrong. One (job offer CRS points) had been removed by IRCC in March 2025.
- **Why it happened:** The gate is triggered by uncertainty. When training data felt certain, the gate never triggered. Confidence in training data bypassed the verification step entirely. A fact does not need to feel uncertain to be wrong.
- **The rule going forward:** For all IRCC immigration policy facts, training data confidence counts as zero. Every policy claim — CRS points, document validity windows, photo specs, fee amounts, form numbers, biometrics rules, language test eligibility, minimum proof of funds — is in one of exactly two states: verified against canada.ca in this session, or unverified. The verification is triggered by the category of the fact (immigration policy), not by how uncertain it feels. If a canada.ca citation cannot be provided for a claim, the claim cannot be written into any Visa Forte artifact.

---

## Category: Architecture & Stack

**Lesson 1**
- **What went wrong:** Multiple finished versions of the configuration files were missing entire categories of features — no subagent instructions, no CI/CD setup, no observability plan. These gaps were only found by asking "what would an expert in this area say is missing?"
- **Why it happened:** I reviewed the files from my own perspective only. Different experts look for different things.
- **The rule going forward:** Before declaring any set of files complete, run a named-audience check: "What would a workflow expert flag? What would a security expert flag? What would a non-coder trying to use this flag?" Each perspective finds a different category of gap.

**Lesson 2 — The database is Supabase. Never write "Neon" anywhere on Visa Forte.**
- **What went wrong:** After the project migrated from Neon to Supabase, seven stale "Neon" references survived in code comments, the README, the live public Privacy Policy page, and the infrastructure blueprint — and were quoted back to Prash in session responses as if they were current facts.
- **Why it happened:** The runtime code was updated first and the migration felt done. Documentation, comments, and policy pages were never audited to match the new provider.
- **The rule going forward:** The Visa Forte database is Supabase — always. Any code, comment, or document that says "Neon" in the context of database or infrastructure is wrong and must be corrected immediately. Before finishing any task that touches DB-related files, the README, policy pages, or deployment config, run a search for "Neon" across the codebase and confirm zero results in forward-facing content.

---

## Category: Security

**Lesson 1**
- **What went wrong:** The admin dashboard was accessible to any logged-in user, not just Prash.
- **Why it happened:** The middleware only checked whether a session cookie existed — it did not check which email the session belonged to.
- **The rule going forward:** After any session check on a protected page, also check `session.user.email` against the allowed email before rendering anything. Redirect immediately if the email does not match. Middleware is the gate; the server component is the lock.

---

## Category: Code Quality

**Lesson 1 — CSS in client components causes a flash of unstyled content**
- **What went wrong:** The landing page showed a white flash with unstyled text for a fraction of a second before the page looked correct.
- **Why it happened:** All the page CSS was inside a special style block inside the page component. That component needed JavaScript to load before it could apply any styles. The browser painted the page before JavaScript arrived.
- **The rule going forward:** All CSS for a page must live in a `.css` file imported at the top of the component file (`import "./home.css"`). Next.js loads CSS files directly in the browser before painting — no JavaScript required. Never put layout or brand CSS inside a styled-jsx `<style>` block in a client component.

**Lesson 2 — CSS brand colour variables must be defined in the global stylesheet**
- **What went wrong:** The hero section showed no background colour on first load because the brand colour variables were not available yet.
- **Why it happened:** The variables (`--prussian`, `--saffron`, etc.) were only defined inside the page component's style block, which loaded after the page was already painted.
- **The rule going forward:** All `:root` CSS variable definitions must live in `globals.css`. That file is loaded before any page content is painted, so the variables are always available from the very first render.

**Lesson 3 — Long mailto links must be built in JavaScript, not written into the href attribute**
- **What went wrong:** A "Request Triage" button stopped opening the email client after I replaced the short email template with a longer professional one.
- **Why it happened:** Browsers have a silent length limit on `href` values for mailto links. When the link exceeds that limit, clicking the button does nothing — no error, no email. The longer template pushed the encoded URL over the limit.
- **The rule going forward:** Any mailto link with a multi-line body or more than one sentence must use an `onClick` handler that builds the URL in JavaScript and sets `window.location.href`. Do not hardcode a long encoded mailto URL in an `href` attribute.

**Lesson 4 — All CTA buttons with the same purpose must be wired the same way**
- **What went wrong:** Two of the three "Request Triage" buttons on the landing page did not open the email client — they just scrolled the page.
- **Why it happened:** Only the bottom button was updated with the email handler. The nav and hero buttons were left as scroll anchors.
- **The rule going forward:** When adding or changing behaviour on one CTA button, immediately search the page for all other buttons with the same label or intent and apply the same change. Never leave two buttons that look the same but behave differently.

---

## Category: Responsive Design — Mobile First (Non-Negotiable)

**Lesson 1 — Every CSS change must include responsive breakpoints at the same time**
- **What went wrong:** UI corrections were applied only to the desktop view. Tablet and mobile layouts were not updated at the same time, leaving them silently broken.
- **Why it happened:** Styles were written desktop-first and responsive overrides were treated as an afterthought rather than a required part of every change.
- **The rule going forward:** Mobile-first always. Write base styles for the smallest viewport (375px), then layer tablet and desktop overrides in the same commit. For the CanVisa Pro tool, the `@media (max-width: 900px)` block in `canvisa-pro.css` must be reviewed and updated every time a layout or grid class is touched. Before any UI task is marked done, mentally run through 375px → 768px → 1280px and confirm nothing breaks.

**Lesson 2 — Three specific CanVisa Pro mobile rules that were missing and must never be left out**
- **What went wrong:** The assessment report looked broken on phones: (1) the toolbar buttons were squished side-by-side with no wrapping because `.cvp-toolbar` had no mobile rule, (2) the "Minimum Required (family of X)" funds label split mid-sentence while its value misaligned because `.cvp2-funds-row` used `align-items: baseline` with no mobile override, (3) the report body content was clipped at the edges because `.cvp2-body` kept its 2rem horizontal padding on a 390px screen.
- **Why it happened:** New UI elements were added to the report without being included in the existing `@media (max-width: 900px)` block in `canvisa-pro.css`.
- **The rule going forward:** Every time any of these classes are touched — `.cvp-toolbar`, `.cvp2-funds-row`, `.cvp2-body`, `.cvp2-card`, `.cvp2-hero`, `.cvp2-scenario-row` — the 900px and 480px breakpoints in `canvisa-pro.css` must be updated in the same commit. The pattern: toolbar wraps with `flex-wrap: wrap; justify-content: center; gap: 0.5rem`, funds label gets `flex: 1` and value gets `white-space: nowrap; flex-shrink: 0`, body padding shrinks to `1rem` on phone.

---

## Category: UI & Brand Standards

**Lesson 1 — All small text must meet the 12px digital minimum, always**
- **What went wrong:** The nav tagline ("ENGINEERED FOR PASSAGE."), all three footer text elements (nav links, disclaimer, copyright), and the assessment form labels were all set below 12px — some as small as 9.6px.
- **Why it happened:** Small utility text was styled in rem units that looked fine on a large monitor but translated to sub-12px values at the base 16px font size. No one checked the computed pixel value.
- **The rule going forward:** The Visa Forte brand guideline sets a hard floor of 12px for all digital text. In rem terms that is 0.75rem. Every font-size below 0.75rem in any CSS file is a brand violation. Before finishing any UI work, scan for `font-size` values below `0.75rem` and raise them.

**Lesson 2 — Eyebrows on dark (Prussian) backgrounds need a local colour override**
- **What went wrong:** The contact page hero eyebrow "GET IN TOUCH" rendered with "GET" in white and "IN TOUCH" in saffron — a visible two-colour split on the dark background.
- **Why it happened:** The global `.eyebrow { color: var(--saffron); }` rule can be lost in the CSS cascade when the element sits inside a dark-background section. The home page already had a fix for this (`.forensic .eyebrow { color: var(--saffron); }` in home.css) but the contact page was missing the equivalent.
- **The rule going forward:** Whenever a `.eyebrow` element is placed inside a Prussian-background section, add a scoped override in that page's CSS: `.section-name .eyebrow { color: var(--saffron); }`. This matches the pattern already established in home.css and prevents cascade from silently stripping the saffron colour.

**Lesson 3 — The nav hamburger must fire at 860px, not 768px**
- **What went wrong:** On an iPad portrait (768px), the full desktop nav was still showing — five links plus Login plus the CTA button — all crammed into ~500px of available space at tiny font sizes.
- **Why it happened:** The hamburger breakpoint was set at `max-width: 768px`, which means exactly 768px is still treated as desktop. iPad portrait is exactly 768px, so it fell just outside the mobile trigger.
- **The rule going forward:** The nav hamburger breakpoint in `globals.css` lives at `max-width: 860px`. Never move it below that. iPad portrait (768px) must always get the mobile drawer, not the cramped desktop bar.

**Lesson 4 — Run a brand audit screenshot review before declaring any UI complete**
- **What went wrong:** Seven issues (font sizes below brand floor, a split-colour eyebrow, a wrong breakpoint) were all present at the same time and only caught together in a formal audit with screenshots at three viewports.
- **Why it happened:** Each issue was small and invisible during normal development on a large desktop monitor. None were caught by tests.
- **The rule going forward:** Before marking any UI milestone complete, capture screenshots at desktop (1280px), tablet (768px), and mobile (375px) for every page and visually check: (1) no text below 0.75rem, (2) all eyebrows are saffron on dark backgrounds, (3) the hamburger shows on tablet, (4) footer and nav tagline are legible.

**Lesson 5 — Small labels/badges must reuse the one existing tag style, never invent a new colour-per-category scheme**
- **What went wrong:** The `/resources` page gave each resource-type badge (Checklist, Cheat Sheet, Timeline, Guide, Sample, Letter, Comparison) its own solid fill colour — Prussian, Teal, Saffron, or Ink depending on type. This produced a busy, four-colour badge row that Prash immediately flagged as off-brand. The site already had an established single-style tag pattern (`.visas-nav-tag` / `.visas-pnp-type-tag` in `visas.css`: saffron text, thin saffron border, no fill) — it was just never checked before the resources badges were built.
- **Why it happened:** Each resource type "needed a colour to stand out," so a colour was picked per type from the available brand palette (Prussian/Teal/Saffron/Ink) without first checking whether the site already had a small-label/tag component to reuse. This is the same mistake the brand rule already warns against — Saffron used as a solid background fill — plus a new one: building a redundant, inconsistent variant of an existing UI pattern.
- **The rule going forward:** Before styling any new badge, tag, pill, or small uppercase label, search the codebase for existing patterns first (grep for `-tag`, `-badge`, `eyebrow`, `pill`). Visa Forte has exactly one small-label style: saffron uppercase text + thin saffron border + transparent/pearl fill — no solid colour fills, and never a different colour per category or item type. If a new label needs visual distinction between categories, add an icon or reorder — never a new fill colour. This also reinforces the existing brand rule: Saffron is accent-only, never a dominant background across many repeated elements on a page.

**Lesson 6 — Two page sections in a row with the same background colour double up their spacing**
- **What went wrong:** On the `/resources` page, the "Interactive Tools" section and the "Free Resources" section both sit on the same cream (pearl) background with no colour change between them. Every section on the site gets a fixed 5.5rem of breathing room at its top AND its bottom, so when both of these sections used that default spacing, the gap between them added up to 11rem (176px) — nearly triple a normal gap — and looked like a mistake because there was no colour change to explain why the empty space was there.
- **Why it happened:** The default spacing rule was written once, to work for the normal case: a light section followed by a dark section (or vice versa), where the colour change itself signals "new section" and a generous gap feels intentional. Nobody checked what happens when two same-coloured sections land next to each other — the same math applies, but there's no colour cue to justify the extra room.
- **The rule going forward:** Whenever a new section is added to any page, check the colour of the section directly above and below it. If either neighbour shares the exact same background colour, cut that shared boundary's spacing down to roughly a fifth of the default (about 2rem on desktop, 1.5rem on mobile) instead of leaving both sections at full spacing. A full site scan on 2026-07-05 confirmed this is currently the only page where the mistake occurred — every other page already alternates colours or was built with the smaller gap on purpose.

---

## Category: Workflow

**Lesson 1 — Verify the fix works on the live site, not just in code**
- **What went wrong:** The FOUC (flash of unstyled content) was reported as fixed twice before it was actually fixed.
- **Why it happened:** The first two fixes addressed symptoms (body background, CSS variables) without identifying the root cause (styled-jsx in a client component is JS-injected, not render-blocking).
- **The rule going forward:** Before telling Prash a visual bug is fixed: (1) identify the root cause in plain English, (2) explain why the fix prevents the root cause — not just the symptom. If the explanation sounds like "this should help," keep investigating.

**Lesson 2 — Vercel CLI must be `prash279`; run deploy from repo root, not `apps/web`**
- **What went wrong:** `vercel deploy --prod` was failing with "Could not retrieve Project Settings" because the Vercel CLI was authenticated to an old `amoghaa-properties7` account from a previous Antigravity build.
- **Why it happened:** The primary CLI auth file (`C:\Users\hp\AppData\Roaming\com.vercel.cli\Data\auth.json`) was never cleaned up when the project moved to the `prash279` account. A second correct auth file existed but was not being used.
- **The rule going forward:** At the start of any deploy task, check that `vercel whoami` returns `prash279`. If it does not, halt and fix the auth before touching anything else. Also: `vercel deploy --prod` must always be run from the **repo root** (`c:\Users\hp\visaforte`), never from inside `apps/web` — the Vercel project already has `rootDirectory: apps/web` in its settings, so running from inside that folder doubles the path and fails silently with a misleading error.

**Lesson 3 — GitHub push must go through `gh` CLI auth, never an embedded PAT in the remote URL**
- **What went wrong:** `git push` showed a GitHub login popup that placed the PAT token in the username field. The push never worked, and repeated attempts just re-triggered the popup.
- **Why it happened:** Three things were wrong simultaneously: (1) the PAT embedded in the remote URL had expired, (2) the old `amoghaaproperties` account's credentials were still in Windows Credential Manager and were being sent for GitHub requests, (3) the GitHub CLI (`gh`) token was also invalid. Windows kept routing pushes through the wrong account's stale credentials.
- **The rule going forward:** The GitHub remote URL must always be the clean form — `https://github.com/Prash279/visa-forte.git` — with no PAT embedded in it. Authentication is handled exclusively by the GitHub CLI (`gh`). Before any push, `gh auth status` must show `Prash279 (keyring)` with a valid token. If it does not, run `gh auth login -h github.com -p https -w` to re-authenticate via browser — takes 30 seconds, no PAT copy-paste required. Never store GitHub credentials in Windows Credential Manager manually; let `gh` manage the keyring. The `amoghaaproperties` account must never be present in any credential store.

**Lesson 4 — Each user turn resets the Bash cwd to repo root; run web commands with an explicit `cd apps/web`**
- **What went wrong:** `npx vitest`/`npx tsc` run bare from the persistent shell either installed a fresh tool version or printed help (no tsconfig found), because the shell's working directory had reset to the repo root between turns.
- **Why it happened:** The Bash tool's cwd does not persist across user turns — it returns to `c:\Users\hp\visaforte` at the start of each turn, but the project's vitest/tsconfig live under `apps/web`.
- **The rule going forward:** For any web task, prefix the command with `cd /c/Users/hp/visaforte/apps/web && …` inside the same call. Do not rely on a `cd` from a previous turn. Also: do NOT invoke PowerShell via the Bash tool (`powershell -Command …`) — the auto-mode classifier denies it as routing around the PowerShell deny rule. Use native Bash/Windows commands (`taskkill`, `rm` without `-rf`) or the dedicated task tools (`TaskStop`) instead.

**Lesson 5 — A CSS custom property redeclared in two separate `:root` selectors (one plain, one media-scoped) gets silently dropped by Turbopack/Lightning CSS; root-caused and fixed**
- **What went wrong:** `globals.css` declared `--nav-h: 81.4px;` in the top-level `:root { ... }` block, and separately overrode it with `--nav-h: 69.8px;` inside a **second** `:root { --nav-h: 69.8px; }` rule buried inside a large, unrelated `@media (max-width: 860px) { ... }` block (alongside nav padding, hamburger visibility, etc.). The build compiled cleanly with zero errors, but the property vanished from the compiled CSS entirely — every sibling variable declared in the same base `:root` block (`--prussian`, `--sand`, `--max-w`, `--text-w`) survived; only `--nav-h` did not. This silently broke `.asx-result-view { padding-top: var(--nav-h); }` on the assessment page (an earlier, already-shipped nav-overlap fix) and made a new `scroll-margin-top: var(--nav-h)` fix on the resources page a no-op — both looked correct in source and both did nothing live.
- **Why it happened:** Confirmed via a controlled build test (`next build`, then grepping the compiled chunk in `.next/dev/static/chunks/`): the plain `:root` block and the media-scoped `:root` block are two **separate selector rules** with conflicting values for the same custom property, and the second one sits deep inside an `@media` block that also contains many unrelated sibling rules. Turbopack's Lightning CSS minifier does at-rule/selector merging as a size optimization; something in that pass drops the property when it's redeclared this way, rather than correctly resolving the override. Reading the CSS source file gave no indication anything was wrong — only `getComputedStyle(el).getPropertyValue('--nav-h')` in an actual browser, or grepping the compiled `.next` chunk directly, revealed the property was missing.
- **The rule going forward:** Any CSS custom property that needs a responsive override must be declared with **native CSS nesting inside a single `:root { }` block** — `:root { --x: base-value; @media (max-width: Ypx) { --x: override-value; } }` — never as a second, separate `:root { --x: override; }` selector elsewhere in the file (especially not nested inside an unrelated `@media` block that has other sibling rules). This repo's Next.js 16 + Turbopack + Lightning CSS setup explicitly supports CSS nesting, so this costs nothing. `globals.css` now uses this pattern for `--nav-h` (verified via a full `next build` + live `getComputedStyle` check at both breakpoints, on both the resources page and the assessment page, with zero code changes needed on the assessment side). Before trusting any `var(--custom-property)` that's declared in more than one place, verify the computed value in a real browser — a clean build is not proof the variable survived.

**Lesson 6 — Any edit to `crs-rules.json` (even a comment/`_note`) changes the rules hash; run `npm test`, never bare `npx vitest run`, before pushing**
- **What went wrong:** PR #6 CI failed on 3 CRS snapshot tests that passed locally. A `_note` string in `crs-rules.json` had been edited; CI's `pretest` hook regenerated `crs-rules.version.ts` with a new hash (`9b674267` → `5b5dd31e`), so every snapshot embedding `rulesVersion` mismatched. Locally the tests were run with bare `npx vitest run`, which skips npm's `pretest` hook — the stale hash matched the stale snapshots, hiding the failure.
- **Why it happened:** `scripts/hash-crs-rules.mjs` hashes the entire `crs-rules.json` file, comments included, and only runs via npm lifecycle hooks (`pretest`, `prebuild`, `pretypecheck`). Bypassing npm scripts bypasses the regeneration.
- **The rule going forward:** After touching `crs-rules.json` in any way, run `cd apps/web && npm test` (not `npx vitest run`) so the hash regenerates, then refresh snapshots with `npm test -- -u` and verify the diff is ONLY the `rulesVersion` lines before committing. More generally: the local pre-push test run must use the same entry point CI uses (`npm test`), never a direct tool invocation.
- **Addendum (2026-07-19):** A second failure mode surfaced immediately: the script hashed raw file bytes, so a plain `git checkout` on Windows (CRLF materialization) produced a different hash than Linux CI (LF) for identical content — snapshots failed with zero file edits. Fixed at the root in `scripts/hash-crs-rules.mjs`: CRLF is normalized to LF before hashing, so the fingerprint tracks rule content, never the platform. If a rules-hash mismatch ever appears again with no `crs-rules.json` diff, suspect environment (line endings, encoding) before suspecting the rules.

---

## Category: Planning & Documentation

**Lesson 3 — Verify a plan's central claim against the repo before executing its remediation**
- **What went wrong:** A saved plan declared a P0 emergency — ".env.local is committed to the remote with real secrets, rotate everything today." A full scan of every commit on every branch showed the file was never committed anywhere; the emergency did not exist, and 30 minutes of credential rotation plus a risky git history rewrite were about to be spent on a false premise.
- **Why it happened:** The audit that produced the plan most likely saw the .env.local file sitting in the local folder and assumed it was tracked by git, without running the one command that checks. The plan was then trusted as fact because it was written down and looked authoritative.
- **The rule going forward:** Before executing any remediation plan, re-verify its central factual claim directly against the source (for git claims: `git log --all -- <path>` and a full-ref scan) — a plan document is a snapshot of what an earlier session believed, not evidence. The scarier the claimed emergency, the more important the two-minute check before acting.


**Lesson 1 — Plan documents must be committed before implementation begins**
- **What went wrong:** Two planning docs (`docs/superpowers/plans/2026-05-24-resources-page.md` and the matching spec) were never committed to git, staying untracked through 15 implementation commits and only noticed after the feature was complete.
- **Why it happened:** The plan generator writes files to `docs/superpowers/plans/` but does not include a step to commit them. Every per-task commit in the plan used `git add src/...` paths, so the plan file itself was never staged.
- **The rule going forward:** Immediately after any plan or spec document is written to `docs/superpowers/`, commit it before writing a single line of implementation code. `git add docs/superpowers/` then commit with `docs: add <feature-name> plan`. This is Task 0 — it happens before the plan's own Task 1.

**Lesson 2 — A handover file must be date-checked before it is trusted, and rewritten whenever a session ends**
- **What went wrong:** A fresh session was told by its opening prompt to "read HANDOVER.md" to resume a half-finished task, but HANDOVER.md was three weeks old and described a completely different, already-finished task (CVP-5). The file meant to brief the session actively mis-briefed it, and it promised resume steps that were not in the file at all.
- **Why it happened:** The previous session wrote a new opening prompt for the new task but never rewrote HANDOVER.md to match, so the opening prompt and the handover file drifted apart — and nothing in the file warned a reader that it was out of date.
- **The rule going forward:** Every HANDOVER.md carries the date it was written. At the start of any session, compare that date to today; if it does not match the current session, treat the whole file as history — re-verify every fact from source and never act on its "next steps". A session that ends with a handoff must rewrite HANDOVER.md in the same breath as producing the opening prompt, and the opening prompt may only reference steps that actually appear in the file it just wrote.

---

## Category: Shipping & External Dependencies

**Lesson 4 — Never ship a user-facing path that depends on a manual external step nobody verified**
- **What went wrong:** Task 4 (Razorpay, April 2026) shipped full USD checkout for international clients. Its own notes recorded the dependency in plain sight — *"Enabling international payments on Razorpay dashboard is a Prash action (required for USD orders)"* — and that action was never completed. Meanwhile `BookingForm.detectCurrency()` auto-selected USD for every non-Indian visitor by browser locale. For roughly three months, every international visitor was silently routed into a checkout that could not complete at the gateway, on service tiers up to $999. Nobody reported it because the people hitting it were strangers who simply left. It surfaced only as a side-finding while auditing an unrelated Resources page plan.
- **Why it happened:** The dependency was written down as a note, not encoded as a gate. Nothing in the code, tests, or deploy checks asserted that the external capability actually existed before the UI offered it — and the default path (locale auto-detect) *pointed at* the unverified capability rather than away from it. A note in a task file is documentation; it is not a control.
- **The rule going forward:** When a feature depends on an external capability being switched on (a gateway mode, a domain verification, an API allowlist), the feature does not ship to users until that capability is verified live — by a test transaction or an API check, not by assertion. If it must ship earlier, the unverified path defaults to **off** and is opt-in, never selected automatically. Any "X is a Prash action" note in a plan is a **blocking gate**: no code that requires X reaches production until X is confirmed done. Silent failure on a payment path is invisible revenue loss — the affected users never complain, they just leave.

**Lesson 5 — Never ship the recall layer of a two-stage pipeline as the whole product**
- **What went wrong:** The public NOC Code Verifier (RT-4, PR #11) shipped using only `retrieveCandidates()` — the TF-IDF shortlist step — as the final answer, because the spec said "deterministic output only, no Claude API call." The first real user input ("Data Science Engineer" with AI/Python duties) returned Civil Engineers as the strongest match: the generic token "engineer" outscored every distinctive signal. The codebase itself documented the limitation being ignored — `noc-retrieval.ts` says in its own header that retrieval "is a recall step only" whose output the Claude classifier then ranks, and the DOMAIN_ANCHORS comment says outright that TF-IDF cannot surface codes when real-world vocabulary differs from StatCan text. Prash caught it in production the same day.
- **Why it happened:** A cost-saving spec constraint ("free tool → no API call") was honoured over an accuracy constraint that was already proven and written down in the same codebase. The recall stage looked like a working product because it returns plausible-shaped results for common occupations — plausible shape was mistaken for accuracy, and no adversarial input (résumé-speak, cross-domain titles) was tested before shipping.
- **The rule going forward:** When reusing a stage of an existing pipeline, read what the stage's own documentation says it is FOR — a component whose header says "recall step only" must never be shipped as a ranking product, whatever the spec says about cost. Before shipping any classifier-like tool, test it with at least one adversarial real-world input whose vocabulary diverges from the reference corpus (the failure mode the code already warns about), not just the happy-path input whose words match. If cost forces a degraded mode, the degraded mode must be labelled as degraded in the UI — never presented with the same confidence as the full pipeline.

---

*lessons.md is a living document. Every correction is a lesson. Every lesson is a rule.*
