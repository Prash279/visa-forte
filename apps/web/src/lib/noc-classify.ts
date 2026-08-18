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

// A unit group is residual when StatCan titles it as the "Other ..." bucket of its
// family. This matches the published convention: StatCan states that a unit group
// ending in 9 classifies occupations a grouping does not otherwise account for, and
// that these are "identified in their title by 'Other' appearing at the beginning of
// the title" (NOC 2021 V1.0 introduction, statcan.gc.ca, modified 2023-09-14).
function isResidualGroup(title: string): boolean {
  return /^other\b/i.test(title.trim());
}

// The binding legal test, quoted from the Regulations rather than paraphrased. IRCC's
// plain-language pages summarise this; the Regulations are what an officer applies.
// Verified live against laws-lois.justice.gc.ca on 2026-08-18 (all sections HTTP 200,
// text current to 2026-05-26). Identical two-part wording appears three times:
//   IRPR s.75(2)(b)-(c)   — Federal Skilled Worker
//   IRPR s.87.1(2)(b)-(c) — Canadian Experience Class
//   IRPR s.80(3)(a)-(b)   — general skilled-worker experience definition
// One test, applied by three programmes — so one implementation, used by every route.
//
// SCOPE NOTE on the employment-requirements clause: the words "regardless of whether
// they meet the employment requirements" appear in s.80(3), which opens "For the
// purposes of subsection (1)" — the FSW selection-grid experience points. s.75(2) and
// s.87.1(2) state the same two limbs WITHOUT that clause. So the clause is not
// textually general, but nothing in s.75(2)/s.87.1(2) makes NOC employment requirements
// a condition either, and Statistics Canada independently states that an occupation's
// TEER requirements "may differ from personal educational levels". Treating credentials
// as irrelevant to code choice is therefore sound; do not cite s.80(3) as if it governed
// CEC eligibility directly.
export const STATUTORY_DUTY_TEST = {
  citation: 'IRPR s.75(2)(b)-(c), s.87.1(2)(b)-(c), s.80(3)',
  sourceUrl:
    'https://laws-lois.justice.gc.ca/eng/regulations/SOR-2002-227/section-80.html',
  // All three sections fetched and read in full on this date (HTTP 200, text current
  // to 2026-05-26). IRPA s.40 and the StatCan TEER table were verified the same day.
  verifiedOn: '2026-08-18',
  // s.80(3), verbatim — the cleanest statement of the test, and the only one that
  // also disposes of employment requirements.
  text: 'a skilled worker is considered to have experience in an occupation, regardless of whether they meet the employment requirements of the occupation as set out in the occupational descriptions of the National Occupational Classification, if they performed (a) the actions described in the lead statement for the occupation as set out in the occupational descriptions of the National Occupational Classification; and (b) at least a substantial number of the main duties of the occupation as set out in the occupational descriptions of the National Occupational Classification, including all the essential duties.',
} as const;

