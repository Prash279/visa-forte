# AGENTS.md — Visa Forte Platform: Subagent Architecture
> Defines how Claude Code spawns, delegates to, and receives results from subagents.
> Read this file before parallelising any work or spawning any subagent.
> Last updated: April 2026 | Owner: Prashant Thirthingoth

---

## 1. When to Use a Subagent

Subagents exist to keep the main context window clean and to parallelise work that can be fully isolated. The main agent retains architectural decisions, task planning, and communication with Prash.

**Delegate to a subagent when the task is:**
- Self-contained with a clearly bounded input and expected output
- Research or exploration (library comparison, CVE lookup, API documentation scan)
- Isolated feature implementation that doesn't touch shared state
- Repetitive work across multiple files (e.g. adding a consistent pattern to 10 route handlers)
- A long-running background analysis that shouldn't block main task progress

**Keep in the main agent when the task:**
- Requires an architectural decision that affects `tech.md`, `spec.md`, or `CLAUDE.md`
- Touches security controls defined in `security.md`
- Requires Prash's approval before proceeding
- Involves cross-product changes affecting more than one product in `spec.md §3`
- Is a halting condition per `CLAUDE.md`

---

## 2. Subagent Types

### Type 1 — Research Agent
**Purpose:** Gather information without modifying any file.
**Input:** A specific question and a named authoritative source.
**Output:** A structured answer with citations — no code, no file changes.
**Context provided:** Question only. Do not pass the full codebase context.

```
Research Agent Task:
Question: What is the current CVE status of [library] [version]?
Source: nvd.nist.gov, official library GitHub releases
Output format: CVE ID (if any) · Severity · Patched version · One-sentence summary
Do not modify any file. Return findings only.
```

### Type 2 — Implementation Agent
**Purpose:** Build a single, isolated feature or module.
**Input:** A precise spec (what to build, inputs, outputs, file location, test requirement).
**Output:** The implemented file(s) + a passing test + a plain-English summary of what was built.
**Context provided:** Relevant section of `tech.md` + `security.md` OWASP checklist + the specific file(s) to create or modify. Nothing else.

```
Implementation Agent Task:
Build: [feature name]
Spec: [precise description — inputs, outputs, constraints]
File location: [exact path]
Must pass: [specific test criterion]
Security: Apply OWASP checklist from security.md §9 before marking done.
Do not modify any file outside the specified path.
Return: implemented file + test file + plain-English summary.
```

### Type 3 — Audit Agent
**Purpose:** Review existing code for a specific class of problem.
**Input:** A file or directory + a specific audit criterion.
**Output:** A structured findings report — no code changes.
**Context provided:** The target file(s) + the audit criterion. Nothing else.

```
Audit Agent Task:
Review: [file or directory path]
Criterion: [e.g. "check all external I/O boundaries for missing Zod/Pydantic validation"]
Output format: Finding · File · Line number · Recommended fix
Do not modify any file. Return findings only.
```

---

## 3. Context Handoff Protocol

Every subagent receives the **minimum context required** to complete its task — not the full project context. Context bloat degrades subagent performance.

**What to always include in subagent context:**
- The task type (Research / Implementation / Audit)
- The precise input and expected output format
- The specific files the agent is authorised to read and/or modify
- The relevant section of `tech.md`, `security.md`, or `spec.md` — not the whole file

**What to never include in subagent context:**
- `CLAUDE.md` (behavioural config is for the main agent only)
- `tasks/lessons.md` (self-improvement loop is main agent only)
- Unrelated product specs or skill files
- Credentials or environment variable values

---

## 4. Result Integration

When a subagent returns results, the main agent:

1. **Validates the output** against the task spec before integrating — a subagent can hallucinate just as a main agent can
2. **Runs the tests** if an Implementation Agent returned code — do not take the subagent's word that tests pass
3. **Applies the OWASP checklist** (`security.md §9`) to any code before merging
4. **Updates `tasks/todo.md`** to mark the delegated task complete
5. **Logs any correction** needed from the subagent output into `tasks/lessons.md` with the tag `[Subagent Pattern]`

---

## 5. Parallelisation Rules

