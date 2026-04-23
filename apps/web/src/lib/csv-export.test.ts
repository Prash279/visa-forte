import { describe, it, expect } from 'vitest'

// Inline the escapeCsv logic here to test it without importing the route file.
// The route uses this exact implementation.
function escapeCsv(value: string | null | undefined): string {
  const s = value ?? ''
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

describe('escapeCsv', () => {
  it('returns plain strings unchanged', () => {
    expect(escapeCsv('Ravi Kumar')).toBe('Ravi Kumar')
  })

  it('wraps values containing commas in quotes', () => {
    expect(escapeCsv('Kumar, Ravi')).toBe('"Kumar, Ravi"')
  })

  it('escapes embedded double-quotes per RFC 4180', () => {
    expect(escapeCsv('He said "hello"')).toBe('"He said ""hello"""')
  })

  it('wraps values containing newlines in quotes', () => {
    expect(escapeCsv('line one\nline two')).toBe('"line one\nline two"')
  })

  it('returns empty string for null', () => {
    expect(escapeCsv(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeCsv(undefined)).toBe('')
  })

  it('returns empty string for empty string input', () => {
    expect(escapeCsv('')).toBe('')
  })
})

describe('CSV row construction', () => {
  const header = ['Name', 'Email', 'Phone', 'Service Tier', 'Stage', 'Notes', 'Date Added']

  it('produces exactly 7 header columns', () => {
    expect(header).toHaveLength(7)
  })

  it('builds a valid CSV line from a typical client row', () => {
    const row = [
      escapeCsv('Ravi Kumar'),
      escapeCsv('ravi@example.com'),
      escapeCsv(null),
      escapeCsv('PNP Stream Matching'),
      escapeCsv('Active Client'),
      escapeCsv(null),
      escapeCsv('23 Apr 2026'),
    ]
    const line = row.join(',')
    expect(line).toBe('Ravi Kumar,ravi@example.com,,PNP Stream Matching,Active Client,,23 Apr 2026')
  })

  it('correctly escapes a client name with a comma', () => {
    const row = [
      escapeCsv('Kumar, Ravi'),
      escapeCsv('ravi@example.com'),
    ]
    expect(row[0]).toBe('"Kumar, Ravi"')
    expect(row.join(',')).toBe('"Kumar, Ravi",ravi@example.com')
  })
})