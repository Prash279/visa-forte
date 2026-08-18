import { describe, it, expect, beforeAll } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { retrieveCandidates } from './noc-retrieval';
import {
  NOC_CLASSIFIER_SYSTEM,
  NOC_MODEL,
  NOC_MAX_TOKENS,
  ADMIN_RETRIEVE_TOP_K,
  buildCandidateBlock,
  parseRawClassification,
  groundClassification,
} from './noc-classify';
import { NOC_GOLDEN_CASES, type NocGoldenCase } from './noc-golden-cases';

// The paid half of the golden corpus: the only test in this repo that measures whether
// the classifier is ACTUALLY RIGHT, rather than whether the plumbing works.
//
// OPT-IN BY DESIGN — it spends Anthropic credits (one call per case) and depends on a
// live API, so it must never run in CI or on a routine `npm test`. Run it deliberately,
// after any change to NOC_CLASSIFIER_SYSTEM, to the retrieval scoring, or to the anchors:
//
//   cd apps/web && npm run eval:noc
//
// WHAT IT PROVES, AND WHAT IT DOES NOT. It proves the model picks the right code for ten
// known duty texts. It does not prove the classifier is right in general — ten cases is a
// smoke alarm, not a guarantee. Its real value is directional: run it before and after a
// prompt change and the difference is evidence rather than opinion. Every previous prompt
// and anchor change in this file's history was shipped on reasoning alone, and two of them
// turned out to do nothing.
//
// A FAILING CASE IS NOT AUTOMATICALLY A BUG IN THE CODE. Read the model's rationale in the
// scorecard first. If the rationale is sound and the label is what is actually wrong, fix
// the label in noc-golden-cases.ts and say so in the comment — the corpus is only worth
// keeping if its answers stay defensible against the official StatCan text.

// Scored at the ADMIN shortlist size by default: that is the path a real client file takes
// through CanVisa Pro, and "can this be trusted on a live file" is the question the corpus
// exists to answer. Set NOC_EVAL_TOPK=30 to score the public tool's harder, smaller
// shortlist instead.
const TOP_K = process.env.NOC_EVAL_TOPK
  ? Number(process.env.NOC_EVAL_TOPK)
  : ADMIN_RETRIEVE_TOP_K;

const ENABLED = Boolean(process.env.NOC_LIVE_EVAL);
const CALL_TIMEOUT_MS = 900_000;

interface Scored {
  case: NocGoldenCase;
  picked: string | null;
  pickedTitle: string;
  rationale: string;
  confidence: string;
  fitScore: number;
  leadStatementMatch: boolean;
  essentialDutiesMet: boolean;
  /** Rank of the correct code in the retrieval shortlist — context for a miss. */
  retrievalRank: number;
  /** True when the correct code appeared anywhere in the model's 1–3 returned codes. */
  inReturnedSet: boolean;
  /** Why the model stopped. "max_tokens" means the reply was cut off — recorded because
   *  diagnosing that once cost two throwaway probe scripts. Adaptive thinking is billed
   *  against max_tokens, so a tiny visible answer can still hit the ceiling. */
  stopReason: string;
  outputTokens: number;
  error?: string;
}

