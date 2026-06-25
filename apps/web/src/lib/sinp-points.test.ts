import { describe, it, expect } from 'vitest'
import {
  sinpEducationPoints,
  sinpWorkExperiencePoints,
  sinpFirstLanguagePoints,
  sinpSecondLanguagePoints,
  sinpAgePoints,
  scoreSinp,
  SINP_MAX_POINTS,
  SINP_PASS_MARK,
} from './sinp-points'
import { type ApplicantProfile } from './crs-calculator'

// Every expected value below is taken from the official SINP International Skilled
// Worker Points Grid (saskatchewan.ca "Assess Your Eligibility"), read directly
// from the source PDF — never from training data.

// ── Factor I · Education and Training (max 23) ───────────────────────────────
describe('sinpEducationPoints — verified against the SINP grid', () => {
  it('awards 23 for a Master\'s or Doctorate', () => {
    expect(sinpEducationPoints('masters')).toBe(23)
    expect(sinpEducationPoints('doctoral')).toBe(23)
  })
  it('awards 20 for a Bachelor\'s / three-year degree (incl. two-or-more credentials)', () => {
    expect(sinpEducationPoints('bachelors')).toBe(20)
    expect(sinpEducationPoints('two_or_more_degrees')).toBe(20)
  })
  it('awards 15 for a two-year (but less than three) post-secondary credential', () => {
    expect(sinpEducationPoints('two_year_post_secondary')).toBe(15)
  })
  it('awards 12 for a one-year credential (at least two semesters, under two years)', () => {
    expect(sinpEducationPoints('one_year_post_secondary')).toBe(12)
  })
  it('awards 0 for secondary or less (no post-secondary credential)', () => {
    expect(sinpEducationPoints('secondary')).toBe(0)
    expect(sinpEducationPoints('less_than_secondary')).toBe(0)
  })
})

// ── Factor I · Skilled Work Experience, window a) last 5 years (max 10) ──────
describe('sinpWorkExperiencePoints — verified against the SINP grid (5-year window)', () => {
  it('tiers years 1→5 as 2/4/6/8/10', () => {
    expect(sinpWorkExperiencePoints(1)).toBe(2)
    expect(sinpWorkExperiencePoints(2)).toBe(4)
    expect(sinpWorkExperiencePoints(3)).toBe(6)
    expect(sinpWorkExperiencePoints(4)).toBe(8)
    expect(sinpWorkExperiencePoints(5)).toBe(10)
  })
  it('caps at 10 for more than 5 years (window a maximum)', () => {
    expect(sinpWorkExperiencePoints(8)).toBe(10)
  })
  it('floors partial years and gives 0 for under a year', () => {
    expect(sinpWorkExperiencePoints(2.9)).toBe(4)
    expect(sinpWorkExperiencePoints(0)).toBe(0)
  })
})

// ── Factor I · First Language Test (max 20) ──────────────────────────────────
describe('sinpFirstLanguagePoints — verified against the SINP grid', () => {
  it('tiers CLB 4→8+ as 12/14/16/18/20', () => {
    expect(sinpFirstLanguagePoints(4)).toBe(12)
    expect(sinpFirstLanguagePoints(5)).toBe(14)
    expect(sinpFirstLanguagePoints(6)).toBe(16)
    expect(sinpFirstLanguagePoints(7)).toBe(18)
    expect(sinpFirstLanguagePoints(8)).toBe(20)
    expect(sinpFirstLanguagePoints(10)).toBe(20)
  })
  it('awards 0 below CLB 4', () => {
    expect(sinpFirstLanguagePoints(3)).toBe(0)
  })
})

// ── Factor I · Second Language Test (max 10) ─────────────────────────────────
describe('sinpSecondLanguagePoints — verified against the SINP grid', () => {
  it('tiers CLB 4→8+ as 2/4/6/8/10', () => {
    expect(sinpSecondLanguagePoints(4)).toBe(2)
    expect(sinpSecondLanguagePoints(5)).toBe(4)
    expect(sinpSecondLanguagePoints(6)).toBe(6)
    expect(sinpSecondLanguagePoints(7)).toBe(8)
    expect(sinpSecondLanguagePoints(8)).toBe(10)
    expect(sinpSecondLanguagePoints(11)).toBe(10)
  })
  it('awards 0 below CLB 4', () => {
    expect(sinpSecondLanguagePoints(3)).toBe(0)
  })
})

