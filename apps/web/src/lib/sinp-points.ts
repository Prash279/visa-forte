// SINP International Skilled Worker Points Grid scorer — deterministic, never networked.
//
// Every point value below is transcribed from the official SINP grid on
// saskatchewan.ca ("Assess Your Eligibility — Saskatchewan Immigrant Nominee
// Program"), read directly from the source page. Training data is not a source.
//
// The grid has two factors:
//   Factor I  — Labour Market Success (max 80): education, skilled work
//               experience, first + second language, age.
//   Factor II — Connection to the Saskatchewan labour market & adaptability
//               (max 30): SK job offer, SK family relative, past SK work/study.
// Grand total caps at 110; SINP's minimum eligibility score is 60.
//
// Only Factor I is derivable from the generic applicant profile. Factor II and a
// missing second-language test are province-specific facts the profile does not
// hold, so they are surfaced as "to confirm" rather than silently scored zero.

import { scoresToClb, type ApplicantProfile, type EducationLevel } from './crs-calculator'

// ── Grid constants (saskatchewan.ca) ─────────────────────────────────────────

export const SINP_MAX_POINTS = 110
export const SINP_PASS_MARK = 60 // SINP minimum eligibility score (out of 110)

const FACTOR_II_MAX = 30

const EDUCATION_MAX = 23
const WORK_EXPERIENCE_MAX = 10 // window a) — the 5-year window the profile can speak to
const FIRST_LANGUAGE_MAX = 20
const SECOND_LANGUAGE_MAX = 10
const AGE_MAX = 12

// Education and Training — points for the applicant's highest credential.
const EDUCATION_POINTS: Record<EducationLevel, number> = {
  less_than_secondary: 0,
  secondary: 0,
  one_year_post_secondary: 12, // certificate / at least two semesters, under a two-year program
  two_year_post_secondary: 15, // two but less than three years
  bachelors: 20,               // Bachelor's OR at least a three-year degree
  two_or_more_degrees: 20,     // two+ credentials, at least one 3+ years
  masters: 23,
  doctoral: 23,
}

// ── Factor I pure scorers (each verified against the published grid) ──────────

export function sinpEducationPoints(education: EducationLevel): number {
  return EDUCATION_POINTS[education]
}

// Skilled work experience in the 5 years before applying. The profile holds only
// a duration, not dated history, so the older 6–10 year window is left to confirm.
export function sinpWorkExperiencePoints(years: number): number {
  const whole = Math.floor(years)
  if (whole >= 5) return 10
  if (whole === 4) return 8
  if (whole === 3) return 6
  if (whole === 2) return 4
  if (whole === 1) return 2
  return 0
}

export function sinpFirstLanguagePoints(clb: number): number {
  if (clb >= 8) return 20
  if (clb === 7) return 18
  if (clb === 6) return 16
  if (clb === 5) return 14
  if (clb === 4) return 12
  return 0
}

export function sinpSecondLanguagePoints(clb: number): number {
  if (clb >= 8) return 10
  if (clb === 7) return 8
  if (clb === 6) return 6
  if (clb === 5) return 4
  if (clb === 4) return 2
  return 0
}

export function sinpAgePoints(age: number): number {
  if (age < 18) return 0
  if (age <= 21) return 8
  if (age <= 34) return 12
  if (age <= 45) return 10
  if (age <= 50) return 8
  return 0
}

// ── Aggregate ────────────────────────────────────────────────────────────────

export type SinpFactorStatus = 'computed' | 'to-confirm'

export interface SinpFactor {
  key: string
  label: string
  points: number
  maxPoints: number
  status: SinpFactorStatus
  detail: string
}

export interface SinpScore {
  factors: SinpFactor[]
  computedPoints: number      // sum of the computed factors only
  maxPoints: number           // 110
  passMark: number            // 60
  meetsPassMark: boolean      // computed points already clear 60 (before any to-confirm credit)
  hasUnconfirmedFactors: boolean
}

function minClb(scores: ApplicantProfile['firstLanguageScores']): number {
  const b = scoresToClb(scores)
  return Math.min(b.listening, b.reading, b.writing, b.speaking)
}

export function scoreSinp(profile: ApplicantProfile): SinpScore {
  const factors: SinpFactor[] = []

  // Education
  const eduPts = sinpEducationPoints(profile.education)
  factors.push({
    key: 'education',
    label: 'Education and training',
    points: eduPts,
    maxPoints: EDUCATION_MAX,
    status: 'computed',
    detail: 'Scored on the applicant’s highest credential.',
  })

  // Skilled work experience (last 5 years). Recency is assumed, since the profile
  // records total years rather than dated employment history.
  const totalYears = profile.foreignWorkExperienceYears + profile.canadianWorkExperienceYears
  factors.push({
    key: 'work-experience',
    label: 'Skilled work experience (last 5 years)',
    points: sinpWorkExperiencePoints(totalYears),
    maxPoints: WORK_EXPERIENCE_MAX,
    status: 'computed',
    detail: 'Assumes the recorded experience falls within the 5 years before applying. Additional points for work 6–10 years prior require dated history (to confirm).',
  })

  // First language
  const firstClb = minClb(profile.firstLanguageScores)
  factors.push({
    key: 'first-language',
    label: 'First language test',
    points: sinpFirstLanguagePoints(firstClb),
    maxPoints: FIRST_LANGUAGE_MAX,
    status: 'computed',
    detail: `Lowest ability band CLB ${firstClb}.`,
  })

  // Second language — only if a second official-language test is on file.
  if (profile.hasSecondLanguage && profile.secondLanguageScores) {
    const secondClb = minClb(profile.secondLanguageScores)
    factors.push({
      key: 'second-language',
      label: 'Second language test',
      points: sinpSecondLanguagePoints(secondClb),
      maxPoints: SECOND_LANGUAGE_MAX,
      status: 'computed',
      detail: `Lowest ability band CLB ${secondClb}.`,
    })
  } else {
    factors.push({
      key: 'second-language',
      label: 'Second language test',
      points: 0,
      maxPoints: SECOND_LANGUAGE_MAX,
      status: 'to-confirm',
      detail: 'No second official-language test on file. A valid test in the other official language adds up to 10 points.',
    })
  }

  // Age
  factors.push({
    key: 'age',
    label: 'Age',
    points: sinpAgePoints(profile.age),
    maxPoints: AGE_MAX,
    status: 'computed',
    detail: `Age ${profile.age}.`,
  })

  // Factor II — Saskatchewan connection. None of its items (SK job offer, SK
  // family relative, prior SK work/study) can be read from the generic profile.
  factors.push({
    key: 'sk-connection',
    label: 'Connection to Saskatchewan (Factor II)',
    points: 0,
    maxPoints: FACTOR_II_MAX,
    status: 'to-confirm',
    detail: 'Up to 30 points for a high-skilled Saskatchewan job offer (30), a close SK family relative (20), or past SK work/study (5 each) — none captured by this profile.',
  })

  const computedPoints = factors
    .filter(f => f.status === 'computed')
    .reduce((acc, f) => acc + f.points, 0)

  return {
    factors,
    computedPoints,
    maxPoints: SINP_MAX_POINTS,
    passMark: SINP_PASS_MARK,
    meetsPassMark: computedPoints >= SINP_PASS_MARK,
    hasUnconfirmedFactors: factors.some(f => f.status === 'to-confirm'),
  }
}
