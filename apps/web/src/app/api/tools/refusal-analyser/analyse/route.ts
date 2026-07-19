// Runs the deterministic refusal-letter analysis for a paying user.
//
// PRIVACY CONTRACT (security.md — client PII): the letter text is parsed
// from the request, scored in memory, and discarded. It is never written to
// the database, never logged, and never sent to any third party. Do not add
// logging of the request body to this route.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyDownloadToken } from '@/lib/premium-download-token';
import { analyseRefusalLetter } from '@/lib/refusal-patterns';

// Must match ANALYSER_TOKEN_ID in the verify route.
const TOKEN_ID = 'refusal-analyser';

const Schema = z.object({
  letterText: z.string().min(100).max(30000),
  exp: z.number(),
  sig: z.string().min(1),
});

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
          'Paste the full text of your refusal letter (at least a few sentences).',
      },
      { status: 400 },
    );
  }

  const { letterText, exp, sig } = result.data;

  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  if (!keySecret || !verifyDownloadToken(TOKEN_ID, exp, sig, keySecret)) {
    return NextResponse.json(
      {
        error:
          'Your access link is invalid or has expired. Use the link from your purchase email, or email prashant@visaforte.com from your purchase address.',
      },
      { status: 403 },
    );
  }

  const analysis = analyseRefusalLetter(letterText);
  return NextResponse.json(analysis);
}
