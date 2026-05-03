#!/usr/bin/env node
// Fetches the IRCC settlement funds table from canada.ca and updates
// apps/web/src/lib/proof-of-funds.json if the values have changed.
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
const FUNDS_JSON = join(ROOT, 'apps/web/src/lib/proof-of-funds.json')

const IRCC_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html'

async function scrapeFunds() {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()

    // networkidle waits until there are no more than 2 active connections for 500ms.
    // This ensures Cloudflare JS challenges complete and the real page content renders
    // before we read the DOM.
    const response = await page.goto(IRCC_URL, { waitUntil: 'networkidle', timeout: 60000 })
    console.log(`Page status: ${response?.status()} | URL: ${page.url()}`)

    // Extract all table row cells and the full body text from the rendered DOM.
    // page.evaluate runs inside the browser — we get rendered text, not raw HTML.
    const { title, rows, bodyText } = await page.evaluate(() => {
      const rows = []
      for (const row of document.querySelectorAll('table tr')) {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 2) {
          rows.push(Array.from(cells).map(td => td.innerText.trim()))
        }
      }
      return {
        title: document.title,
        rows,
        // body text is used to find "add $X for each additional family member"
        bodyText: document.body.innerText,
      }
    })

    console.log(`Page title: "${title}" | Table rows found: ${rows.length}`)
    return { rows, bodyText }
  } finally {
    await browser.close()
  }
}

function parseFunds({ rows, bodyText }) {
  const byFamilySize = {}

  for (const cells of rows) {
    if (cells.length < 2) continue
    const n = parseInt(cells[0], 10)
    // Strip $, commas, and whitespace — works regardless of formatting
    const amount = parseInt(cells[1].replace(/[$,\s]/g, ''), 10)
    if (n >= 1 && n <= 7 && amount > 5000) {
      byFamilySize[String(n)] = amount
    }
  }

  if (Object.keys(byFamilySize).length !== 7) {
    throw new Error(
      `Expected 7 family-size rows, parsed ${Object.keys(byFamilySize).length}. ` +
      'The page may still be showing a challenge/redirect or the table structure changed.'
    )
  }

  // Find "add $X for each additional family member" in the rendered page text
  const extraM = bodyText.match(/\$\s*([\d,]+)\s+for\s+each\s+additional/i)
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
  const scraped = await scrapeFunds()

  const { byFamilySize, extraPerMember } = parseFunds(scraped)
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
