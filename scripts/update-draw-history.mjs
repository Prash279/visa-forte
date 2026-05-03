#!/usr/bin/env node
// Fetches the Express Entry rounds-of-invitations table from canada.ca and
// updates apps/web/src/lib/crs-draw-history.json with the most recent 25 draws.
//
// Uses Playwright DOM extraction (page.evaluate) with networkidle wait so the
// real page content is read after Cloudflare JS challenges complete and all
// dynamic content is rendered — no regex on raw HTML.
//
// Exit codes:
//   0 — success (updated or unchanged)
//   1 — fatal error (navigation failed or data not found)

import { chromium } from 'playwright'
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
  const m = str.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/)
  if (!m) return null
  const month = MONTHS[m[1]]
  if (!month) return null
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`
}

async function scrapeDraws() {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()

    // networkidle waits until there are no more than 2 active connections for 500ms.
    // This ensures Cloudflare JS challenges complete and the real page content renders
    // before we read the DOM.
    const response = await page.goto(IRCC_URL, { waitUntil: 'networkidle', timeout: 60000 })
    console.log(`Page status: ${response?.status()} | URL: ${page.url()}`)

    // Extract every table row's cell text directly from the rendered DOM.
    // page.evaluate runs inside the browser — we get rendered text, not raw HTML.
    const { title, rows } = await page.evaluate(() => {
      const rows = []
      for (const row of document.querySelectorAll('table tr')) {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 2) {
          rows.push(Array.from(cells).map(td => td.innerText.trim()))
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

function parseDrawRows(rows) {
  const draws = []
  for (const cells of rows) {
    if (cells.length < 4) continue
    const date = parseDate(cells[0])
    if (!date) continue

    // innerText already strips HTML — just normalise whitespace
    const type = cells[1].replace(/\s+/g, ' ').trim()
    const cutoffScore = parseInt(cells[2].replace(/,/g, ''), 10)
    const invitationsIssued = parseInt(cells[3].replace(/,/g, ''), 10)

    if (!type || isNaN(cutoffScore) || isNaN(invitationsIssued)) continue
    if (cutoffScore < 200 || cutoffScore > 1200) continue

    draws.push({ date, type, cutoffScore, invitationsIssued })
  }

  if (draws.length === 0) {
    throw new Error(
      'No draw rows found in any table on canada.ca page. ' +
      'The page may still be showing a challenge/redirect or the table structure changed.'
    )
  }

  draws.sort((a, b) => b.date.localeCompare(a.date))
  return draws.slice(0, 25)
}

async function main() {
  console.log(`Fetching: ${IRCC_URL}`)
  const rows = await scrapeDraws()

  const draws = parseDrawRows(rows)
  console.log(`Parsed ${draws.length} draws. Most recent: ${draws[0]?.date} — ${draws[0]?.type} — ${draws[0]?.cutoffScore}`)

  const existing = JSON.parse(readFileSync(DRAWS_JSON, 'utf-8'))
  const existingTop5 = JSON.stringify(existing.draws.slice(0, 5))
  const newTop5 = JSON.stringify(draws.slice(0, 5))

  if (existingTop5 === newTop5) {
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
