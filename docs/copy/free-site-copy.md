# Visa Forte — Free Educational Site: Copy Deck

**Status:** DRAFT for Prash's approval. **Nothing in this file is implemented.**
**Written:** 2026-11-11 · **Branch:** `feat/free-educational-site` · **Plan:** `tasks/todo.md`

**How to review:** read top to bottom. Edit any wording directly in this file, or tell me what to change.
When you are happy, say "approved" and I start building. Section 11 lists the decisions I need from you.

---

## 0. Read these two things first

### 0A. ⚠️ IRCC changed the CRS on 2026-11-03 — the site's score tools may now be out of date

While verifying facts for this deck I fetched the live canada.ca CRS page (`.../express-entry/check-score/crs-criteria.html`,
**date modified 2026-11-03**, fetched today, HTTP 200). It states:

> "As of November 3, 2026, we've changed how points are awarded for Canadian work experience and valid job offers …
> removed Labour Market Impact Assessment (LMIA) requirements and LMIA-exemption requirements for all Express Entry job offers."

and it now shows a **"Labour Market Integration factor — New: November 3, 2026"** worth up to 140 points (with a
spouse) / 150 points (without). It says points are given for *either* Canadian work experience (work-length points
**plus** high-wage-occupation points) *or* a high-wage job offer, **but not both**.

Our scoring rules file (`apps/web/src/lib/crs-rules.json`) says `lastVerified: 2026-05-09` and models only
work-length points for Canadian experience. So the CRS Modeller and the Assessment tool are **very likely scoring
differently from IRCC today**. I have *not* yet compared the whole grid line by line — that is a separate piece of
work and, under CLAUDE.md, a **stop-and-ask item** (an IRCC change that conflicts with existing scoring logic).

**Why it matters here:** this site is about to put the CRS tools front and centre as its main free product. A free
tool that gives a wrong score is worse than a paid one, because nobody is checking it.
**I need your decision on this — see Decision 1 in Section 11.** Nothing in this deck quotes a CRS number.

### 0B. Two corrections to the plan I gave you earlier

1. **Email provider.** I said "Resend". PR #21 (merged 2026-10-24) retired Resend: all site email now goes out through
   **one Google Workspace mailbox** (`SMTP_USER`, via `sendEmail()` in `apps/web/src/lib/email.ts`). Consequences for
   PR 2 (draw alerts): the From address is that mailbox (not `noreply@`), the sender module has **no support for the
   one-click-unsubscribe headers** yet, and a mailing list sharing the mailbox with your admin alerts and client emails
   puts those at risk if Google throttles it. The "check your Resend plan" gate becomes **"decide the bulk-sending
   route"** (Decision 6). `tasks/todo.md` has been corrected.
2. **The current privacy policy is already incomplete.** It does not mention Anthropic (the public NOC Verifier sends
   the duties a visitor types to Claude), Sentry (error monitoring) or Cloudflare analytics. Section 8 fixes this.

---

## 1. Ground rules for all new copy

- **Voice:** warm, direct, authoritative. First person singular ("I") — it is a one-person site. No sales language:
  no "Get Reviewed", "book", "consult", "limited capacity", "engage", "bespoke".
- **No IRCC fact without a canada.ca citation fetched this session.** Every fact I kept is in the Fact Register
  (Section 10) with URL and date modified. Anything I could not verify is **cut**, not softened.
- **Cut for being unverifiable:** "90% of applications fail", "March 2025 arranged-employment removal" (I could not
  confirm that wording on the live CRS page this session, and the page has since changed again), the "90-day gap" rule, "converted at
  IRCC-specified exchange rates", and every client case study (they describe paid engagements).
- **Disclaimer:** the site carries the Standard Legal Disclaimer from the immigration-consulting skill, Section 17,
  **verbatim** (reproduced in 2.5). The extra marketing sentence currently on the footer is dropped.
- **No price, no "from ₹…", no payment words anywhere.** Schema (Google) price for every tool = 0.

---

## 2. Site-wide

### 2.1 Browser title and description (`layout.tsx`)

