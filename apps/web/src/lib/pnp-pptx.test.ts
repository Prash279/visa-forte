import { describe, it, expect } from 'vitest'
import { assessPnp, type NocClassification } from './pnp-eligibility'
import { buildPnpPptxBlob } from './pnp-pptx'
import { type ApplicantProfile } from './crs-calculator'

const profile: ApplicantProfile = {
  name: 'Rashmi Test', age: 32, nocCode: '31301', nocTeer: 1,
  occupationTitle: 'Registered Nurse', countryOfCitizenship: 'India', countryOfResidence: 'India',
  reportDate: '2026-06-25', education: 'bachelors', hasEca: true,
  firstLanguageScores: { testType: 'IELTS_GT', listening: 8, reading: 7, writing: 7, speaking: 7 },
  hasSecondLanguage: false, foreignWorkExperienceYears: 6, canadianWorkExperienceYears: 0,
  hasSpouse: false, hasJobOffer: 'none', hasProvincialNomination: false, hasCanadianEducation: false,
  hasFamilyInCanada: false, settlementFunds: 25000, familySize: 1,
  hasCriminalRecord: false, hasMedicalCondition: false, hasPriorRefusal: false,
}

const noc: NocClassification = {
  nocCode: '31301', teer: 1, title: 'Registered nurses and registered psychiatric nurses',
  citationUrl: 'https://noc.esdc.gc.ca', confidence: 'high', verified: true,
  candidates: [
    { nocCode: '31301', teer: 1, title: 'Registered nurses', rationale: 'Direct patient care duties.', matchScore: 120, fitScore: 90 },
    { nocCode: '32101', teer: 2, title: 'Licensed practical nurses', rationale: 'Adjacent clinical duties.', matchScore: 88, fitScore: 58 },
  ],
  ambiguity: { flag: false, alternatives: [] },
}

describe('buildPnpPptxBlob', () => {
  it('produces a non-trivial .pptx blob from a real assessment', async () => {
    const pnp = assessPnp(profile, noc)
    const blob = await buildPnpPptxBlob(profile, pnp)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(5000)
  })
})
