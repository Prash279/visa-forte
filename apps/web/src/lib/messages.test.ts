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

describe('One-reply-per-thread logic', () => {
  it('correctly identifies whether a client has already replied', () => {
    const thread = [
      { senderRole: 'admin', body: 'Please send your docs.' },
      { senderRole: 'client', body: 'Done, uploaded.' },
    ]
    const hasClientReply = thread.some((m) => m.senderRole === 'client')
    expect(hasClientReply).toBe(true)
  })

  it('correctly identifies a thread with no client reply', () => {
    const thread = [
      { senderRole: 'admin', body: 'Please send your docs.' },
    ]
    const hasClientReply = thread.some((m) => m.senderRole === 'client')
    expect(hasClientReply).toBe(false)
  })

  it('empty thread has no client reply', () => {
    const thread: { senderRole: string; body: string }[] = []
    const hasClientReply = thread.some((m) => m.senderRole === 'client')
    expect(hasClientReply).toBe(false)
  })
})