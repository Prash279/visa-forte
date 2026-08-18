// Deterministic, offline retrieval over the grounded NOC 2021 dataset.
//
// Given an applicant's free-text duties, score every one of the 516 unit groups by
// IDF-weighted term overlap and return the strongest candidates. This is a recall
// step only: it narrows 516 groups to a shortlist that the Claude classifier then
// ranks precisely against the real lead statements and main duties. It never reaches
// the network — the dataset is bundled (see noc-2021.json _meta for provenance).

import nocData from './noc-2021.json';

export interface NocGroup {
  code: string;
  title: string;
  teer: number;
  leadStatement: string;
  mainDuties: string[];
  examples: string[];
  employmentRequirements: string[];
}

export interface NocRetrievalHit {
  group: NocGroup;
  score: number;
}

const GROUPS: NocGroup[] = (nocData as { groups: NocGroup[] }).groups;

// Occupation titles and illustrative examples are the most diagnostic signal, so
// terms appearing there are weighted above terms in the longer duty prose.
const TITLE_WEIGHT = 3;
const EXAMPLE_WEIGHT = 3;
const BODY_WEIGHT = 1;
const DEFAULT_TOP_K = 20;

// Generic English + résumé filler that carries no occupational signal.
const STOPWORDS: ReadonlySet<string> = new Set([
  'the',
  'and',
  'for',
  'with',
  'are',
  'was',
  'were',
  'this',
  'that',
  'these',
  'those',
  'from',
  'have',
  'has',
  'had',
  'will',
  'would',
  'should',
  'could',
  'their',
  'them',
  'they',
  'such',
  'into',
  'other',
  'than',
  'then',
  'some',
  'all',
  'any',
  'may',
  'also',
  'including',
  'include',
  'includes',
  'included',
  'within',
  'across',
  'per',
  'via',
  'work',
  'working',
  'worked',
  'works',
  'duties',
  'duty',
  'responsible',
  'responsibility',
  'responsibilities',
  'role',
  'roles',
  'job',
  'jobs',
  'task',
  'tasks',
  'position',
  'experience',
  'years',
  'year',
  'various',
  'related',
  'etc',
  'using',
  'use',
  'used',
  'ensure',
  'ensuring',
  'provide',
  'providing',
  'provided',
  'support',
  'team',
  'teams',
  'company',
  'organization',
  'organisation',
  'business',
  'management',
  'manage',
  'managing',
]);

