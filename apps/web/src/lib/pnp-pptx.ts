// PNP Pathway Assessment — PowerPoint (.pptx) export.
//
// Builds a native, editable Visa Forte deck with pptxgenjs (pure JS, no headless
// browser) so it runs client-side and deploys cleanly on Vercel. Mirrors the
// on-screen report's sections and the curated, sourced stream data — the same
// PnpAssessmentResult that drives PnpReport.tsx, so the two never diverge.

import { type ApplicantProfile } from './crs-calculator'
import {
  buildPnpInsights,
  type PnpAssessmentResult,
  type PnpStreamMatch,
  type PnpVerdict,
} from './pnp-eligibility'
import { scoreSinp } from './sinp-points'
import { analyzeSinpDraws, type SinpDrawVerdict } from './sinp-draws'

// Brand palette (hex without '#', as pptxgenjs expects).
const PRUSSIAN = '0C2340'
const PEARL = 'F8F4EE'
const SAFFRON = 'C97B1E'
const INK = '1A2B3C'
const MUTED = '475569'
const SAND = 'E2DBD1'
const TEAL = '1A5C72'
const WHITE = 'FFFFFF'
const GREEN = '1F7A4D'
const AMBER = 'B7791F'
const RED = 'B23A3A'

const SERIF = 'Georgia'
const SANS = 'Calibri'

const VERDICT_COLOR: Record<PnpVerdict, string> = {
  confirmed: GREEN,
  likely: TEAL,
  marginal: SAFFRON,
  ineligible: RED,
}
const VERDICT_LABEL: Record<PnpVerdict, string> = {
  confirmed: 'CONFIRMED',
  likely: 'LIKELY',
  marginal: 'MARGINAL',
  ineligible: 'INELIGIBLE',
}

const FOOTER_CONTACT = 'visaforte.com · prashant@visaforte.com'

// Minimal structural typings for the parts of the pptxgenjs API we use, so the
// dynamically imported module stays type-safe without pulling its types eagerly.
type PptxSlide = {
  background: { color: string }
  addText: (text: unknown, opts: Record<string, unknown>) => void
  addShape: (shape: unknown, opts: Record<string, unknown>) => void
  addTable: (rows: unknown[], opts: Record<string, unknown>) => void
}
type Pptx = {
  defineLayout: (l: { name: string; width: number; height: number }) => void
  layout: string
  ShapeType: Record<string, unknown>
  addSlide: () => PptxSlide
  write: (opts: { outputType: string }) => Promise<Blob>
}

const W = 13.333 // LAYOUT_WIDE width (inches)

// A saffron rule + serif heading at the top of a content slide.
function sectionHeader(pptx: Pptx, slide: PptxSlide, eyebrow: string, title: string): void {
  slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 0.55, w: 0.07, h: 0.42, fill: { color: SAFFRON } })
  slide.addText(eyebrow.toUpperCase(), {
    x: 0.8, y: 0.5, w: W - 1.6, h: 0.22, fontFace: SANS, fontSize: 10, color: SAFFRON, bold: true, charSpacing: 2,
  })
  slide.addText(title, {
    x: 0.8, y: 0.7, w: W - 1.6, h: 0.5, fontFace: SERIF, fontSize: 28, color: PRUSSIAN, bold: true,
  })
}

function footer(slide: PptxSlide, profile: ApplicantProfile, pnp: PnpAssessmentResult): void {
  slide.addText(
    `PNP Pathway Assessment · ${profile.name || 'Applicant'} · Stream data verified ${pnp.dataVersion} · ${FOOTER_CONTACT}`,
    { x: 0.6, y: 7.05, w: W - 1.2, h: 0.3, fontFace: SANS, fontSize: 8, color: MUTED, align: 'left' }
  )
}

function streamTitle(m: PnpStreamMatch): string {
  return `${m.stream.province} — ${m.stream.streamName}`
}

function nextMove(m: PnpStreamMatch): string {
  if (m.verdict === 'confirmed') return 'Meets every checkable requirement — proceed to documentation.'
  const lever = m.conditionalRequirements[0]
  if (!lever) return `Maintain the profile — current verdict is ${m.verdict}.`
  return `Next step: ${lever.replace(/\.$/, '')} → moves toward Confirmed.`
}

