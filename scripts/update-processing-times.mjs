#!/usr/bin/env node
// Fetches IRCC processing times for Express Entry and PNP streams from canada.ca
// and updates apps/web/src/lib/processing-times.json if values have changed.
//
// The IRCC check-processing-times page uses a two-step dropdown widget:
//   1. Select the application category (e.g. "Permanent residence")
//   2. Select the sub-type (e.g. "Federal Skilled Worker")
// Playwright drives the UI and reads the displayed time from the result element.
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
const TIMES_JSON = join(ROOT, 'apps/web/src/lib/processing-times.json')

const IRCC_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html'

// Programs to scrape. The `category` and `subType` values must match the text
// in the IRCC dropdown options exactly (case-insensitive match attempted).
const PROGRAMS = [
  { id: 'ee_fswp',         category: 'Permanent residence', subType: 'Federal Skilled Worker Program' },
  { id: 'ee_cec',          category: 'Permanent residence', subType: 'Canadian Experience Class'      },
  { id: 'ee_fstp',         category: 'Permanent residence', subType: 'Federal Skilled Trades Program' },
  { id: 'pnp_enhanced',    category: 'Permanent residence', subType: 'Provincial Nominee Program (enhanced stream)' },
  { id: 'pnp_base',        category: 'Permanent residence', subType: 'Provincial Nominee Program (base stream)'     },
  { id: 'sponsorship_spouse', category: 'Family sponsorship', subType: 'Spouse, common-law or conjugal partner'    },
]

// Parse "X months" or "X weeks" out of a result string and return whole months.
function parseMonths(text) {
  if (!text) return null
  const monthMatch = text.match(/(\d+)\s*month/i)
  if (monthMatch) return parseInt(monthMatch[1], 10)
  const weekMatch  = text.match(/(\d+)\s*week/i)
  if (weekMatch)  return Math.round(parseInt(weekMatch[1], 10) / 4.33)
  return null
}

// Select an option from a <select> element by matching option text (case-insensitive).
async function selectByText(page, selector, targetText) {
  const options = await page.evaluate(
    ({ selector, targetText }) => {
      const el = document.querySelector(selector)
      if (!el) return null
      const target = targetText.toLowerCase()
      const opt = Array.from(el.options).find(o => o.text.toLowerCase().includes(target))
      return opt ? opt.value : null
    },
    { selector, targetText }
  )
  if (options === null) throw new Error(`Option "${targetText}" not found in ${selector}`)
  await page.selectOption(selector, options)
}

// Wait for a result element to appear and return its visible text.
async function readResult(page) {
  // IRCC renders the result in a div/p after both dropdowns are selected.
  // We wait for any element that contains "month" or "week" in its text.
  const result = await page.waitForFunction(
    () => {
      const candidates = document.querySelectorAll(
        '.processing-time, .result, [class*="result"], [class*="time"], p, div'
      )
      for (const el of candidates) {
        const t = el.innerText ?? ''
        if (/\d+\s*(month|week)/i.test(t) && el.children.length < 3) return t.trim()
      }
      return null
    },
    {},
    { timeout: 15000 }
  )
  return String(result)
}

async function scrapeAllPrograms() {
  const browser = await chromium.launch({ headless: true })
  const results = {}

  try {
    for (const program of PROGRAMS) {
      const page = await browser.newPage()
      try {
        console.log(`Fetching: ${program.id} (${program.subType})`)
        await page.goto(IRCC_URL, { waitUntil: 'networkidle', timeout: 60000 })

        // Step 1 — select the main category
        const selects = await page.$$('select')
        if (selects.length < 1) throw new Error('No <select> elements found on the page.')

        // Try the first select for the main category
        await selectByText(page, 'select:first-of-type', program.category)
        await page.waitForTimeout(800)

        // Step 2 — select the sub-type (second select, which may be dynamically rendered)
        const selects2 = await page.$$('select')
        if (selects2.length < 2) throw new Error(`Second <select> not found after selecting "${program.category}".`)
        await selectByText(page, 'select:nth-of-type(2)', program.subType)
        await page.waitForTimeout(800)

        const rawText = await readResult(page)
        const months  = parseMonths(rawText)
        console.log(`  → "${rawText}" → ${months} month(s)`)
        results[program.id] = { rawText, months }
      } catch (err) {
        console.warn(`  WARN: could not fetch ${program.id}: ${err.message}`)
        results[program.id] = null
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }

  return results
}

async function main() {
  console.log(`Fetching IRCC processing times: ${IRCC_URL}`)
  const scraped = await scrapeAllPrograms()

  const existing = JSON.parse(readFileSync(TIMES_JSON, 'utf-8'))
  let changed = false

  const updatedPrograms = existing.programs.map(prog => {
    const fresh = scraped[prog.id]
    if (!fresh) {
      console.log(`  Keeping existing value for ${prog.id} (scrape failed or skipped).`)
      return prog
    }
    if (fresh.months !== prog.months || fresh.rawText !== prog.rawText) {
      console.log(`  UPDATED ${prog.id}: ${prog.months}mo → ${fresh.months}mo ("${fresh.rawText}")`)
      changed = true
      return { ...prog, months: fresh.months, rawText: fresh.rawText }
    }
    return prog
  })

  if (!changed) {
    console.log('No change — processing-times.json is current.')
    return
  }

  const today   = new Date().toISOString().split('T')[0]
  const updated = { ...existing, lastUpdated: today, programs: updatedPrograms }
  writeFileSync(TIMES_JSON, JSON.stringify(updated, null, 2) + '\n')
  console.log(`Updated processing-times.json (lastUpdated: ${today})`)
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})