function tokenize(text: string): string[] {
  const matched = text.toLowerCase().match(/[a-z]+/g);
  if (!matched) return [];
  return matched.filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// A group's field-weighted term map: token -> summed weight across its fields.
function buildGroupTerms(group: NocGroup): Map<string, number> {
  const terms = new Map<string, number>();
  const add = (text: string, weight: number): void => {
    for (const token of tokenize(text)) {
      terms.set(token, (terms.get(token) ?? 0) + weight);
    }
  };
  add(group.title, TITLE_WEIGHT);
  for (const ex of group.examples) add(ex, EXAMPLE_WEIGHT);
  add(group.leadStatement, BODY_WEIGHT);
  for (const d of group.mainDuties) add(d, BODY_WEIGHT);
  // employmentRequirements IS scored here, deliberately, even though IRPR s.80(3) makes
  // credentials irrelevant to whether experience counts in an occupation. That rule
  // governs the DECISION, and it is enforced where the decision is made — in the
  // classifier prompt. This layer only gathers candidates, and credential vocabulary is
  // useful recall signal for that. Dropping it was tried and measured on 2026-08-18:
  // 22212 fell from rank 10 to 17 and 22310 left the shortlist entirely. Recall got
  // worse for no legal gain. Do not "fix" this again by citing s.80(3).
  for (const r of group.employmentRequirements) add(r, BODY_WEIGHT);
  return terms;
}

// Precomputed once per server process: each group's term map, plus the corpus IDF
// so distinctive terms (e.g. "clinical", "compliance") outweigh ubiquitous ones.
const GROUP_TERMS: Map<string, number>[] = GROUPS.map(buildGroupTerms);

const IDF: ReadonlyMap<string, number> = (() => {
  const df = new Map<string, number>();
  for (const terms of GROUP_TERMS) {
    for (const token of terms.keys()) df.set(token, (df.get(token) ?? 0) + 1);
  }
  const n = GROUPS.length;
  const idf = new Map<string, number>();
  for (const [token, freq] of df) idf.set(token, Math.log(1 + n / freq));
  return idf;
})();

const CODE_INDEX: ReadonlyMap<string, NocGroup> = new Map(
  GROUPS.map((g) => [g.code, g]),
);

export function getGroupByCode(code: string): NocGroup | undefined {
  return CODE_INDEX.get(code);
}

// Domain anchors: occupations where real-world job-posting vocabulary differs so much
// from the official NOC 2021 StatCan text that TF-IDF cannot surface the right code at
// all. A firing anchor moves its codes to the FRONT of the shortlist so the classifier
// sees them first; it never picks the winner. Deciding the winner requires reading the
// duties against the lead statement, which only the model stage does — a regex knows
// vocabulary (which field someone works in), never scope (what they actually do).
//
// Add an anchor ONLY after measuring that retrieval misses the code unaided, and record
// the measured rank in the entry. An anchor for a code TF-IDF already finds is a no-op:
// a fibre/OSP anchor added 2026-08-18 was removed the same day once measurement showed
// all four of its codes were already on the shortlist (22214 #2, 21311 #6, 22212 #10,
// 22310 #29 of 30) — it had never rescued anything.
const DOMAIN_ANCHORS: ReadonlyArray<{
  pattern: RegExp;
  codes: ReadonlyArray<string>;
}> = [
  {
    // Clinical Research Coordinators / Associates / Clinical Trial Assistants.
    // NOC 2021 StatCan text contains none of: clinical trial, IRB, TMF, ICF,
    // informed consent, CRC, CRA, CTMS, eTMF, site activation, AE/SAE.
    // ESDC-confirmed code: 41404 – Health policy researchers, consultants and
    // program officers (TEER 1).
    // Measured 2026-08-18: without this anchor 41404 is ABSENT from the top 30 —
    // TF-IDF leads with petroleum and mining process operators. This anchor is
    // load-bearing; it is the clearest case in the file of a genuine vocabulary gap.
    pattern:
      /clinical[\s-]+trial|clinical[\s-]+research|\beTMF\b|\bTMF\b|\bIRB\b|\bICF\b|informed\s+consent|\bCRC\b|\bCRA\b|site[\s-]+activation|study[\s-]+start[\s-]?up|\bAE\/SAE\b|\bCTMS\b/i,
    codes: ['41404'],
  },
  {
    // Data science / ML / AI product roles. Real-world vocabulary (Python, ML
    // models, pipelines, LLMs, conversational AI) barely appears in the NOC
    // 2021 StatCan text, while generic engineering words ("engineer",
    // "monitor", "optimization") drag traditional engineering groups up the
    // TF-IDF ranking — the exact failure seen with a "Data Science Engineer"
    // input scoring Civil Engineers first (2026-07-19). Codes verified against
    // the bundled StatCan dataset: 21211 Data scientists, 21232 Software
    // developers and programmers, 21231 Software engineers and designers,
    // 21223 Database analysts and data administrators.
    // Measured 2026-08-18: only 21232 is genuinely rescued (absent from the top 30).
    // The other three are found unaided but poorly placed — 21211 #5, 21223 #9,
    // 21231 #10, all sitting BELOW Civil, Mechanical, Chemical and Electrical
    // engineers. Listing all four is therefore deliberate: the anchor rescues one
    // code and, by hoisting the family to the front, drops Civil engineers from #1
    // to #5 so the classifier no longer reads a wrong answer first.
    pattern:
      /machine[\s-]?learning|\bML\b|\bAI\b|\bLLM\b|artificial intelligence|data[\s-]scien(ce|tist)|deep[\s-]learning|neural[\s-]network|\bNLP\b|natural language processing|conversational (ai|agent|workflow)|chatbot|\bpython\b|data pipeline|model training|\betl\b/i,
    codes: ['21211', '21232', '21231', '21223'],
  },
  {
    // General software development — the anchor above only fires on data-science and ML
    // vocabulary, so a plain backend or web developer had no protection at all.
    //
    // Measured 2026-08-18 on the golden-corpus case 'software-developer-not-architect'
    // (a backend developer who explicitly does NOT own architecture). In the PUBLIC top
    // 30, retrieval returned exactly one of these four codes: 21231 at rank 1 — the
    // ARCHITECTURE code, the one thing this applicant does not do. 21232 sat at 13,
    // while 21230 and 21234 were absent entirely (ranks 35 and 57 of 60). Ranks 2-8 were
    // Civil, Chemical, Mechanical, Computer, Electrical, Industrial and Metallurgical
    // engineers: generic engineering vocabulary outscoring the actual occupation.
    //
    // Left alone, the public tool would push ordinary developers toward 21231 because it
    // is the only plausible code on their shortlist — inflation into an architecture code
    // that an employment reference letter saying "wrote and tested code" cannot support.
    // This anchor puts all four genuine candidates in front of the model so the choice is
    // made on the duty test rather than on what survived a keyword search.
    //
    // Deliberately NOT matching bare "api", "agile", "scrum" or "sprint": those appear in
    // plenty of non-software roles, and an anchor that fires spuriously now costs more
    // than it used to, since anchored codes take the front of the shortlist.
    pattern:
      /\b(typescript|javascript|node\.?js|react|angular|vue|golang|kotlin|swift|\.net|c\+\+|c#|php|rails|django|laravel|spring boot)\b|rest(ful)?[\s-]?apis?\b|micro-?services?|back-?end|front-?end|full[\s-]?stack|ci\/cd|unit test|integration test|pull requests?|source control|\bgit\b|devops|kubernetes|docker|software (developer|engineer|development)|web (developer|application)/i,
    codes: ['21230', '21231', '21232', '21234'],
  },
];

// Rank all unit groups against the applicant's duties (and optional title) and
// return the top K candidates. Deterministic: identical input -> identical output.
export function retrieveCandidates(
  jobDuties: string,
  occupationTitle?: string,
  topK: number = DEFAULT_TOP_K,
): NocRetrievalHit[] {
  const input = `${occupationTitle ?? ''} ${jobDuties}`;
  const queryTokens = new Set(tokenize(input));
  if (queryTokens.size === 0) return [];

  const scored: NocRetrievalHit[] = GROUPS.map((group, i) => {
    const terms = GROUP_TERMS[i]!;
    let score = 0;
    for (const token of queryTokens) {
      const weight = terms.get(token);
      if (weight === undefined) continue;
      score += weight * (IDF.get(token) ?? 0);
    }
    return { group, score };
  });

  const hits = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Anchored codes go to the FRONT, not the end. A rescued code appended last landed
  // as candidate 31 of 31 — the worst slot in the prompt for the one code we have
  // specific reason to believe in. The routes used to compensate with an "anchor wins"
  // override that could demote a correctly-ranked answer; putting the code where it
  // will actually be read removes the need for any override.
  const anchored = DOMAIN_ANCHORS.filter((a) => a.pattern.test(input)).flatMap(
    (a) => a.codes,
  );
  if (anchored.length === 0) return hits;

  const front: NocRetrievalHit[] = [];
  const promoted = new Set<string>();
  for (const code of anchored) {
    if (promoted.has(code)) continue;
    const existing = hits.find((h) => h.group.code === code);
    const group = existing?.group ?? CODE_INDEX.get(code);
    if (!group) continue;
    promoted.add(code);
    front.push(existing ?? { group, score: 0 });
  }
  return [...front, ...hits.filter((h) => !promoted.has(h.group.code))];
}