**Hard rule: Implementation is always sequential.** Code is written one piece at a time. Prash tests each piece before the next one starts. This is non-negotiable regardless of phase.

The reason: Prash cannot read code to catch merge conflicts between parallel implementation agents. A conflict in a file that two agents touched simultaneously produces broken code that neither the AI nor Prash can easily untangle.

Subagents can run in parallel only for **Research and Audit tasks** — never for Implementation.

**Safe to parallelise:**
- Research Agent on library A + Research Agent on library B
- Audit Agent on `apps/web/` + Audit Agent on `apps/api/` (read-only, different directories)

**Never parallelise:**
- Two Implementation Agents writing any code, regardless of whether the files seem unrelated
- Two agents modifying the database schema
- Any agent work that touches `CLAUDE.md`, `tech.md`, `spec.md`, or `security.md` — these are main-agent-only files

---

## 6. Subagent Failure Handling

If a subagent returns an unusable result:
1. Do not retry more than once with the same prompt — reformulate the task spec
2. If the second attempt also fails, bring the task back into the main agent context
3. Log the failure pattern in `tasks/lessons.md` under `[Subagent Pattern]`
4. Do not surface subagent failure details to Prash unless the task itself is now blocked

---

## 7. Phase Constraints

| Phase | Subagent Usage |
|---|---|
| Phase 1 (Foundation) | Research Agents only |
| Phase 2 (Client Management) | Research + Audit Agents only |
| Phase 3 (Automation) | Research + Audit Agents only |

**Implementation is always sequential across all phases.** One feature. One agent. Prash tests it. Then the next feature begins. This is the rule until Prash has a technical co-founder or developer who can review parallel code output.

---

## 8. Model & Effort Routing

Sources (verified live against official docs, not training data): [Model configuration](https://code.claude.com/docs/en/model-config.md) · [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents.md)

**Resolved 2026-07-16:** `~/.claude/settings.json` previously set `CLAUDE_CODE_SUBAGENT_MODEL: "haiku"`, which — per the official docs — "overrides the per-invocation `model` parameter and the subagent definition's `model` frontmatter" for every subagent. That silently forced `security-reviewer` and `code-reviewer` onto Haiku despite both being pinned to `claude-opus-4-6` for higher-stakes review. Now set to `"inherit"`, so each subagent's own frontmatter `model` field is respected again.

### By subagent type (Section 2 taxonomy)

| Type | Recommended model | Recommended effort | Why |
|---|---|---|---|
| Research Agent | `haiku` (`sonnet` if the lookup needs judgment, e.g. CVE triage) | `low`–`medium` | Bounded, single-question tasks — official guidance reserves `low` for "short, scoped, latency-sensitive tasks that are not intelligence-sensitive" |
| Implementation Agent | `sonnet` | `high` | Matches the official description of `high`: "comprehensive implementation... extensive testing and documentation" — also `high` is Sonnet 5's own default |
| Audit Agent (OWASP / security / immigration compliance) | `opus` | `high`–`xhigh` | Correctness-critical review benefits from deeper reasoning; worth the extra token spend `xhigh` costs |

### Named agents currently used on this project

| Agent | Frontmatter `model` | Frontmatter `effort` |
|---|---|---|
| `security-reviewer`, `code-reviewer` | `claude-opus-4-6` | `high` (set 2026-07-16 — Opus 4.6's ceiling, no `xhigh`/`max` available) |
| `immigration-doc-checker`, `db-schema-reviewer` | `claude-sonnet-4-6` | `high` (set 2026-07-16 — Sonnet 4.6's ceiling, no `xhigh`/`max` available) |
| `fastapi-reviewer`, `python-reviewer`, `typescript-reviewer`, `e2e-runner` | `sonnet` | `high` (set 2026-07-16 — matches Sonnet 5's own default; `xhigh`/`max` still available if a review warrants it) |

Anthropic's docs don't state what a subagent falls back to when `effort` is omitted from its frontmatter — don't assume a `/effort high` main session carries over to an agent that hasn't set it explicitly. For a security or compliance review that needs deeper reasoning, set `effort` directly in that agent's frontmatter rather than relying on inheritance, as done for `security-reviewer` above.

---

*AGENTS.md — Visa Forte Platform | Read-before-subagent reference*
