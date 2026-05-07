import { describe, it, expect } from 'vitest'
import { AssessmentLeadSchema } from './assessment-lead-schema'

const valid = {
  name: 'Arjun Sharma',
  email: 'arjun@example.com',
  crsScore: 487,
  consentGiven: true as const,
}

describe('AssessmentLeadSchema', () => {
  it('accepts a valid submission', () => {
    const result = AssessmentLeadSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects when name is empty', () => {
    const result = AssessmentLeadSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid email address', () => {
    const result = AssessmentLeadSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects when consent is not given', () => {
    const result = AssessmentLeadSchema.safeParse({ ...valid, consentGiven: false })
    expect(result.success).toBe(false)
  })

  it('rejects a CRS score above 1200', () => {
    const result = AssessmentLeadSchema.safeParse({ ...valid, crsScore: 1201 })
    expect(result.success).toBe(false)
  })

  it('rejects a negative CRS score', () => {
    const result = AssessmentLeadSchema.safeParse({ ...valid, crsScore: -1 })
    expect(result.success).toBe(false)
  })
})