| | Before | After |
|---|---|---|
| Title | Visa Forte — Forensic Immigration Documentation \| Engineered for Passage. | **Visa Forte — Free Canada Immigration Guides & Tools \| Engineered for Passage.** |
| Description | 20 years of forensic immigration documentation expertise. Express Entry, FSW, PNP. Every file personally reviewed. Zero margin for error. | **Free, plain-English guides and tools for Canadian permanent residence — Express Entry, Federal Skilled Worker and Provincial Nominee Programs. No sign-up, no fees.** |
| Site name | Visa Forte Consulting | **Visa Forte** |

### 2.2 Google structured data

- Type changes from `ProfessionalService` to **`EducationalOrganization`** (plus the existing `WebSite`).
- Description: **"Free educational guides and tools about Canadian permanent residence pathways — Express Entry, Federal Skilled Worker and Provincial Nominee Programs."**
- Remove `areaServed`. Every tool's `Offer` stays at `price: 0` (Refusal Analyser changes from 2497 INR to 0).

### 2.3 Navigation (`SiteNav`)

| | Before | After |
|---|---|---|
| Links | Resources · Assessment · Contact | **Resources · Assessment · Tools · About · Contact** *(About is currently only in the footer; see Decision 8)* |
| Login link (desktop + mobile drawer) | "Login" | **Removed** (admin uses the URL directly) |
| Button | "Request Triage" (opens a pre-filled email) | **"Check Your CRS Score"** → `/assessment` |

### 2.4 Footer (`SiteFooter`)

- Links: **About · Visas · Resources · Assessment · Contact.** **Removed:** Services, Client Login, Refund Policy.
- Legal row: **Privacy Policy** only.
- Copyright line: "© {year} Visa Forte. Free educational resource. All rights reserved."
- Hidden-footer path list drops `/portal` and `/signup`.

### 2.5 Standard Legal Disclaimer (verbatim, footer and tool results)

> The information provided is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements before taking any action.

*Dropped from the current footer:* "Visa Forte specialises in documentation forensics and regulatory alignment—where applications succeed through precision and fail through oversight."

---

## 3. Home page

Design, layout, colours and animations stay exactly as they are. Only text and links change.

### 3.1 Hero

- **Eyebrow** (unchanged): Express Entry · Federal Skilled Worker · Provincial Nominee Programs
- **Headline** — Before: *The IRCC Doesn't Reject Candidates. It Rejects **Documents.***
  After: ***Your Score Opens the Door.** Your Documents Decide What Happens Next.*
  *(Same thesis, no unverifiable claim. Emphasis stays on "Your Documents".)*
- **Sub-copy** — Before: "Your CRS score qualified you. Your ITA arrived… 90% of otherwise eligible applications fail…"
  After:
  > Free, plain-English guides and tools for Canadian permanent residence — written by a documentation specialist with 20+ years of practice. No sign-up. No fees. No sales calls.
- **Buttons:** primary **"Check your CRS score — free →"** (`/assessment`) · ghost **"Browse free guides"** (`/resources`).
  *(Replaces "Get Reviewed →" and "See client outcomes".)*
- **Stats row** — Before: 20+ Years / 1 Consultant. Every File. / 0 Junior Clerks.
  After: **20+ Years in documentation practice · 5 Free tools · 10 Free guides & templates** *(counts re-checked at build time)*

### 3.2 Section "Where Applications Fail" → **"Where Applications Go Wrong"**

- **Eyebrow:** Where Applications Go Wrong
- **Headline:** Eligibility Gets You In the Pool. Documentation Carries You Through.
- **Lead:**
  > Meeting an eligibility threshold is only step one. After that, an officer reads what you submit. These are six places where well-qualified people commonly stumble — and where the free guides on this site can help.

Six short notes (replace six long ones). Each ends with a link to the relevant free resource.

1. **Reference letters written for the wrong occupation system.**
   > IRCC moved to the 2021 version of the National Occupational Classification (NOC) on November 16, 2022. A letter describing your real, day-to-day duties is what lets an officer match your job to the right occupation. → *NOC Code Verifier* · *Employment Reference Letter Sample*
2. **Proof of funds that can't be followed.**
   > Funds should be easy to trace: whose money it is, where it is held, and how it got there. IRCC publishes the current requirements — check them before you assemble statements. → *Proof of funds on canada.ca* (link)