// ── Slides ─────────────────────────────────────────────────────────────────

function titleSlide(pptx: Pptx, profile: ApplicantProfile, pnp: PnpAssessmentResult): void {
  const s = pptx.addSlide()
  s.background = { color: PRUSSIAN }
  s.addText('VISA FORTE', { x: 0.8, y: 0.9, w: 8, h: 0.4, fontFace: SANS, fontSize: 16, color: PEARL, bold: true, charSpacing: 5 })
  s.addText('Engineered for Passage.', { x: 0.8, y: 1.3, w: 8, h: 0.35, fontFace: SERIF, fontSize: 18, color: SAFFRON, italic: true })
  s.addShape(pptx.ShapeType.rect, { x: 0.82, y: 1.95, w: 0.7, h: 0.04, fill: { color: SAFFRON } })
  s.addText('PNP Pathway Assessment', { x: 0.8, y: 2.3, w: 11.5, h: 1.1, fontFace: SERIF, fontSize: 48, color: PEARL, bold: true })
  s.addText(
    [
      { text: 'Prepared for: ', options: { color: SAND } },
      { text: profile.name || 'Applicant', options: { color: PEARL, bold: true } },
    ],
    { x: 0.8, y: 3.7, w: 11, h: 0.4, fontFace: SANS, fontSize: 15 }
  )
  s.addText(`NOC ${pnp.noc.nocCode} · TEER ${pnp.noc.teer} · ${pnp.noc.title}`, {
    x: 0.8, y: 4.1, w: 11.5, h: 0.4, fontFace: SANS, fontSize: 15, color: SAFFRON,
  })
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 6.6, w: W - 1.6, h: 0.012, fill: { color: '33415588' } })
  s.addText(
    `Verified ${pnp.dataVersion} · Source: canada.ca · ${pnp.sourceLog.length} streams assessed`,
    { x: 0.8, y: 6.7, w: 8, h: 0.3, fontFace: SANS, fontSize: 10, color: SAND }
  )
  s.addText(FOOTER_CONTACT, { x: W - 5.3, y: 6.7, w: 4.7, h: 0.3, fontFace: SANS, fontSize: 10, color: SAND, align: 'right' })
}

function executiveSummarySlide(pptx: Pptx, profile: ApplicantProfile, pnp: PnpAssessmentResult): void {
  const s = pptx.addSlide()
  s.background = { color: PEARL }
  sectionHeader(pptx, s, 'Executive Summary', 'Recommended direction')
  const name = profile.name || 'The applicant'
  const topEe = pnp.eeLinked[0]
  const paras: string[] = [
    `${name}'s documented duties classify to NOC ${pnp.noc.nocCode} (TEER ${pnp.noc.teer}), ${pnp.noc.title}. Of ${pnp.sourceLog.length} active Provincial and Territorial Nominee streams assessed (Quebec excluded), the ${pnp.shortlist.length} strongest, most occupation-relevant pathways are detailed in this deck.`,
    topEe
      ? `The highest-leverage route is an Express Entry-linked nomination — strongest via ${streamTitle(topEe)} — which adds 600 CRS points and effectively guarantees an Invitation to Apply.`
      : `No Express Entry-linked stream currently matches this profile; the base pathways lead to a paper-based PR application after nomination.`,
    `Scores rank fit and strategic value, not the odds of selection. Each pathway states exactly what must still be secured before applying.`,
  ]
  s.addText(
    paras.map((p) => ({ text: p, options: { breakLine: true, paraSpaceAfter: 12 } })),
    { x: 0.8, y: 1.55, w: W - 1.6, h: 4.8, fontFace: SANS, fontSize: 15, color: INK, lineSpacingMultiple: 1.25, valign: 'top' }
  )
  footer(s, profile, pnp)
}

