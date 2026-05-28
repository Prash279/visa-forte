'use client'

import { useState, useRef, useCallback } from 'react'
import {
  calculate,
  scoresToClb,
  type ApplicantProfile,
  type LanguageScores,
  type LanguageBands,
  type CrsResult,
  type EducationLevel,
  type StreamEligibility,
  type FswImprovementSuggestion,
} from '@/lib/crs-calculator'
import drawData from '@/lib/crs-draw-history.json'
import fundsData from '@/lib/proof-of-funds.json'
import './canvisa-pro.css'
import NocSearch from '@/components/NocSearch'

// ── Helpers ──────────────────────────────────────────────────────────────────

type Draw = { date: string; type: string; cutoffScore: number; invitationsIssued: number }

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortType(type: string): string {
  if (/^general$/i.test(type)) return 'General'
  if (/pnp|provincial nominee/i.test(type)) return 'PNP'
  if (/canadian experience class/i.test(type)) return 'CEC'
  if (/stem/i.test(type)) return 'STEM'
  if (/french/i.test(type)) return 'French'
  if (/health/i.test(type)) return 'Healthcare'
  if (/trade/i.test(type)) return 'Trades'
  if (/transport/i.test(type)) return 'Transport'
  if (/agri/i.test(type)) return 'Agriculture'
  if (/education/i.test(type)) return 'Education'
  if (/senior manager/i.test(type)) return 'Senior Mgr'
  if (/physician/i.test(type)) return 'Physicians'
  return type.length > 20 ? type.slice(0, 18) + '…' : type
}

function getEligibleDrawCategories(
  profile: ApplicantProfile,
  elig: StreamEligibility,
  secondLangBands: LanguageBands | undefined
): string[] {
  const cats: string[] = []
  if (elig.cec.eligible) cats.push('CEC')
  const isFrenchTest =
    profile.hasSecondLanguage &&
    (profile.secondLanguageScores?.testType === 'TEF' ||
      profile.secondLanguageScores?.testType === 'TCF')
  const frenchClbMet =
    secondLangBands != null &&
    secondLangBands.listening >= 7 && secondLangBands.reading >= 7 &&
    secondLangBands.writing >= 7 && secondLangBands.speaking >= 7
  if (isFrenchTest && frenchClbMet) cats.push('French')
  const nocNum = parseInt(profile.nocCode, 10)
  if (!isNaN(nocNum)) {
    if (nocNum >= 30010 && nocNum <= 35109) cats.push('Healthcare')
    if (
      (nocNum >= 72000 && nocNum <= 75199) ||
      (nocNum >= 82000 && nocNum <= 82099) ||
      (nocNum >= 92000 && nocNum <= 95199)
    ) cats.push('Trades')
    if (nocNum >= 40000 && nocNum <= 41499) cats.push('Education')
  }
  if (profile.hasProvincialNomination) cats.push('PNP')
  return cats
}

const EDU_LABELS: Record<EducationLevel, string> = {
  less_than_secondary: 'Less than Secondary School',
  secondary: 'Secondary School Diploma',
  one_year_post_secondary: '1-Year Post-Secondary',
  two_year_post_secondary: '2-Year Post-Secondary',
  bachelors: "Bachelor's Degree",
  two_or_more_degrees: '2+ Post-Secondary (one 3+ yr)',
  masters: "Master's Degree / Professional",
  doctoral: 'Doctoral Degree (PhD)',
}

const CLB_COLOR = (clb: number) =>
  clb >= 9 ? '#2DD4BF' : clb >= 7 ? '#FDE047' : '#FCA5A5'

function clbDisplay(bands: LanguageBands) {
  return `L:${bands.listening} · R:${bands.reading} · W:${bands.writing} · S:${bands.speaking}`
}

function todayStr() {
  return new Date().toISOString().split('T')[0] ?? ''
}

function reportId(name: string, date: string) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
  const d = date.replace(/-/g, '')
  return `CVP-${d}-${initials}-001`
}

// Gauge arc path — score out of 1200 mapped to 0-315 degrees of arc.
function gaugeOffset(score: number, max = 1200): number {
  const pathLength = 314.16
  const pct = Math.min(score / max, 1)
  return pathLength * (1 - pct)
}

function dotPosition(score: number, max = 1200): { x: number; y: number } {
  const pct = Math.min(score / max, 1)
  const angle = Math.PI - pct * Math.PI
  return { x: 130 + 100 * Math.cos(angle), y: 180 - 100 * Math.sin(angle) }
}

// ── Initial form state ────────────────────────────────────────────────────────

const DEFAULT_LANG: LanguageScores = {
  testType: 'IELTS_GT',
  listening: 0,
  reading: 0,
  writing: 0,
  speaking: 0,
}

const INITIAL: ApplicantProfile = {
  name: '',
  age: 30,
  nocCode: '',
  nocTeer: 1,
  occupationTitle: '',
  countryOfCitizenship: '',
  countryOfResidence: '',
  reportDate: todayStr(),
  strategyTitle: '',
  currentEmployer: '',
  education: 'bachelors',
  hasEca: true,
  firstLanguageScores: { ...DEFAULT_LANG },
  hasSecondLanguage: false,
  secondLanguageScores: { ...DEFAULT_LANG },
  foreignWorkExperienceYears: 0,
  canadianWorkExperienceYears: 0,
  hasSpouse: false,
  hasJobOffer: 'none' as const,
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 0,
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
  refusalDetails: '',
  fundsSource: '',
}

// ── MARP Report Builder ───────────────────────────────────────────────────────

function pill(label: string, type: 'eligible' | 'not-eligible' | 'borderline' | 'likely'): string {
  const styles: Record<string, string> = {
    'eligible':     'background:rgba(134,239,172,0.15);color:#86EFAC;',
    'likely':       'background:rgba(45,212,191,0.15);color:#2DD4BF;',
    'borderline':   'background:rgba(253,224,71,0.15);color:#FDE047;',
    'not-eligible': 'background:rgba(252,165,165,0.15);color:#FCA5A5;',
  }
  return `<span style="${styles[type]}padding:3px 10px;font-size:0.65em;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">${label}</span>`
}

function metricCard(label: string, value: string | number, note: string, accent = '#2DD4BF'): string {
  return `<div style="background:#1E293B;border-top:3px solid ${accent};padding:18px 20px;text-align:center;">
  <div style="color:#94A3B8;font-size:0.58em;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:8px;">${label}</div>
  <div style="color:${accent};font-size:2.4em;line-height:1;font-weight:700;margin-bottom:6px;">${value}</div>
  <div style="color:#64748B;font-size:0.62em;">${note}</div>
</div>`
}

function gapCard(level: 'critical' | 'high' | 'medium', title: string, desc: string): string {
  const colours: Record<string, string> = { critical: '#FCA5A5', high: '#FDE047', medium: '#2DD4BF' }
  const c = colours[level]
  return `<div style="background:#1E293B;border-left:4px solid ${c};padding:14px 18px;margin:8px 0;">
  <div style="color:${c};font-size:0.6em;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">${level}</div>
  <div style="color:#F1F5F9;font-size:0.88em;font-weight:600;">${title}</div>
  <div style="color:#94A3B8;font-size:0.78em;margin-top:4px;">${desc}</div>
</div>`
}