3. **Experience you can't verify.**
   > An officer needs to be able to confirm that the experience happened. A reference letter that is specific and signed by someone who can be reached is far easier to verify than a general one. → *Employment Reference Letter Sample* · *Employer Request Letter Template*
4. **An education assessment that doesn't match your profile.**
   > An Educational Credential Assessment (ECA) is used to verify that your foreign credential is valid and equal to a Canadian one. Make sure the credential on your ECA report is the one in your profile. → *ECA Application Guide*
5. **Unexplained gaps.**
   > A dated, month-by-month timeline of work, study and breaks makes gaps easy to explain before anyone asks. → *Express Entry Document Checklist*
6. **Rules that moved while you were preparing.**
   > Express Entry changes often. For example, on November 3, 2026 IRCC changed how points are awarded for Canadian work experience and job offers. Always check canada.ca on the day you act. → *Check your CRS score* ⚠️ *keep only if Decision 1 is resolved*

*Removed outright (unverified in this session):* the "2016 NOC duty matrix" claim, the "90 days" gap rule, the
exchange-rate statement, the arranged-employment-points paragraph.

### 3.3 Section "The Visa Forte Method" → **"How These Guides Are Made"**

- **Eyebrow:** How These Guides Are Made
- **Headline:** Plain English. Checked Against the Source. Honest About Limits.
- **Lead:**
  > I am a documentation specialist based in Secunderabad, India. I am not a Regulated Canadian Immigration Consultant (RCIC) or a lawyer, and nothing here is legal advice or representation. What I can do is explain, clearly and for free, what the paperwork is for and how to prepare it well.
- **Pull quote** (replaces the "junior clerks" quote): *"Most of what makes a file strong is simply doing the ordinary things carefully. These tools exist so that everyone can see what 'carefully' looks like."* — Prashant Thirthingoth · Documentation Specialist · Visa Forte
  *(Your words — please rewrite freely.)*
- **Four cards** (replace Every File Is My File / Current Criteria / Edge Cases / Structured Communication):
  1. **Checked Against canada.ca** — "Every rule, number and date in these guides is checked against the official IRCC page it comes from, and the page and date are shown. If I can't verify it, it isn't published."
  2. **Written for Real Profiles** — "Two decades of documentation work means the guides cover the awkward cases — work history across countries, gaps, unusual employers — not just the textbook ones."
  3. **Honest About Limits** — "I can't assess your individual case or represent you. For advice about your own situation, speak to a licensed RCIC or an immigration lawyer."
  4. **Free and Private** — "No account. No payment. Results appear on screen and are not stored. I only keep your email if you choose to give it."

### 3.4 Section "Client Outcomes" → **"Free Tools"**

Three case studies removed. Replaced by a grid of the five tools (same card style as `/resources`):

| Tool | One-line description |
|---|---|
| CRS Score Check (Assessment) ⚠️ | Work out your Express Entry score and see which pathways fit. |
| CRS Modeller ⚠️ | Test how changes — a language retake, a new credential — would move your score. |
| NOC Code Verifier | Describe your duties and see which NOC 2021 codes they match. |
| 60-Day ITA Countdown | Turn your ITA date into a dated, day-by-day document checklist. |
| Refusal Pattern Analyser | Paste a refusal letter and see the patterns it contains. |

⚠️ Hold these two cards' wording until Decision 1 is settled.

Eyebrow: Free Tools · Headline: Check Your Score. Plan Your Move. · Sub: "Every tool is free, needs no login, and shows its result on screen."

### 3.5 Accordion "The Questions Serious Applicants Ask" → **"Straight Answers"**

Three sales-objection questions (why not the IRCC site / a big firm / is there a guarantee) are replaced:

1. **Is this really free?** — "Yes. There are no fees, no paid tier and no account. I may ask for your email if you'd like to hear about new Express Entry draws — that is always optional."
2. **Can this replace an immigration professional?** — "No. This is education, not advice. I am not an RCIC or a lawyer. If your case is complicated, or you've been refused, speak to a licensed RCIC or immigration lawyer."
3. **How current is the information?** — "Each guide and tool shows the canada.ca page it relies on and when that page was last updated. IRCC rules change often, so always confirm on canada.ca before you act."

### 3.6 Section "The Engagement" (Premium Starter Kit offer) → **"Free Guides & Templates"**