function nocSlide(pptx: Pptx, profile: ApplicantProfile, pnp: PnpAssessmentResult): void {
  const s = pptx.addSlide()
  s.background = { color: PEARL }
  sectionHeader(pptx, s, 'Occupation Classification', 'Closest NOC match')
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.55, w: W - 1.6, h: 1.0, fill: { color: WHITE }, line: { color: SAND, width: 1 } })
  s.addText(`NOC ${pnp.noc.nocCode} — ${pnp.noc.title}`, {
    x: 1.0, y: 1.65, w: W - 2.0, h: 0.5, fontFace: SERIF, fontSize: 22, color: PRUSSIAN, bold: true,
  })
  s.addText(
    `TEER ${pnp.noc.teer}  ·  ${pnp.noc.confidence} confidence  ·  ${pnp.noc.verified ? 'Verified on Statistics Canada' : 'Grounded in StatCan data'}`,
    { x: 1.0, y: 2.12, w: W - 2.0, h: 0.3, fontFace: SANS, fontSize: 12, color: TEAL }
  )

  if (pnp.noc.candidates.length > 1) {
    s.addText('Ranked matches considered', { x: 0.8, y: 2.8, w: 8, h: 0.3, fontFace: SANS, fontSize: 11, color: SAFFRON, bold: true, charSpacing: 1 })
    const rows = pnp.noc.candidates.slice(0, 4).map((c, i) => ([
      { text: `${i + 1}`, options: { color: SAFFRON, bold: true, align: 'center', valign: 'middle' } },
      { text: `NOC ${c.nocCode} (TEER ${c.teer})`, options: { color: PRUSSIAN, bold: true, valign: 'middle' } },
      { text: c.title, options: { color: INK, valign: 'middle' } },
      { text: c.rationale, options: { color: MUTED, valign: 'middle' } },
    ]))
    s.addTable(rows, {
      x: 0.8, y: 3.15, w: W - 1.6, colW: [0.5, 2.2, 3.0, 6.0],
      fontFace: SANS, fontSize: 11, color: INK, valign: 'middle',
      border: { type: 'solid', color: SAND, pt: 1 }, rowH: 0.4, autoPage: false,
    })
  }
  footer(s, profile, pnp)
}

function pathwaysSlide(pptx: Pptx, profile: ApplicantProfile, pnp: PnpAssessmentResult): void {
  const s = pptx.addSlide()
  s.background = { color: PEARL }
  sectionHeader(pptx, s, 'Recommended Pathways', `Your strongest ${pnp.shortlist.length} streams`)

  const header = ['Province & Stream', 'Type', 'Verdict', 'Score', 'Next step'].map((h) => ({
    text: h, options: { fill: { color: PRUSSIAN }, color: PEARL, bold: true, fontSize: 10, valign: 'middle' },
  }))
  const rows = pnp.shortlist.map((m) => ([
    { text: streamTitle(m), options: { color: PRUSSIAN, bold: true, valign: 'middle' } },
    { text: m.stream.category === 'ee-linked' ? 'EE-linked' : 'Base', options: { color: m.stream.category === 'ee-linked' ? SAFFRON : TEAL, valign: 'middle' } },
    { text: VERDICT_LABEL[m.verdict], options: { color: VERDICT_COLOR[m.verdict], bold: true, valign: 'middle' } },
    { text: String(m.score), options: { color: SAFFRON, bold: true, align: 'center', valign: 'middle' } },
    { text: nextMove(m), options: { color: INK, fontSize: 10, valign: 'middle' } },
  ]))
  s.addTable([header, ...rows], {
    x: 0.8, y: 1.65, w: W - 1.6, colW: [3.4, 1.2, 1.4, 0.9, 5.2],
    fontFace: SANS, fontSize: 11, valign: 'middle',
    border: { type: 'solid', color: SAND, pt: 1 }, rowH: 0.55, autoPage: false,
  })
  s.addText('Score ranks fit and strategic value — not the probability of selection.', {
    x: 0.8, y: 6.55, w: W - 1.6, h: 0.3, fontFace: SANS, fontSize: 10, color: MUTED, italic: true,
  })
  footer(s, profile, pnp)
}