async function scoreCase(
  anthropic: Anthropic,
  c: NocGoldenCase,
): Promise<Scored> {
  const hits = retrieveCandidates(c.duties, c.jobTitle, TOP_K);
  const retrievalRank = hits.findIndex((h) => h.group.code === c.expected) + 1;

  const base: Scored = {
    case: c,
    picked: null,
    pickedTitle: '',
    rationale: '',
    confidence: '',
    fitScore: 0,
    leadStatementMatch: false,
    essentialDutiesMet: false,
    retrievalRank,
    inReturnedSet: false,
    stopReason: '',
    outputTokens: 0,
  };

  try {
    const message = await anthropic.messages.create({
      model: NOC_MODEL,
      max_tokens: NOC_MAX_TOKENS,
      system: NOC_CLASSIFIER_SYSTEM,
      messages: [
        {
          role: 'user',
          // Byte-for-byte the user message the routes build. If this ever drifts from
          // the routes, the eval stops measuring production and starts measuring itself.
          content: `Applicant job title (context only): ${c.jobTitle || 'not provided'}\n\nApplicant duties:\n${c.duties}\n\nShortlisted candidate NOC unit groups:\n\n${buildCandidateBlock(hits)}`,
        },
      ],
    });

    const stopReason = message.stop_reason ?? 'unknown';
    const outputTokens = message.usage.output_tokens;
    const meta = { ...base, stopReason, outputTokens };

    const rawText = message.content.find((b) => b.type === 'text')?.text ?? '';
    const raw = parseRawClassification(rawText);
    if (raw === null) {
      return {
        ...meta,
        error:
          stopReason === 'max_tokens'
            ? `reply truncated at max_tokens (${outputTokens} output tokens) and salvage found no complete candidate — raise NOC_MAX_TOKENS`
            : `unparseable model reply (stop_reason=${stopReason}, ${outputTokens} output tokens)`,
      };
    }

    const grounded = groundClassification(raw, hits);
    if (grounded === null)
      return { ...meta, error: 'no shortlisted code chosen' };

    const winner = grounded.candidates[0]!;
    return {
      ...meta,
      picked: grounded.nocCode,
      pickedTitle: grounded.title,
      rationale: winner.rationale,
      confidence: grounded.confidence,
      fitScore: winner.fitScore,
      leadStatementMatch: winner.leadStatementMatch ?? false,
      essentialDutiesMet: winner.essentialDutiesMet ?? false,
      inReturnedSet: raw.ranked.some((r) => r.nocCode === c.expected),
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

describe.skipIf(!ENABLED)(
  `NOC golden corpus — live classification accuracy (top ${TOP_K}, ${NOC_MODEL})`,
  () => {
    const results = new Map<string, Scored>();

    beforeAll(async () => {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) {
        throw new Error(
          'NOC_LIVE_EVAL is set but ANTHROPIC_API_KEY is not. The eval cannot run.',
        );
      }
      const anthropic = new Anthropic({ apiKey: key });

      // Sequential on purpose. Ten calls is a couple of minutes, and firing them in
      // parallel risks a 429 that would show up as a classification failure rather
      // than as the rate limit it actually is — a false red in the one test whose
      // whole job is to be trustworthy.
      for (const c of NOC_GOLDEN_CASES) {
        results.set(c.id, await scoreCase(anthropic, c));
      }

      const rows = NOC_GOLDEN_CASES.map((c) => {
        const r = results.get(c.id)!;
        const ok =
          !r.error && [c.expected, ...(c.alsoAcceptable ?? [])].includes(r.picked ?? '');
        // "ALT " means the classifier chose an officially-defensible sibling rather than
        // the primary label — a pass, but worth seeing in the scorecard rather than
        // hidden behind a green tick.
        const mark = r.error
          ? 'ERR '
          : r.picked === c.expected
            ? 'PASS'
            : ok
              ? 'ALT '
              : 'FAIL';
        const got = r.error ?? `${r.picked} ${r.pickedTitle}`;
        return [
          `${mark}  ${c.id}`,
          `      expected ${c.expected}  got ${got}`,
          `      confidence=${r.confidence} fit=${r.fitScore} testA=${r.leadStatementMatch} testB=${r.essentialDutiesMet} retrievalRank=${r.retrievalRank || '—'} correctCodeReturned=${r.inReturnedSet}`,
          `      stop_reason=${r.stopReason} output_tokens=${r.outputTokens}${r.stopReason === 'max_tokens' ? '  ← TRUNCATED' : ''}`,
          `      rationale: ${r.rationale}`,
        ].join('\n');
      });
      const passed = NOC_GOLDEN_CASES.filter((c) => {
        const r = results.get(c.id)!;
        return (
          !r.error && [c.expected, ...(c.alsoAcceptable ?? [])].includes(r.picked ?? '')
        );
      }).length;

      process.stdout.write(
        `\n${'='.repeat(78)}\nNOC LIVE EVAL — ${passed}/${NOC_GOLDEN_CASES.length} top-1 correct ` +
          `(model ${NOC_MODEL}, shortlist ${TOP_K})\n${'='.repeat(78)}\n` +
          `${rows.join('\n\n')}\n${'='.repeat(78)}\n\n`,
      );
    }, CALL_TIMEOUT_MS);

    it.each(NOC_GOLDEN_CASES)('$id → picks NOC $expected', (c) => {
      const r = results.get(c.id)!;
      expect(
        r.error,
        `API/parse failure, not a classification result`,
      ).toBeUndefined();
      const allowed = [c.expected, ...(c.alsoAcceptable ?? [])];
      expect(
        allowed,
        `Expected ${allowed.join(' or ')} but got ${r.picked} (${r.pickedTitle}).\n` +
          `The correct code was at retrieval rank ${r.retrievalRank || 'ABSENT'} of ${TOP_K}, ` +
          `so this is a ${r.retrievalRank ? 'RANKING' : 'RECALL'} failure.\n` +
          `Model rationale: ${r.rationale}\n` +
          `Trap this case guards: ${c.trap}\n` +
          `Why ${c.expected} is correct: ${c.why}`,
      ).toContain(r.picked);
    });
  },
);

// Guard against the eval quietly becoming a no-op. describe.skipIf reports skipped suites
// as passing, so a typo'd env var or a deleted corpus would look like a green run forever.
// This assertion always runs and states, in the test name, which mode you are in.
describe('NOC live eval wiring', () => {
  it(`is ${ENABLED ? 'ENABLED (spending credits)' : 'DISABLED (set NOC_LIVE_EVAL=1 to score)'} over a non-empty corpus`, () => {
    expect(NOC_GOLDEN_CASES.length).toBeGreaterThan(0);
  });
});