The whole offer (kit list, "what is included", "limited capacity") is removed. Replaced by a strip of the featured
guides — the three former premium PDFs plus the most-downloaded free ones — with the **same card component** as
`/resources` and a **"Free download"** label. No price, no cart.

- **Eyebrow:** Free Guides & Templates · **Headline:** Download. Print. Use. · **Sub:** "Checklists, letter templates and guides — free, with no sign-up."
- **Button:** "See all guides →" (`/resources`)

### 3.7 Final call to action

- **Eyebrow:** Begin Your Assessment → **Start Here**
- **Headline:** Your Documentation Is Either Bulletproof — or It Isn't. → **Start With Your Score. Then Get Your Paperwork in Order.**
- **Body:** *(old: "Request a Document Triage Assessment… personal review… capacity is limited")* →
  > Check your score, then work through the checklists and templates at your own pace. Everything is free.
- **Button:** "Get Reviewed →" → **"Check your CRS score →"**
- **Contact line:** "Questions or corrections? prashant@visaforte.com · visaforte.com"

---

## 4. About page

Same layout. Sections: hero → profile → method → scope → closing.

- **Hero eyebrow:** The Practice → **About Visa Forte** · **Headline:** Twenty Years at the Boundary Where Applications Fail. → **Twenty Years of Documentation, Shared Freely.**
- **Hero lead:**
  > Visa Forte is a free educational resource about Canadian permanent residence, written by a documentation specialist based in Secunderabad, India.
- **Profile** (name, title, photo unchanged; title "Senior Documentation Consultant" → **"Documentation Specialist"**; badge "Consultant on Every File" → **"Free for Everyone"**):
  - ¶1 (keep, lightly edited): "I have spent more than two decades working at the point in the Canadian immigration process where most applications succeed or fail — the documentation phase: the employment letters, the financial evidence, the ECA alignment, the gap explanations, the consistency of a file."
  - ¶2 (replaces "solo practice… the same person who answers IRCC correspondence"): "This site is my way of making that knowledge available to everyone. The guides are free, the tools are free, and there is nothing to buy."
  - ¶3: "I am based in Secunderabad, India, and the site is read by applicants across India, Southeast Asia, the Middle East and beyond."
- **Method section** → eyebrow **How It Works** · headline **Plain Explanations. Official Sources.**
  Three cards: **Checked Against canada.ca** · **Updated When Rules Change** ("Each page shows when it was last verified. When IRCC changes a rule, I update the page.") · **Built for Real Profiles**.
  *(Removes "Personal Review" and the March-2025 sentence.)*
- **Scope section** → headline **"Education, Clearly Defined."**
  - **What this site provides:** free guides and checklists · free calculators and planners · plain-English explanations of Express Entry and PNP documentation · links to the official IRCC page behind every fact
  - **What this site is not:** legal representation · immigration law advice · regulated immigration consulting (RCIC services) · a substitute for the official IRCC website
  - Closing paragraph: "Visa Forte focuses on the documentation side of Canadian immigration. It is educational only. For advice about your own case, speak to a licensed RCIC or an immigration lawyer."
- **Closing CTA** (replaces "Every engagement starts with a Document Triage Assessment… Get Reviewed"):
  - Eyebrow **Start Here** · Headline **"Begin with the free tools."** · Body "Check your score, then work through the guides." · Button **"Explore free resources →"** (`/resources`)

---

## 5. Contact page

The consulting enquiry form (service dropdown with the seven paid tiers, phone/WhatsApp, "Response commitment",
"Services" link list) is replaced by a **simple feedback form** (name, email, message). It still opens the visitor's
own email app, so nothing is stored by the site.

- **Hero eyebrow:** Get in Touch (unchanged) · **Headline:** Every File Begins with a Conversation. → **Questions, Corrections, Feedback.**
- **Intro:**
  > Found an error? Spotted a rule that has changed? Have a question about how a tool works? Write to me. I read every message.
  >
  > **Please note:** this site is educational. I can't answer questions about individual cases through it, and nothing I write here is legal advice.
