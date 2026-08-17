// NOC Code Verifier — public, free, accuracy-first.
//
// Three-stage pipeline, identical in architecture to the admin PNP
// classifier (the proven pipeline in this codebase):
//   1. Deterministic TF-IDF retrieval narrows the 516 official NOC 2021 unit
//      groups to a shortlist (noc-2021.json stays server-side — 1.2 MB never
//      enters the client bundle).
//   2. Claude ranks the shortlist against each group's REAL StatCan lead
//      statement and main duties — judging scope and meaning, not shared
//      vocabulary. The model can only choose codes from the shortlist;
//      TEER and title are joined from the bundled dataset, never trusted
//      from the model.
//   3. The winning code is live-verified against the official Statistics
//      Canada page.
//
// History: this route originally shipped as retrieval-only (RT-4 spec said
// "no Claude API call"). A real "Data Science Engineer" input scored Civil
// Engineers first — the recall layer alone cannot bridge résumé vocabulary
// vs StatCan vocabulary. Prash overrode the spec on 2026-07-19: accuracy
// over per-call cost. If Claude is unreachable the route degrades to the
// lexical top-3, explicitly labelled method:"lexical" so the UI shows a
// caution instead of presenting keyword matches as the answer.

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { toolRateLimits } from '../../../../../drizzle/schema';
import {
  retrieveCandidates,
  getAnchoredCodes,
  getGroupByCode,
} from '@/lib/noc-retrieval';
import type { NocRetrievalHit } from '@/lib/noc-retrieval';
import {
  NOC_CLASSIFIER_SYSTEM,
  RETRIEVE_TOP_K,
  ADMIN_RETRIEVE_TOP_K,
  buildCandidateBlock,
  parseRawClassification,
  groundClassification,
  esdcProfileUrl,
  verifyCodeLive,
} from '@/lib/noc-classify';
import { titleCaseOccupation } from '@/lib/noc-format';
import { getCurrentAuthSession } from '@/lib/auth-server';

export const maxDuration = 60;

// Same model configuration as the admin classifier — proven accurate there.
// Sonnet 5 thinks adaptively and has no `thinking` parameter to set: extended
// thinking with an explicit budget is not supported on this model, so the
// ranking call below passes no thinking block at all.
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 4096;

// Durable per-IP limiter backed by Postgres (tool_rate_limits). The previous
// in-memory Map reset on every serverless cold start and never spanned
// instances, so a scripted caller effectively had no limit — on an endpoint
// that spends Anthropic credits per request. One atomic upsert per request:
// the first hit in a window stamps it; an expired window resets in place.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

// The admin's own CanVisa Pro sessions embed this same matcher while preparing
// client files, and that work must never eat into the public tool's hourly
// budget. Same identity check the admin routes use; a failed/absent session
// simply falls through to the normal public limit.
const ADMIN_EMAIL = 'prashant@visaforte.com';

async function isAdminSession(): Promise<boolean> {
  const session = await getCurrentAuthSession();
  return Boolean(session?.session) && session?.user?.email === ADMIN_EMAIL;
}

// Only a one-way hash of the IP is ever stored — never the raw IP (privacy gate).
function rateLimitKey(ip: string): string {
  return createHash('sha256').update(`noc-verifier:${ip}`).digest('hex');
}

