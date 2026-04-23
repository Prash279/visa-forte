import { describe, it, expect } from 'vitest'
import { CRM_STAGES, CreateClientSchema, UpdateClientSchema } from './crm-stages'

describe('CRM_STAGES', () => {
  it('has exactly 9 stages', () => {
    expect(CRM_STAGES).toHaveLength(9)
  })
  it('starts with Lead', () => {
    expect(CRM_STAGES[0]).toBe('Lead')
  })
  it('ends with Archived', () => {
    expect(CRM_STAGES[CRM_STAGES.length - 1]).toBe('Archived')
  })
  it('includes ITA Window', () => {
    expect(CRM_STAGES).toContain('ITA Window')
  })
})

describe('CreateClientSchema', () => {
  it('accepts valid data', () => {
    const result = CreateClientSchema.safeParse({
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
      serviceTier: 'Pre-Application Eligibility Assessment',
    })
    expect(result.success).toBe(true)
  })
  it('rejects missing name', () => {
    const result = CreateClientSchema.safeParse({
      email: 'ravi@example.com',
      serviceTier: 'PNP Stream Matching',
    })
    expect(result.success).toBe(false)
  })
  it('rejects invalid email', () => {
    const result = CreateClientSchema.safeParse({
      name: 'Ravi',
      email: 'not-an-email',
      serviceTier: 'PNP Stream Matching',
    })
    expect(result.success).toBe(false)
  })
  it('accepts optional phone', () => {
    const result = CreateClientSchema.safeParse({
      name: 'Ravi',
      email: 'ravi@example.com',
      phone: '+91-9876543210',
      serviceTier: 'PNP Stream Matching',
    })
    expect(result.success).toBe(true)
  })
})

describe('UpdateClientSchema', () => {
  it('accepts valid stage update', () => {
    const result = UpdateClientSchema.safeParse({ stage: 'Active Client' })
    expect(result.success).toBe(true)
  })
  it('accepts notes update', () => {
    const result = UpdateClientSchema.safeParse({ notes: 'Client submitted docs.' })
    expect(result.success).toBe(true)
  })
  it('rejects invalid stage value', () => {
    const result = UpdateClientSchema.safeParse({ stage: 'Not A Real Stage' })
    expect(result.success).toBe(false)
  })
  it('rejects empty update (requires at least one field)', () => {
    const result = UpdateClientSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