- **Fields:** Full Name · Email Address · Message *(removed: Phone/WhatsApp, Service of Interest)*
- **Subject line generated:** `Visa Forte feedback — {name}`
- **Info column:** *Direct contact:* prashant@visaforte.com · *Location:* Secunderabad, Telangana, India · *Response time:* "I reply when I can — usually within a few working days." *(old "within 24 hours" commitment removed; Decision 7)*
- **Sent-confirmation screen:** headline "Your email client should be open." — body unchanged except "your enquiry is on its way" → "your message is on its way".

---

## 6. Other pages and tool surfaces

### 6.1 `/resources`

- Page intro and the "tools" section copy stay (already free). Fix: the hero card says "…the top 2–3 reasons it's lower than the last draw cutoff" — keep, but hold with Decision 1.
- The 3 former premium PDFs appear in the free grid with the same "Free download" label. Their `priceINR` and "Buy" button go.
- Remove the "premium" section/heading if the page has one.
- Refusal Analyser card: remove any price tag; ITA Countdown card: remove "Standard/Premium".

### 6.2 `/assessment` (after the result)

- **Delete** the "What happens next" consulting block: *"Your score is calculated. Your strategy is the next step…"* / **Get Reviewed →** / *"Pre-Application Eligibility Assessment · From ₹4,999"*.
- **Replace with a "What to do next" block (free links only):**
  > **Your score is calculated. Here's what to do next.** Work through the document checklist, check your NOC code, and plan your first 60 days after an invitation. → *Document Checklist* · *NOC Code Verifier* · *60-Day ITA Countdown*
- **Email card** becomes the standard email-capture block in Section 7.

### 6.3 `/visas` bottom banner

- **Eyebrow** Your Documentation → keep. **Headline:** "Eligibility opens the door. Documentation determines whether you walk through it." → keep (it is your thesis).
- **Body:** *"…where 20 years of documentation practice becomes the difference between submission and rejection."* →
  > Meeting the eligibility threshold is step one. What an officer then reads — the employment letters, the financial proofs, the ECA — is where careful preparation pays off. The free guides walk you through each one.
- **Buttons:** "Get Reviewed →" (`/intake`) → **"Browse free guides →"** (`/resources`); "Check your CRS score" stays.

### 6.4 ITA Countdown (`/tools/ita-countdown`)

- **Removed:** the Standard ₹2,997 / Premium ₹3,997 tier pills, "+ doc review call", the payment button, and the consent checkbox about storing the profile.
- **Button:** "Get My Full Checklist — Standard, ₹2,997 →" → **"Build my checklist — free"**.
- **Result screen:** the checklist appears immediately, with **Print / Save as PDF** and the email block from Section 7.
- **Note under the form:** "Your details are used to build the checklist in your browser session. They are not stored unless you choose to give your email (below)."

### 6.5 Refusal Pattern Analyser