async function rateLimited(ip: string): Promise<boolean> {
  const windowFloor = new Date(Date.now() - RATE_WINDOW_MS);
  const expired = sql`${toolRateLimits.windowStart} < ${windowFloor}`;
  const [row] = await db
    .insert(toolRateLimits)
    .values({ key: rateLimitKey(ip), count: 1 })
    .onConflictDoUpdate({
      target: toolRateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${toolRateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${toolRateLimits.windowStart} end`,
      },
    })
    .returning({ count: toolRateLimits.count });
  return (row?.count ?? 0) > RATE_LIMIT;
}

const Schema = z.object({
  jobTitle: z.string().max(120).optional(),
  duties: z.string().min(30).max(3000),
  // When true, the response includes verifyNotes (upstream host + status for
  // failed live checks). Harmless to expose; exists so verification failures
  // in the serverless environment can be diagnosed without log infrastructure.
  debug: z.boolean().optional(),
});

// Keep candidates scoring under half of the top lexical hit out of the
// fallback view — they are different occupations, not alternatives.
const LEXICAL_RESULTS = 3;
const MIN_RELATIVE_SCORE = 0.5;

interface VerifierMatch {
  code: string;
  title: string;
  teer: number;
  leadStatement: string;
  mainDuties: string[];
  esdcUrl: string;
  band: 'strongest' | 'review';
  rationale?: string;
  fitScore?: number;
}

interface VerifierResponse {
  method: 'ai' | 'lexical';
  confidence?: 'high' | 'medium' | 'low';
  // Which official source confirmed the winning code live: the ESDC NOC site
  // (noc.esdc.gc.ca — where IRCC directs applicants) or Statistics Canada
  // (NOC 2021 co-publisher, fallback). null = verification unavailable.
  verifiedSource?: 'esdc' | 'statcan' | null;
  verifyNotes?: string[];
  matches: VerifierMatch[];
}

function toMatch(
  code: string,
  band: 'strongest' | 'review',
  extras: { rationale?: string; fitScore?: number } = {},
): VerifierMatch | null {
  const group = getGroupByCode(code);
  if (!group) return null;
  return {
    code: group.code,
    title: titleCaseOccupation(group.title),
    teer: group.teer,
    leadStatement: group.leadStatement,
    mainDuties: group.mainDuties.slice(0, 4),
    esdcUrl: esdcProfileUrl(group.code),
    band,
    ...extras,
  };
}

function lexicalFallback(hits: NocRetrievalHit[]): VerifierResponse {
  const topScore = hits[0]?.score ?? 0;
  const matches = hits
    .filter((h) => h.score >= topScore * MIN_RELATIVE_SCORE && h.score > 0)
    .slice(0, LEXICAL_RESULTS)
    // Keyword order is not a ranking. Raw TF-IDF puts "Civil engineers" first for
    // data-science duties, so promoting hit #1 to "Strongest match" would give the
    // wrong code the badge and the highlight while the caution says the opposite.
    // Everything in degraded mode is a candidate to review, nothing more.
    .map((h) => toMatch(h.group.code, 'review'))
    .filter((m): m is VerifierMatch => m !== null);
  return { method: 'lexical', matches };
}

async function aiRank(
  duties: string,
  jobTitle: string | undefined,
  hits: NocRetrievalHit[],
): Promise<VerifierResponse | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('NOC verifier: ANTHROPIC_API_KEY is not configured.');
    return null;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: NOC_CLASSIFIER_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Applicant job title (context only): ${jobTitle || 'not provided'}\n\nApplicant duties:\n${duties}\n\nShortlisted candidate NOC unit groups:\n\n${buildCandidateBlock(hits)}`,
      },
    ],
  });

  const rawText = message.content.find((b) => b.type === 'text')?.text ?? '';
  const raw = parseRawClassification(rawText);
  if (raw === null) return null;

  // Anchor-wins (same rule as the admin classifier): when a domain anchor
  // fired for vocabulary-gap occupations and Claude ranked the anchor code at
  // all, it wins — the anchor exists precisely because TF-IDF cannot surface
  // these codes on wording.
  const anchoredCodes = getAnchoredCodes(duties, jobTitle);
  if (anchoredCodes.length > 0) {
    const anchorRank = raw.ranked.find((r) =>
      anchoredCodes.includes(r.nocCode),
    );
    if (anchorRank) {
      raw.ranked = [
        anchorRank,
        ...raw.ranked.filter((r) => r.nocCode !== anchorRank.nocCode),
      ];
    }
  }

  const grounded = groundClassification(raw, hits);
  if (grounded === null) return null;

  const liveVerify = await verifyCodeLive(grounded.nocCode, grounded.title);

  const matches = grounded.candidates
    .map((c, i) =>
      toMatch(c.nocCode, i === 0 ? 'strongest' : 'review', {
        rationale: c.rationale,
        fitScore: c.fitScore,
      }),
    )
    .filter((m): m is VerifierMatch => m !== null);

  return {
    method: 'ai',
    confidence: grounded.confidence,
    verifiedSource: liveVerify.source,
    verifyNotes: liveVerify.notes,
    matches,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const result = Schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error:
          'Describe your duties in at least 30 characters — the more specific the duties, the better the match.',
      },
      { status: 400 },
    );
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const admin = await isAdminSession();
  if (!admin && (await rateLimited(ip))) {
    return NextResponse.json(
      {
        error:
          'Too many checks from this connection — please try again in an hour.',
      },
      { status: 429 },
    );
  }

  const { jobTitle, duties, debug } = result.data;
  const topK = admin ? ADMIN_RETRIEVE_TOP_K : RETRIEVE_TOP_K;
  const hits = retrieveCandidates(duties, jobTitle, topK);
  if (hits.length === 0) {
    if (admin) {
      return NextResponse.json(
        {
          error:
            'The duties did not match any occupation. Add more concrete, task-level detail.',
        },
        { status: 422 },
      );
    }
    return NextResponse.json({
      method: 'lexical',
      matches: [],
    } satisfies VerifierResponse);
  }

  // Admin runs are a paid, accuracy-critical assessment — a keyword-only result
  // presented with the same confidence as an AI ranking would be an invisible
  // downgrade on a real client file. Admin gets a clear retry error instead of
  // the public degraded mode.
  if (admin) {
    try {
      const aiResult = await aiRank(duties, jobTitle, hits);
      if (aiResult !== null) {
        if (!debug) delete aiResult.verifyNotes;
        return NextResponse.json(aiResult);
      }
      return NextResponse.json(
        {
          error:
            'The NOC classifier could not produce a verified result. Please retry.',
        },
        { status: 503 },
      );
    } catch (err) {
      console.error('NOC verifier (admin) AI ranking failed:', err);
      return NextResponse.json(
        {
          error: 'The NOC classifier is temporarily unavailable. Please retry.',
        },
        { status: 503 },
      );
    }
  }

  try {
    const aiResult = await aiRank(duties, jobTitle, hits);
    if (aiResult !== null) {
      if (!debug) delete aiResult.verifyNotes;
      return NextResponse.json(aiResult);
    }
  } catch (err) {
    console.error(
      'NOC verifier AI ranking failed, falling back to lexical:',
      err,
    );
  }

  return NextResponse.json(lexicalFallback(hits));
}
