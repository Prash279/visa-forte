import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { retrieveCandidates, getAnchoredCodes } from '@/lib/noc-retrieval';
import {
  NOC_CLASSIFIER_SYSTEM,
  RETRIEVE_TOP_K,
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

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const THINKING_BUDGET = 2048;
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

    // 1) Retrieval: narrow 516 unit groups to a grounded shortlist.
    const hits = retrieveCandidates(jobDuties, occupationTitle, RETRIEVE_TOP_K);
    if (hits.length === 0) {
      return NextResponse.json(
        {
          error:
            'The duties did not match any occupation. Add more concrete, task-level detail.',
        },
        { status: 422 },
      );
    }

    // 2) Claude ranks the shortlist against the candidates' real StatCan duties.
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'enabled', budget_tokens: THINKING_BUDGET },
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

    // Anchor-wins: when a domain anchor fired and Claude ranked the anchor code (even
    // not first), promote it to winner. The anchor only fires for vocabulary-gap
    // occupations where TF-IDF cannot surface the correct code; Claude acknowledging
    // the anchor code in its ranked list is evidence of meaningful fit — it wins.
    const anchoredCodes = getAnchoredCodes(jobDuties, occupationTitle);
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

    // 3) Ground: keep only shortlisted codes, join authoritative TEER + title.
    const grounded = groundClassification(raw, hits);
    if (grounded === null) {
      return NextResponse.json(
        { error: 'Classifier did not choose a code from the shortlist.' },
        { status: 502 },
      );
    }

    // 4) Verify the winning code live against the official StatCan page.
    const verified = await verifyCodeLive(grounded.nocCode, grounded.title);

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
