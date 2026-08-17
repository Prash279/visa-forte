// Grounded NOC classification — the pure, network-free core shared by the
// /api/admin/pnp-noc route and its tests. The route adds auth, the Claude call and
// the live verification; everything testable without a network lives here.
//
// Trust boundary: Claude only ranks codes that we already retrieved from the bundled
// StatCan dataset, and it returns codes + reasoning ONLY. The authoritative TEER and
// title are joined here from the dataset — never taken from the model.

import { z } from 'zod';
import { getGroupByCode, type NocRetrievalHit } from './noc-retrieval';
import { type NocCandidate } from './pnp-eligibility';

export const RETRIEVE_TOP_K = 30;
// Admin runs (CanVisa Pro, PNP classifier) accept a larger, slower candidate
// block in exchange for a better chance the correct code is on the shortlist
// at all — Claude can only rank what retrieval surfaces. Public stays at 30.
export const ADMIN_RETRIEVE_TOP_K = 60;
export const RANKED_RETURNED = 3;

// A runner-up is only shown as a "considered match" when it is genuinely competitive:
// its own fit must clear an absolute floor AND sit within a margin of the leader's fit.
// Otherwise the leader stands alone — which is the correct signal, not manufactured doubt.
export const ALT_MIN_FIT_SCORE = 55;
export const ALT_MAX_FIT_GAP = 20;

// StatCan "Other ..." unit groups are residual catch-alls: they bundle several unrelated
// minor occupations into one sprawling duty list, which makes loose keyword overlap easy
// and lets them masquerade as a match (this is what put NOC 32109 ahead of 41404). By the
// classification rule a SPECIFIC group wins whenever its fit is comparable, so a residual
// leader is overruled by the best specific candidate within this fit margin.
export const RESIDUAL_OVER_SPECIFIC_MARGIN = 15;

// A unit group is residual when StatCan titles it as the "Other ..." bucket of its family.
function isResidualGroup(title: string): boolean {
  return /^other\b/i.test(title.trim());
}

export const NOC_CLASSIFIER_SYSTEM = `You are an expert Canadian NOC 2021 (TEER) occupational classifier for immigration documentation. A wrong NOC code is the single highest-frequency PR refusal trigger — accuracy is paramount.

You are given an applicant's DUTIES and a SHORTLIST of candidate NOC 2021 unit groups, each with its official Statistics Canada lead statement, example job titles and main duties.

Your task: choose the best-fitting unit group(s) FROM THE SHORTLIST ONLY, ranked best first, and score how well each fits.

Classification methodology — follow this order strictly:
1. From the applicant's duties, state their PRIMARY occupational function — the core work that defines the role — and separate it from incidental or secondary tasks.
2. For each candidate, judge whether its official SCOPE (lead statement + main duties) CONTAINS that primary function and the bulk of the secondary tasks. Classification is about scope of work and level of responsibility — not shared wording.
3. CRITICAL — paraphrase rule: an applicant's duties are real-world descriptions written by a consultant. They will NEVER match the Statistics Canada wording verbatim, and they are NOT supposed to. The absence of verbatim or word-for-word overlap is completely normal and must NEVER lower your confidence or your fitScore. Judge meaning and scope, never vocabulary.
4. NEVER rank by job title similarity. Titles are unreliable and often misleading.
5. Determine the correct TEER from the work actually performed and its level of responsibility: TEER 0 = senior management/executive, TEER 1 = professional (degree-level), TEER 2 = technical (diploma/apprenticeship), TEER 3 = intermediate (months of training), TEER 4 = labour (short training).
6. RESIDUAL-GROUP RULE: a candidate whose title begins with "Other" is a Statistics Canada residual catch-all — a leftover bucket that merges several unrelated minor occupations, so its duty list is long and sprawling and loose keyword overlap with it is easy and misleading. Treat a residual "Other ..." group as a LAST RESORT: rank it as the best fit ONLY when no specific (non-"Other") candidate's scope contains the applicant's primary function. Never place a residual group above a specific group whose scope fits comparably well.

For each chosen code, assign:
- fitScore: an integer 0–100 for how fully that code's official scope contains the applicant's primary function and main tasks. 100 = the code's scope is a complete, unambiguous home for these duties; ~50 = partial or generic overlap; below 40 = only loosely related. Score on semantic scope, NEVER on shared words.
- rationale: ONE sentence citing the SPECIFIC applicant duties that fall within that code's scope.

Return between 1 and 3 codes. Include a second or third code ONLY if it is a genuine alternative — do NOT pad the list with loosely-related codes to reach three. A single, clearly-correct code with no real rival is the ideal result.
Output the 5-digit code, fitScore and rationale ONLY. Do NOT output TEER or title — the system supplies the authoritative values. Choose only from the numbered candidates provided; never output a code that is not in the shortlist.

Confidence rules — judge the TOP code by scope fit, never by counting matching words:
- "high": the applicant's primary function falls cleanly and wholly inside one code's scope, the TEER is unambiguous, and no other candidate is a close rival.
- "medium": the scope fit is good but some duties sit outside it, OR the TEER needs judgement, OR one other candidate is a plausible rival.
- "low": the duties are genuinely generic, span more than one TEER, or fit two or more codes' scopes roughly equally.

Set ambiguityFlag = true only if your top two choices are genuine rivals (close fitScores) OR describe materially different kinds of work at different TEER levels.

Return ONLY a valid JSON object, no markdown fences and no commentary, in exactly this shape:
{"ranked":[{"nocCode":"#####","fitScore":0,"rationale":"..."}],"confidence":"high","ambiguityFlag":false}`;