- **Removed:** price (₹2,497), payment step, "for a paying user" wording.
- **Button:** → **"Analyse my letter — free"**
- **Privacy note (matches the code's contract):** "Your letter is analysed in this session and is never stored, logged or sent to anyone else."
- **Add under the result:** "This is a pattern analysis, not legal advice. If you have been refused, consider speaking to a licensed RCIC or immigration lawyer about your options."

### 6.6 NOC Code Verifier

- Add a one-line notice: "To rank the matches, the duties you type are sent to Anthropic's Claude AI service. Visa Forte does not store them." **[VERIFY in code that nothing persists the text before this ships.]**

### 6.7 CRS Modeller and Assessment

- Footer note on the result: the Section 2.5 disclaimer, plus **"Scores follow the CRS grid on canada.ca as last verified on {date from crs-rules.json}."** *(shows the visitor how current the tool is — and forces us to keep that date honest; see Decision 1)*

---

## 7. Email capture, consent and unsubscribe

Shown under the result of: **CRS Modeller · Assessment · ITA Countdown**. Always optional; the result is always visible first.

### 7.1 The block

> **Keep a copy of this result**
> Name [____] Email [____]
> ☐ **Email me this result.**
> ☐ **Also email me when a new Express Entry draw is published.**
> ☐ *(only shown if a score exists)* **Include my score so the email can compare it to the draw cutoff.**
> [ Send ]
>
> *Small print:* I'm Prashant Thirthingoth, Secunderabad, India. I'll use your name and email only for what you ticked above. Every email has an unsubscribe link that works in one click. See the [Privacy Policy](/privacy-policy).

- **Both boxes start unticked.** Ticking the second box is the *only* thing that puts someone on the draw-alert list.
- If neither box is ticked, the Send button stays disabled.
- Success message: **"Done. Check your inbox ✓"** (if "email me this" ticked) or **"You're on the list ✓"**.
- Error message: **"That didn't work. Your result is still on screen — try again in a moment."**

### 7.2 "Your result" email (sent only if box 1 ticked)

- **Subject:** Your {tool name} result — Visa Forte
- **Body:** result summary (same content as on screen) + Section 2.5 disclaimer + "Rules change often — confirm on canada.ca before acting." + footer: "You're receiving this because you asked for a copy at visaforte.com. This is a one-off email."
- This is a one-off, **not** a subscription.

### 7.3 `/unsubscribe` page

- **Headline:** You're unsubscribed.
- **Body:** "I've removed {email} from the draw-alert list. You won't get any more emails from me. If this was a mistake, you can sign up again on any tool."
- **Invalid or used link:** "This link isn't valid any more. If you're still getting emails, write to prashant@visaforte.com and I'll remove you by hand."
- Opens straight to the result — no login, no extra click.

### 7.4 Compliance flags (not legal advice — [VERIFY] with a professional)

- **India's DPDP Act, 2023** — my understanding is that consent must be specific, informed, and given by a clear
  affirmative action, and withdrawing it must be as easy as giving it. The design above (unticked boxes, separate
  consent, one-click unsubscribe, timestamp) is built to that. **[VERIFY] the exact requirements, including notice
  wording, with the DPDP Act text or a lawyer — I have not verified them this session.**
- **Canada's anti-spam law (CASL)** applies to commercial email received by people in Canada. The design (express
  opt-in, sender identified, working unsubscribe) is the standard shape. **[VERIFY] with canada.ca / a lawyer.**
- I store only: name, email, source tool, consent yes/no, consent time, unsubscribe token, and (only if ticked) CRS score + category.

---

## 8. Privacy Policy — full replacement text

*(Layout unchanged. "Effective" date to be set at launch. Items marked ⚙ describe how the code behaves and I will re-check each against the code before ship.)*

**Effective date:** {launch date} · **Last updated:** {launch date}

**1. Who I am.** Visa Forte is a free educational website operated by Prashant Thirthingoth, Secunderabad, Telangana, India. Contact: prashant@visaforte.com.

**2. What I collect.**
- **Using the tools:** the CRS tools and the ITA Countdown work in your browser session. Nothing you enter is stored unless you choose to give your email (below). ⚙
- **Refusal Analyser:** the letter text is analysed in memory and discarded. It is never stored, logged or sent to a third party. ⚙
- **NOC Code Verifier:** the duties you type are sent to Anthropic (the Claude AI service) to rank the matches. I do not store them. ⚙
- **Email list / copy of your result:** if you ask for your result or ask to hear about draws, I store your name, email address, the tool you used, whether you opted in to draw alerts, when you did so, and — only if you tick the box — your CRS score and Express Entry category.
- **Writing to me:** if you email me, I keep your message and address in my mailbox to reply.
- **Abuse protection:** to stop automated misuse, tools keep a one-way hash of your IP address and a hit count for up to an hour. The IP address itself is not stored. ⚙
- **Analytics:** see Section 6.

**3. How I use it.** To send what you asked for — your result, and draw alerts if you opted in. I don't sell or share your data, and I don't use it for advertising or profiling.

**4. Your choices.** Every email has an unsubscribe link that works in one click. You can also write to me to see, correct or delete what I hold. I reply within 30 days. **[VERIFY: DPDP Act rights and grievance-redress wording.]**

**5. Where data lives, and who processes it.**
- **Supabase** — database (email list, admin records)
- **Vercel** — website hosting
- **Google Workspace** — sends the emails and holds my mailbox
- **Anthropic** — NOC Verifier only (above)
- **Google Analytics 4 and Cloudflare Web Analytics** — anonymous usage statistics
- **Sentry** — error monitoring, configured not to send personal data ⚙

**6. Cookies and analytics.** The public pages set no cookies of their own. Google Analytics and Cloudflare analytics may set cookies to count visits (pages viewed, rough location, how you arrived); they are not linked to your email or anything you entered. No advertising cookies. You can block analytics cookies in your browser without affecting the site.

