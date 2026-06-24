import { describe, it, expect } from 'vitest'
import { retrieveCandidates, getGroupByCode } from './noc-retrieval'

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
})
