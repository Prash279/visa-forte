import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Inline the schemas from the API routes to test them in isolation.
// These mirror the Zod schemas in /api/admin/clients/[id]/messages and /api/portal/messages.

const AdminSendSchema = z.object({
  body: z.string().min(1, 'Message body is required').max(4000, 'Message too long'),
})

const ClientReplySchema = z.object({
  body: z.string().min(1, 'Message body is required').max(4000, 'Message too long'),
})

describe('AdminSendSchema', () => {
  it('accepts a valid message body', () => {
    const result = AdminSendSchema.safeParse({ body: 'Please send your passport copy.' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty body', () => {
    const result = AdminSendSchema.safeParse({ body: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Message body is required')
  })

  it('rejects a body that is too long', () => {
    const result = AdminSendSchema.safeParse({ body: 'x'.repeat(4001) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Message too long')
  })

  it('rejects missing body field', () => {
    const result = AdminSendSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects non-string body', () => {
    const result = AdminSendSchema.safeParse({ body: 123 })
    expect(result.success).toBe(false)
  })

  it('accepts the maximum allowed length exactly', () => {
    const result = AdminSendSchema.safeParse({ body: 'x'.repeat(4000) })
    expect(result.success).toBe(true)
  })
})

describe('ClientReplySchema', () => {
  it('accepts a valid reply', () => {
    const result = ClientReplySchema.safeParse({ body: 'I have uploaded my passport.' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty reply body', () => {
    const result = ClientReplySchema.safeParse({ body: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a reply that is too long', () => {
    const result = ClientReplySchema.safeParse({ body: 'a'.repeat(4001) })
    expect(result.success).toBe(false)
  })
})

// Mirrors isSlaBreached() in CrmTable.tsx — inline so no import needed
const SLA_ITA_MS = 12 * 60 * 60 * 1000
const SLA_STD_MS = 24 * 60 * 60 * 1000

function isSlaBreached(clientId: string, stage: string, oldestTs: Record<string, number>): boolean {
  const ts = oldestTs[clientId]
  if (!ts) return false
  const threshold = stage === 'ITA Window' ? SLA_ITA_MS : SLA_STD_MS
  return Date.now() - ts > threshold
}

describe('SLA threshold logic', () => {
  it('returns false when no timestamp exists for client', () => {
    expect(isSlaBreached('c1', 'Pre-Assessment', {})).toBe(false)
  })

  it('returns false when message is within 24h for a standard stage', () => {
    const ts = Date.now() - 20 * 60 * 60 * 1000 // 20h ago
    expect(isSlaBreached('c1', 'Pre-Assessment', { c1: ts })).toBe(false)
  })

  it('returns true when message exceeds 24h for a standard stage', () => {
    const ts = Date.now() - 25 * 60 * 60 * 1000 // 25h ago
    expect(isSlaBreached('c1', 'Pre-Assessment', { c1: ts })).toBe(true)
  })

  it('returns false when message is within 12h for ITA Window', () => {
    const ts = Date.now() - 10 * 60 * 60 * 1000 // 10h ago
    expect(isSlaBreached('c1', 'ITA Window', { c1: ts })).toBe(false)
  })

  it('returns true when message exceeds 12h for ITA Window', () => {
    const ts = Date.now() - 13 * 60 * 60 * 1000 // 13h ago
    expect(isSlaBreached('c1', 'ITA Window', { c1: ts })).toBe(true)
  })

  it('applies standard 24h threshold to non-ITA stages', () => {
    const ts = Date.now() - 23 * 60 * 60 * 1000 // 23h ago — within 24h
    expect(isSlaBreached('c2', 'Document Collection', { c2: ts })).toBe(false)
  })
})