// ── Factor I · Age (max 12) ──────────────────────────────────────────────────
describe('sinpAgePoints — verified against the SINP grid', () => {
  it('maps each documented age band', () => {
    expect(sinpAgePoints(17)).toBe(0)
    expect(sinpAgePoints(18)).toBe(8)
    expect(sinpAgePoints(21)).toBe(8)
    expect(sinpAgePoints(22)).toBe(12)
    expect(sinpAgePoints(34)).toBe(12)
    expect(sinpAgePoints(35)).toBe(10)
    expect(sinpAgePoints(45)).toBe(10)
    expect(sinpAgePoints(46)).toBe(8)
    expect(sinpAgePoints(50)).toBe(8)
    expect(sinpAgePoints(51)).toBe(0)
  })
})

// ── Aggregate scorer ─────────────────────────────────────────────────────────

// Master's, age 30, CLB 9 first language, 5 yr experience, no second language.
// Mirrors the Rashmi-style health-policy profile in the task brief.
const mastersProfile: ApplicantProfile = {
  name: 'Test Applicant',
  age: 30,
  nocCode: '41400',
  nocTeer: 1,
  occupationTitle: 'Health Policy Analyst',
  countryOfCitizenship: 'India',
  countryOfResidence: 'India',
  reportDate: '2026-06-25',
  education: 'masters',
  hasEca: true,
  firstLanguageScores: { testType: 'IELTS_GT', listening: 8.0, reading: 7.0, writing: 7.0, speaking: 7.0 },
  hasSecondLanguage: false,
  foreignWorkExperienceYears: 5,
  canadianWorkExperienceYears: 0,
  hasSpouse: false,
  hasJobOffer: 'none',
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 30000,
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
}

describe('scoreSinp', () => {
  it('reports the grid ceiling (110) and pass mark (60)', () => {
    const r = scoreSinp(mastersProfile)
    expect(r.maxPoints).toBe(110)
    expect(SINP_MAX_POINTS).toBe(110)
    expect(r.passMark).toBe(60)
    expect(SINP_PASS_MARK).toBe(60)
  })

  it('computes Factor I for a strong Master\'s profile and clears the 60-point pass mark', () => {
    const r = scoreSinp(mastersProfile)
    // 23 (Master's) + 10 (5 yr) + 20 (CLB 9 first language) + 12 (age 30) = 65
    expect(r.computedPoints).toBe(65)
    expect(r.meetsPassMark).toBe(true)
  })

  it('marks the Saskatchewan connection (Factor II) as to-confirm — it is not in the profile', () => {
    const r = scoreSinp(mastersProfile)
    const f2 = r.factors.find(f => f.key === 'sk-connection')
    expect(f2).toBeDefined()
    expect(f2!.status).toBe('to-confirm')
    expect(f2!.points).toBe(0)
    expect(f2!.maxPoints).toBe(30)
    expect(r.hasUnconfirmedFactors).toBe(true)
  })

  it('marks second language as to-confirm when none is on file', () => {
    const r = scoreSinp(mastersProfile)
    const sl = r.factors.find(f => f.key === 'second-language')
    expect(sl!.status).toBe('to-confirm')
    expect(sl!.points).toBe(0)
  })

  it('computes second-language points when a second language is on file', () => {
    const withSecond: ApplicantProfile = {
      ...mastersProfile,
      hasSecondLanguage: true,
      secondLanguageScores: { testType: 'IELTS_GT', listening: 5.0, reading: 4.0, writing: 5.0, speaking: 5.0 },
    }
    const r = scoreSinp(withSecond)
    const sl = r.factors.find(f => f.key === 'second-language')
    expect(sl!.status).toBe('computed')
    expect(sl!.points).toBeGreaterThan(0)
  })

  it('computedPoints equals the sum of computed factor points', () => {
    const r = scoreSinp(mastersProfile)
    const sum = r.factors
      .filter(f => f.status === 'computed')
      .reduce((acc, f) => acc + f.points, 0)
    expect(r.computedPoints).toBe(sum)
  })
})
