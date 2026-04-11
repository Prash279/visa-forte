# tasks/lessons.md — Self-Improvement Log
> Updated by Claude Code after every correction from Prash.
> Reviewed at the START of every session before any work begins.
> Last updated: April 2026

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

*No entries yet. Add here when a correction involves CRS calculations, IRCC data sourcing, regulatory rules, or scope boundary violations.*

---

## Category: Architecture & Stack

**Lesson 1**
- **What went wrong:** Multiple finished versions of the configuration files were missing entire categories of features — no subagent instructions, no CI/CD setup, no observability plan. These gaps were only found by asking "what would an expert in this area say is missing?"
- **Why it happened:** I reviewed the files from my own perspective only. Different experts look for different things.
- **The rule going forward:** Before declaring any set of files complete, run a named-audience check: "What would a workflow expert flag? What would a security expert flag? What would a non-coder trying to use this flag?" Each perspective finds a different category of gap.



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

## Category: Workflow

**Lesson 1 — Verify the fix works on the live site, not just in code**
- **What went wrong:** The FOUC (flash of unstyled content) was reported as fixed twice before it was actually fixed.
- **Why it happened:** The first two fixes addressed symptoms (body background, CSS variables) without identifying the root cause (styled-jsx in a client component is JS-injected, not render-blocking).
- **The rule going forward:** Before telling Prash a visual bug is fixed: (1) identify the root cause in plain English, (2) explain why the fix prevents the root cause — not just the symptom. If the explanation sounds like "this should help," keep investigating.

---

*lessons.md is a living document. Every correction is a lesson. Every lesson is a rule.*
