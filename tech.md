# tech.md — Visa Forte Platform: Technology Reference
> Authoritative stack decisions for Claude Code.
> Read this file before making any architectural, library, or infrastructure decision.
> Last updated: April 2026 | Owner: Prashant Thirthingoth

---

## 1. Full Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind CSS | App Router enables server components by default — less client JS, faster load |
| State | URL Search Params (shareable) · Zustand (client state) | URL state = shareable links for free; Zustand only for ephemeral UI state |
| Validation | Zod (TypeScript) · Pydantic (Python) | Mandatory at ALL external I/O boundaries. See §5. |
| Backend | Python 3.12+ · FastAPI | Async-first, type-safe, Pydantic-native. Runs AI tooling and background jobs. |
| Database | PostgreSQL 16 · Drizzle ORM | Drizzle: type-safe queries, migration files version-controlled. See §6. |
| Storage | Cloudflare R2 | Client documents only. Near-zero egress cost. S3-compatible API. |
| Payments | Paddle (MoR/digital) · Wise Business (SWIFT/wire) | Paddle handles tax/compliance globally. Wise for wire transfers. |
| Auth | Better Auth | Open-source, zero SaaS fees, handles sessions, OAuth, 2FA. |
| Testing | Vitest (TypeScript) · PyTest (Python) | Co-located tests. See §8. |
| AI Layer | Claude API · `claude-sonnet-4-20250514` | Do not substitute model without explicit approval. |
| Email | TBD — evaluate Resend or self-hosted postal at deploy time | Vendor-agnostic. Define the interface contract first. |

---

## 2. Hosting Decision Framework

**Default to Render.** It deploys both Next.js and Python (FastAPI) from the same dashboard, manages the PostgreSQL database visually, and auto-deploys on every push to `main` — no server configuration required. For a solo non-coder, zero-ops always outweighs cost optimisation at the start.

| Platform | Use When | Trade-off |
|---|---|---|
| **Render** ✅ Recommended | Default choice — unified stack, managed DB, zero ops | Slightly higher cost than VPS at scale |
| **DigitalOcean App Platform** | If Render has availability issues in your region | Less mature Next.js support |
| **VPS + Coolify** | Only when monthly cost becomes a constraint (Phase 2+) | Requires basic server management comfort |
| **Vercel** | Never — cannot host FastAPI alongside Next.js | Splits the stack into two separate deployments |

**Decision rule:** Start on Render. Migrate to VPS + Coolify only if hosting cost exceeds budget in Phase 2. Document the hosting choice in this file when made.

---

## 3. Directory Structure

```
visaforte/
├── CLAUDE.md               ← Agent behavioural config (behaviour only)
├── AGENTS.md               ← Subagent architecture and delegation protocol
├── tech.md                 ← This file — stack reference
├── spec.md                 ← Product and feature specification
├── security.md             ← Security implementation guide
├── tasks/
│   ├── todo.md             ← Active task list (checkable)
│   └── lessons.md          ← Self-improvement log
├── apps/
│   ├── web/                ← Next.js App Router application
│   │   ├── app/            ← Routes (directory = route)
│   │   ├── components/     ← Shared UI components
│   │   ├── lib/            ← Utility functions (pure, testable)
│   │   ├── hooks/          ← Custom React hooks
│   │   ├── store/          ← Zustand stores
│   │   ├── constants.ts    ← Named constants — no magic numbers
│   │   └── middleware.ts   ← Session, rate limiting, auth enforcement
│   └── api/                ← FastAPI backend
│       ├── routers/        ← One file per route group
│       ├── models/         ← Pydantic models (validation + serialisation)
│       ├── services/       ← Business logic (no DB calls here)
│       ├── db/             ← Drizzle schema + query files
│       ├── config.py       ← Named constants and env var loading
│       └── main.py         ← App entry point
├── tools/
│   ├── canvisa-pro/        ← CanVisa Pro (single-file, self-contained)
│   ├── globalvia-pro/      ← GlobalVia Pro (internal only)
│   ├── proscrape/          ← ProScrape (Python/PyQt6)
│   ├── axiom/              ← Axiom
│   ├── socrates/           ← Socrates
│   └── prometheus/         ← Prometheus
└── docs/                   ← Additional reference documentation
```

---

## 4. State Management Rules

**URL Search Params** — Use for any state that should survive a page refresh or be shareable via link. Filter selections, pagination, active tab, modal open state tied to a resource. Implement via `useSearchParams` + `useRouter`.

**Zustand** — Use only for ephemeral client state with no URL representation: toast notifications, sidebar open/closed, loading overlays, multi-step form progress. One store per domain — do not create a single global mega-store.

**Rule:** If two people should see the same view when sharing a URL, that state goes in the URL. Everything else goes in Zustand.

---

## 5. Validation Architecture (Zod + Pydantic)

Every external payload — API request bodies, Paddle webhooks, canada.ca responses, user form inputs, Claude API responses — must be parsed through a schema before any business logic executes. This is non-negotiable.

