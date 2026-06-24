// Grounded NOC classification — the pure, network-free core shared by the
// /api/admin/pnp-noc route and its tests. The route adds auth, the Claude call and
// the live verification; everything testable without a network lives here.
//
// Trust boundary: Claude only ranks codes that we already retrieved from the bundled
// StatCan dataset, and it returns codes + reasoning ONLY. The authoritative TEER and
// title are joined here from the dataset — never taken from the model.

import { z } from 'zod'
import { getGroupByCode, type NocRetrievalHit } from './noc-retrieval'
import { type NocCandidate } from './pnp-eligibility'

export const RETRIEVE_TOP_K = 30
export const RANKED_RETURNED = 3

export const NOC_CLASSIFIER_SYSTEM = `You are an expert Canadian NOC 2021 (TEER) occupational classifier for immigration documentation. A wrong NOC code is the single highest-frequency PR refusal trigger — accuracy is paramount.

You are given an applicant's DUTIES and a SHORTLIST of candidate NOC 2021 unit groups, each with its official Statistics Canada lead statement, example job titles and main duties.

Your task: choose the THREE best-fitting unit groups FROM THE SHORTLIST ONLY, ranked best first.

Classification methodology — follow this order strictly:
1. Read each applicant duty as a concrete task. For each task, identify which candidate's MAIN DUTIES it maps to most precisely — match verbs, tools, processes, scope of work, and level of responsibility.
2. Count how many of the applicant's concrete tasks appear verbatim or near-verbatim in each candidate's MAIN DUTIES list. The candidate with the most duty-to-duty matches ranks #1.
3. NEVER rank by job title similarity. Titles are unreliable and often misleading. Classification is determined solely by duty overlap with the official MAIN DUTIES.
4. If two candidates tie on duty matches, prefer the one whose LEAD STATEMENT most accurately describes the same scope of responsibility (e.g. "plan, organize and supervise" vs "operate equipment" are different levels).
5. Consider TEER level: TEER 0 = senior management/executive, TEER 1 = professional (degree-level), TEER 2 = technical (diploma/apprenticeship), TEER 3 = intermediate (6 months training), TEER 4 = labour (short training). Match the applicant's actual responsibilities to the correct TEER.

For each chosen code provide ONE sentence of rationale that cites the SPECIFIC applicant duties that matched the code's official main duties.
Output the 5-digit code and rationale ONLY. Do NOT output TEER or title — the system supplies the authoritative values.
Choose only from the numbered candidates provided. Never output a NOC code that is not in the shortlist.

Confidence rules:
- "high": the top-ranked code has substantially more duty matches than all alternatives, and the TEER level is unambiguous
- "medium": the top code has a modest lead, or TEER level requires judgement
- "low": duties are sparse, generic, or describe work in more than one TEER category

Set ambiguityFlag = true if your top two choices are genuinely close OR describe materially different kinds of work (e.g. a TEER 1 specialist vs a TEER 2 technician).

Return ONLY a valid JSON object, no markdown fences and no commentary, in exactly this shape:
{"ranked":[{"nocCode":"#####","rationale":"..."},{"nocCode":"#####","rationale":"..."},{"nocCode":"#####","rationale":"..."}],"confidence":"high","ambiguityFlag":false}`

// Build the grounding block: the real StatCan lead statement, example titles and main
// duties for each shortlisted unit group. Claude ranks against THIS, not memory.
export function buildCandidateBlock(hits: NocRetrievalHit[]): string {
  return hits
    .map((h, i) => {
      const g = h.group
      const duties = g.mainDuties.map((d) => `  - ${d}`).join('\n')
      const examples = g.examples.slice(0, 6).join('; ')
      return `### Candidate ${i + 1} — NOC ${g.code} (TEER ${g.teer}): ${g.title}
Lead statement: ${g.leadStatement}
Example job titles: ${examples}
Main duties:
${duties}`
    })
    .join('\n\n')
}

// The model returns codes + reasoning only — never TEER/title, which we join ourselves.
const rawSchema = z.object({
  ranked: z
    .array(z.object({ nocCode: z.string(), rationale: z.string().min(1) }))
    .min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  ambiguityFlag: z.boolean(),
})
export type RawClassification = z.infer<typeof rawSchema>

// Pull the first complete, balanced JSON object out of the model's reply, even if it
// wraps the object in fences or adds commentary. String contents are skipped so braces
// inside values don't end the scan early.
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else if (ch === '"') {
      inString = true
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

export function parseRawClassification(modelText: string): RawClassification | null {
  const json = extractJsonObject(modelText)
  if (json === null) return null
  try {
    const parsed = rawSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export interface GroundedClassification {
  nocCode: string
  teer: number
  title: string
  confidence: 'high' | 'medium' | 'low'
  candidates: NocCandidate[]
  ambiguity: {
    flag: boolean
    alternatives: { nocCode: string; teer: number; title: string }[]
  }
}

// Keep only model codes that were actually in the shortlist, join the authoritative
// title + TEER from the bundled dataset, and assemble the ranked result. Returns null
// if the model picked nothing from the shortlist.
export function groundClassification(
  raw: RawClassification,
  hits: NocRetrievalHit[]
): GroundedClassification | null {
  const scoreByCode = new Map(hits.map((h) => [h.group.code, h.score]))
  const seen = new Set<string>()
  const candidates: NocCandidate[] = []

  for (const r of raw.ranked) {
    const group = getGroupByCode(r.nocCode)
    if (!group) continue                       // not a real NOC code
    if (!scoreByCode.has(r.nocCode)) continue   // not in the shortlist we supplied
    if (seen.has(r.nocCode)) continue           // de-dupe
    seen.add(r.nocCode)
    candidates.push({
      nocCode: group.code,
      teer: group.teer,                         // authoritative — never from the model
      title: group.title,
      rationale: r.rationale,
      matchScore: Math.round(scoreByCode.get(r.nocCode) ?? 0),
    })
    if (candidates.length >= RANKED_RETURNED) break
  }

  if (candidates.length === 0) return null
  const winner = candidates[0]!
  const teerSpread = new Set(candidates.map((c) => c.teer)).size > 1

  return {
    nocCode: winner.nocCode,
    teer: winner.teer,
    title: winner.title,
    confidence: raw.confidence,
    candidates,
    ambiguity: {
      flag: raw.ambiguityFlag || teerSpread,
      alternatives: candidates
        .slice(1)
        .map((c) => ({ nocCode: c.nocCode, teer: c.teer, title: c.title })),
    },
  }
}

// Client-facing citation: the ESDC occupational profile for the specific code.
export function esdcProfileUrl(code: string): string {
  return `https://noc.esdc.gc.ca/OaSIS/OaSISOccProfile?GocTemplateCulture=en-CA&code=${code}.00&version=2023.0`
}

// Lightweight server-rendered page used for the live verification fetch.
export function statcanUnitGroupUrl(code: string): string {
  return `https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVD=1322554&CVD=1322870&CPV=${code}&CST=01052021&CLV=5&MLV=5`
}