**7. Earlier clients.** Before this site became free, Visa Forte also offered paid services. Records of those clients (accounts, documents, messages, booking details) are kept in my private admin system, not shown on this site, and deleted **two years** after the file was last active. ⚙ *(see Decision 4 — current policy says 3 years but the nightly job deletes at 2)*

**8. Changes.** I'll update this page and its date when anything changes.

**9. Contact.** prashant@visaforte.com

**Removed:** Razorpay, bookings, intake forms, payment data, client accounts, refund references; the line "Required by Razorpay and all payment processors…" in the code comment.

---

## 9. Removed with no replacement

`/services`, `/booking`, `/intake`, `/refund-policy`, `/signup`, `/portal`, `/activate` — all become 301 redirects (plan).
Also gone: all price displays; "Premium" labels; the testimonials/case studies; the Starter Kit; "Request Triage";
any "limited capacity" language; the "Services" link list on Contact.

---

## 10. Fact register — every IRCC statement kept in this deck

All fetched **2026-11-11** with plain `curl -sSL` (HTTP 200). Base: `https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada`

| # | Claim in copy | Source page | Date modified | Status |
|---|---|---|---|---|
| 1 | IRCC moved to NOC 2021 on **Nov 16, 2022** | `/find-national-occupation-code.html` ("On November 16, 2022, we switched to the 2021 version…") | 2025-06-27 | ✅ verified |
| 2 | An ECA verifies a foreign credential is "valid and equal to a Canadian one" | `/express-entry/documents/education-assessment.html` | 2026-10-16 | ✅ verified |
| 3 | On **Nov 3, 2026** IRCC changed how points are awarded for Canadian work experience and job offers | `/express-entry/check-score/crs-criteria.html` | 2026-11-03 | ✅ verified |
| 4 | Category-based selection exists; categories are announced in advance | `/express-entry/rounds-invitations/category-based-selection.html` | 2026-10-16 | ✅ verified (used only in context, no figures) |
| 5 | Employment-letter content requirements (signatory contact details, duties, hours) | not fetched | — | ❌ **not stated**; copy only says "specific, signed by someone who can be reached" and links to our sample letter. *Please confirm the sample letter PDF itself was verified when it was built.* |
| 6 | "90% of applications fail", "90-day gap rule", exchange-rate rule, March-2025 wording | none | — | ❌ **cut** |

No CRS point value, fee, cutoff or processing time appears anywhere in this deck.

---

## 11. Decisions I need from you

1. **⚠️ CRS tools vs the 2026-11-03 rule change (Section 0A).** Options:
   **(a)** First do a separate, small PR that updates `crs-rules.json` and the scoring code to IRCC's current grid, *then* the free-site PR (recommended — the free site's main product should be right);
   **(b)** Ship the free site now and put a visible "being updated to IRCC's 3 Nov 2026 changes" banner on both CRS tools until (a) is done;
   **(c)** Pull the CRS tools from the homepage and nav until they're updated.
   This is a stop-and-ask item under CLAUDE.md. I will not change scoring logic without your say-so.
2. **Headline and pull-quote wording** (3.1, 3.3) — mine are drafts. Rewrite freely.
3. **"About" in the top nav?** (2.3) I added it; today it's footer-only.
4. **Data retention for earlier clients.** Policy says 3 years; the nightly job deletes at 2 years. I wrote "two years" to match what actually happens. Say if you want it the other way (changes the job, not just words).
5. **Footer disclaimer:** Section 17 verbatim (my recommendation), or keep the extra "documentation forensics" sentence?
6. **Bulk-sending route for draw alerts (PR 2).** Current setup sends from one Workspace mailbox that also carries admin/client email, with no unsubscribe-header support. Options: **(a)** a dedicated second Workspace mailbox for the list; **(b)** a proper email-list service (cheap, built for this); **(c)** stay on the current mailbox for a small list and accept the risk. I'll bring numbers — Google's sending limits are `[VERIFY]` and I haven't checked them yet.
7. **Contact response time:** old text promised 24 hours; I wrote "usually within a few working days." Your call.
8. **Contact page stance:** "I can't answer individual cases" (as drafted — consistent with no solicitation and with not being an RCIC), or allow a softer line?
