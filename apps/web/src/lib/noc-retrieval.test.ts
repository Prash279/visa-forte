import { describe, it, expect } from 'vitest'
import { retrieveCandidates, getGroupByCode, getAnchoredCodes } from './noc-retrieval'

// Representative of Rashmi's documented clinical-trial-operations duties.
const RASHMI_DUTIES = `
Maintained and ensured inspection readiness of the Trial Master File (TMF/eTMF) for multiple clinical trials.
Coordinated with Institutional Review Boards (IRB) and ethics committees on study approvals and amendments.
Managed the Clinical Trial Management System (CTMS) and tracked site regulatory documents and compliance.
Completed Case Report Forms (CRF) and resolved data queries. Reported adverse and serious adverse events per regulatory requirements.
Oversaw vendors and compiled study metrics and progress reports for senior officials.
Reviewed health programme data, monitored study conduct, maintained health information databases,
analysed statistical information, and assessed compliance with health regulatory standards.
`

// Real CRC/CTA duties — no artificial health-policy language.
// Used to verify that the domain anchor surfaces 41404 even when the TF-IDF
// engine finds no overlap with the official NOC 2021 StatCan vocabulary.
const REAL_CRC_DUTIES = `
Managed ICF version control and distributed regulatory packages to sites.
Coordinated with central and local IRBs on approvals and amendments.
Managed end-to-end TMF/eTMF maintenance and inspection readiness activities.
Performed periodic TMF QC reviews. Maintained CTMS accuracy.
Supported study start-up activities: site identification, regulatory submissions,
IRB approvals, and site activation. Conducted active patient recruitment and
pre-screening. Supported the informed consent process. Documented AEs/SAEs.
`

const SOFTWARE_DUTIES = `
Designed, developed and tested software applications and web services. Wrote and maintained source code in
multiple programming languages, debugged programs, and built APIs and databases for production systems.
`

function topCodes(duties: string, title?: string, k = 20): string[] {
  return retrieveCandidates(duties, title, k).map((c) => c.group.code)
}

describe('noc-retrieval', () => {
  it('ranks NOC 41404 first in the candidate set for Rashmi-style health-policy duties', () => {
    const ranked = retrieveCandidates(RASHMI_DUTIES, 'Clinical Research Coordinator')
    expect(ranked[0]?.group.code).toBe('41404')
  })

  it('getAnchoredCodes returns 41404 for CRC/CTA input and nothing for unrelated input', () => {
    expect(getAnchoredCodes(REAL_CRC_DUTIES, 'Clinical Trial Assistant')).toContain('41404')
    expect(getAnchoredCodes(SOFTWARE_DUTIES, 'Software Developer')).toEqual([])
  })

  it('domain anchor forces NOC 41404 into the shortlist for real-world CRC/CTA duties', () => {
    // Real CRC duties contain no NOC 2021 StatCan vocabulary — TF-IDF alone misses 41404.
    // The domain anchor must guarantee 41404 appears in the returned hits.
    const hits = retrieveCandidates(REAL_CRC_DUTIES, 'Clinical Trial Assistant')
    expect(hits.some((h) => h.group.code === '41404')).toBe(true)
  })

  it('ranks software-developer duties to the 2123x family', () => {
    const codes = topCodes(SOFTWARE_DUTIES, 'Software Developer', 10)
    expect(codes.some((c) => c.startsWith('2123'))).toBe(true)
  })

  it('returns nothing for empty or signal-free input', () => {
    expect(retrieveCandidates('   ')).toEqual([])
    expect(retrieveCandidates('the and for with')).toEqual([])
  })

  it('is deterministic for identical input', () => {
    expect(topCodes(RASHMI_DUTIES)).toEqual(topCodes(RASHMI_DUTIES))
  })

  it('getGroupByCode resolves a known code and rejects an unknown one', () => {
    expect(getGroupByCode('41404')?.teer).toBe(1)
    expect(getGroupByCode('99999')).toBeUndefined()
  })

  it('NOC 32109 main duties carry no bare sub-occupation heading labels', () => {
    // StatCan's "Main duties" element for residual groups embeds sub-occupation titles
    // (e.g. "Hearing instrument practitioners") that are headings, not duties — they
    // inflate keyword overlap and already live in `examples`. They must be removed.
    const duties = getGroupByCode('32109')!.mainDuties
    const headings = [
      'Hearing instrument practitioners',
      'Communicative disorders assistants and speech-language pathology assistants',
      'Ophthalmic medical technologists and technicians',
      'Physical rehabilitation therapists',
      'Physiotherapy assistants and occupational therapy assistants',
    ]
    for (const heading of headings) expect(duties).not.toContain(heading)
    // The genuine duty statements remain.
    expect(duties.some((d) => d.startsWith('Examine adult clients to assess hearing loss'))).toBe(true)
  })
})