function matrixSlide(pptx: Pptx, profile: ApplicantProfile, pnp: PnpAssessmentResult): void {
  const s = pptx.addSlide()
  s.background = { color: PEARL }
  sectionHeader(pptx, s, 'Reference', 'All eligible jurisdictions')

  // Field-relevant eligible streams only — mirrors the on-screen report.
  const eligible = [...pnp.eeLinked, ...pnp.base].filter((m) => m.relevance !== 'mismatch')
  const header = ['Province', 'Stream', 'Category', 'Verdict', 'Score'].map((h) => ({
    text: h, options: { fill: { color: PRUSSIAN }, color: PEARL, bold: true, fontSize: 10, valign: 'middle' },
  }))
  const rows = eligible.slice(0, 14).map((m) => ([
    { text: m.stream.province, options: { color: INK, valign: 'middle' } },
    { text: m.stream.streamName, options: { color: INK, valign: 'middle' } },
    { text: m.stream.category === 'ee-linked' ? 'EE-linked' : 'Base', options: { color: MUTED, valign: 'middle' } },
    { text: VERDICT_LABEL[m.verdict], options: { color: VERDICT_COLOR[m.verdict], bold: true, valign: 'middle' } },
    { text: String(m.score), options: { color: SAFFRON, bold: true, align: 'center', valign: 'middle' } },
  ]))
  s.addTable([header, ...rows], {
    x: 0.8, y: 1.65, w: W - 1.6, colW: [2.4, 4.6, 1.6, 1.7, 1.0],
    fontFace: SANS, fontSize: 11, valign: 'middle',
    border: { type: 'solid', color: SAND, pt: 1 }, rowH: 0.34, autoPage: false,
  })
  s.addText(
    `${eligible.length} streams match both this profile's attributes and occupation field. ${pnp.ineligible.length} excluded for a hard requirement gap.`,
    { x: 0.8, y: 6.55, w: W - 1.6, h: 0.3, fontFace: SANS, fontSize: 10, color: MUTED }
  )
  footer(s, profile, pnp)
}

function insightsSlide(pptx: Pptx, profile: ApplicantProfile, pnp: PnpAssessmentResult): void {
  const s = pptx.addSlide()
  s.background = { color: PEARL }
  sectionHeader(pptx, s, 'Decision Support', 'Strategic insights')
  const insights = buildPnpInsights(pnp).slice(0, 6)
  const colW = (W - 1.6 - 0.4) / 2
  insights.forEach((it, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 0.8 + col * (colW + 0.4)
    const y = 1.6 + row * 1.75
    s.addShape(pptx.ShapeType.rect, { x, y, w: colW, h: 1.6, fill: { color: WHITE }, line: { color: SAND, width: 1 } })
    s.addShape(pptx.ShapeType.rect, { x, y, w: 0.06, h: 1.6, fill: { color: SAFFRON } })
    s.addText(it.label.toUpperCase(), { x: x + 0.2, y: y + 0.12, w: colW - 0.4, h: 0.3, fontFace: SANS, fontSize: 10, color: SAFFRON, bold: true, charSpacing: 1 })
    s.addText(it.body, { x: x + 0.2, y: y + 0.42, w: colW - 0.4, h: 1.05, fontFace: SANS, fontSize: 11, color: INK, lineSpacingMultiple: 1.15, valign: 'top' })
  })
  footer(s, profile, pnp)
}

const DRAW_VERDICT_COLOR: Record<SinpDrawVerdict, string> = {
  clears: GREEN,
  conditional: AMBER,
  'out-of-range': RED,
}
const DRAW_VERDICT_LABEL: Record<SinpDrawVerdict, string> = {
  clears: 'ABOVE CUTOFF',
  conditional: 'CONDITIONAL',
  'out-of-range': 'BELOW REACH',
}

