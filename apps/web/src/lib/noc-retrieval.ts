// Deterministic, offline retrieval over the grounded NOC 2021 dataset.
//
// Given an applicant's free-text duties, score every one of the 516 unit groups by
// IDF-weighted term overlap and return the strongest candidates. This is a recall
// step only: it narrows 516 groups to a shortlist that the Claude classifier then
// ranks precisely against the real lead statements and main duties. It never reaches
// the network — the dataset is bundled (see noc-2021.json _meta for provenance).

import nocData from './noc-2021.json'

export interface NocGroup {
  code: string
  title: string
  teer: number
  leadStatement: string
  mainDuties: string[]
  examples: string[]
  employmentRequirements: string[]
}

export interface NocRetrievalHit {
  group: NocGroup
  score: number
}

const GROUPS: NocGroup[] = (nocData as { groups: NocGroup[] }).groups

// Occupation titles and illustrative examples are the most diagnostic signal, so
// terms appearing there are weighted above terms in the longer duty prose.
const TITLE_WEIGHT = 3
const EXAMPLE_WEIGHT = 3
const BODY_WEIGHT = 1
const DEFAULT_TOP_K = 20

// Generic English + résumé filler that carries no occupational signal.
const STOPWORDS: ReadonlySet<string> = new Set([
  'the', 'and', 'for', 'with', 'are', 'was', 'were', 'this', 'that', 'these', 'those',
  'from', 'have', 'has', 'had', 'will', 'would', 'should', 'could', 'their', 'them',
  'they', 'such', 'into', 'other', 'than', 'then', 'some', 'all', 'any', 'may', 'also',
  'including', 'include', 'includes', 'included', 'within', 'across', 'per', 'via',
  'work', 'working', 'worked', 'works', 'duties', 'duty', 'responsible', 'responsibility',
  'responsibilities', 'role', 'roles', 'job', 'jobs', 'task', 'tasks', 'position',
  'experience', 'years', 'year', 'various', 'related', 'etc', 'using', 'use', 'used',
  'ensure', 'ensuring', 'provide', 'providing', 'provided', 'support', 'team', 'teams',
  'company', 'organization', 'organisation', 'business', 'management', 'manage', 'managing',
])

function tokenize(text: string): string[] {
  const matched = text.toLowerCase().match(/[a-z]+/g)
  if (!matched) return []
  return matched.filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

// A group's field-weighted term map: token -> summed weight across its fields.
function buildGroupTerms(group: NocGroup): Map<string, number> {
  const terms = new Map<string, number>()
  const add = (text: string, weight: number): void => {
    for (const token of tokenize(text)) {
      terms.set(token, (terms.get(token) ?? 0) + weight)
    }
  }
  add(group.title, TITLE_WEIGHT)
  for (const ex of group.examples) add(ex, EXAMPLE_WEIGHT)
  add(group.leadStatement, BODY_WEIGHT)
  for (const d of group.mainDuties) add(d, BODY_WEIGHT)
  for (const r of group.employmentRequirements) add(r, BODY_WEIGHT)
  return terms
}

// Precomputed once per server process: each group's term map, plus the corpus IDF
// so distinctive terms (e.g. "clinical", "compliance") outweigh ubiquitous ones.
const GROUP_TERMS: Map<string, number>[] = GROUPS.map(buildGroupTerms)

const IDF: ReadonlyMap<string, number> = (() => {
  const df = new Map<string, number>()
  for (const terms of GROUP_TERMS) {
    for (const token of terms.keys()) df.set(token, (df.get(token) ?? 0) + 1)
  }
  const n = GROUPS.length
  const idf = new Map<string, number>()
  for (const [token, freq] of df) idf.set(token, Math.log(1 + n / freq))
  return idf
})()

const CODE_INDEX: ReadonlyMap<string, NocGroup> = new Map(GROUPS.map((g) => [g.code, g]))

export function getGroupByCode(code: string): NocGroup | undefined {
  return CODE_INDEX.get(code)
}

// Domain anchors: occupations where real-world job-posting vocabulary differs so
// much from the official NOC 2021 StatCan text that TF-IDF cannot surface the right
// code. When a pattern fires the listed codes are appended to the shortlist (score 0)
// so Claude still decides the final ranking — the anchor only guarantees visibility.
// Each entry is Prash-verified against the ESDC NOC 2021 browser.
const DOMAIN_ANCHORS: ReadonlyArray<{ pattern: RegExp; codes: ReadonlyArray<string> }> = [
  {
    // Clinical Research Coordinators / Associates / Clinical Trial Assistants.
    // NOC 2021 StatCan text contains none of: clinical trial, IRB, TMF, ICF,
    // informed consent, CRC, CRA, CTMS, eTMF, site activation, AE/SAE.
    // ESDC-confirmed code: 41404 – Health policy researchers, consultants and
    // program officers (TEER 1).
    pattern:
      /clinical[\s-]+trial|clinical[\s-]+research|\beTMF\b|\bTMF\b|\bIRB\b|\bICF\b|informed\s+consent|\bCRC\b|\bCRA\b|site[\s-]+activation|study[\s-]+start[\s-]?up|\bAE\/SAE\b|\bCTMS\b/i,
    codes: ['41404'],
  },
]

// Rank all unit groups against the applicant's duties (and optional title) and
// return the top K candidates. Deterministic: identical input -> identical output.
export function retrieveCandidates(
  jobDuties: string,
  occupationTitle?: string,
  topK: number = DEFAULT_TOP_K
): NocRetrievalHit[] {
  const input = `${occupationTitle ?? ''} ${jobDuties}`
  const queryTokens = new Set(tokenize(input))
  if (queryTokens.size === 0) return []

  const scored: NocRetrievalHit[] = GROUPS.map((group, i) => {
    const terms = GROUP_TERMS[i]!
    let score = 0
    for (const token of queryTokens) {
      const weight = terms.get(token)
      if (weight === undefined) continue
      score += weight * (IDF.get(token) ?? 0)
    }
    return { group, score }
  })

  const hits = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  // Append anchor codes that didn't make the TF-IDF cut when the input signals a
  // domain whose terminology is absent from the NOC 2021 StatCan vocabulary.
  for (const anchor of DOMAIN_ANCHORS) {
    if (!anchor.pattern.test(input)) continue
    for (const code of anchor.codes) {
      if (hits.some((h) => h.group.code === code)) continue
      const group = CODE_INDEX.get(code)
      if (group) hits.push({ group, score: 0 })
    }
  }

  return hits
}