// Build the grounding block: the real StatCan lead statement, example titles and main
// duties for each shortlisted unit group. Claude ranks against THIS, not memory.
export function buildCandidateBlock(hits: NocRetrievalHit[]): string {
  return hits
    .map((h, i) => {
      const g = h.group;
      const duties = g.mainDuties.map((d) => `  - ${d}`).join('\n');
      const examples = g.examples.slice(0, 6).join('; ');
      return `### Candidate ${i + 1} — NOC ${g.code} (TEER ${g.teer}): ${g.title}
Lead statement: ${g.leadStatement}
Example job titles: ${examples}
Main duties:
${duties}`;
    })
    .join('\n\n');
}

// The model returns codes + reasoning only — never TEER/title, which we join ourselves.
const rawSchema = z.object({
  ranked: z
    .array(
      z.object({
        nocCode: z.string(),
        rationale: z.string().min(1),
        fitScore: z.number().min(0).max(100), // 0–100 semantic fit of the duties to this code's scope
      }),
    )
    .min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  ambiguityFlag: z.boolean(),
});
export type RawClassification = z.infer<typeof rawSchema>;

// Pull the first complete, balanced JSON object out of the model's reply, even if it
// wraps the object in fences or adds commentary. String contents are skipped so braces
// inside values don't end the scan early.
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function parseRawClassification(
  modelText: string,
): RawClassification | null {
  const json = extractJsonObject(modelText);
  if (json === null) return null;
  try {
    const parsed = rawSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export interface GroundedClassification {
  nocCode: string;
  teer: number;
  title: string;
  confidence: 'high' | 'medium' | 'low';
  candidates: NocCandidate[];
  ambiguity: {
    flag: boolean;
    alternatives: { nocCode: string; teer: number; title: string }[];
  };
}

// Keep only model codes that were actually in the shortlist, join the authoritative
// title + TEER from the bundled dataset, and assemble the ranked result. Returns null
// if the model picked nothing from the shortlist.
export function groundClassification(
  raw: RawClassification,
  hits: NocRetrievalHit[],
): GroundedClassification | null {
  const scoreByCode = new Map(hits.map((h) => [h.group.code, h.score]));
  const seen = new Set<string>();
  const valid: NocCandidate[] = [];

  for (const r of raw.ranked) {
    const group = getGroupByCode(r.nocCode);
    if (!group) continue; // not a real NOC code
    if (!scoreByCode.has(r.nocCode)) continue; // not in the shortlist we supplied
    if (seen.has(r.nocCode)) continue; // de-dupe
    seen.add(r.nocCode);
    valid.push({
      nocCode: group.code,
      teer: group.teer, // authoritative — never from the model
      title: group.title,
      rationale: r.rationale,
      matchScore: Math.round(scoreByCode.get(r.nocCode) ?? 0),
      fitScore: Math.round(r.fitScore),
    });
    if (valid.length >= RANKED_RETURNED) break;
  }

  if (valid.length === 0) return null;

  // Residual-group guard: if the model led with an "Other ..." catch-all, hand the lead
  // to the best specific candidate whose fit is within RESIDUAL_OVER_SPECIFIC_MARGIN. The
  // residual group only keeps the lead when no specific group fits comparably well.
  let leaderIndex = 0;
  if (isResidualGroup(valid[0]!.title)) {
    const challenger = valid.findIndex(
      (c, i) =>
        i !== 0 &&
        !isResidualGroup(c.title) &&
        valid[0]!.fitScore - c.fitScore <= RESIDUAL_OVER_SPECIFIC_MARGIN,
    );
    if (challenger !== -1) leaderIndex = challenger;
  }

  // The leader stands; a runner-up is shown only when it is genuinely competitive.
  const winner = valid[leaderIndex]!;
  const candidates = [
    winner,
    ...valid.filter(
      (c, i) =>
        i !== leaderIndex &&
        c.fitScore >= ALT_MIN_FIT_SCORE &&
        winner.fitScore - c.fitScore <= ALT_MAX_FIT_GAP,
    ),
  ];
  const teerSpread = new Set(candidates.map((c) => c.teer)).size > 1;

  return {
    nocCode: winner.nocCode,
    teer: winner.teer,
    title: winner.title,
    confidence: raw.confidence,
    candidates,
    ambiguity: {
      flag: candidates.length > 1 && (raw.ambiguityFlag || teerSpread),
      alternatives: candidates
        .slice(1)
        .map((c) => ({ nocCode: c.nocCode, teer: c.teer, title: c.title })),
    },
  };
}

// Client-facing citation: the ESDC occupational profile for the specific code.
export function esdcProfileUrl(code: string): string {
  return `https://noc.esdc.gc.ca/OaSIS/OaSISOccProfile?GocTemplateCulture=en-CA&code=${code}.00&version=2023.0`;
}

// Lightweight server-rendered page used for the live verification fetch.
export function statcanUnitGroupUrl(code: string): string {
  return `https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVD=1322554&CVD=1322870&CPV=${code}&CST=01052021&CLV=5&MLV=5`;
}

// The ESDC NOC 2021 profile page for a unit group — the site IRCC's
// "Find your NOC" page directs applicants to. Server-rendered, contains the
// official title verbatim, and 404s for codes that do not exist.
export function esdcNocProfileUrl(code: string): string {
  return `https://noc.esdc.gc.ca/Structure/NocProfile?GocTemplateCulture=en-CA&code=${code}&version=2021.0`;
}

const VERIFY_TIMEOUT_MS = 8000;

// Honest, transparent tool identification. The Government of Canada WAF
// resets connections that claim a browser UA over a non-browser TLS
// fingerprint, while passing clearly-identified tools (the same behaviour
// this project documented for canada.ca: default curl UA passes, spoofed
// Mozilla gets reset). Never impersonate a browser here.
const VERIFY_USER_AGENT = 'VisaForteNOCVerifier/1.0 (+https://visaforte.com)';

async function pageContainsTitle(
  url: string,
  title: string,
  notes: string[],
): Promise<boolean> {
  const host = new URL(url).host;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      // Follow language/culture redirects — the final page must still carry
      // the official title.
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': VERIFY_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-CA,en;q=0.9',
      },
    });
    if (res.status !== 200) {
      notes.push(`${host} status=${res.status}`);
      return false;
    }
    const html = await res.text();
    if (html.toLowerCase().includes(title.toLowerCase())) return true;
    notes.push(`${host} 200 but title absent`);
    return false;
  } catch (err) {
    notes.push(`${host} ${err instanceof Error ? err.name : 'unknown'}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type LiveVerifySource = 'esdc' | 'statcan';

export interface LiveVerifyResult {
  source: LiveVerifySource | null;
  // One entry per failed check ("<host> status=403" / "<host> AbortError") —
  // production observability without log infrastructure.
  notes: string[];
}

// Best-effort confirmation that the winning code still exists on the official
// sources. ESDC (noc.esdc.gc.ca) is checked FIRST — it is the site IRCC
// directs applicants to — with Statistics Canada (the NOC 2021 co-publisher
// and origin of the bundled dataset) as fallback. Never throws: a
// verification hiccup must not fail the whole classification. Shared by the
// admin PNP classifier and the public NOC verifier.
export async function verifyCodeLive(
  code: string,
  title: string,
): Promise<LiveVerifyResult> {
  const notes: string[] = [];
  if (await pageContainsTitle(esdcNocProfileUrl(code), title, notes)) {
    return { source: 'esdc', notes };
  }
  if (await pageContainsTitle(statcanUnitGroupUrl(code), title, notes)) {
    return { source: 'statcan', notes };
  }
  return { source: null, notes };
}