**TypeScript pattern:**
```typescript
// Define schema once, infer the type from it — never the reverse
const ClientProfileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  crsScore: z.number().int().min(0).max(1200),
})
type ClientProfile = z.infer<typeof ClientProfileSchema>

// At the boundary — parse, don't cast
const result = ClientProfileSchema.safeParse(incomingData)
if (!result.success) {
  // Log the error, return 400 — never let invalid data through
  return { error: result.error.flatten() }
}
const profile = result.data // TypeScript now knows this is valid
```

**Python pattern:**
```python
from pydantic import BaseModel, EmailStr

class ClientProfile(BaseModel):
    name: str
    email: EmailStr
    crs_score: int

# FastAPI does this automatically when you annotate route params
# For manual use:
try:
    profile = ClientProfile.model_validate(incoming_data)
except ValidationError as e:
    raise HTTPException(status_code=400, detail=e.errors())
```

**Rule:** `unknown` at TypeScript I/O boundaries — never `any`. Parse with Zod before narrowing. Unvalidated data never reaches a service function.

---

## 6. Database & Migration Discipline (Drizzle ORM)

**Schema location:** `apps/api/db/schema.ts` — single source of truth for all table definitions.

**Migration rule:** Every schema change goes through a Drizzle migration file. Never run raw `ALTER TABLE` in production. Never modify the database directly through a GUI without a corresponding migration file.

```bash
# Generate migration after schema change
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate

# Never do this in production:
# ALTER TABLE clients ADD COLUMN phone TEXT;
```

**Query pattern:** All DB queries live in `apps/api/db/queries/` — one file per table/domain. No raw SQL in route handlers or service files. No ORM calls in route handlers — only service functions call the DB layer.

---

## 7. Environment Variables

**Convention:**
```
# Public (exposed to browser — only non-sensitive config)
NEXT_PUBLIC_APP_URL=

# Server-only (never NEXT_PUBLIC_ prefix)
DATABASE_URL=
PADDLE_SECRET_KEY=
PADDLE_WEBHOOK_SECRET=
BETTER_AUTH_SECRET=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
ANTHROPIC_API_KEY=        ← Server-side only. Never exposed to the browser.
```

**Rules:**
- `.env.local` for local development — never committed to git
- `.env.example` committed with all keys present, values empty — documents required vars
- Production secrets set directly in the hosting platform's secrets manager
- Claude API key for client-facing tools (CanVisa Pro) entered by user at runtime — never in env vars for client-side tools

---

## 8. Testing Conventions

**TypeScript (Vitest):**
- Test files co-located with source: `lib/crs-calculator.ts` → `lib/crs-calculator.test.ts`
- Test the behaviour, not the implementation
- Unit tests for all utility functions in `lib/`
- Integration tests for API route handlers

```bash
npx vitest              # run all tests
npx vitest --watch      # watch mode during development
npx vitest --coverage   # coverage report
```

**Python (PyTest):**
- Test files in `apps/api/tests/` mirroring the source structure
- Fixtures in `conftest.py`
- All service functions must have unit tests before merging

```bash
pytest                  # run all tests
pytest -v               # verbose output
pytest --cov=.          # coverage report
```

**Minimum bar:** A task is not complete until its tests pass. "It works in the browser" is not a substitute for a passing test.

---

## 9. Development Commands

```bash
# Web app (from apps/web/)
npm run dev             # start Next.js dev server
npm run build           # production build
npm run typecheck       # TypeScript type check (no emit)
npm run lint            # ESLint
npx vitest              # run tests

# API (from apps/api/)
uvicorn main:app --reload   # start FastAPI dev server
pytest                      # run tests
pip install <pkg> --break-system-packages  # install Python package

# Database
npx drizzle-kit generate    # generate migration from schema changes
npx drizzle-kit migrate     # apply pending migrations
npx drizzle-kit studio      # open Drizzle Studio (local DB GUI)
```

---

## 10. Constants Convention

No magic numbers or magic strings in application code. Every constant has a name, a type, and lives in the right place.

**TypeScript:** `apps/web/constants.ts`
```typescript
export const MAX_FILE_SIZE_MB = 10
export const SESSION_TIMEOUT_HOURS = 24
export const SIGNED_URL_EXPIRY_MINUTES = 15
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 60
```

**Python:** `apps/api/config.py`
```python
MAX_FILE_SIZE_MB: int = 10
SESSION_TIMEOUT_HOURS: int = 24
SIGNED_URL_EXPIRY_MINUTES: int = 15
RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
```

---

## 11. CI/CD Pipeline

### The Non-Coder Principle
Prash does not debug YAML. The deployment pipeline must be as hands-off as possible. Two tiers:

**Tier 1 — Render Auto-Deploy (Default for Prash)**
Render watches the `main` branch. Every merged pull request deploys automatically. No terminal commands required from Prash. This is the default deployment model.