// Saskatchewan-only slide: the SINP points band against the last 5 EOI draw cutoffs.
// Returns early when there is no draw data so the deck simply omits the slide.
function sinpDrawsSlide(pptx: Pptx, profile: ApplicantProfile, pnp: PnpAssessmentResult): void {
  const sinp = scoreSinp(profile)
  const analysis = analyzeSinpDraws(sinp)
  if (analysis.comparisons.length === 0) return

  const s = pptx.addSlide()
  s.background = { color: PEARL }
  sectionHeader(pptx, s, 'Saskatchewan · SINP', 'Standing vs last 5 draws')

  s.addText(
    `Estimated band: floor ${analysis.bandFloor} – ceiling ${analysis.bandCeiling} of ${sinp.maxPoints} (pass mark ${analysis.passMark}). ` +
      `${analysis.clears} above · ${analysis.conditional} conditional · ${analysis.outOfRange} below reach.`,
    { x: 0.8, y: 1.5, w: W - 1.6, h: 0.35, fontFace: SANS, fontSize: 12, color: INK }
  )

  const header = ['Draw date', 'Sub-category', 'Cutoff', 'Invited', 'Standing'].map((h) => ({
    text: h, options: { fill: { color: PRUSSIAN }, color: PEARL, bold: true, fontSize: 10, valign: 'middle' },
  }))
  const rows = analysis.comparisons.map((c) => ([
    { text: c.date, options: { color: INK, valign: 'middle' } },
    { text: c.subCategories.join(' · '), options: { color: INK, valign: 'middle' } },
    { text: String(c.cutoffScore), options: { color: SAFFRON, bold: true, align: 'center', valign: 'middle' } },
    { text: String(c.invitationsIssued), options: { color: MUTED, align: 'center', valign: 'middle' } },
    { text: DRAW_VERDICT_LABEL[c.verdict], options: { color: DRAW_VERDICT_COLOR[c.verdict], bold: true, valign: 'middle' } },
  ]))
  s.addTable([header, ...rows], {
    x: 0.8, y: 2.0, w: W - 1.6, colW: [1.8, 4.5, 1.3, 1.3, 2.8],
    fontFace: SANS, fontSize: 11, valign: 'middle',
    border: { type: 'solid', color: SAND, pt: 1 }, rowH: 0.5, autoPage: false,
  })

  s.addText(
    `${analysis.programStatus} Standing compares this profile's band against historical cutoffs only — not a prediction, probability, or guarantee of an invitation. ` +
      `Draw data: saskatchewan.ca EOI Selection Results · last updated ${analysis.lastUpdated}.`,
    { x: 0.8, y: 6.35, w: W - 1.6, h: 0.6, fontFace: SANS, fontSize: 10, color: MUTED, italic: true, lineSpacingMultiple: 1.2 }
  )
  footer(s, profile, pnp)
}

function disclaimerSlide(pptx: Pptx, profile: ApplicantProfile, pnp: PnpAssessmentResult): void {
  const s = pptx.addSlide()
  s.background = { color: PRUSSIAN }
  s.addText('LEGAL DISCLAIMER', { x: 0.8, y: 0.9, w: 10, h: 0.3, fontFace: SANS, fontSize: 12, color: SAFFRON, bold: true, charSpacing: 2 })
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.5, w: 0.06, h: 3.6, fill: { color: SAFFRON } })
  s.addText(
    'The information provided is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements before taking any action.',
    { x: 1.1, y: 1.55, w: W - 2.2, h: 3.5, fontFace: SANS, fontSize: 14, color: PEARL, lineSpacingMultiple: 1.4, valign: 'top' }
  )
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 6.6, w: W - 1.6, h: 0.012, fill: { color: '33415588' } })
  s.addText(`PNP Pathway Assessment · Generated ${profile.reportDate} · Stream data verified ${pnp.dataVersion}`, {
    x: 0.8, y: 6.7, w: 8, h: 0.3, fontFace: SANS, fontSize: 10, color: SAND,
  })
  s.addText(`Visa Forte · ${FOOTER_CONTACT}`, { x: W - 5.3, y: 6.7, w: 4.7, h: 0.3, fontFace: SANS, fontSize: 10, color: SAND, align: 'right' })
}

// Build the deck and return it as a Blob ready for download. pptxgenjs is imported
// dynamically so it never enters the server bundle or the initial client chunk.
export async function buildPnpPptxBlob(profile: ApplicantProfile, pnp: PnpAssessmentResult): Promise<Blob> {
  const mod = await import('pptxgenjs')
  const PptxGenJS = mod.default as unknown as new () => Pptx
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'VF_WIDE', width: W, height: 7.5 })
  pptx.layout = 'VF_WIDE'

  titleSlide(pptx, profile, pnp)
  executiveSummarySlide(pptx, profile, pnp)
  nocSlide(pptx, profile, pnp)
  pathwaysSlide(pptx, profile, pnp)
  matrixSlide(pptx, profile, pnp)
  insightsSlide(pptx, profile, pnp)
  if (pnp.sourceLog.some((entry) => entry.province === 'Saskatchewan')) {
    sinpDrawsSlide(pptx, profile, pnp)
  }
  disclaimerSlide(pptx, profile, pnp)

  return pptx.write({ outputType: 'blob' })
}
