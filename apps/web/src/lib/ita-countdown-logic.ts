// Pure logic for the RT-3 60-Day Countdown Planner.
// Given an ITA date and applicant profile, produces a personalised document
// checklist with exact start-by and deadline dates. No I/O — deterministic.

export interface ItaInput {
  itaDate: string // ISO date, e.g. "2026-07-04"
  citizenshipCountry: string
  residenceCountries: string[]
  hasSpouse: boolean
  numDependentChildren: number
  tier: 'standard' | 'premium'
}

export interface ChecklistItem {
  id: string
  task: string
  startByDate: string // ISO date
  deadlineDate: string // ISO date
  notes: string
}

// Countries with longer police certificate processing times (locked decision).
const LONG_POLICE_CERT_COUNTRIES = ['India', 'Pakistan']

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// Submission deadline is always ITA date + 58 days (2-day buffer before the 60-day cutoff).
export function generateChecklist(input: ItaInput): ChecklistItem[] {
  const { itaDate, citizenshipCountry, residenceCountries, hasSpouse, numDependentChildren } = input

  const allCountries = [citizenshipCountry, ...residenceCountries]
  const longLeadTime = allCountries.some((c) => LONG_POLICE_CERT_COUNTRIES.includes(c))

  const items: ChecklistItem[] = [
    {
      id: 'police_certificate',
      task: 'Police clearance certificate(s)',
      startByDate: addDays(itaDate, 0),
      deadlineDate: addDays(itaDate, 50),
      notes: longLeadTime
        ? '6–8 weeks processing — start immediately.'
        : '4–6 weeks processing — standard lead time.',
    },
    {
      id: 'medical_exam',
      task: 'Immigration medical exam',
      startByDate: addDays(itaDate, 3),
      deadlineDate: addDays(itaDate, 40),
      notes: 'Book your appointment with a panel physician as soon as possible.',
    },
    {
      id: 'language_test',
      task: 'Confirm language test validity',
      startByDate: addDays(itaDate, 0),
      deadlineDate: addDays(itaDate, 7),
      notes: 'Test results must be less than 2 years old on the day you submit your application.',
    },
    {
      id: 'employment_letters',
      task: 'Employment reference letters',
      startByDate: addDays(itaDate, 7),
      deadlineDate: addDays(itaDate, 30),
      notes: 'Request letters on official letterhead covering duties, hours, and salary.',
    },
    {
      id: 'document_translations',
      task: 'Certified translations of non-English/French documents',
      startByDate: addDays(itaDate, 7),
      deadlineDate: addDays(itaDate, 42),
      notes: 'Use a certified translator — machine translations are not accepted.',
    },
    {
      id: 'biometrics',
      task: 'Biometrics',
      startByDate: addDays(itaDate, 0),
      deadlineDate: addDays(itaDate, 45),
      notes: 'Check whether your biometrics are still valid from a prior application before booking a new appointment.',
    },
    {
      id: 'final_submission',
      task: 'Final document upload and submission',
      startByDate: addDays(itaDate, 50),
      deadlineDate: addDays(itaDate, 58),
      notes: 'Submit with a 2-day buffer before the 60-day ITA deadline.',
    },
  ]

  if (hasSpouse) {
    items.push({
      id: 'spouse_letter_of_support',
      task: "Sponsor's letter of support",
      startByDate: addDays(itaDate, 7),
      deadlineDate: addDays(itaDate, 30),
      notes: 'Signed statement from your spouse confirming their participation in the application.',
    })
  }

  for (let i = 0; i < numDependentChildren; i++) {
    items.push({
      id: `child_${i + 1}_birth_certificate`,
      task: `Child ${i + 1}: birth certificate + certified translation`,
      startByDate: addDays(itaDate, 7),
      deadlineDate: addDays(itaDate, 42),
      notes: 'Include a certified translation if the original is not in English or French.',
    })
  }

  return items.sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))
}