- Push to `main` → Render builds and deploys automatically
- If the build fails, Render sends an email and keeps the previous version live
- Prash's job: merge the PR when the Prashant Proof passes. That's it.

**Tier 2 — GitHub Actions (Claude Code manages, Prash does not debug)**
For automated quality checks before merge. Claude Code sets this up and maintains it. If a GitHub Actions workflow breaks, Claude Code fixes it — Prash does not read YAML error logs.

**File location:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  web:
    name: Next.js — Typecheck, Lint, Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install dependencies
        run: npm ci
        working-directory: apps/web
      - name: Type check
        run: npm run typecheck
        working-directory: apps/web
      - name: Lint
        run: npm run lint
        working-directory: apps/web
      - name: Test
        run: npx vitest run
        working-directory: apps/web

  api:
    name: FastAPI — Type check, Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install -r requirements.txt --break-system-packages
        working-directory: apps/api
      - name: Type check (mypy)
        run: mypy .
        working-directory: apps/api
      - name: Test
        run: pytest --tb=short
        working-directory: apps/api
```

**Note on tests:** Vitest and PyTest are run by Claude Code, not by Prash. Prash verifies features via the Prashant Proof (browser steps). Tests are the code quality gate — the Prashant Proof is the user experience gate. Both are required.

### Pre-commit Hooks (Optional — Claude Code sets up, not Prash)

```bash
npm install --save-dev husky
npx husky init
# .husky/pre-commit: runs typecheck + lint before each commit
```

### Branch Conventions

| Branch | Purpose | Deploy target |
|---|---|---|
| `main` | Production-ready code only | Production (Render auto-deploy) |
| `staging` | Integration testing | Staging environment |
| `feature/*` | Individual features | Preview deploy (ephemeral) |
| `fix/*` | Bug fixes | Preview deploy (ephemeral) |

**Rules:**
- No direct commits to `main` — all changes via pull request
- PR requires CI pipeline to pass before merge
- Prash tests the feature branch via preview URL before approving merge

---

## 12. Observability

Observability is designed before the first route is written. Not retrofitted after the first production incident.

### What Gets Logged

Every log entry must include: `timestamp` · `level` · `service` · `action` · `actor_id` (user or system) · `result`.

**Application events (always log):**
- Auth: login, logout, failed login attempt, session invalidation
- Payments: webhook received, payment confirmed, subscription created/cancelled
- Storage: file uploaded, file deleted, signed URL generated
- Transcripts: download requested, download link generated
- Data retention: records deleted by cron job (count + timestamp)
- Errors: all unhandled exceptions with stack trace (server-side only — never expose to client)

**Never log:**
- Passwords, API keys, or session tokens (even partial)
- Full request/response bodies containing client PII
- Paddle webhook raw payload (signature header only for audit purposes)

### Logging Implementation

**TypeScript (structured JSON logs):**
```typescript
// lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  service: string
  action: string
  actorId?: string
  result: 'success' | 'failure'
  metadata?: Record<string, unknown>
}

export function log(entry: Omit<LogEntry, 'timestamp'>): void {
  const record: LogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  }
  // Output as JSON — structured for log aggregation tools
  console.log(JSON.stringify(record))
}
```

**Python:**
```python
# config/logger.py
import logging
import json
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": record.name,
            "message": record.getMessage(),
        })

logger = logging.getLogger("visaforte")
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

### Error Tracking

**Tool:** Sentry (open-source self-hostable) or Sentry cloud free tier [VERIFY current pricing]

**Integration points:**
- Next.js: `@sentry/nextjs` — captures unhandled exceptions in both server and client components
- FastAPI: `sentry-sdk[fastapi]` — captures unhandled exceptions in all routes

**Rules:**
- Error details (stack traces, context) sent to Sentry only — never returned to the client
- Client receives: generic error message + a unique error reference ID for support lookups
- PII scrubbing enabled in Sentry config — client email, name, and document content must not appear in error events

### Uptime Monitoring

**Tool:** UptimeRobot (free tier monitors 50 endpoints at 5-minute intervals) [VERIFY]

**Endpoints to monitor:**
- `GET /api/health` — application health check (returns 200 if DB and R2 are reachable)
- `GET /` — landing page availability
- Paddle webhook endpoint — confirm it is accepting connections

**Health check implementation:**
```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check DB connectivity
    await db.execute(sql`SELECT 1`)
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (error) {
    // Log internally — return minimal info externally
    log({ level: 'error', service: 'health', action: 'health_check', result: 'failure' })
    return Response.json({ status: 'error' }, { status: 503 })
  }
}
```

### Alert Thresholds

| Condition | Alert Target | Response Time |
|---|---|---|
| Uptime check fails 2× consecutively | Prash (email + SMS) | Immediate |
| Error rate exceeds 5% in 5 minutes | Prash (email) | Within 30 minutes |
| Sentry: new unhandled exception type | Prash (email) | Within 2 hours |
| Cron job (data retention) fails | Prash (email) | Within 24 hours |

---

*tech.md — Visa Forte Platform | Read-before-build reference*
