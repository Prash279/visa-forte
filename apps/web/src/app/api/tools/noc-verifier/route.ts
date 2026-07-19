// NOC Code Verifier — free, ungated, fully deterministic.
// Wraps the existing lexical scorer over the bundled NOC 2021 dataset and
// returns the top 3 candidate unit groups. No Claude API call, no network,
// no storage — identical input always gives identical output. Running
// server-side keeps the 1.2 MB noc-2021.json out of the client bundle.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { retrieveCandidates } from '@/lib/noc-retrieval';
import { esdcProfileUrl } from '@/lib/noc-classify';
import { titleCaseOccupation } from '@/lib/noc-format';

const Schema = z.object({
  jobTitle: z.string().max(120).optional(),
  duties: z.string().min(30).max(3000),
});

const RESULTS_RETURNED = 3;
// A candidate scoring under half of the top hit is a different occupation,
// not an alternative reading of the same one — don't show it.
const MIN_RELATIVE_SCORE = 0.5;

export interface NocVerifierMatch {
  code: string;
  title: string;
  teer: number;
  leadStatement: string;
  mainDuties: string[];
  esdcUrl: string;
  band: 'strongest' | 'review';
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

  const { jobTitle, duties } = result.data;
  const hits = retrieveCandidates(duties, jobTitle, RESULTS_RETURNED * 2);
  const topScore = hits[0]?.score ?? 0;

  const matches: NocVerifierMatch[] = hits
    .filter((h) => h.score >= topScore * MIN_RELATIVE_SCORE && h.score > 0)
    .slice(0, RESULTS_RETURNED)
    .map((h, i) => ({
      code: h.group.code,
      title: titleCaseOccupation(h.group.title),
      teer: h.group.teer,
      leadStatement: h.group.leadStatement,
      mainDuties: h.group.mainDuties.slice(0, 4),
      esdcUrl: esdcProfileUrl(h.group.code),
      band: i === 0 ? 'strongest' : 'review',
    }));

  return NextResponse.json({ matches });
}
