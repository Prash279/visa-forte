import { describe, it, expect } from 'vitest'
import { calculate, type ApplicantProfile } from './crs-calculator'

// Base profile matching CrsModeller DEFAULTS (age 30, bachelor's, CLB 7 all, 0 WE)
const base: ApplicantProfile = {
  name: '', nocCode: '', nocTeer: 1, occupationTitle: '',
  countryOfCitizenship: '', countryOfResidence: '',
  reportDate: '2026-07-03',
  age: 30, education: 'bachelors', hasEca: true,
  firstLanguageScores: {
    testType: 'CELPIP',
    listening: 7, reading: 7, writing: 7, speaking: 7,
  },
  hasSecondLanguage: false,
  foreignWorkExperienceYears: 0,
  canadianWorkExperienceYears: 0,
  hasSpouse: false,
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 15263,
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
}

describe('CRS modeller delta assertions', () => {
  it('maxing all language bands from CLB 7 to CLB 12 gives positive point gain', () => {
    const before = calculate(base).breakdown.total
    const after = calculate({
      ...base,
      firstLanguageScores: {
        testType: 'CELPIP',
        listening: 12, reading: 12, writing: 12, speaking: 12,
      },
    }).breakdown.total
    expect(after).toBeGreaterThan(before)
  })

  it('3 years foreign WE (CLB 7, no Canadian WE) gives +25 pts vs 0 years', () => {
    const before = calculate(base).breakdown.total
    const after = calculate({ ...base, foreignWorkExperienceYears: 3 }).breakdown.total
    expect(after - before).toBe(25)
  })

  it('default profile scores above zero', () => {
    expect(calculate(base).breakdown.total).toBeGreaterThan(0)
  })
})
