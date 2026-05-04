#!/usr/bin/env node
// Fetches the Express Entry rounds data directly from the IRCC JSON API and
// updates apps/web/src/lib/crs-draw-history.json with the most recent 25 draws.
//
// Strategy: navigate to the JSON API URL in a Playwright browser (bypasses
// Cloudflare), then parse document.body.innerText as JSON. No HTML scraping,
// no table parsing — the API response is the canonical source of truth.
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
const DRAWS_JSON = join(ROOT, 'apps/web/src/lib/crs-draw-history.json')

const IRCC_JSON_API =
  'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_4_en.json'

const MONTHS = {
  January: '01', February: '02', March: '03', April: '04',
  May: '05', June: '06', July: '07', August: '08',
  September: '09', October: '10', November: '11', December: '12',
}

function parseDate(str) {
  const m = str.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/)
  if (!m) return null
  const month = MONTHS[m[1]]
  return month ? `${m[3]}-${month}-${m[2].padStart(2, '0')}` : null
}

async function fetchRoundsJSON() {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const response = await page.goto(IRCC_JSON_API, { waitUntil: 'networkidle', timeout: 60000 })
    console.log(`Response status: ${response?.status()} | URL: ${page.url()}`)

    const raw = await page.evaluate(() => document.body.innerText)
    const data = JSON.parse(raw)
    const roundCount = Object.keys(data.rounds ?? {}).length
    console.log(`Rounds in API response: ${roundCount}`)
    return data
  } finally {
    await browser.close()
  }
}

function parseDraws(data) {
  if (!data.rounds || typeof data.rounds !== 'object') {
    throw new Error('Unexpected JSON structure — "rounds" key missing or not an object.')
  }

  const draws = Object.values(data.rounds)
    .map(r => ({
      date: parseDate(r.drawDateFull ?? ''),
      type: (r.drawName ?? '').trim(),
      cutoffScore: parseInt(String(r.drawCRS ?? '').replace(/,/g, ''), 10),
      invitationsIssued: parseInt(String(r.drawSize ?? '').replace(/,/g, ''), 10),
    }))
    .filter(d => d.date && d.type && !isNaN(d.cutoffScore) && !isNaN(d.invitationsIssued))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 25)

  if (draws.length === 0) {
    throw new Error('Parsed 0 valid draws from API response. Manual review required.')
  }

  return draws
}

async function main() {
  console.log(`Fetching IRCC JSON API: ${IRCC_JSON_API}`)
  const data = await fetchRoundsJSON()
  const draws = parseDraws(data)
  console.log(`Parsed ${draws.length} draws. Most recent: ${draws[0]?.date} — ${draws[0]?.type} — cutoff ${draws[0]?.cutoffScore}`)

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