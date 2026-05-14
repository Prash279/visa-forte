#!/usr/bin/env node
// Fetches IRCC fee schedule from the official fees page and updates
// apps/web/src/lib/fee-schedule.json with current Express Entry PR fees.
//
// Strategy: navigate to the HTML fees page in a Playwright browser (handles
// any redirect/bot protection), collect all table rows as text arrays, then
// match target fees by predicate. Falls back to existing values for any row
// that cannot be confidently matched — it never silently zeroes a fee.
//
// As of April 30, 2026, IRCC restructured the fee page: fees are now shown
// as bundled totals ("Your application" = processing + ROPRF). The ROPRF is
// no longer a standalone row and is computed as: total − processing fee.
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

// Predicate-based targets: more flexible than regex for IRCC's restructured page.
// Each `match` receives a row's cell array and returns true if that row is the target.
const FEE_TARGETS = [
  {
    // "Your application (without right of permanent residence fee)" — principal processing fee
    match: cells =>
      cells.some(c => /without right of permanent residence/i.test(c)) &&
      !cells.some(c => /spouse|partner/i.test(c)),
    item: 'Principal applicant — processing fee',
  },
  {
    // "Include your spouse or partner (without right of permanent residence fee)"
    match: cells =>
      cells.some(c => /spouse|partner/i.test(c)) &&
      cells.some(c => /without right of permanent residence/i.test(c)),
    item: 'Spouse or common-law partner — processing fee',
  },
  {
    match: cells => cells.some(c => /dependent child/i.test(c)),
    item: 'Dependent child — processing fee (per child)',
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

// ROPRF is no longer a standalone row on the IRCC page (as of April 30, 2026).
// Compute it as: "Your application" total − principal processing fee.
function computeRoprf(rows, existing, processingFee) {
  const item = 'Right of Permanent Residence Fee — per adult'

  const totalRow = rows.find(cells =>
    cells.some(c => /your application/i.test(c)) &&
    !cells.some(c => /without/i.test(c)) &&
    !cells.some(c => /spouse|partner/i.test(c))
  )

  if (!totalRow || !processingFee) {
    console.warn(`WARNING: Could not find total row or processing fee to compute ROPRF — keeping existing value`)
    return existing.fees.find(f => f.item === item) ?? { item, amount: 'CAD 0' }
  }

  // Amount cell starts with a digit or $, not text like "increased April 30, 2026"
  const totalCell = totalRow.find(c => /^\$?\d/.test(c.trim()))
  const total = totalCell ? parseInt(totalCell.replace(/[$\s,]/g, ''), 10) : NaN
  const processing = parseInt(processingFee.replace(/[^0-9]/g, ''), 10)

  if (isNaN(total) || isNaN(processing) || total <= processing) {
    console.warn(`WARNING: ROPRF computation failed (total=${total}, processing=${processing}) — keeping existing value`)
    return existing.fees.find(f => f.item === item) ?? { item, amount: 'CAD 0' }
  }

  const roprf = total - processing
  const amount = `CAD ${roprf.toLocaleString('en-CA')}`
  console.log(`Computed "${item}": ${total} (total) − ${processing} (processing) = ${roprf} → ${amount}`)
  return { item, amount }
}

function matchFees(rows, existing) {
  const matched = FEE_TARGETS.map((target) => {
    const row = rows.find(cells => target.match(cells))

    if (!row) {
      console.warn(`WARNING: No row matched for "${target.item}" — keeping existing value`)
      return existing.fees.find(f => f.item === target.item) ?? { item: target.item, amount: 'CAD 0' }
    }

    // Amount cell: starts with $ or digit — avoids "increased April 30, 2026" type badge cells
    const amountCell = row.find(cell => /^\$?\d/.test(cell.trim()))
    const amount = amountCell ? parseAmount(amountCell) : null

    if (!amount) {
      console.warn(`WARNING: Could not parse amount for "${target.item}" (row: ${row.join(' | ')}) — keeping existing value`)
      return existing.fees.find(f => f.item === target.item) ?? { item: target.item, amount: 'CAD 0' }
    }

    console.log(`Matched "${target.item}" → ${amount}`)
    return { item: target.item, amount }
  })

  const principalFee = matched.find(f => f.item === 'Principal applicant — processing fee')
  const roprf = computeRoprf(rows, existing, principalFee?.amount)

  return [...matched, roprf]
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
