#!/usr/bin/env node
// Fetches the Express Entry rounds-of-invitations table from canada.ca and
// updates apps/web/src/lib/crs-draw-history.json with the most recent 25 draws.
//
// Exit codes:
//   0 — success (updated or unchanged)
//   1 — fatal error (fetch failed or page structure changed)
//
// On any change, writes the updated JSON; caller detects via `git diff --quiet`.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DRAWS_JSON = join(ROOT, 'apps/web/src/lib/crs-draw-history.json')

const IRCC_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html'

const MONTHS = {
  January: '01', February: '02', March: '03', April: '04',
  May: '05', June: '06', July: '07', August: '08',
  September: '09', October: '10', November: '11', December: '12',
}

function parseDate(str) {
  // "April 30, 2025" → "2025-04-30"
  const m = str.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/)
  if (!m) return null
  const month = MONTHS[m[1]]
  if (!month) return null
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`
}

async function fetchPage() {
  const res = await fetch(IRCC_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-CA,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} from canada.ca`)
  return res.text()
}

function parseDrawsTable(html) {
  const draws = []

  // Match tbody rows in the rounds-of-invitations table.
  // Each row: Date | Type | CRS score | # invitations
  // The table id is "round-history" or similar on canada.ca.
  const rowRe =
    /<tr[^>]*>\s*<td[^>]*>\s*([A-Za-z]+ \d{1,2}, \d{4})\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*([\d,]+)\s*<\/td>\s*<td[^>]*>\s*([\d,]+)\s*<\/td>\s*<\/tr>/gi

  let m
  while ((m = rowRe.exec(html)) !== null) {
    const date = parseDate(m[1])
    if (!date) continue

    // Strip HTML tags from type cell (some cells have links or spans)
    const type = m[2].replace(/<[^>]+>/g, '').trim()
    const cutoffScore = parseInt(m[3].replace(/,/g, ''), 10)
    const invitationsIssued = parseInt(m[4].replace(/,/g, ''), 10)

    if (!type || isNaN(cutoffScore) || isNaN(invitationsIssued)) continue
    if (cutoffScore < 200 || cutoffScore > 1200) continue // sanity check

    draws.push({ date, type, cutoffScore, invitationsIssued })
  }

  if (draws.length === 0) {
    throw new Error(
      'No draw rows parsed from canada.ca page. ' +
        'The table structure may have changed — manual review required.'
    )
  }

  // Sort most-recent first, keep latest 25
  draws.sort((a, b) => b.date.localeCompare(a.date))
  return draws.slice(0, 25)
}

async function main() {
  console.log(`Fetching: ${IRCC_URL}`)
  const html = await fetchPage()
  console.log(`Fetched ${html.length} bytes`)

  const draws = parseDrawsTable(html)
  console.log(`Parsed ${draws.length} draws. Most recent: ${draws[0]?.date} — ${draws[0]?.type} — ${draws[0]?.cutoffScore}`)

  const existing = JSON.parse(readFileSync(DRAWS_JSON, 'utf-8'))

  // Compare: same count, same most-recent-5 draws
  const existingTop5 = JSON.stringify(existing.draws.slice(0, 5))
  const newTop5 = JSON.stringify(draws.slice(0, 5))
  const unchanged = existingTop5 === newTop5

  if (unchanged) {
    console.log('No change — crs-draw-history.json is current.')
    return
  }

  const today = new Date().toISOString().split('T')[0]
  const updated = { ...existing, lastUpdated: today, draws }
  writeFileSync(DRAWS_JSON, JSON.stringify(updated, null, 2) + '\n')
  console.log(`Updated crs-draw-history.json with ${draws.length} draws (lastUpdated: ${today})`)
}

main().catch((err) => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
