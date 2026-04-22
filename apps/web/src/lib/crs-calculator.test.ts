import { describe, it, expect } from 'vitest'
import {
  calculate,
  scoresToClb,
  type ApplicantProfile,
  type LanguageScores,
} from './crs-calculator'

// Ground-truth test profile derived from the verified HTML report for Kishore Sai.
// All expected values are confirmed outputs from the CanVisa Pro HTML tool.
const kishoreProfile: ApplicantProfile = {
  name: 'Kishore Sai',
  age: 26,
  nocCode: '21211',
  nocTeer: 1,
  occupationTitle: 'Data Scientist',
  countryOfCitizenship: 'India',
  countryOfResidence: 'USA',
  reportDate: '2026-02-27',
  education: 'masters',
  hasEca: true,
  firstLanguageScores: {
    testType: 'IELTS_GT',
    listening: 8.0,
    reading: 8.5,
    writing: 7.0,
    speaking: 7.0,
  },
  hasSecondLanguage: false,
  foreignWorkExperienceYears: 2.25,
  canadianWorkExperienceYears: 0,
  hasSpouse: false,
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 16000,
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
}

describe('scoresToClb — IELTS GT conversion', () => {
  it('converts IELTS GT L:8.0, R:8.5, W:7.0, S:7.0 to CLB 9/10/9/9', () => {
    const scores: LanguageScores = {
      testType: 'IELTS_GT',
      listening: 8.0,
      reading: 8.5,
      writing: 7.0,
      speaking: 7.0,
    }
    const bands = scoresToClb(scores)
    expect(bands.listening).toBe(9)
    expect(bands.reading).toBe(10)
    expect(bands.writing).toBe(9)
    expect(bands.speaking).toBe(9)
  })

  it('converts CLB 7 boundary correctly', () => {
    const scores: LanguageScores = {
      testType: 'IELTS_GT',
      listening: 6.0,
      reading: 6.0,
      writing: 5.5,
      speaking: 5.5,
    }
    const bands = scoresToClb(scores)
    expect(bands.listening).toBe(7)
    expect(bands.reading).toBe(7)
    expect(bands.writing).toBe(7)
    expect(bands.speaking).toBe(7)
  })

  it('converts CLB 10 for IELTS GT L:8.5, R:8.0, W:7.5, S:7.5', () => {
    const scores: LanguageScores = {
      testType: 'IELTS_GT',
      listening: 8.5,
      reading: 8.0,
      writing: 7.5,
      speaking: 7.5,
    }
    const bands = scoresToClb(scores)
    expect(bands.listening).toBe(10)
    expect(bands.reading).toBe(10)
    expect(bands.writing).toBe(10)
    expect(bands.speaking).toBe(10)
  })
})

describe('scoresToClb — CELPIP conversion', () => {
  it('converts CELPIP 9 in all abilities to CLB 9', () => {
    const scores: LanguageScores = {
      testType: 'CELPIP',
      listening: 9, reading: 9, writing: 9, speaking: 9,
    }
    const bands = scoresToClb(scores)
    expect(bands.listening).toBe(9)
    expect(bands.reading).toBe(9)
  })
})

describe('calculate — Kishore Sai ground-truth verification', () => {
  const result = calculate(kishoreProfile)

  it('produces correct CLB bands for first language', () => {
    expect(result.firstLanguageBands.listening).toBe(9)
    expect(result.firstLanguageBands.reading).toBe(10)
    expect(result.firstLanguageBands.writing).toBe(9)
    expect(result.firstLanguageBands.speaking).toBe(9)
  })

  it('Section A: age 26 = 110 points', () => {
    expect(result.breakdown.agePoints).toBe(110)
  })

  it("Section A: Master's = 135 points", () => {
    expect(result.breakdown.educationPoints).toBe(135)
  })

  it('Section A: CLB 9/10/9/9 first language = 127 points', () => {
    // 3 abilities at CLB 9 (31 pts each) + 1 at CLB 10 (34 pts) = 127
    expect(result.breakdown.firstLanguagePoints).toBe(127)
  })

  it('Section A: no Canadian experience = 0 points', () => {
    expect(result.breakdown.canadianExpPoints).toBe(0)
  })

  it('Section A: core total = 372', () => {
    expect(result.breakdown.coreTotal).toBe(372)
  })

  it("Section C: Master's + CLB 9+ language transferability = 50", () => {
    expect(result.breakdown.eduLanguageTransfer).toBe(50)
  })

  it('Section C: 2.25yr FWE + CLB 9+ language transferability = 25', () => {
    expect(result.breakdown.foreignExpLanguageTransfer).toBe(25)
  })

  it('Section C: transferability total = 75', () => {
    expect(result.breakdown.transferTotal).toBe(75)
  })

  it('CRS grand total = 447', () => {
    expect(result.breakdown.total).toBe(447)
  })
})

describe('calculate — FSW 67-point grid', () => {
  const result = calculate(kishoreProfile)

  it('FSW language (CLB 9/10/9/9, no second language) = 24', () => {
    expect(result.fswGrid.language).toBe(24)
  })

  it("FSW education (Master's) = 23", () => {
    expect(result.fswGrid.education).toBe(23)
  })

  it('FSW work experience (2.25yr → 2yr tier) = 11', () => {
    expect(result.fswGrid.workExperience).toBe(11)
  })

  it('FSW age (26) = 12', () => {
    expect(result.fswGrid.age).toBe(12)
  })

  it('FSW adaptability (no Canadian ties) = 0', () => {
    expect(result.fswGrid.adaptability).toBe(0)
  })

  it('FSW total = 70, eligible = true', () => {
    expect(result.fswGrid.total).toBe(70)
    expect(result.fswGrid.eligible).toBe(true)
  })
})

describe('calculate — stream eligibility', () => {
  const result = calculate(kishoreProfile)

  it('FSW eligible (TEER 1, 67-point grid passed, CLB 7+)', () => {
    expect(result.eligibility.fsw.eligible).toBe(true)
  })

  it('CEC not eligible (no Canadian work experience)', () => {
    expect(result.eligibility.cec.eligible).toBe(false)
  })

  it('FST not eligible (NOC 21211 is not a trade)', () => {
    expect(result.eligibility.fst.eligible).toBe(false)
  })

  it('Express Entry pool eligible', () => {
    expect(result.eligibility.expressEntryPool.eligible).toBe(true)
  })
})

describe('calculate — proof of funds', () => {
  it('single applicant funds required = 14690', () => {
    const result = calculate(kishoreProfile)
    expect(result.proofOfFundsRequired).toBe(14690)
  })

  it('funds sufficient when settlement funds >= required', () => {
    const result = calculate({ ...kishoreProfile, settlementFunds: 16000 })
    expect(result.proofOfFundsSufficient).toBe(true)
  })

  it('funds insufficient when below threshold', () => {
    const result = calculate({ ...kishoreProfile, settlementFunds: 10000 })
    expect(result.proofOfFundsSufficient).toBe(false)
  })
})

describe('calculate — provincial nomination', () => {
  it('adds +600 points for provincial nomination', () => {
    const result = calculate({ ...kishoreProfile, hasProvincialNomination: true })
    expect(result.breakdown.total).toBe(447 + 600)
  })
})

describe('calculate — age boundary cases', () => {
  it('age 45+ returns 0 age points', () => {
    const result = calculate({ ...kishoreProfile, age: 45 })
    expect(result.breakdown.agePoints).toBe(0)
  })

  it('age 30 returns 105 age points', () => {
    const result = calculate({ ...kishoreProfile, age: 30 })
    expect(result.breakdown.agePoints).toBe(105)
  })
})
