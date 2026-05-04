#!/usr/bin/env node
// Fetches the IRCC settlement funds table from canada.ca and updates
// apps/web/src/lib/proof-of-funds.json if the values have changed.
//
// The canada.ca proof-of-funds table uses <th> for the family-size column and
// <td> for the dollar amount. We query 'td, th' to capture both.
// The "additional family member" row is detected by cell text containing "additional".
//
// Exit codes:
//   0 — success (updated or unchanged)
//   1 — fatal error

import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FUNDS_JSON = join(ROOT, 'apps/web/src/lib/proof-of-funds.json')

const IRCC_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html'

async function scrapeFunds() {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const response = await page.goto(IRCC_URL, { waitUntil: 'networkidle', timeout: 60000 })
    console.log(`Page status: ${response?.status()} | URL: ${page.url()}`)

    // The table uses <th> for family-size cells and <td> for dollar amounts.
    // Querying 'td, th' captures all cells in document order per row.
    const { title, rows } = await page.evaluate(() => {
      const rows = []
      for (const row of document.querySelectorAll('table tr')) {
        const cells = row.querySelectorAll('td, th')
        if (cells.length >= 2) {
          rows.push(Array.from(cells).map(cell => cell.innerText.trim()))
        }
      }
      return { title: document.title, rows }
    })

    console.log(`Page title: "${title}" | Table rows found: ${rows.length}`)
    return rows
  } finally {
    await browser.close()
  }
}

function parseFunds(rows) {
  const byFamilySize = {}
  let extraPerMember = null

  for (const cells of rows) {
    if (cells.length < 2) continue

    const firstCell = cells[0].toLowerCase()
    const amountStr = cells[1].replace(/[$,\s]/g, '')
    const amount = parseInt(amountStr, 10)

    if (isNaN(amount) || amount < 1000) continue

    // Row for "additional family member" — text detection
    if (firstCell.includes('additional')) {
      extraPerMember = amount
      continue
    }

    const n = parseInt(cells[0], 10)
    if (n >= 1 && n <= 7) {
      byFamilySize[String(n)] = amount
    }
  }

  if (Object.keys(byFamilySize).length !== 7) {
    throw new Error(
      `Expected 7 family-size rows, parsed ${Object.keys(byFamilySize).length}. ` +
      'The page may be showing a challenge/redirect or the table structure changed.'
    )
  }

  if (extraPerMember === null) {
    throw new Error(
      'Could not find per-additional-member row on canada.ca page. Manual review required.'
    )
  }

  return { byFamilySize, extraPerMember }
}

async function main() {
  console.log(`Fetching: ${IRCC_URL}`)
  const rows = await scrapeFunds()
  const { byFamilySize, extraPerMember } = parseFunds(rows)
  console.log('Parsed:', { byFamilySize, extraPerMember })

  const existing = JSON.parse(readFileSync(FUNDS_JSON, 'utf-8'))
  const table = existing.byFamilySize

  const unchanged =
    extraPerMember === existing.extraPerMember &&
    Object.keys(byFamilySize).every((k) => byFamilySize[k] === table[k])

  if (unchanged) {
    console.log('No change — proof-of-funds.json is current.')
    return
  }

  const today = new Date().toISOString().split('T')[0]
  const updated = { ...existing, lastUpdated: today, byFamilySize, extraPerMember }
  writeFileSync(FUNDS_JSON, JSON.stringify(updated, null, 2) + '\n')
  console.log(`Updated proof-of-funds.json (lastUpdated: ${today})`)
}

main().catch((err) => {
  console.error('FATAL:', err.message)
  process.exit(1)
})