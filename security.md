# security.md — Visa Forte Platform: Security Implementation Guide
> Every control named here is mandatory. Not a checklist — a build contract.
> Read this file before building any endpoint, auth flow, payment handler, or data pipeline.
> Last updated: April 2026 | Owner: Prashant Thirthingoth

---

## 1. Boundary Validation (First Line of Defence)

Every external payload — API request bodies, Paddle webhooks, canada.ca responses, Claude API responses, user form submissions — must be parsed through a Zod (TypeScript) or Pydantic (Python) schema before any business logic executes.

**The rule in one sentence:** Data enters the application as `unknown`. It leaves the boundary layer as a typed, validated object. Nothing in between is negotiable.

**TypeScript implementation:**
```typescript
import { z } from 'zod'

// 1. Define the schema — this is the contract
const BookingRequestSchema = z.object({
  clientId: z.string().uuid(),
  serviceTier: z.number().int().min(1).max(8),
  slotId: z.string().uuid(),
})

// 2. At the API route boundary — parse, never cast
export async function POST(request: Request) {
  const body = await request.json() // type: unknown

  const result = BookingRequestSchema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    )
  }

  // result.data is now fully typed and validated
  // Safe to pass to service layer
  return createBooking(result.data)
}
```

**Python implementation:**
```python
from pydantic import BaseModel, UUID4
from fastapi import HTTPException

class BookingRequest(BaseModel):
    client_id: UUID4
    service_tier: int  # validated by FastAPI automatically
    slot_id: UUID4

# FastAPI parses and validates automatically when typed
@router.post("/bookings")
async def create_booking(request: BookingRequest):
    # request is already validated — safe to use
    return await booking_service.create(request)
```

---

## 2. Paddle Webhook Verification (HMAC-SHA256)

Every incoming Paddle webhook must be cryptographically verified before any business logic runs. An unverified webhook that triggers business logic is a critical security failure.

**Implementation principle:** Claude Code implements this using Node.js's built-in `crypto` module — an established, maintained standard library. No custom cryptographic functions are ever written from scratch. If a well-maintained library exists for a security operation, use it.

**Implementation pattern:**
```typescript
import crypto from 'crypto'

// In middleware.ts or the webhook route handler — runs FIRST
function verifyPaddleWebhook(
  rawBody: string,        // raw request body string — not parsed JSON
  signature: string,      // from Paddle-Signature header
  secret: string          // PADDLE_WEBHOOK_SECRET env var
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody)
  const expectedSignature = hmac.digest('hex')

  // Constant-time comparison prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: Request) {
  const rawBody = await request.text() // Must be raw string, not parsed
  const signature = request.headers.get('Paddle-Signature') ?? ''
  const secret = process.env.PADDLE_WEBHOOK_SECRET!

  if (!verifyPaddleWebhook(rawBody, signature, secret)) {
    // Reject immediately — do not log the payload details
    return new Response('Forbidden', { status: 400 })
  }

  // Signature verified — safe to parse and process
  const event = JSON.parse(rawBody)
  // ... business logic
}
```

**Critical notes:**
- Read the body as raw text (`request.text()`) — not `request.json()`. JSON parsing before HMAC verification breaks the signature check.
- Use `crypto.timingSafeEqual` — regular string comparison is vulnerable to timing attacks.
- Return HTTP 400, not 401. Do not leak information about why the request was rejected.

---

## 3. Session Invalidation (Better Auth + Next.js Middleware)

Session invalidation on account suspension must fire at the middleware layer, not at individual route handlers. A route-level check means a suspended user can still access any route that doesn't explicitly check — the middleware check means no route is ever accessible.

**Middleware implementation (`apps/web/middleware.ts`):**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await getSession(request)

  // No session — redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Session exists but account is suspended — invalidate immediately
  if (session.user.status === 'suspended') {
    // Destroy the session cookie
    const response = NextResponse.redirect(new URL('/suspended', request.url))
    response.cookies.delete('session')
    return response
  }

  return NextResponse.next()
}

