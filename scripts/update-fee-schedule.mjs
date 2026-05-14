#!/usr/bin/env node
// Fetches IRCC fee schedule from the official fees page and updates
// apps/web/src/lib/fee-schedule.json with current Express Entry PR fees.
//
// Strategy: navigate to the HTML fees page in a Playwright browser (handles
// any redirect/bot protection), collect all table rows as text arrays, then
// match target fees by description. Falls back to existing values for any row
// that cannot be confidently matched — it never silently zeroes a fee.
//
// Exit codes:
//   0 — success (updated or unchanged)
//   1 — fatal error (page unreachable or JSON unreadable)

import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FEE_JSON = join(ROOT, 'apps/web/src/lib/fee-schedule.json')

const IRCC_FEES_URL = 'https://ircc.canada.ca/english/information/fees/fees.asp'

// Each target: a regex to find the fee row by description text, and the
// canonical display label used in fee-schedule.json and on the Visas page.
const FEE_TARGETS = [
  {
    match: /principal applicant/i,
    item: 'Principal applicant — processing fee',
  },
  {
    match: /spouse|common.law/i,
    item: 'Spouse or common-law partner — processing fee',
  },
  {
    match: /dependent child/i,
    item: 'Dependent child — processing fee (per child)',
  },
  {
    match: /right of permanent residence/i,
    item: 'Right of Permanent Residence Fee — per adult',
  },
]

// Parses "$1,365.00", "1,365", "230", "$515.00" → "CAD 1,365" / "CAD 230"
function parseAmount(raw) {
  const stripped = raw.replace(/[$\s]/g, '').replace(/,/g, '').replace(/\.00$/, '')
  const n = parseInt(stripped, 10)
  if (isNaN(n) || n <= 0) return null
  return `CAD ${n.toLocaleString('en-CA')}`
}

async function scrapeFeePage() {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const response = await page.goto(IRCC_FEES_URL, { waitUntil: 'networkidle', timeout: 60000 })
    console.log(`Response status: ${response?.status()} | URL: ${page.url()}`)

    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll('table tr')).map(tr =>
        Array.from(tr.querySelectorAll('td, th')).map(c => c.innerText.trim())
      )
    )

    console.log(`Found ${rows.length} table rows on fees page`)
    return rows
  } finally {
    await browser.close()
  }
}

function matchFees(rows, existing) {
  return FEE_TARGETS.map((target) => {
    const row = rows.find(cells => cells.some(cell => target.match.test(cell)))

    if (!row) {
      console.warn(`WARNING: No row matched for "${target.item}" — keeping existing value`)
      return existing.fees.find(f => f.item === target.item) ?? { item: target.item, amount: 'CAD 0' }
    }

    // Amount is the last cell that looks like a number
    const amountCell = [...row].reverse().find(cell => /\d{2,}/.test(cell))
    const amount = amountCell ? parseAmount(amountCell) : null

    if (!amount) {
      console.warn(`WARNING: Could not parse amount for "${target.item}" (row: ${row.join(' | ')}) — keeping existing value`)
      return existing.fees.find(f => f.item === target.item) ?? { item: target.item, amount: 'CAD 0' }
    }

    console.log(`Matched "${target.item}" → ${amount}`)
    return { item: target.item, amount }
  })
}

async function main() {
  console.log(`Fetching IRCC fees page: ${IRCC_FEES_URL}`)
  const rows = await scrapeFeePage()
  const existing = JSON.parse(readFileSync(FEE_JSON, 'utf-8'))
  const fees = matchFees(rows, existing)

  if (JSON.stringify(existing.fees) === JSON.stringify(fees)) {
    console.log('No change — fee-schedule.json is current.')
    return
  }

  const today = new Date().toISOString().split('T')[0]
  const updated = { ...existing, lastUpdated: today, fees }
  writeFileSync(FEE_JSON, JSON.stringify(updated, null, 2) + '\n')
  console.log(`Updated fee-schedule.json (lastUpdated: ${today})`)
  fees.forEach(f => console.log(`  ${f.item}: ${f.amount}`))
}

main().catch((err) => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