function buildMarpMarkdown(p: ApplicantProfile, r: CrsResult, maritalStatusStr: string): string {
  const { breakdown, fswGrid, eligibility, scenarios } = r
  const total = breakdown.total
  const fwYrs = p.foreignWorkExperienceYears
  const rId = reportId(p.name, p.reportDate)
  const poolEligible = eligibility.expressEntryPool.eligible

  // ── Shared style constants ─────────────────────────────────────────────────
  const BG      = '#020617'
  const NAVY    = '#0D1B2A'
  const CARD    = '#1E293B'
  const BORDER  = '#334155'
  const TEAL    = '#2DD4BF'
  const AMBER   = '#FDE047'
  const RED     = '#FCA5A5'
  const GREEN   = '#86EFAC'
  const TEXT    = '#F1F5F9'
  const MUTED   = '#94A3B8'
  const DIM     = '#64748B'

  // ── Helper: status badge ───────────────────────────────────────────────────
  const badge = (eligible: boolean, yesLabel = 'ELIGIBLE', noLabel = 'NOT ELIGIBLE') =>
    eligible
      ? `<span style="background:rgba(134,239,172,0.15);color:${GREEN};padding:4px 12px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;font-family:system-ui">${yesLabel}</span>`
      : `<span style="background:rgba(252,165,165,0.15);color:${RED};padding:4px 12px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;font-family:system-ui">${noLabel}</span>`

  // ── Helper: data row ───────────────────────────────────────────────────────
  const row = (label: string, value: string, highlight = false) =>
    `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid ${BORDER};">
      <span style="color:${MUTED};font-size:12px;letter-spacing:0.5px;">${label}</span>
      <span style="color:${highlight ? TEAL : TEXT};font-size:13px;font-weight:600;text-align:right;max-width:55%;">${value}</span>
    </div>`

  // ── Helper: section header bar ─────────────────────────────────────────────
  const sectionBar = (label: string) =>
    `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <div style="width:3px;height:18px;background:${TEAL};flex-shrink:0;"></div>
      <span style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui">${label}</span>
      <div style="flex:1;height:1px;background:${BORDER};"></div>
    </div>`

  // ── Helper: metric card ────────────────────────────────────────────────────
  const mc = (label: string, value: string | number, note: string, color: string) =>
    `<div style="background:${CARD};border-top:3px solid ${color};padding:16px 18px;flex:1;">
      <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:10px;">${label}</div>
      <div style="color:${color};font-size:36px;line-height:1;font-weight:700;margin-bottom:6px;">${value}</div>
      <div style="color:${DIM};font-size:11px;">${note}</div>
    </div>`

  // ── Helper: gap card ───────────────────────────────────────────────────────
  const gc = (level: 'CRITICAL' | 'HIGH' | 'MEDIUM', title: string, desc: string) => {
    const c = level === 'CRITICAL' ? RED : level === 'HIGH' ? AMBER : TEAL
    return `<div style="background:${CARD};border-left:4px solid ${c};padding:14px 18px;margin-bottom:10px;">
      <div style="color:${c};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:5px;">${level}</div>
      <div style="color:${TEXT};font-size:14px;font-weight:600;margin-bottom:4px;">${title}</div>
      <div style="color:${MUTED};font-size:12px;line-height:1.5;">${desc}</div>
    </div>`
  }

  // ── Gap cards data ─────────────────────────────────────────────────────────
  const gapItems: string[] = []
  if (!r.proofOfFundsSufficient) gapItems.push(gc('CRITICAL', 'Insufficient Proof of Funds', `CAD $${p.settlementFunds.toLocaleString()} declared — minimum required: CAD $${r.proofOfFundsRequired.toLocaleString()} for family of ${p.familySize}.`))
  if (!poolEligible) gapItems.push(gc('CRITICAL', 'Not Pool-Eligible', eligibility.expressEntryPool.reason))
  if (!eligibility.fsw.eligible) gapItems.push(gc('HIGH', 'FSW Not Eligible', eligibility.fsw.reason))
  if (!eligibility.cec.eligible) gapItems.push(gc('HIGH', 'CEC Not Eligible', eligibility.cec.reason))
  if (!p.hasEca && p.education !== 'secondary' && p.education !== 'less_than_secondary') gapItems.push(gc('MEDIUM', 'ECA Not Confirmed', 'Educational Credential Assessment required for foreign credentials to count in CRS scoring.'))
  if (gapItems.length === 0) gapItems.push(gc('MEDIUM', 'No Critical Gaps Identified', 'Profile meets primary thresholds. Focus on CRS score maximization.'))

  // ── CRS gauge SVG (half-donut) ─────────────────────────────────────────────
  // Half-circle arc: radius 85, center 100,100, sweep from 180° to 0° (left to right)
  const r85 = 85
  const pct = Math.min(total / 1200, 1)
  const angleRad = Math.PI * (1 - pct)
  const arcX = (100 + r85 * Math.cos(Math.PI - angleRad)).toFixed(1)
  const arcY = (100 - r85 * Math.sin(Math.PI - angleRad)).toFixed(1)
  const gaugeArc = pct > 0
    ? `<path d="M ${(100 - r85).toFixed(1)},100 A ${r85},${r85} 0 ${pct > 0.5 ? 1 : 0} 1 ${arcX},${arcY}" fill="none" stroke="${TEAL}" stroke-width="16" stroke-linecap="round"/>`
    : ''

  // ── MARP slides ────────────────────────────────────────────────────────────
  return `---
marp: true
theme: default
size: 16:9
paginate: true
style: |
  section {
    background: ${BG};
    color: ${TEXT};
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 16px;
    padding: 0;
    display: block;
  }
  section::after { color: ${DIM}; font-size: 12px; }
  header { display: none; }

---

<!-- _paginate: false -->

<div style="background:linear-gradient(135deg,${NAVY} 0%,${BG} 55%,#0D2018 100%);height:100%;padding:52px 60px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">

  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:36px;">
      <div style="color:${TEAL};font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;font-family:system-ui;">CanVisa Pro</div>
      <div style="width:1px;height:14px;background:${BORDER};"></div>
      <div style="color:${MUTED};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;">Precision Assessment · Confidential</div>
    </div>

    <div style="color:${MUTED};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:12px;">Assessment Report</div>
    <div style="color:${TEXT};font-size:48px;font-weight:700;line-height:1.1;margin-bottom:8px;">${p.name || 'Applicant'}</div>
    <div style="color:${TEAL};font-size:16px;margin-bottom:32px;">${p.strategyTitle || 'Canada PR Eligibility Assessment'}</div>
  </div>

  <div>
    <div style="display:flex;gap:12px;margin-bottom:28px;">
      <div style="background:${CARD};border-top:3px solid ${TEAL};padding:18px 22px;flex:1;">
        <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:8px;">CRS Score</div>
        <div style="color:${TEAL};font-size:40px;font-weight:700;line-height:1;">${total}</div>
        <div style="color:${DIM};font-size:11px;margin-top:4px;">out of 1200</div>
      </div>
      <div style="background:${CARD};border-top:3px solid ${poolEligible ? GREEN : RED};padding:18px 22px;flex:1;">
        <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:8px;">Pool Status</div>
        <div style="color:${poolEligible ? GREEN : RED};font-size:20px;font-weight:700;line-height:1;margin-top:8px;">${poolEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}</div>
        <div style="color:${DIM};font-size:11px;margin-top:4px;">Express Entry pool</div>
      </div>
      <div style="background:${CARD};border-top:3px solid ${AMBER};padding:18px 22px;flex:1;">
        <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:8px;">Report Date</div>
        <div style="color:${AMBER};font-size:18px;font-weight:700;line-height:1;margin-top:8px;">${p.reportDate}</div>
        <div style="color:${DIM};font-size:11px;margin-top:4px;">NOC ${p.nocCode || '—'} · TEER ${p.nocTeer}</div>
      </div>
      <div style="background:${CARD};border-top:3px solid ${fwYrs >= 1 ? GREEN : RED};padding:18px 22px;flex:1;">
        <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:8px;">Foreign WE</div>
        <div style="color:${fwYrs >= 1 ? GREEN : RED};font-size:40px;font-weight:700;line-height:1;">${fwYrs}y</div>
        <div style="color:${DIM};font-size:11px;margin-top:4px;">${fwYrs >= 1 ? 'FSW eligible' : 'Below 1-yr min'}</div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid ${BORDER};">
      <div style="color:${DIM};font-size:11px;">${rId} · All data sourced from canada.ca · For guidance purposes only</div>
      <div style="color:${DIM};font-size:11px;">Visa Forte · visaforte.com</div>
    </div>
  </div>

</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">

  ${sectionBar('Executive Summary')}

  <div style="display:flex;gap:12px;margin-bottom:20px;">
    ${mc('CRS Score', total, 'out of 1200', TEAL)}
    ${mc('FSW Grid', `${fswGrid.total}/67`, fswGrid.eligible ? 'Threshold Met' : 'Below Threshold', fswGrid.eligible ? GREEN : RED)}
    ${mc('Canadian WE', `${p.canadianWorkExperienceYears}y`, p.canadianWorkExperienceYears >= 1 ? 'CEC Eligible' : 'Below Min', p.canadianWorkExperienceYears >= 1 ? GREEN : MUTED)}
    ${mc('Settlement', `$${Math.round(p.settlementFunds / 1000)}K`, r.proofOfFundsSufficient ? 'Funds Sufficient' : 'Below Threshold', r.proofOfFundsSufficient ? GREEN : RED)}
  </div>

  <div style="display:flex;gap:16px;">
    <div style="flex:1;background:${CARD};padding:18px 20px;">
      <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:14px;">CRS Breakdown</div>
      ${row('Core / Human Capital', `${breakdown.coreTotal} pts`, true)}
      ${row('Transferability (Sec. C)', `${breakdown.transferTotal} pts`)}
      ${row('Additional (PNP / Other)', `${breakdown.additionalTotal} pts`)}
      ${row('Grand Total', `${total} pts`, true)}
    </div>
    <div style="flex:1;background:${CARD};padding:18px 20px;">
      <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:14px;">Pathway Status</div>
      ${[
        ['FSW', eligibility.fsw.eligible],
        ['CEC', eligibility.cec.eligible],
        ['FST', eligibility.fst.eligible],
        ['Express Entry Pool', poolEligible],
      ].map(([name, ok]) =>
        `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid ${BORDER};">
          <span style="color:${TEXT};font-size:13px;">${name}</span>
          ${badge(ok as boolean)}
        </div>`
      ).join('')}
    </div>
  </div>

</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">

  ${sectionBar('Applicant Data Profile')}

  <div style="display:flex;gap:16px;">
    <div style="flex:1;background:${CARD};padding:18px 20px;">
      <div style="color:${TEAL};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:14px;">Principal Applicant</div>
      ${row('Age', `${p.age} Years`)}
      ${row('Education', EDU_LABELS[p.education])}
      ${row('ECA Status', p.hasEca ? 'Confirmed' : 'Not Confirmed')}
      ${row('Citizenship', p.countryOfCitizenship || '—')}
      ${row('Country of Residence', p.countryOfResidence || '—')}
      ${row('NOC Code', `${p.nocCode || '—'} (TEER ${p.nocTeer})`)}
      ${row('Occupation', p.occupationTitle || '—')}
    </div>
    <div style="flex:1;background:${CARD};padding:18px 20px;">
      <div style="color:${TEAL};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:14px;">Experience &amp; Language</div>
      ${row('Foreign Work Exp', `${fwYrs} Years`)}
      ${row('Canadian Work Exp', `${p.canadianWorkExperienceYears} Years`)}
      ${row('Language Test', p.firstLanguageScores.testType)}
      ${row('CLB — Listening', `${r.firstLanguageBands.listening}`, r.firstLanguageBands.listening >= 9)}
      ${row('CLB — Reading', `${r.firstLanguageBands.reading}`, r.firstLanguageBands.reading >= 9)}
      ${row('CLB — Writing', `${r.firstLanguageBands.writing}`, r.firstLanguageBands.writing >= 9)}
      ${row('CLB — Speaking', `${r.firstLanguageBands.speaking}`, r.firstLanguageBands.speaking >= 9)}
    </div>
    <div style="flex:1;background:${CARD};padding:18px 20px;">
      <div style="color:${TEAL};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:14px;">Additional Factors</div>
      ${row('Marital Status', maritalStatusStr)}
      ${row('Family Size', `${p.familySize}`)}
      ${row('Settlement Funds', `CAD $${p.settlementFunds.toLocaleString()}`)}
      ${row('Funds Required', `CAD $${r.proofOfFundsRequired.toLocaleString()}`)}
      ${row('Funds Status', r.proofOfFundsSufficient ? '✓ Sufficient' : '✗ Insufficient', r.proofOfFundsSufficient)}
      ${row('Provincial Nomination', p.hasProvincialNomination ? 'Yes (+600 pts)' : 'No')}
      ${row('Canadian Education', p.hasCanadianEducation ? 'Yes' : 'No')}
    </div>
  </div>

</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">

  ${sectionBar('CRS Score Breakdown')}

  <div style="display:flex;gap:24px;align-items:flex-start;">

    <div style="flex:0 0 200px;text-align:center;">
      <svg viewBox="0 0 200 110" width="200" height="110">
        <path d="M15,100 A85,85 0 0 1 185,100" fill="none" stroke="${CARD}" stroke-width="16" stroke-linecap="round"/>
        ${gaugeArc}
        <text x="100" y="80" text-anchor="middle" fill="${TEXT}" font-size="30" font-weight="700" font-family="system-ui">${total}</text>
        <text x="100" y="96" text-anchor="middle" fill="${MUTED}" font-size="10" font-family="system-ui">CRS / 1200</text>
      </svg>
      <div style="color:${AMBER};font-size:11px;margin-top:4px;">General cutoff ≈ 500</div>
      <div style="color:${DIM};font-size:10px;margin-top:2px;">Verify at canada.ca</div>
      <div style="background:${CARD};border-top:3px solid ${total >= 500 ? GREEN : AMBER};padding:12px;margin-top:16px;text-align:center;">
        <div style="color:${MUTED};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;">vs Cutoff</div>
        <div style="color:${total >= 500 ? GREEN : AMBER};font-size:22px;font-weight:700;">${total >= 500 ? '+' : ''}${total - 500}</div>
      </div>
    </div>

    <div style="flex:1;background:${CARD};padding:18px 20px;">
      <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:14px;">Section A — Core / Human Capital</div>
      ${row('Age', `${breakdown.agePoints} pts`)}
      ${row('Education', `${breakdown.educationPoints} pts`)}
      ${row('First Language', `${breakdown.firstLanguagePoints} pts`, true)}
      ${breakdown.secondLanguagePoints > 0 ? row('Second Language', `${breakdown.secondLanguagePoints} pts`) : ''}
      ${row('Canadian Work Experience', `${breakdown.canadianExpPoints} pts`)}
      ${breakdown.spousePoints > 0 ? row('Spouse Factors', `${breakdown.spousePoints} pts`) : ''}
      <div style="height:1px;background:${BORDER};margin:10px 0;"></div>
      <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin:12px 0 10px;">Section C &amp; D</div>
      ${row('Transferability Factors', `${breakdown.transferTotal} pts`)}
      ${breakdown.additionalTotal > 0 ? row('Additional (PNP/Other)', `${breakdown.additionalTotal} pts`) : ''}
      <div style="height:1px;background:${TEAL};margin:10px 0;opacity:0.4;"></div>
      ${row('TOTAL CRS', `${total} pts`, true)}
    </div>

    <div style="flex:0 0 200px;">
      <div style="background:${CARD};padding:14px 16px;margin-bottom:10px;border-left:3px solid ${TEAL};">
        <div style="color:${MUTED};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Transferability Detail</div>
        ${row('Edu + Language', `${breakdown.eduLanguageTransfer} pts`)}
        ${row('FWE + Language', `${breakdown.foreignExpLanguageTransfer} pts`)}
      </div>
      <div style="background:${CARD};padding:14px 16px;border-left:3px solid ${AMBER};">
        <div style="color:${AMBER};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">⚠ Policy Note</div>
        <div style="color:${MUTED};font-size:11px;line-height:1.5;">Job offer points removed from CRS post-March 2025 per IRCC policy change.</div>
      </div>
    </div>

  </div>

</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">

  ${sectionBar('Stream Eligibility Matrix')}

  <div style="display:flex;flex-direction:column;gap:10px;">
    ${[
      {
        name: 'Federal Skilled Worker (FSW)',
        eligible: eligibility.fsw.eligible,
        reason: eligibility.fsw.reason,
        detail: `67-pt grid: ${fswGrid.total}/67 — ${fswGrid.eligible ? 'Threshold met' : 'Below threshold'}`,
      },
      {
        name: 'Canadian Experience Class (CEC)',
        eligible: eligibility.cec.eligible,
        reason: eligibility.cec.reason,
        detail: p.canadianWorkExperienceYears >= 1 ? `${p.canadianWorkExperienceYears} yr CWE — meets 1-yr minimum` : 'Insufficient Canadian work experience',
      },
      {
        name: 'Federal Skilled Trades (FST)',
        eligible: eligibility.fst.eligible,
        reason: eligibility.fst.reason,
        detail: 'Trades NOC required + CLB 5 (writing/reading) or CLB 7 (speaking/listening)',
      },
      {
        name: 'Express Entry Pool',
        eligible: poolEligible,
        reason: eligibility.expressEntryPool.reason,
        detail: poolEligible ? 'Qualifies for at least one stream — pool eligible' : 'No qualifying stream — cannot enter pool',
      },
    ].map(s => `
      <div style="background:${CARD};padding:14px 20px;display:flex;align-items:center;gap:20px;border-left:3px solid ${s.eligible ? GREEN : RED};">
        <div style="flex:0 0 240px;color:${TEXT};font-size:14px;font-weight:600;">${s.name}</div>
        <div style="flex:0 0 120px;">${badge(s.eligible)}</div>
        <div style="flex:1;color:${MUTED};font-size:12px;line-height:1.4;">${s.detail}</div>
      </div>`).join('')}
  </div>

  <div style="background:${CARD};border-left:3px solid ${AMBER};padding:12px 18px;margin-top:16px;">
    <div style="color:${MUTED};font-size:12px;line-height:1.5;">
      <span style="color:${AMBER};font-weight:700;">Note:</span> Stream eligibility is a hard gate — a single disqualifying factor blocks the entire stream. Verify all requirements at <span style="color:${TEAL};">canada.ca/immigration</span> before proceeding.
    </div>
  </div>

</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">

  ${sectionBar('FSW 67-Point Grid')}

  <div style="display:flex;gap:24px;align-items:flex-start;">

    <div style="flex:1;background:${CARD};padding:18px 20px;">
      <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:14px;">Selection Factors</div>
      ${[
        ['Language Ability', fswGrid.language, 28],
        ['Education', fswGrid.education, 25],
        ['Work Experience', fswGrid.workExperience, 15],
        ['Age', fswGrid.age, 12],
        ['Adaptability', fswGrid.adaptability, 10],
      ].map(([label, score, max]) => `
        <div style="padding:8px 0;border-bottom:1px solid ${BORDER};">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="color:${TEXT};font-size:13px;">${label}</span>
            <span style="color:${TEAL};font-size:13px;font-weight:700;">${score} / ${max}</span>
          </div>
          <div style="background:${BORDER};height:4px;border-radius:2px;">
            <div style="background:${TEAL};height:4px;border-radius:2px;width:${Math.round((score as number) / (max as number) * 100)}%;"></div>
          </div>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:10px 0;">
        <span style="color:${TEXT};font-size:14px;font-weight:700;">Total</span>
        <span style="color:${fswGrid.eligible ? GREEN : RED};font-size:14px;font-weight:700;">${fswGrid.total} / 100</span>
      </div>
    </div>

    <div style="flex:0 0 200px;display:flex;flex-direction:column;gap:12px;">
      <div style="background:${CARD};padding:24px;text-align:center;border-top:3px solid ${fswGrid.eligible ? GREEN : RED};">
        <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:12px;">FSW Score</div>
        <div style="color:${fswGrid.eligible ? GREEN : RED};font-size:56px;font-weight:700;line-height:1;">${fswGrid.total}</div>
        <div style="color:${MUTED};font-size:12px;margin:8px 0;">out of 100</div>
        ${badge(fswGrid.eligible)}
        <div style="color:${DIM};font-size:10px;margin-top:8px;">Threshold: 67 points</div>
      </div>
      <div style="background:${CARD};padding:14px 16px;border-left:3px solid ${AMBER};">
        <div style="color:${AMBER};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">⚠ Policy</div>
        <div style="color:${MUTED};font-size:11px;line-height:1.5;">Arranged Employment removed post-March 2025 (IRCC). Max grid = 90.</div>
      </div>
    </div>

  </div>

</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">

  ${sectionBar('Profile Deficit Map — Critical Gaps')}

  <div style="display:flex;flex-direction:column;gap:0;">
    ${gapItems.join('')}
  </div>

  <div style="background:${CARD};border-left:3px solid ${DIM};padding:12px 18px;margin-top:8px;">
    <div style="color:${MUTED};font-size:12px;">Gaps are ranked by impact on pool eligibility. Address Critical items before submitting an Expression of Interest.</div>
  </div>

</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">

  ${sectionBar('Scenario Projections — CRS Improvement Model')}

  <div style="display:flex;flex-direction:column;gap:8px;">
    ${scenarios.map(s => {
      const sign = s.delta >= 0 ? '+' : ''
      const color = s.delta > 0 ? GREEN : s.delta === 0 ? MUTED : RED
      return `<div style="background:${CARD};padding:14px 20px;display:flex;align-items:center;gap:16px;">
        <div style="flex:0 0 28px;color:${color};font-size:16px;font-weight:700;text-align:center;">${sign}${s.delta}</div>
        <div style="width:1px;height:36px;background:${BORDER};"></div>
        <div style="flex:1;">
          <div style="color:${TEXT};font-size:13px;font-weight:600;margin-bottom:3px;">${s.name}</div>
          <div style="color:${MUTED};font-size:11px;">${s.change}</div>
        </div>
        <div style="flex:0 0 100px;text-align:right;">
          <div style="color:${MUTED};font-size:10px;text-transform:uppercase;letter-spacing:1px;">Projected</div>
          <div style="color:${s.competitive ? GREEN : AMBER};font-size:20px;font-weight:700;">${s.projectedCrs}</div>
        </div>
        <div style="flex:0 0 90px;text-align:center;">
          ${badge(s.competitive, 'COMPETITIVE', 'BORDERLINE')}
        </div>
      </div>`
    }).join('')}
  </div>

  <div style="background:${CARD};border-left:3px solid ${TEAL};padding:12px 18px;margin-top:12px;">
    <div style="color:${MUTED};font-size:12px;">All projections assume current IRCC scoring rules. Verify live draw cutoffs at canada.ca before acting on any scenario.</div>
  </div>

</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">

  ${sectionBar('Risk Assessment')}

  <div style="display:flex;gap:14px;margin-bottom:16px;">
    <div style="flex:1;background:${CARD};border-top:3px solid ${r.proofOfFundsSufficient ? GREEN : RED};padding:18px 20px;">
      <div style="color:${r.proofOfFundsSufficient ? GREEN : RED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:10px;">Financial Risk</div>
      <div style="color:${TEXT};font-size:14px;font-weight:600;margin-bottom:12px;">Settlement Funds</div>
      ${row('Declared', `CAD $${p.settlementFunds.toLocaleString()}`)}
      ${row('Required', `CAD $${r.proofOfFundsRequired.toLocaleString()}`)}
      ${row('Status', r.proofOfFundsSufficient ? '✓ Sufficient' : '✗ Below Threshold', r.proofOfFundsSufficient)}
    </div>
    <div style="flex:1;background:${CARD};border-top:3px solid ${p.hasCriminalRecord ? RED : GREEN};padding:18px 20px;">
      <div style="color:${p.hasCriminalRecord ? RED : GREEN};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:10px;">Admissibility</div>
      <div style="color:${TEXT};font-size:14px;font-weight:600;margin-bottom:12px;">Criminal Record</div>
      <div style="color:${MUTED};font-size:12px;line-height:1.6;margin-top:8px;">
        ${p.hasCriminalRecord
          ? 'Criminal history declared. Legal review strongly recommended before any application.'
          : 'No criminal history declared. Standard IRCC admissibility requirements apply.'}
      </div>
    </div>
    <div style="flex:1;background:${CARD};border-top:3px solid ${p.hasMedicalCondition ? AMBER : GREEN};padding:18px 20px;">
      <div style="color:${p.hasMedicalCondition ? AMBER : GREEN};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:10px;">Medical</div>
      <div style="color:${TEXT};font-size:14px;font-weight:600;margin-bottom:12px;">Medical Condition</div>
      <div style="color:${MUTED};font-size:12px;line-height:1.6;margin-top:8px;">
        ${p.hasMedicalCondition
          ? 'Medical condition declared. IRCC medical examination required. May affect excessive demand assessment.'
          : 'No medical conditions declared. Standard IME (Immigration Medical Exam) required at time of application.'}
      </div>
    </div>
    <div style="flex:1;background:${CARD};border-top:3px solid ${p.hasPriorRefusal ? AMBER : GREEN};padding:18px 20px;">
      <div style="color:${p.hasPriorRefusal ? AMBER : GREEN};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:10px;">Prior History</div>
      <div style="color:${TEXT};font-size:14px;font-weight:600;margin-bottom:12px;">Prior Refusals</div>
      <div style="color:${MUTED};font-size:12px;line-height:1.6;margin-top:8px;">
        ${p.hasPriorRefusal
          ? `Prior refusal declared: ${p.refusalDetails || 'Details not provided. Must disclose full history on application.'}`
          : 'No prior refusals declared. Standard IRCC application history review applies.'}
      </div>
    </div>
  </div>

</div>

---

<div style="background:${NAVY};height:100%;padding:52px 60px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">

  <div>
    <div style="color:${TEAL};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:20px;">Legal Disclaimer &amp; Data Sources</div>

    <div style="color:${MUTED};font-size:13px;line-height:1.9;max-width:820px;margin-bottom:20px;">
      The information provided in this report is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content.
    </div>
    <div style="color:${MUTED};font-size:13px;line-height:1.9;max-width:820px;margin-bottom:20px;">
      Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources at <span style="color:${TEAL};">www.canada.ca/immigration</span> and confirming current eligibility requirements before taking any action.
    </div>
    <div style="color:${MUTED};font-size:13px;line-height:1.9;max-width:820px;">
      All CRS scoring reflects current IRCC rules as published at canada.ca. Visa Forte specialises in documentation consulting and eligibility guidance — helping applicants prepare complete, accurate profiles and understand their pathways with clarity. Scoring methodology is updated whenever IRCC announces regulatory changes; verify the latest rules before acting on any assessment.
    </div>
  </div>

  <div style="padding-top:20px;border-top:1px solid ${BORDER};display:flex;justify-content:space-between;align-items:center;">
    <div style="color:${DIM};font-size:11px;">${rId} · Generated ${p.reportDate} · All CRS data sourced from canada.ca</div>
    <div style="color:${DIM};font-size:11px;">Visa Forte · visaforte.com · prashant@visaforte.com</div>
  </div>

</div>
`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CanVisaProTool() {
  const [view, setView] = useState<'form' | 'report'>('form')
  const [profile, setProfile] = useState<ApplicantProfile>(INITIAL)
  const [result, setResult] = useState<CrsResult | null>(null)
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married' | 'separated'>('single')
  const [hasSpouseLanguage, setHasSpouseLanguage] = useState(false)

  // Live CLB preview while filling the form
  const firstClb = scoresToClb(profile.firstLanguageScores)
  const secondClb = profile.hasSecondLanguage && profile.secondLanguageScores
    ? scoresToClb(profile.secondLanguageScores)
    : null
  const spouseClb = hasSpouseLanguage && profile.spouseLanguageScores
    ? scoresToClb(profile.spouseLanguageScores)
    : null

  const reportRef = useRef<HTMLDivElement>(null)

  const set = useCallback(<K extends keyof ApplicantProfile>(
    key: K,
    value: ApplicantProfile[K]
  ) => {
    setProfile(prev => ({ ...prev, [key]: value }))
  }, [])

  const setLangScore = useCallback(
    (which: 'first' | 'second' | 'spouse', field: keyof LanguageScores, value: string | number) => {
      const key = which === 'first' ? 'firstLanguageScores' : which === 'second' ? 'secondLanguageScores' : 'spouseLanguageScores'
      setProfile(prev => ({
        ...prev,
        [key]: { ...(prev[key] ?? DEFAULT_LANG), [field]: value },
      }))
    },
    []
  )

  function handleMaritalStatus(status: 'single' | 'married' | 'separated'): void {
    setMaritalStatus(status)
    set('hasSpouse', status === 'married')
  }

  function generate() {
    const r = calculate(profile)
    setResult(r)
    setView('report')
    setTimeout(() => window.scrollTo({ top: 0 }), 50)
    // Non-PII audit trail: log rule version + score breakdown, never blocks UI.
    fetch('/api/admin/crs-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rulesVersion: r.rulesVersion,
        total: r.breakdown.total,
        sections: {
          coreHuman: r.breakdown.coreTotal,
          coreSpouse: r.breakdown.spousePoints,
          transferability: r.breakdown.transferTotal,
          additional: r.breakdown.additionalTotal,
        },
        streamsEligible: (Object.entries(r.eligibility) as [string, { eligible: boolean }][])
          .filter(([, v]) => v.eligible)
          .map(([k]) => k),
        generatedAt: new Date().toISOString(),
      }),
    }).catch(() => { /* fire-and-forget: never interrupt the UI on failure */ })
  }

  function downloadMarp() {
    if (!result) return
    const maritalStatusStr = maritalStatus === 'married' ? 'Married / Common-Law' : maritalStatus === 'separated' ? 'Legally Separated' : 'Single'
    const md = buildMarpMarkdown(profile, result, maritalStatusStr)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CanVisa-Pro-${profile.name.replace(/\s+/g, '-') || 'Report'}-${profile.reportDate}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── FORM ──────────────────────────────────────────────────────────────────

  if (view === 'form') {
    return (
      <div className="cvp-wrap">
        <div className="cvp-form-wrap">
          <div className="cvp-form-header">
            <p className="cvp-form-eyebrow">Consultant Tool · Confidential</p>
            <h1 className="cvp-form-title">CanVisa Pro</h1>
            <p className="cvp-form-subtitle">
              Enter applicant data to generate a full PR eligibility assessment report.
            </p>
          </div>

          {/* Section 1: Applicant Info */}
          <p className="cvp-section-label">1 — Applicant Identity</p>
          <div className="cvp-grid-2">
            <div className="cvp-field full">
              <label className="cvp-label">Full Name</label>
              <input className="cvp-input" value={profile.name}
                onChange={e => set('name', e.target.value)} placeholder="e.g. Kishore Sai" />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Age</label>
              <input className="cvp-input" type="number" min={18} max={80}
                value={profile.age} onChange={e => set('age', parseInt(e.target.value) || 0)} />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Report Date</label>
              <input className="cvp-input" type="date" value={profile.reportDate}
                onChange={e => set('reportDate', e.target.value)} />
            </div>
            <div className="cvp-field full">
              <NocSearch
                theme="dark"
                onSelect={(code, teer) => setProfile(prev => ({ ...prev, nocCode: code, nocTeer: teer }))}
              />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">NOC Code</label>
              <input className="cvp-input" value={profile.nocCode}
                onChange={e => set('nocCode', e.target.value)} placeholder="e.g. 21211" />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">NOC TEER</label>
              <select className="cvp-select" value={profile.nocTeer}
                onChange={e => set('nocTeer', parseInt(e.target.value) as ApplicantProfile['nocTeer'])}>
                {[0, 1, 2, 3, 4, 5].map(t => (
                  <option key={t} value={t}>TEER {t}</option>
                ))}
              </select>
            </div>
            <div className="cvp-field full">
              <label className="cvp-label">Occupation Title</label>
              <input className="cvp-input" value={profile.occupationTitle}
                onChange={e => set('occupationTitle', e.target.value)} placeholder="e.g. Data Scientist" />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Country of Citizenship</label>
              <input className="cvp-input" value={profile.countryOfCitizenship}
                onChange={e => set('countryOfCitizenship', e.target.value)} placeholder="India" />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Country of Residence</label>
              <input className="cvp-input" value={profile.countryOfResidence}
                onChange={e => set('countryOfResidence', e.target.value)} placeholder="USA" />
            </div>
            <div className="cvp-field full">
              <label className="cvp-label">Current Employer (optional)</label>
              <input className="cvp-input" value={profile.currentEmployer ?? ''}
                onChange={e => set('currentEmployer', e.target.value)} />
            </div>
            <div className="cvp-field full">
              <label className="cvp-label">Strategy / Report Subtitle (optional)</label>
              <input className="cvp-input" value={profile.strategyTitle ?? ''}
                onChange={e => set('strategyTitle', e.target.value)}
                placeholder='e.g. The "Enter Now" Deployment' />
            </div>
          </div>

          {/* Section 2: Education */}
          <p className="cvp-section-label">2 — Education</p>
          <div className="cvp-grid-2">
            <div className="cvp-field">
              <label className="cvp-label">Highest Level of Education</label>
              <select className="cvp-select" value={profile.education}
                onChange={e => set('education', e.target.value as EducationLevel)}>
                {(Object.entries(EDU_LABELS) as [EducationLevel, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="cvp-field" style={{ justifyContent: 'flex-end' }}>
              <label className="cvp-checkbox-row">
                <input type="checkbox" checked={profile.hasEca}
                  onChange={e => set('hasEca', e.target.checked)} />
                <span className="cvp-checkbox-label">Educational Credential Assessment (ECA) completed</span>
              </label>
            </div>
          </div>

          {/* Section 3: First Language */}
          <p className="cvp-section-label">3 — First Official Language</p>
          <div className="cvp-grid-2" style={{ marginBottom: '0.75rem' }}>
            <div className="cvp-field full">
              <label className="cvp-label">Test Type</label>
              <select className="cvp-select" value={profile.firstLanguageScores.testType}
                onChange={e => setLangScore('first', 'testType', e.target.value as LanguageScores['testType'])}>
                <option value="IELTS_GT">IELTS General Training</option>
                <option value="IELTS_Academic">IELTS Academic</option>
                <option value="CELPIP">CELPIP-General</option>
                <option value="TEF">TEF Canada</option>
                <option value="TCF">TCF Canada</option>
              </select>
            </div>
          </div>
          <div className="cvp-grid-4">
            {(['listening', 'reading', 'writing', 'speaking'] as const).map(a => (
              <div className="cvp-field" key={a}>
                <label className="cvp-label">{a.charAt(0).toUpperCase() + a.slice(1)}</label>
                <input className="cvp-input" type="number" step="0.5" min={0} max={9}
                  value={profile.firstLanguageScores[a] || ''}
                  onChange={e => setLangScore('first', a, parseFloat(e.target.value) || 0)} />
                <span className="cvp-clb-preview" style={{ color: CLB_COLOR(firstClb[a]) }}>
                  CLB {firstClb[a]}
                </span>
              </div>
            ))}
          </div>

          {/* Section 4: Second Language (optional) */}
          <p className="cvp-section-label">4 — Second Official Language (Optional)</p>
          <label className="cvp-checkbox-row" style={{ marginBottom: '1rem' }}>
            <input type="checkbox" checked={profile.hasSecondLanguage}
              onChange={e => set('hasSecondLanguage', e.target.checked)} />
            <span className="cvp-checkbox-label">Applicant has a second official language test result</span>
          </label>

          {profile.hasSecondLanguage && (
            <>
              <div className="cvp-grid-2" style={{ marginBottom: '0.75rem' }}>
                <div className="cvp-field full">
                  <label className="cvp-label">Test Type</label>
                  <select className="cvp-select" value={profile.secondLanguageScores?.testType ?? 'IELTS_GT'}
                    onChange={e => setLangScore('second', 'testType', e.target.value as LanguageScores['testType'])}>
                    <option value="IELTS_GT">IELTS General Training</option>
                    <option value="IELTS_Academic">IELTS Academic</option>
                    <option value="CELPIP">CELPIP-General</option>
                    <option value="TEF">TEF Canada</option>
                    <option value="TCF">TCF Canada</option>
                  </select>
                </div>
              </div>
              <div className="cvp-grid-4">
                {(['listening', 'reading', 'writing', 'speaking'] as const).map(a => (
                  <div className="cvp-field" key={a}>
                    <label className="cvp-label">{a.charAt(0).toUpperCase() + a.slice(1)}</label>
                    <input className="cvp-input" type="number" step="0.5" min={0} max={9}
                      value={profile.secondLanguageScores?.[a] || ''}
                      onChange={e => setLangScore('second', a, parseFloat(e.target.value) || 0)} />
                    {secondClb && (
                      <span className="cvp-clb-preview" style={{ color: CLB_COLOR(secondClb[a]) }}>
                        CLB {secondClb[a]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Section 5: Work Experience */}
          <p className="cvp-section-label">5 — Work Experience</p>
          <div className="cvp-grid-2">
            <div className="cvp-field">
              <label className="cvp-label">Foreign Work Experience (years)</label>
              <input className="cvp-input" type="number" step="0.25" min={0}
                value={profile.foreignWorkExperienceYears || ''}
                onChange={e => set('foreignWorkExperienceYears', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Canadian Work Experience (years)</label>
              <input className="cvp-input" type="number" step="0.25" min={0}
                value={profile.canadianWorkExperienceYears || ''}
                onChange={e => set('canadianWorkExperienceYears', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Section 6: Additional */}
          <p className="cvp-section-label">6 — Additional Factors</p>

          {/* 6a: Marital Status */}
          <div className="cvp-field" style={{ marginBottom: '1.25rem' }}>
            <label className="cvp-label">Marital Status</label>
            <div className="cvp-radio-group">
              {([
                ['single', 'Single'],
                ['married', 'Married or Common-Law Partner'],
                ['separated', 'Legally Separated'],
              ] as const).map(([val, label]) => (
                <label className="cvp-radio-row" key={val}>
                  <input type="radio" name="maritalStatus" checked={maritalStatus === val}
                    onChange={() => handleMaritalStatus(val)} />
                  <span className="cvp-radio-label">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 6b: Spouse sub-section — visible only when married */}
          {maritalStatus === 'married' && (
            <div style={{ background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.15)', borderRadius: '6px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
              <p className="cvp-label" style={{ marginBottom: '0.75rem', color: 'var(--cvp-teal)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.65rem' }}>Spouse / Common-Law Partner</p>
              <div className="cvp-grid-2">
                <div className="cvp-field">
                  <label className="cvp-label">Spouse Education Level</label>
                  <select className="cvp-select" value={profile.spouseEducation ?? 'bachelors'}
                    onChange={e => set('spouseEducation', e.target.value as EducationLevel)}>
                    {(Object.entries(EDU_LABELS) as [EducationLevel, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="cvp-field">
                  <label className="cvp-label">Spouse Canadian Work Experience (years)</label>
                  <input className="cvp-input" type="number" step="0.25" min={0}
                    value={profile.spouseCanadianExperience ?? ''}
                    onChange={e => set('spouseCanadianExperience', parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <label className="cvp-checkbox-row" style={{ margin: '0.75rem 0' }}>
                <input type="checkbox" checked={hasSpouseLanguage}
                  onChange={e => {
                    setHasSpouseLanguage(e.target.checked)
                    if (!e.target.checked) set('spouseLanguageScores', undefined)
                  }} />
                <span className="cvp-checkbox-label">Partner has an official language test result</span>
              </label>

              {hasSpouseLanguage && (
                <>
                  <div className="cvp-grid-2" style={{ marginBottom: '0.75rem' }}>
                    <div className="cvp-field full">
                      <label className="cvp-label">Spouse Test Type</label>
                      <select className="cvp-select" value={profile.spouseLanguageScores?.testType ?? 'IELTS_GT'}
                        onChange={e => setLangScore('spouse', 'testType', e.target.value as LanguageScores['testType'])}>
                        <option value="IELTS_GT">IELTS General Training</option>
                        <option value="IELTS_Academic">IELTS Academic</option>
                        <option value="CELPIP">CELPIP-General</option>
                        <option value="TEF">TEF Canada</option>
                        <option value="TCF">TCF Canada</option>
                      </select>
                    </div>
                  </div>
                  <div className="cvp-grid-4">
                    {(['listening', 'reading', 'writing', 'speaking'] as const).map(a => (
                      <div className="cvp-field" key={a}>
                        <label className="cvp-label">{a.charAt(0).toUpperCase() + a.slice(1)}</label>
                        <input className="cvp-input" type="number" step="0.5" min={0} max={9}
                          value={profile.spouseLanguageScores?.[a] ?? ''}
                          onChange={e => setLangScore('spouse', a, parseFloat(e.target.value) || 0)} />
                        {spouseClb && (
                          <span className="cvp-clb-preview" style={{ color: CLB_COLOR(spouseClb[a]) }}>
                            CLB {spouseClb[a]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="cvp-grid-2">
            <div className="cvp-field">
              <label className="cvp-label">Settlement Funds Available (CAD)</label>
              <input className="cvp-input" type="number" min={0}
                value={profile.settlementFunds || ''}
                onChange={e => set('settlementFunds', parseInt(e.target.value) || 0)} />
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Family Size (including applicant)</label>
              <input className="cvp-input" type="number" min={1} max={10}
                value={profile.familySize}
                onChange={e => set('familySize', parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '1.25rem' }}>
            <label className="cvp-checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={profile.hasProvincialNomination}
                onChange={e => set('hasProvincialNomination', e.target.checked)} />
              <span className="cvp-checkbox-label">Has provincial nomination (+600)</span>
            </label>
            <label className="cvp-checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={profile.hasCanadianEducation}
                onChange={e => set('hasCanadianEducation', e.target.checked)} />
              <span className="cvp-checkbox-label">Studied in Canada (2+ yr post-secondary)</span>
            </label>
            <label className="cvp-checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={profile.hasFamilyInCanada}
                onChange={e => set('hasFamilyInCanada', e.target.checked)} />
              <span className="cvp-checkbox-label">Has family in Canada (citizen or PR)</span>
            </label>
          </div>

          {/* 6c: Job Offer */}
          <div className="cvp-field" style={{ marginTop: '1.5rem' }}>
            <label className="cvp-label">Valid Job Offer in Canada?</label>
            <div className="cvp-radio-group">
              {([
                ['none', 'No job offer'],
                ['lmia', 'Yes — LMIA-supported'],
                ['exempt', 'Yes — LMIA-exempt'],
              ] as const).map(([val, label]) => (
                <label className="cvp-radio-row" key={val}>
                  <input type="radio" name="jobOffer" checked={(profile.hasJobOffer ?? 'none') === val}
                    onChange={() => set('hasJobOffer', val)} />
                  <span className="cvp-radio-label">{label}</span>
                </label>
              ))}
            </div>
            <p className="cvp-hint">Counts toward FSW 67-point Arranged Employment factor (+5 pts). Does not add CRS bonus points (removed March 2025).</p>
          </div>

          {/* Section 7: Risk */}
          <p className="cvp-section-label">7 — Risk & Disclosure</p>
          <div className="cvp-grid-3">
            <div className="cvp-field">
              <label className="cvp-label">Criminal Record</label>
              <div className="cvp-radio-group">
                <label className="cvp-radio-row">
                  <input type="radio" name="criminal" checked={!profile.hasCriminalRecord}
                    onChange={() => set('hasCriminalRecord', false)} />
                  <span className="cvp-radio-label">None</span>
                </label>
                <label className="cvp-radio-row">
                  <input type="radio" name="criminal" checked={profile.hasCriminalRecord}
                    onChange={() => set('hasCriminalRecord', true)} />
                  <span className="cvp-radio-label">Yes</span>
                </label>
              </div>
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Medical Conditions</label>
              <div className="cvp-radio-group">
                <label className="cvp-radio-row">
                  <input type="radio" name="medical" checked={!profile.hasMedicalCondition}
                    onChange={() => set('hasMedicalCondition', false)} />
                  <span className="cvp-radio-label">None</span>
                </label>
                <label className="cvp-radio-row">
                  <input type="radio" name="medical" checked={profile.hasMedicalCondition}
                    onChange={() => set('hasMedicalCondition', true)} />
                  <span className="cvp-radio-label">Yes</span>
                </label>
              </div>
            </div>
            <div className="cvp-field">
              <label className="cvp-label">Prior Visa Refusals</label>
              <div className="cvp-radio-group">
                <label className="cvp-radio-row">
                  <input type="radio" name="refusal" checked={!profile.hasPriorRefusal}
                    onChange={() => set('hasPriorRefusal', false)} />
                  <span className="cvp-radio-label">None</span>
                </label>
                <label className="cvp-radio-row">
                  <input type="radio" name="refusal" checked={profile.hasPriorRefusal}
                    onChange={() => set('hasPriorRefusal', true)} />
                  <span className="cvp-radio-label">Yes</span>
                </label>
              </div>
            </div>
          </div>

          {profile.hasPriorRefusal && (
            <div className="cvp-field" style={{ marginTop: '1rem' }}>
              <label className="cvp-label">Refusal Details</label>
              <input className="cvp-input" value={profile.refusalDetails ?? ''}
                onChange={e => set('refusalDetails', e.target.value)}
                placeholder="Country, visa type, approximate date" />
            </div>
          )}

          <button className="cvp-generate-btn" onClick={generate}>
            Generate Assessment Report →
          </button>
        </div>
      </div>
    )
  }

  // ── REPORT ────────────────────────────────────────────────────────────────

  if (!result) return null
  const { breakdown: bd, fswGrid: fsw, eligibility: elig, scenarios } = result
  const total = bd.total
  const fwYears = profile.foreignWorkExperienceYears
  const poolEligible = elig.expressEntryPool.eligible

  // Draw context — find highest-priority eligible draw category for this profile
  const allDraws = drawData.draws as Draw[]
  const eligibleCategories = getEligibleDrawCategories(profile, elig, result.secondLanguageBands)
  const topCategory = eligibleCategories[0] ?? null
  const relevantDraw = topCategory
    ? (allDraws.find(d => shortType(d.type) === topCategory) ?? null)
    : null
  const cutoff = relevantDraw?.cutoffScore ?? null
  const gap = cutoff !== null ? total - cutoff : null
  const hasDrawData = allDraws.length > 0
  const pnpScore = total + 600

  const programs = [
    { name: 'Express Entry Pool',          eligible: elig.expressEntryPool.eligible, likely: false,                   reason: elig.expressEntryPool.reason },
    { name: 'Federal Skilled Worker (FSW)', eligible: elig.fsw.eligible,              likely: elig.fsw.likely ?? false, reason: elig.fsw.reason },
    { name: 'Canadian Experience Class',    eligible: elig.cec.eligible,              likely: elig.cec.likely ?? false, reason: elig.cec.reason },
    { name: 'Federal Skilled Trades (FST)', eligible: elig.fst.eligible,              likely: elig.fst.likely ?? false, reason: elig.fst.reason },
  ]

  // FSW grid: split arranged employment (from job offer) out of the adaptability bucket for display
  const arrangedPts = (profile.hasJobOffer === 'lmia' || profile.hasJobOffer === 'exempt') ? 5 : 0
  const adaptabilityExclAE = Math.max(0, fsw.adaptability - arrangedPts)

  const maritalStatusStr = maritalStatus === 'married' ? 'Married / Common-Law' : maritalStatus === 'separated' ? 'Legally Separated' : 'Single'

  return (
    <div className="cvp-wrap" ref={reportRef}>
      {/* Toolbar */}
      <div className="cvp-toolbar">
        <button className="cvp-back-btn" onClick={() => setView('form')}>
          ← Back to Form
        </button>
        <button className="cvp-print-btn" onClick={() => window.print()}>
          Print / Save PDF
        </button>
        <button className="cvp-marp-btn" onClick={downloadMarp}>
          ↓ Download PPTX Source (.md)
        </button>
      </div>

      <div className="cvp2-body">

        {/* ── 1: Hero CRS Score Card ─────────────────────────────────── */}
        <section className="cvp2-hero">
          <div className="cvp2-hero-score">
            <p className="cvp2-hero-label">CRS Score</p>
            <p className="cvp2-hero-value">{total}</p>
            <p className="cvp2-hero-max">out of 1200</p>
          </div>
          <div className="cvp2-hero-meta">
            <p className="cvp2-hero-name">{profile.name || 'Applicant'}</p>
            <p className="cvp2-hero-occ">
              {profile.occupationTitle || '—'} · TEER {profile.nocTeer}
              {profile.countryOfCitizenship ? ` · ${profile.countryOfCitizenship}` : ''}
            </p>
            <div className="cvp2-pool-badge" data-eligible={poolEligible ? 'yes' : 'no'}>
              {poolEligible ? '✓ Express Entry Pool: ELIGIBLE' : '✗ Express Entry Pool: NOT ELIGIBLE'}
            </div>
            <p className="cvp2-hero-date">
              Assessment {profile.reportDate} · {maritalStatusStr} · Family of {profile.familySize}
            </p>
          </div>
        </section>

        {/* ── 2: Recent Draw Context Card ──────────────────────────────── */}
        {hasDrawData && (
          <div className="cvp2-card cvp2-draws-card">
            <h2 className="cvp2-card-title">Pool Draw Context</h2>

            {!poolEligible ? (
              <>
                <p className="cvp2-card-sub">
                  Draw cutoffs are not relevant yet — applicant must clear the FSW 67-point minimum to enter the pool.
                </p>
                <div className="cvp2-gap-row cvp2-gap-below">
                  <div className="cvp2-gap-score">
                    <span className="cvp2-gap-label">FSW Score</span>
                    <span className="cvp2-gap-val">{fsw.total}</span>
                    <span className="cvp2-gap-meta">out of 100</span>
                  </div>
                  <div className="cvp2-gap-vs">
                    <span className="cvp2-gap-your-label">Minimum Required</span>
                    <span className="cvp2-gap-your-val">67</span>
                    <span className="cvp2-gap-diff">{fsw.total - 67} pts below threshold</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="cvp2-card-sub">
                  Applicant score compared to recent Express Entry draws from canada.ca.
                </p>
                {relevantDraw ? (
                  <div className={`cvp2-gap-row${gap !== null && gap >= 0 ? ' cvp2-gap-above' : ' cvp2-gap-below'}`}>
                    <div className="cvp2-gap-score">
                      <span className="cvp2-gap-label">Most Recent {topCategory} Draw</span>
                      <span className="cvp2-gap-val">{relevantDraw.cutoffScore}</span>
                      <span className="cvp2-gap-meta">{fmtDate(relevantDraw.date)}</span>
                    </div>
                    <div className="cvp2-gap-vs">
                      <span className="cvp2-gap-your-label">Applicant Score</span>
                      <span className="cvp2-gap-your-val">{total}</span>
                      {gap !== null && (
                        <span className="cvp2-gap-diff">
                          {gap >= 0 ? `+${gap} pts above cutoff` : `${gap} pts below cutoff`}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="cvp2-no-draw">
                    <p className="cvp2-no-draw-heading">No active draw category matched</p>
                    <p className="cvp2-no-draw-body">
                      Profile does not match an active draw category. Primary pathway: Provincial Nominee Program (PNP).
                      With a nomination, effective CRS becomes <strong>{pnpScore}</strong>, placing well above PNP draw cutoffs.
                    </p>
                  </div>
                )}
                <div className="cvp2-draws-table">
                  <div className="cvp2-draws-header">
                    <span>Date</span><span>Type</span><span>Cutoff</span><span>ITAs</span>
                  </div>
                  {allDraws.slice(0, 5).map((d, i) => (
                    <div key={i} className="cvp2-draw-row">
                      <span className="cvp2-draw-date">{fmtDate(d.date)}</span>
                      <span className="cvp2-draw-type">{shortType(d.type)}</span>
                      <span className="cvp2-draw-score">{d.cutoffScore}</span>
                      <span className="cvp2-draw-itas">{d.invitationsIssued.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <p className="cvp2-draws-source">
                  Synced from canada.ca rounds of invitations
                  {drawData.lastUpdated ? ` · ${fmtDate(drawData.lastUpdated)}` : ''}.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── 3: Program Eligibility ────────────────────────────────────── */}
        <div className="cvp2-card">
          <h2 className="cvp2-card-title">Program Eligibility</h2>
          <p className="cvp2-card-sub">Hard-gate assessment across active Express Entry streams.</p>
          <div className="cvp2-elig-table">
            {programs.map(prog => (
              <div key={prog.name} className="cvp2-elig-row">
                <span className="cvp2-elig-name">{prog.name}</span>
                <span
                  className="cvp2-elig-badge"
                  data-status={prog.eligible ? 'eligible' : prog.likely ? 'likely' : 'no'}
                >
                  {prog.eligible ? 'ELIGIBLE' : prog.likely ? 'LIKELY' : 'NOT ELIGIBLE'}
                </span>
                <span className="cvp2-elig-reason">{prog.reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4: CRS Breakdown Grid ─────────────────────────────────────── */}
        <div className="cvp2-card">
          <h2 className="cvp2-card-title">Score Breakdown</h2>
          <p className="cvp2-card-sub">
            CRS points across all sections (post-March 2025 rules — job offer points removed from CRS).
          </p>
          <div className="cvp2-breakdown-grid">
            <div className="cvp2-bd-tile">
              <span className="cvp2-bd-tile-label">Human Capital (A+B)</span>
              <span className="cvp2-bd-tile-value">{bd.coreTotal}</span>
            </div>
            <div className="cvp2-bd-tile">
              <span className="cvp2-bd-tile-label">Skill Transferability (C)</span>
              <span className="cvp2-bd-tile-value">{bd.transferTotal}</span>
            </div>
            <div className="cvp2-bd-tile">
              <span className="cvp2-bd-tile-label">Additional Points (D)</span>
              <span className="cvp2-bd-tile-value">{bd.additionalTotal}</span>
            </div>
            <div className="cvp2-bd-tile cvp2-bd-total">
              <span className="cvp2-bd-tile-label">Total CRS</span>
              <span className="cvp2-bd-tile-value">{total}</span>
            </div>
          </div>
        </div>

        {/* ── 5: FSW 67-Point Grid ──────────────────────────────────────── */}
        <div className="cvp2-card">
          <h2 className="cvp2-card-title">FSW 67-Point Selection Grid</h2>
          <p className="cvp2-card-sub">Statutory eligibility threshold for Federal Skilled Worker program entry.</p>
          <div className="cvp2-fsw-table">
            {[
              { factor: 'Language Skills',      value: fsw.language,      max: 28, pass: fsw.language >= 24,       detail: `CLB ${clbDisplay(result.firstLanguageBands)}${profile.hasSecondLanguage ? ' + 2nd lang' : ''}` },
              { factor: 'Education',             value: fsw.education,     max: 25, pass: fsw.education >= 20,      detail: `${EDU_LABELS[profile.education]}${profile.hasEca ? ' (ECA)' : ''}` },
              { factor: 'Work Experience',       value: fsw.workExperience, max: 15, pass: fsw.workExperience >= 9, detail: `${fwYears} yrs foreign (NOC ${profile.nocCode || '—'})` },
              { factor: 'Age',                   value: fsw.age,           max: 12, pass: fsw.age >= 10,            detail: `${profile.age} years old` },
              { factor: 'Arranged Employment',   value: arrangedPts,        max: 5,  pass: arrangedPts > 0,          detail: arrangedPts > 0 ? `${profile.hasJobOffer === 'lmia' ? 'LMIA-supported' : 'LMIA-exempt'} job offer` : 'No qualifying job offer' },
              { factor: 'Adaptability',          value: adaptabilityExclAE, max: 10, pass: adaptabilityExclAE > 0,  detail: adaptabilityExclAE > 0 ? [profile.hasCanadianEducation && 'Canadian edu', profile.hasFamilyInCanada && 'Family in CA', profile.canadianWorkExperienceYears >= 1 && 'Prior CWE'].filter(Boolean).join(', ') : 'No Canadian ties' },
            ].map(row => (
              <div key={row.factor} className="cvp2-fsw-row">
                <span className="cvp2-fsw-factor">{row.factor}</span>
                <span className="cvp2-fsw-detail">{row.detail}</span>
                <span className="cvp2-fsw-pts" data-pass={row.pass ? 'yes' : 'no'}>{row.value}/{row.max}</span>
              </div>
            ))}
            <div className="cvp2-fsw-row cvp2-fsw-total">
              <span className="cvp2-fsw-factor">Total</span>
              <span className="cvp2-fsw-detail">Pass mark: 67 points</span>
              <span className="cvp2-fsw-pts" data-pass={fsw.eligible ? 'yes' : 'no'}>{fsw.total}/100</span>
            </div>
          </div>
          <p className="cvp2-fsw-verdict" data-pass={fsw.eligible ? 'yes' : 'no'}>
            {fsw.eligible
              ? `FSW pass mark cleared (${fsw.total}/100). Profile qualifies for Federal Skilled Worker stream.`
              : `FSW pass mark not reached (${fsw.total}/100 — 67 required). FSW pathway currently unavailable.`}
          </p>
        </div>

        {/* ── 6: Settlement Funds ───────────────────────────────────────── */}
        <div className={`cvp2-card cvp2-funds-card${result.proofOfFundsSufficient ? '' : ' cvp2-funds-warn'}`}>
          <h2 className="cvp2-card-title">Settlement Funds</h2>
          <div className="cvp2-funds-row">
            <span className="cvp2-funds-label">Declared</span>
            <span className="cvp2-funds-value">CAD ${profile.settlementFunds.toLocaleString()}</span>
          </div>
          <div className="cvp2-funds-row">
            <span className="cvp2-funds-label">Minimum Required (family of {profile.familySize})</span>
            <span className="cvp2-funds-value">CAD ${result.proofOfFundsRequired.toLocaleString()}</span>
          </div>
          <div className={`cvp2-funds-status${result.proofOfFundsSufficient ? ' cvp2-funds-ok' : ' cvp2-funds-fail'}`}>
            {result.proofOfFundsSufficient
              ? '✓ Funds sufficient for application'
              : '✗ Below required threshold — must be resolved before applying'}
          </div>
          <p className="cvp2-funds-source">
            Source: {fundsData.source} · {fundsData.lastUpdated}. [VERIFY at canada.ca before advising — amounts updated annually.]
          </p>
        </div>

        {/* ── 7: Improvement Paths ──────────────────────────────────────── */}
        {/* Path A: Not pool-eligible — show how to reach FSW 67 */}
        {!poolEligible && result.fswImprovements.length > 0 && (
          <div className="cvp2-card">
            <h2 className="cvp2-card-title">How to Qualify for Express Entry</h2>
            <p className="cvp2-card-sub">
              FSW selection factor score: <strong>{fsw.total}/100</strong>. Need <strong>67 points</strong> to submit a profile.
            </p>
            {result.fswImprovements.every((s: FswImprovementSuggestion) => !s.wouldQualify) && (
              <p className="cvp2-scenario-note" style={{ marginBottom: '1rem' }}>
                No single change below reaches 67 on its own — advise combining two or more improvements.
              </p>
            )}
            <div className="cvp2-scenarios">
              {result.fswImprovements.map((s: FswImprovementSuggestion, i: number) => (
                <div key={i} className="cvp2-scenario-row">
                  <div className="cvp2-scenario-delta positive">+{s.pointsGained}</div>
                  <div className="cvp2-scenario-info">
                    <p className="cvp2-scenario-name">{String.fromCharCode(65 + i)}: {s.name}</p>
                    <p className="cvp2-scenario-desc">{s.action}</p>
                  </div>
                  <div className="cvp2-scenario-projected">
                    <span className="cvp2-projected-label">FSW Score</span>
                    <span className="cvp2-projected-val">{s.projectedFswTotal}</span>
                    <span className="cvp2-competitive-tag" data-meets={s.wouldQualify ? 'yes' : 'no'}>
                      {s.wouldQualify ? '▲ Qualifies' : '▼ Below 67'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Path B: Pool-eligible — show CRS improvement scenarios */}
        {poolEligible && scenarios.length > 0 && (
          <div className="cvp2-card">
            <h2 className="cvp2-card-title">Score Improvement Scenarios</h2>
            <p className="cvp2-card-sub">
              {relevantDraw !== null
                ? `Projections vs. most recent ${topCategory} draw cutoff of ${cutoff} pts (${fmtDate(relevantDraw.date)}).`
                : "Highest-impact changes to improve this applicant's CRS score."}
            </p>
            <div className="cvp2-scenarios">
              {scenarios.map((s, i) => {
                const meetsReal = cutoff !== null ? s.projectedCrs >= cutoff : s.competitive
                return (
                  <div key={i} className="cvp2-scenario-row">
                    <div className={`cvp2-scenario-delta${s.delta > 0 ? ' positive' : ''}`}>
                      {s.delta > 0 ? '+' : ''}{s.delta}
                    </div>
                    <div className="cvp2-scenario-info">
                      <p className="cvp2-scenario-name">{String.fromCharCode(65 + i)}: {s.name}</p>
                      <p className="cvp2-scenario-desc">{s.change}</p>
                    </div>
                    <div className="cvp2-scenario-projected">
                      <span className="cvp2-projected-label">Projected</span>
                      <span className="cvp2-projected-val">{s.projectedCrs}</span>
                      <span className="cvp2-competitive-tag" data-meets={meetsReal ? 'yes' : 'no'}>
                        {meetsReal ? '▲ Cutoff met' : '▼ Below cutoff'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="cvp2-scenario-note">
              All projections assume current IRCC rules. Verify live draw cutoffs at canada.ca before advising.
            </p>
          </div>
        )}

        {/* ── 8: Legal Disclaimer ───────────────────────────────────────── */}
        <div className="cvp2-disclaimer">
          <p className="cvp2-disclaimer-title">Legal Disclaimer &amp; Data Sources</p>
          <p className="cvp2-disclaimer-body">
            This assessment has been prepared by Prashant Thirthingoth, a specialist in Canadian immigration
            documentation analysis with 20+ years of practitioner experience. It is provided for informational
            and guidance purposes only — not immigration law advice, regulated consulting, or a formal
            eligibility determination.
          </p>
          <p className="cvp2-disclaimer-body">
            All CRS scoring reflects IRCC rules published at canada.ca as of {profile.reportDate}. Immigration
            regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent
            change without notice. Verify all information with official IRCC sources at{' '}
            <strong>www.canada.ca/immigration</strong> before taking any action.
          </p>
          <div className="cvp2-disclaimer-sources">
            <span>CRS Grid: canada.ca/crs-grid</span>
            <span>Express Entry Rounds: canada.ca/express-entry-rounds</span>
            <span>Proof of Funds: canada.ca/proof-funds</span>
          </div>
          <p className="cvp2-data-freshness">
            Data currency: {profile.reportDate} · Report ID: {reportId(profile.name, profile.reportDate)}.
            Re-verify if referenced more than 30 days after this date.
          </p>
        </div>

      </div>
    </div>
  )
}