export const NOC_CLASSIFIER_SYSTEM = `You are assessing a Canadian NOC 2021 (TEER) occupational classification exactly as an IRCC officer would. A wrong NOC code is the single highest-frequency PR refusal trigger, and an overstated one is a misrepresentation risk under IRPA s.40, which turns on withholding or misstating "material facts relating to a relevant matter that induces or could induce an error in the administration of this Act" — the provision contains no intent element on its face. Accuracy in both directions is paramount: never inflate, never hedge downward.

You are given an applicant's DUTIES and a SHORTLIST of candidate NOC 2021 unit groups, each with its official Statistics Canada lead statement and numbered main duties.

THE LEGAL TEST — this is the whole assessment. Apply it, nothing else.
Under IRPR s.80(3) (identically worded at s.75(2)(b)-(c) for FSW and s.87.1(2)(b)-(c) for CEC), an applicant has experience in an occupation if and only if they performed:
  TEST A — the actions described in that occupation's LEAD STATEMENT; AND
  TEST B — at least a substantial number of that occupation's MAIN DUTIES, INCLUDING ALL OF THE ESSENTIAL DUTIES.
Both limbs must pass. A candidate that fails Test A cannot be the answer no matter how many main duties overlap. A candidate missing an essential duty fails Test B even if the remaining duty overlap is large.

How to apply it:
1. From the applicant's duties, state their PRIMARY occupational function — the core work that defines the role — separately from incidental or secondary tasks. You are identifying the single code that these duties describe, never blending several roles into an average. (Under FSW the applicant must name ONE primary occupation, IRPR s.75(2)(a); under CEC experience may span more than one NOC, IRPR s.87.1(2)(a). Either way each block of duties resolves to one code, which is what you are choosing here.)
2. TEST A: does the candidate's lead statement describe what this person actually did, as their own work? Judge the described function, not the wording.
3. TEST B: go through that candidate's numbered main duties and count how many the applicant demonstrably performed. Then identify which of those duties are ESSENTIAL — the duties without which the lead statement's core function could not be carried out. Statistics Canada does not label essential duties; duties phrased as optional ("may perform...", "may supervise...") are not essential, while duties that define the occupation are. If the applicant did not perform an essential duty, essentialDutiesMet is false.
4. EMPLOYMENT REQUIREMENTS ARE IRRELEVANT. IRPR s.80(3) states the test applies "regardless of whether they meet the employment requirements of the occupation." The applicant's degree, diploma, certification or lack of one has NO bearing on which code fits. Never reason "this applicant has a bachelor's degree, so a degree-level code fits" — that is a legal error, and it is the single most common way a classification gets inflated by one TEER.
5. NO PERCENTAGE THRESHOLD EXISTS. "Substantial number" is not defined numerically anywhere in the Regulations or in IRCC guidance. Do not apply a fixed cutoff such as 60% or 80%. Judge whether the duties performed represent a substantial part of that occupation's actual work.
6. NEVER classify on job titles. Example job titles are supplied as context only and are the most misleading field in the NOC. A code whose example titles match the applicant's job title but whose main duties do not is the WRONG code — this is precisely how classifications go wrong.
7. CANDIDATE ORDER CARRIES NO INFORMATION. The shortlist is numbered only for reference. It is produced by a keyword search that is frequently wrong at the top, and the correct code often sits far down the list. Assess every candidate on the legal test independently. Never treat a lower number as evidence of a better fit.
8. TEER is a property of the OCCUPATION, never of the applicant. Statistics Canada defines each category by the training, education, experience and responsibilities the occupation requires, and states explicitly that these "may differ from personal educational levels". Assign the TEER belonging to the code whose duties fit; never reason from the applicant's own qualifications. The official categories:
   TEER 0 — management occupations (all management, not only senior or executive roles).
   TEER 1 — completion of a university degree (bachelor's, master's or doctorate); or previous experience and subject-matter expertise from a related TEER 2 occupation.
   TEER 2 — a two-to-three-year college/CEGEP or institute-of-technology program; or a two-to-five-year apprenticeship; or occupations with supervisory or significant safety responsibilities; or several years of experience in a related TEER 3 occupation.
   TEER 3 — a college program of less than two years; or an apprenticeship of less than two years; or more than six months of on-the-job training with some secondary school; or several years in a related TEER 4 occupation.
   TEER 4 — completion of secondary school; or several weeks of on-the-job training; or experience in a related TEER 5 occupation.
   TEER 5 — short work demonstration and no formal educational requirements.
9. SIBLING RULE: when two candidates sit in the same TEER and the same occupational family, they will share most of their vocabulary and the choice between them is the real decision. Your rationale must name at least one duty that is present in the winner's official duty list and absent from the runner-up's.
10. RESIDUAL-GROUP RULE: a candidate whose title begins with "Other" is a Statistics Canada residual catch-all merging several unrelated minor occupations, so its duty list is sprawling and loose overlap with it is easy. Treat it as a LAST RESORT — rank it best only when no specific (non-"Other") candidate passes the legal test.
11. PARAPHRASE RULE: the applicant's duties are real-world descriptions. They will NEVER match the Statistics Canada wording verbatim and are not supposed to. Absence of word-for-word overlap must NEVER lower your assessment. Judge what was done, never how it was worded.

For each code you return, output:
- leadStatementMatch: true if Test A passes.
- essentialDutiesMet: true if the applicant performed all of that code's essential duties.
- mainDutiesMatched: the integer COUNT of that code's numbered main duties the applicant demonstrably performed.
- fitScore: integer 0–100, the share of that code's main duties the applicant demonstrably performed. This is a coverage measure, not a vibe — it should be consistent with mainDutiesMatched divided by the number of duties listed for that code.
- rationale: ONE sentence citing the SPECIFIC applicant duties that satisfy the lead statement and the matched main duties.

Return between 1 and 3 codes, best first. Include a second or third ONLY if it is a genuine alternative — never pad the list. A single clearly-correct code with no rival is the ideal result. Output the 5-digit code and the fields above ONLY. Do NOT output TEER or title — the system supplies the authoritative values. Choose only from the numbered candidates provided.

Confidence, judged on the top code:
- "high": both limbs of the test pass cleanly, the TEER is unambiguous, and no other candidate is a close rival.
- "medium": the test passes but some duties sit outside the code, OR the TEER needs judgement, OR one other candidate is a plausible rival.
- "low": the duties are genuinely generic, span more than one TEER, or two or more codes pass the test roughly equally.

Set ambiguityFlag = true only if your top two choices are genuine rivals or describe materially different work at different TEER levels.

Return ONLY a valid JSON object, no markdown fences and no commentary, in exactly this shape:
{"ranked":[{"nocCode":"#####","leadStatementMatch":true,"essentialDutiesMet":true,"mainDutiesMatched":0,"fitScore":0,"rationale":"..."}],"confidence":"high","ambiguityFlag":false}`;