// Apply to all protected routes
export const config = {
  matcher: ['/dashboard/:path*', '/portal/:path*', '/admin/:path*'],
}
```

---

## 4. Rate Limiting

All public API routes and authentication endpoints must have rate limiting enforced at the middleware layer. Rate limiting at the route handler level is too late — the request has already been processed.

**Implementation with Upstash Redis or in-memory (dev):**
```typescript
// lib/rate-limit.ts
const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,       // IP address or user ID
  limit: number,            // from constants.ts
  windowMs: number          // time window in ms
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimit.get(identifier)

  if (!entry || now > entry.resetTime) {
    rateLimit.set(identifier, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}
```

**Apply in middleware before any auth or business logic:**
```typescript
const { allowed } = checkRateLimit(
  request.ip ?? 'unknown',
  RATE_LIMIT_REQUESTS_PER_MINUTE,  // from constants.ts
  60_000
)
if (!allowed) {
  return new Response('Too Many Requests', { status: 429 })
}
```

**Note:** For production, replace the in-memory Map with Upstash Redis for distributed rate limiting across multiple server instances. The interface contract stays identical.

---

## 5. Transcript Download Flow

No direct database export of client message transcripts. Every download requires:
1. Admin initiates a download request (explicit action — not automatic)
2. System creates a signed URL with a 15-minute expiry (value from `SIGNED_URL_EXPIRY_MINUTES` in constants)
3. Signed URL generated server-side pointing to a temporary file in Cloudflare R2
4. URL delivered to admin — expires automatically
5. Download event logged with timestamp, admin ID, and client ID

```typescript
// services/transcript.ts
export async function generateTranscriptDownload(
  adminId: string,
  clientId: string
): Promise<{ signedUrl: string; expiresAt: Date }> {
  // 1. Verify admin has approval permission
  await verifyAdminRole(adminId)

  // 2. Assemble transcript from DB
  const transcript = await db.query.messages.findMany({
    where: eq(messages.clientId, clientId),
    orderBy: asc(messages.createdAt),
  })

  // 3. Write to temporary R2 object
  const key = `transcripts/temp/${clientId}-${Date.now()}.txt`
  await r2.put(key, formatTranscript(transcript))

  // 4. Generate signed URL with expiry
  const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_MINUTES * 60_000)
  const signedUrl = await r2.sign(key, { expiresIn: SIGNED_URL_EXPIRY_MINUTES * 60 })

  // 5. Log the access event
  await logAuditEvent({ adminId, clientId, action: 'transcript_download', timestamp: new Date() })

  return { signedUrl, expiresAt }
}
```

---

## 6. API Key & Secret Management

```
Rule: No secret ever appears in source code. No secret is ever logged.
```

**Environment variable loading (Python):**
```python
# config.py — load once at startup, fail loudly if missing
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    paddle_webhook_secret: str
    cloudflare_r2_access_key: str
    anthropic_api_key: str  # Server-side only

    class Config:
        env_file = '.env.local'

settings = Settings()  # Raises ValidationError at startup if any key is missing
```

**Client-facing tools (CanVisa Pro):** Claude API key is entered by the user at runtime in a local input field. It is held in React component state only for the duration of the session. It is never sent to any endpoint except `api.anthropic.com`. It is never stored in `localStorage`, `sessionStorage`, cookies, or any persistent mechanism.

---

## 7. Database Migration Discipline

```
Rule: Production database schema is changed only via Drizzle migration files.
Never via GUI, never via raw SQL executed directly.
```

**Safe workflow:**
```bash
# 1. Edit schema.ts
# 2. Generate the migration file (does not apply it yet)
npx drizzle-kit generate

# 3. Review the generated SQL in drizzle/migrations/ — read it before applying
# 4. Apply in development first
npx drizzle-kit migrate

