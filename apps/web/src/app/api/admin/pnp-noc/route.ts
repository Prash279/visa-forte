import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { retrieveCandidates } from '@/lib/noc-retrieval';
import {
  NOC_CLASSIFIER_SYSTEM,
  NOC_MODEL,
  NOC_MAX_TOKENS,
  ADMIN_RETRIEVE_TOP_K,
  buildCandidateBlock,
  parseRawClassification,
  groundClassification,
  esdcProfileUrl,
  verifyCodeLive,
} from '@/lib/noc-classify';
import { type NocClassification } from '@/lib/pnp-eligibility';

// Grounded duties -> NOC classifier. Retrieval narrows the 516 official NOC 2021 unit
// groups to a shortlist; Claude (with extended thinking) ranks the shortlist against
// their REAL StatCan duties; the winner's code is then verified live. TEER and title
// are joined from the bundled dataset server-side — never trusted from the model.
export const maxDuration = 60;

const ADMIN_EMAIL = 'prashant@visaforte.com';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

const requestSchema = z.object({
  occupationTitle: z.string().max(200).optional(),
  jobDuties: z
    .string()
    .min(
      20,
      'Provide a detailed description of the job duties (at least a sentence or two).',
    )
    .max(8000),
  manualNocHint: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),
});

// POST /api/admin/pnp-noc  Body: { occupationTitle?, jobDuties }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 },
      );
    }
    const { occupationTitle, jobDuties, manualNocHint } = parsed.data;

    // 1) Retrieval: narrow 516 unit groups to a grounded shortlist. Admin runs
    // use the wider shortlist — a paid, accuracy-critical assessment can afford
    // the larger candidate block; the correct code has to be on the list before
    // Claude can rank it.
    const hits = retrieveCandidates(
      jobDuties,
      occupationTitle,
      ADMIN_RETRIEVE_TOP_K,
    );
    if (hits.length === 0) {
      return NextResponse.json(
        {
          error:
            'The duties did not match any occupation. Add more concrete, task-level detail.',
        },
        { status: 422 },
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('PNP NOC classifier: ANTHROPIC_API_KEY is not configured.');
      return NextResponse.json(
        {
          error:
            'The NOC classifier is not configured. Add ANTHROPIC_API_KEY and retry.',
        },
        { status: 503 },
      );
    }

    // 2) Claude ranks the shortlist against the candidates' real StatCan duties.
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: NOC_MODEL,
      max_tokens: NOC_MAX_TOKENS,
      system: NOC_CLASSIFIER_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Applicant job title (context only): ${occupationTitle || 'not provided'}\n\nApplicant duties:\n${jobDuties}\n\nShortlisted candidate NOC unit groups:\n\n${buildCandidateBlock(hits)}`,
        },
      ],
    });

    const rawText = message.content.find((b) => b.type === 'text')?.text ?? '';
    const raw = parseRawClassification(rawText);
    if (raw === null) {
      return NextResponse.json(
        { error: 'Classifier returned malformed output.' },
        { status: 502 },
      );
    }

    // No anchor override. Domain anchors now place their codes at the FRONT of the
    // shortlist so a rescued code is read first rather than last; forcing it to win as
    // well could demote a correctly-ranked answer. Ranking is the model's, judged
    // against the IRPR s.80(3) test, and gated deterministically in groundClassification.

    // 3) Ground: keep only shortlisted codes, join authoritative TEER + title.
    const grounded = groundClassification(raw, hits);
    if (grounded === null) {
      return NextResponse.json(
        { error: 'Classifier did not choose a code from the shortlist.' },
        { status: 502 },
      );
    }

    // 4) Verify the winning code live against the official sources (ESDC
    // first, StatCan fallback).
    const verified =
      (await verifyCodeLive(grounded.nocCode, grounded.title)).source !== null;

    const classification: NocClassification = {
      ...grounded,
      citationUrl: esdcProfileUrl(grounded.nocCode),
      verified,
      ...(manualNocHint && manualNocHint !== grounded.nocCode
        ? {
            nocOverrideConflict: {
              yourSelection: manualNocHint,
              correctedTo: grounded.nocCode,
            },
          }
        : {}),
    };
    return NextResponse.json(classification);
  } catch (error: unknown) {
    const messageText =
      error instanceof Error ? error.message : 'NOC classification failed';
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