// Build the grounding block: the real StatCan lead statement and main duties for each
// shortlisted unit group. The model applies the legal test against THIS, not memory.
//
// Field order is deliberate and mirrors the statutory test: lead statement (Test A)
// first, numbered main duties (Test B) second, example job titles LAST and explicitly
// marked context-only. Titles used to sit between the two duty-bearing fields, in the
// most prominent slot in the block, while the prompt told the model to ignore them —
// the layout was arguing against the instruction. Numbering the duties lets the model
// count coverage and lets a reviewer check the count against the source.
//
// employmentRequirements is deliberately never included: IRPR s.80(3) makes it
// irrelevant to whether experience counts in an occupation.
export function buildCandidateBlock(hits: NocRetrievalHit[]): string {
  return hits
    .map((h, i) => {
      const g = h.group;
      const duties = g.mainDuties.map((d, n) => `  ${n + 1}. ${d}`).join('\n');
      const examples = g.examples.slice(0, 6).join('; ');
      return `### Candidate ${i + 1} — NOC ${g.code} (TEER ${g.teer}): ${g.title}
Lead statement (Test A): ${g.leadStatement}
Main duties (Test B) — ${g.mainDuties.length} listed:
${duties}
Example job titles (CONTEXT ONLY — never classify on these): ${examples}`;
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
        fitScore: z.number().min(0).max(100), // share of this code's main duties evidenced
        // The two limbs of the IRPR test, reported per candidate so the result is
        // auditable rather than a bare verdict. Defaulted permissively: an older or
        // truncated model reply that omits them must not silently fail every
        // candidate and collapse the classification.
        leadStatementMatch: z.boolean().optional(), // Test A
        essentialDutiesMet: z.boolean().optional(), // Test B, essential limb
        mainDutiesMatched: z.number().min(0).optional(),
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
      leadStatementMatch: r.leadStatementMatch ?? true,
      essentialDutiesMet: r.essentialDutiesMet ?? true,
      // Clamp to the real duty count — the denominator is ours, not the model's.
      mainDutiesMatched: Math.min(
        Math.round(r.mainDutiesMatched ?? 0),
        group.mainDuties.length,
      ),
      mainDutiesTotal: group.mainDuties.length,
    });
    if (valid.length >= RANKED_RETURNED) break;
  }

  if (valid.length === 0) return null;

  // Statutory gate (IRPR s.80(3)): both limbs must pass. A candidate that fails the
  // lead statement or misses an essential duty cannot lead while any candidate passes
  // both — that is the officer's test, not a preference. If nothing passes, the ranking
  // still stands (the caller sees the failed limbs and the confidence) rather than
  // returning nothing, since a near-miss is exactly what the consultant needs to see.
  const passesTest = (c: NocCandidate): boolean =>
    c.leadStatementMatch === true && c.essentialDutiesMet === true;
  const pool = valid.some(passesTest) ? valid.filter(passesTest) : valid;

  // Residual-group guard: if the leader is an "Other ..." catch-all, hand the lead to
  // the best specific candidate whose fit is within RESIDUAL_OVER_SPECIFIC_MARGIN. The
  // residual group only keeps the lead when no specific group fits comparably well.
  let winner = pool[0]!;
  if (isResidualGroup(winner.title)) {
    const challenger = pool.find(
      (c) =>
        c !== winner &&
        !isResidualGroup(c.title) &&
        winner.fitScore - c.fitScore <= RESIDUAL_OVER_SPECIFIC_MARGIN,
    );
    if (challenger) winner = challenger;
  }

  // The leader stands; a runner-up is shown only when it is genuinely competitive.
  const candidates = [
    winner,
    ...valid.filter(
      (c) =>
        c !== winner &&
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
