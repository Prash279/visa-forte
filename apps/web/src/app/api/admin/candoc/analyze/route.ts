import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import {
  candocReviews,
  clientDocuments,
} from '../../../../../../drizzle/schema';
import { getCurrentAuthSession } from '@/lib/auth-server';
import { parseFindings } from '@/lib/candoc-types';
import { computeDiff } from '@/lib/candoc-diff';

export const maxDuration = 120;

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession();
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

const SOP_SYSTEM_PROMPT = `You are an expert Canadian immigration document reviewer. You review client documents against IRCC SOP requirements for Express Entry applications.
Return ONLY valid JSON — no markdown fences, no explanation, just the JSON object.`;

function buildSopPrompt(clientId: string, version: number): string {
  return `Review all provided documents against these 17 SOP layers:

S0 - Client Profile Baseline: Name, DOB, passport number consistent across all documents.
S1 - Express Entry Profile: NOC code, TEER level, pool entry date, ITA date if present.
S2 - NOC Verification: Duties letter must match the claimed NOC TEER description exactly.
S3 - Language Tests: IELTS/CELPIP/TEF/TCF/PTE Core results, valid to e-APR submission date (not ITA date). IELTS GT only (not Academic unless ECA requires it). PTE Core only (not Academic). CELPIP General only.
S4 - ECA: Evaluated by designated body (WES, ICAS, etc.), valid 5 years from issue date (not from ITA date).
S5 - Employment History: Each job needs reference letter on letterhead with duties, dates, salary, supervisor signature. Duties must align with claimed NOC TEER description.
S6 - Proof of Funds: CAD liquid assets per current IRCC table. Bank statement dated within 6 months of e-APR.
S7 - Passport: Valid for at least 18 months beyond intended landing. All pages clear and legible.
S8 - Police Clearance Certificate: From every country lived in 6+ months in the last 10 years. Issued within 6 months of e-APR submission.
S9 - Medical Examination: Completed by IRCC-designated panel physician. Valid 12 months from exam date.
S10 - Civil Status: Marriage certificate / divorce decree / death certificate as applicable.
S11 - Dependent Children: Birth certificate for each dependent child under 22.
S12 - Photos: Digital upload for e-APR; IRCC digital photo specifications apply.
S13 - Forms: IMM 0008, IMM 5669, IMM 5406, IMM 5562 (if applicable) — all signed, no blanks.
S14 - Fees: RPRF receipt, biometrics fee receipt, application processing fee receipt.
S15 - Consistency Review: Name, DOB, nationality consistent across ALL documents. No date overlaps in employment or travel history.
S16 - Biometrics: Enrollment confirmation if applicable (valid 10 years for adults 14-79).

Return this exact JSON (no other text):
{
  "reviewedAt": "<ISO 8601 timestamp>",
  "clientId": "${clientId}",
  "version": ${version},
  "sopLayers": [
    {
      "layer": "S0",
      "layerName": "Client Profile Baseline",
      "status": "pass|gap|missing|partial",
      "findings": [
        {
          "id": "S0-001",
          "severity": "info|minor|major|critical",
          "description": "<specific issue>",
          "documentRef": "<filename or 'Not provided'>",
          "suggestedAction": "<what to do>"
        }
      ]
    }
  ],
  "overallRiskLevel": "clear|minor|major|critical",
  "totalGaps": <count of layers where status != "pass">
}`;
}

function inferContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return map[ext] ?? 'image/jpeg';
}

// POST /api/admin/candoc/analyze
// Body: { reviewId: string }
// Fetches all client documents, calls Claude Vision, stores rawFindings with diff markers.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin();
  if (deny) return deny;

  let reviewId: string | undefined;

  try {
    const body = (await req.json()) as { reviewId: string };
    reviewId = body.reviewId;
    if (!reviewId) {
      return NextResponse.json(
        { error: 'reviewId is required' },
        { status: 400 },
      );
    }

    const [review] = await db
      .select()
      .from(candocReviews)
      .where(eq(candocReviews.id, reviewId));
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    if (review.status !== 'pending') {
      return NextResponse.json(
        { error: `Review is already ${review.status}` },
        { status: 409 },
      );
    }

    await db
      .update(candocReviews)
      .set({ status: 'analyzing', updatedAt: new Date() })
      .where(eq(candocReviews.id, reviewId));

    const docs = await db
      .select()
      .from(clientDocuments)
      .where(eq(clientDocuments.clientId, review.clientId));

    const contentBlocks = await Promise.all(
      docs.map(
        async (
          doc,
        ): Promise<
          | Anthropic.Messages.ImageBlockParam
          | Anthropic.Messages.DocumentBlockParam
        > => {
          const res = await fetch(doc.blobUrl, {
            headers: {
              Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
            },
          });
          if (!res.ok)
            throw new Error(
              `Failed to fetch ${doc.filename}: ${res.statusText}`,
            );
          const contentType =
            res.headers.get('content-type') ?? inferContentType(doc.filename);
          const base64 = Buffer.from(await res.arrayBuffer()).toString(
            'base64',
          );
          if (contentType.includes('pdf')) {
            return {
              type: 'document' as const,
              source: {
                type: 'base64' as const,
                media_type: 'application/pdf' as const,
                data: base64,
              },
            };
          }
          return {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type:
                contentType as Anthropic.Messages.Base64ImageSource['media_type'],
              data: base64,
            },
          };
        },
      ),
    );

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SOP_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            ...contentBlocks,
            {
              type: 'text' as const,
              text: buildSopPrompt(review.clientId, review.version),
            },
          ],
        },
      ],
    });

    const rawText = message.content.find((b) => b.type === 'text')?.text ?? '';
    const jsonText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    let parsed = parseFindings(JSON.parse(jsonText));

    if (review.version > 1) {
      const [prevReview] = await db
        .select({ rawFindings: candocReviews.rawFindings })
        .from(candocReviews)
        .where(eq(candocReviews.clientId, review.clientId))
        .orderBy(desc(candocReviews.version))
        .offset(1)
        .limit(1);

      if (prevReview?.rawFindings) {
        const prevParsed = parseFindings(prevReview.rawFindings);
        parsed = computeDiff(prevParsed, parsed);
      }
    }

    await db
      .update(candocReviews)
      .set({
        status: 'analyzed',
        rawFindings: parsed,
        analyzedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(candocReviews.id, reviewId));

    return NextResponse.json({ ok: true, version: review.version });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    if (reviewId) {
      await db
        .update(candocReviews)
        .set({ status: 'error', errorMessage: message, updatedAt: new Date() })
        .where(eq(candocReviews.id, reviewId));
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
