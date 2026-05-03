#!/usr/bin/env node
// Fetches the IRCC settlement funds table from canada.ca and updates
// apps/web/src/lib/proof-of-funds.json if the values have changed.
//
// Exit codes:
//   0 — fetched successfully, no change (nothing to commit)
//   1 — fatal error (fetch failed, parse failed, page structure changed)
// On change: writes the updated JSON and exits 0. GitHub Actions detects
// the dirty file with `git diff --quiet` and commits it.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FUNDS_JSON = join(ROOT, 'apps/web/src/lib/proof-of-funds.json')

const IRCC_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html'

async function fetchPage() {
  const res = await fetch(IRCC_URL, {
    headers: {
      'User-Agent': 'VisaForte-DataSync/1.0 (+https://visaforte.com)',
      Accept: 'text/html',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} from canada.ca`)
  return res.text()
}

function parseFundsTable(html) {
  const byFamilySize = {}

  // Match table rows: <td>1</td> ... <td>$15,263</td>
  // canada.ca uses a simple two-column table; the pattern is stable across minor HTML changes.
  const rowRe = /<tr[^>]*>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*\$\s*([\d,]+)\s*<\/td>\s*<\/tr>/gi
  let m
  while ((m = rowRe.exec(html)) !== null) {
    const n = parseInt(m[1], 10)
    const amount = parseInt(m[2].replace(/,/g, ''), 10)
    if (n >= 1 && n <= 7 && amount > 5000) byFamilySize[String(n)] = amount
  }

  if (Object.keys(byFamilySize).length !== 7) {
    throw new Error(
      `Expected 7 family-size rows, parsed ${Object.keys(byFamilySize).length}. ` +
        'The canada.ca page structure may have changed — manual review required.'
    )
  }

  // "add $4,112 for each additional family member"
  const extraRe = /\$\s*([\d,]+)\s+for\s+each\s+additional/i
  const extraM = extraRe.exec(html)
  if (!extraM) {
    throw new Error(
      'Could not find per-additional-member increment on canada.ca page. Manual review required.'
    )
  }
  const extraPerMember = parseInt(extraM[1].replace(/,/g, ''), 10)

  return { byFamilySize, extraPerMember }
}

async function main() {
  console.log(`Fetching: ${IRCC_URL}`)
  const html = await fetchPage()

  const { byFamilySize, extraPerMember } = parseFundsTable(html)
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
  const updated = {
    ...existing,
    lastUpdated: today,
    byFamilySize,
    extraPerMember,
  }
  writeFileSync(FUNDS_JSON, JSON.stringify(updated, null, 2) + '\n')
  console.log(`Updated proof-of-funds.json (lastUpdated: ${today})`)
}

main().catch((err) => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
