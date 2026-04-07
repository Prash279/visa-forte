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

*No entries yet. Add here when a correction involves authentication, session management, webhook verification, data handling, or DPDP compliance.*

---

## Category: Code Quality

*No entries yet. Add here when a correction involves TypeScript types, Python patterns, error handling, constants, or test coverage.*

---

## Category: Workflow

*No entries yet. Add here when a correction involves task planning, scope creep, verification steps, or communication with Prash.*

---

*lessons.md is a living document. Every correction is a lesson. Every lesson is a rule.*