# 5. Test thoroughly
# 6. Apply in production via the same command in the production environment
```

**Rollback discipline:** Every migration that adds a column or table must have a corresponding down migration documented in a comment. Drizzle does not auto-generate rollbacks — write them manually.

---

## 8. DPDP Compliance Automations

Three automations required. Build all three in Phase 1.

### 8.1 Plain-Language Consent Checkbox
```typescript
// Component: ConsentCheckbox.tsx
// Renders before any data collection form
export function ConsentCheckbox({ onConsent }: { onConsent: (given: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        onChange={(e) => onConsent(e.target.checked)}
        className="mt-1"
      />
      <span className="text-sm text-ink">
        I agree that Visa Forte may collect and store the information I provide
        to deliver immigration documentation services. I can request deletion
        of my data at any time from my account settings.
      </span>
    </label>
  )
}
// Consent state stored in DB with timestamp — not just a boolean
```

### 8.2 Data Minimization
Enforce at the schema level. Every column in the `clients` table must have a documented justification. If a field cannot be tied to a specific visa documentation requirement, it is not collected.

### 8.3 Automated Deletion Cron

**Implementation:** TypeScript Next.js API route (`GET /api/cron/data-retention`) called by Vercel Cron daily at 02:00 IST (20:30 UTC). No separate backend host required — all operations use existing Drizzle + `@vercel/blob` + Resend integrations already in the stack.

**Batch cap:** Processes max 20 clients per run to stay within Vercel's serverless timeout limit. Any overflow is handled on the next nightly run.

```typescript
// app/api/cron/data-retention/route.ts
// Secured by CRON_SECRET header — Vercel passes this automatically
const RETENTION_DAYS = 730  // 2 years — adjust per DPDP guidance [VERIFY]
const BATCH_SIZE = 20

export async function GET(request: Request) {
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Forbidden', { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  const expired = await db.select().from(clients)
    .where(and(eq(clients.stage, 'Archived'), lt(clients.updatedAt, cutoff)))
    .limit(BATCH_SIZE)

  for (const client of expired) {
    await del(`clients/${client.id}/`)          // Vercel Blob folder delete
    await db.delete(clients).where(eq(clients.id, client.id))  // DB cascade
    await db.insert(auditLog).values({
      event: 'client_deleted',
      actorId: 'cron',
      targetClientId: client.id,
      metadata: { reason: 'retention_policy' },
    })
  }

  if (expired.length > 0) {
    // Send summary email to Prash via Resend
  }

  log({ level: 'info', service: 'cron', action: 'data_retention', result: 'success',
        metadata: { deleted: expired.length } })

  return Response.json({ deleted: expired.length })
}
```

---

## 9. OWASP Minimum Checklist for New Endpoints

Before marking any new endpoint complete, confirm each of the following:

| Vector | Minimum Control Required |
|---|---|
| Injection | All DB queries via Drizzle ORM parameterised queries. No string-concatenated SQL. |
| Broken Auth | Middleware authentication check applies to this route. Verified — not assumed. |
| XSS | User-supplied content rendered via React (auto-escapes). No `dangerouslySetInnerHTML`. |
| IDOR | Resource ownership verified server-side before returning data. Client ID from session — not from request params. |
| Security Misconfiguration | No stack traces or internal error details in API responses. Log internally; return generic error to client. |
| Outdated Components | `[VERIFY]` tag added for any new dependency. CVE check before adding to package.json. |
| Broken Auth (sessions) | Session token rotation on privilege escalation. Invalidation on suspension fires at middleware. |
| Data Integrity | Paddle webhook HMAC-SHA256 verified. Migration files reviewed before applying. |
| Logging Failures | Auth events, payment events, transcript downloads, and deletion events all logged with timestamp and actor ID. |
| SSRF | No user-supplied URLs fetched server-side. `canada.ca` and `api.anthropic.com` are the only permitted outbound fetch targets. |

---

*security.md — Visa Forte Platform | Read-before-build reference*
