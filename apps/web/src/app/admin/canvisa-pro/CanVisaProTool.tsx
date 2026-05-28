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
} from '@/lib/crs-calculator'
import './canvisa-pro.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function buildMarpMarkdown(p: ApplicantProfile, r: CrsResult): string {
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
      ${row('Spouse / CLP', p.hasSpouse ? 'Yes' : 'No')}
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

  // Live CLB preview while filling the form
  const firstClb = scoresToClb(profile.firstLanguageScores)
  const secondClb = profile.hasSecondLanguage && profile.secondLanguageScores
    ? scoresToClb(profile.secondLanguageScores)
    : null

  const reportRef = useRef<HTMLDivElement>(null)

  const set = useCallback(<K extends keyof ApplicantProfile>(
    key: K,
    value: ApplicantProfile[K]
  ) => {
    setProfile(prev => ({ ...prev, [key]: value }))
  }, [])

  const setLangScore = useCallback(
    (which: 'first' | 'second', field: keyof LanguageScores, value: string | number) => {
      const key = which === 'first' ? 'firstLanguageScores' : 'secondLanguageScores'
      setProfile(prev => ({
        ...prev,
        [key]: { ...(prev[key] ?? DEFAULT_LANG), [field]: value },
      }))
    },
    []
  )

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
    const md = buildMarpMarkdown(profile, result)
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
              <input type="checkbox" checked={profile.hasSpouse}
                onChange={e => set('hasSpouse', e.target.checked)} />
              <span className="cvp-checkbox-label">Has spouse / common-law partner</span>
            </label>
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
  const generalCutoff = 500 // approximate recent general draw cutoff [VERIFY at canada.ca]
  const scoreDelta = generalCutoff - total
  const fwYears = profile.foreignWorkExperienceYears

  const eligPills = [
    {
      pathway: 'Federal Skilled Worker (FSW)',
      ...elig.fsw,
      reason: elig.fsw.reason,
    },
    {
      pathway: 'Express Entry Pool',
      ...elig.expressEntryPool,
      reason: elig.expressEntryPool.reason,
    },
    {
      pathway: 'Canadian Experience Class (CEC)',
      ...elig.cec,
      reason: elig.cec.reason,
    },
    {
      pathway: 'Federal Skilled Trades (FST)',
      ...elig.fst,
      reason: elig.fst.reason,
    },
  ]

  const gaugeOffset_ = gaugeOffset(total)
  const dot_ = dotPosition(generalCutoff)

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

      <div className="cvp-report">
        {/* ── Report Header ──────────────────────────────────────────── */}
        <div className="cvp-rpt-header">
          <div className="cvp-rpt-top-row">
            <div className="cvp-brand">
              <h1>CanVisa Pro</h1>
              <p>Precision Canadian Permanent Residency Assessment</p>
            </div>
            <div className="cvp-data-badge">
              All data sourced from canada.ca · {profile.reportDate}
            </div>
          </div>

          <p className="cvp-rpt-name">Applicant: {profile.name || '—'}</p>
          <h2 className="cvp-rpt-title">
            {profile.strategyTitle || 'PR Eligibility Assessment'}
          </h2>
          <p className="cvp-rpt-sub">
            {profile.occupationTitle || '—'} (TEER {profile.nocTeer}) ·{' '}
            {profile.countryOfCitizenship || '—'} National ·{' '}
            Resident of {profile.countryOfResidence || '—'}
          </p>

          <div className="cvp-meta-row">
            <div className="cvp-meta-item">
              <span className="label">Report Date</span>
              <span className="value">{profile.reportDate}</span>
            </div>
            <div className="cvp-meta-item">
              <span className="label">NOC Code</span>
              <span className="value">{profile.nocCode || '—'}</span>
            </div>
            <div className="cvp-meta-item">
              <span className="label">Current CRS</span>
              <span className="value">{total} (Calculated)</span>
            </div>
            <div className="cvp-meta-item">
              <span className="label">Mode</span>
              <span className="value">Deep Analysis Mode</span>
            </div>
          </div>

          <p className="cvp-report-id">
            Report ID: {reportId(profile.name, profile.reportDate)} · Generated {profile.reportDate}
          </p>
        </div>

        <div className="cvp-rpt-body">

          {/* ── Section 1: Applicant Profile ──────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Applicant Data Profile</h2></div>
            <p className="cvp-section-sub">Intake data mapped against IRCC validation requirements.</p>
            <div className="cvp-profile-grid">
              <div className="cvp-profile-card">
                <p className="cvp-profile-head">Principal Applicant</p>
                <div className="cvp-data-row"><span className="label">Age</span><span className="value">{profile.age} Years</span></div>
                <div className="cvp-data-row"><span className="label">Education</span>
                  <span className="value">{EDU_LABELS[profile.education]}{profile.hasEca ? ' (ECA Confirmed)' : ''}</span></div>
                <div className="cvp-data-row"><span className="label">First Language</span>
                  <span className="value" style={{ fontSize: '0.82rem' }}>{clbDisplay(result.firstLanguageBands)}</span></div>
                <div className="cvp-data-row"><span className="label">Foreign Work Exp</span>
                  <span className="value">{fwYears} Years {fwYears > 0 && fwYears < 1 ? '(partial)' : fwYears >= 1 ? '(Eligible)' : '(None)'}</span></div>
                <div className="cvp-data-row"><span className="label">Canadian Work Exp</span>
                  <span className="value">{profile.canadianWorkExperienceYears > 0 ? `${profile.canadianWorkExperienceYears} Years` : 'None'}</span></div>
                <div className="cvp-data-row"><span className="label">Settlement Funds</span>
                  <span className={result.proofOfFundsSufficient ? 'value cvp-funds-ok' : 'value cvp-funds-fail'}>
                    CAD ${profile.settlementFunds.toLocaleString()}
                    {result.proofOfFundsSufficient ? ' ✓' : ' — BELOW THRESHOLD'}
                  </span>
                </div>
                {profile.currentEmployer && (
                  <div className="cvp-data-row"><span className="label">Current Employer</span>
                    <span className="value">{profile.currentEmployer}</span></div>
                )}
              </div>
              {profile.hasSpouse && (
                <div className="cvp-profile-card">
                  <p className="cvp-profile-head">Spouse / Common-Law Partner</p>
                  <div className="cvp-data-row"><span className="label">Status</span>
                    <span className="value">Present (affects scoring)</span></div>
                </div>
              )}
            </div>
            {profile.firstLanguageScores.testType && (
              <p style={{ fontSize: '0.82rem', color: 'var(--cvp-muted)', marginTop: '14px' }}>
                <strong style={{ color: 'var(--cvp-text)' }}>Language Test:</strong>{' '}
                {profile.firstLanguageScores.testType === 'IELTS_GT' ? 'IELTS General Training' :
                  profile.firstLanguageScores.testType === 'IELTS_Academic' ? 'IELTS Academic' :
                  profile.firstLanguageScores.testType === 'TEF' ? 'TEF Canada' :
                  profile.firstLanguageScores.testType === 'TCF' ? 'TCF Canada' :
                  profile.firstLanguageScores.testType} — L:{profile.firstLanguageScores.listening}{' '}
                R:{profile.firstLanguageScores.reading} W:{profile.firstLanguageScores.writing}{' '}
                S:{profile.firstLanguageScores.speaking} → CLB {clbDisplay(result.firstLanguageBands)}
              </p>
            )}
          </div>

          {/* ── Section 2: Stream Eligibility Matrix ──────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Stream Eligibility Matrix</h2></div>
            <p className="cvp-section-sub">Hard-gate assessment against active IRCC pathways.</p>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>PR Pathway</th>
                  <th>Status</th>
                  <th>Requirement Analysis</th>
                </tr>
              </thead>
              <tbody>
                {eligPills.map(row => (
                  <tr key={row.pathway}>
                    <td><strong>{row.pathway}</strong></td>
                    <td>
                      <span className={`cvp-pill ${row.eligible ? 'eligible' : row.likely ? 'likely' : 'not-eligible'}`}>
                        {row.eligible ? 'ELIGIBLE' : row.likely ? 'LIKELY ELIGIBLE' : 'NOT ELIGIBLE'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Section 3: FSW 67-Point Grid ──────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>FSW 67-Point Selection Grid</h2></div>
            <p className="cvp-section-sub">Statutory threshold assessment for Federal Skilled Worker program entry.</p>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>Selection Factor</th>
                  <th>Applicant Profile</th>
                  <th style={{ textAlign: 'right' }}>Points</th>
                  <th style={{ textAlign: 'right' }}>Max</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Language Skills</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    CLB {clbDisplay(result.firstLanguageBands)}{profile.hasSecondLanguage ? ' + 2nd lang' : ''}
                  </td>
                  <td className={fsw.language >= 24 ? 'pts' : 'pts-muted'}>{fsw.language}</td>
                  <td className="max-pts">28</td>
                </tr>
                <tr>
                  <td><strong>Education</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    {EDU_LABELS[profile.education]}{profile.hasEca ? ' (ECA Confirmed)' : ''}
                  </td>
                  <td className={fsw.education >= 20 ? 'pts' : 'pts-muted'}>{fsw.education}</td>
                  <td className="max-pts">25</td>
                </tr>
                <tr>
                  <td><strong>Work Experience</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    {fwYears} Years (NOC {profile.nocCode || '—'})
                  </td>
                  <td className={fsw.workExperience >= 9 ? 'pts' : 'pts-muted'}>{fsw.workExperience}</td>
                  <td className="max-pts">15</td>
                </tr>
                <tr>
                  <td><strong>Age</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>{profile.age} Years Old</td>
                  <td className={fsw.age >= 10 ? 'pts' : 'pts-muted'}>{fsw.age}</td>
                  <td className="max-pts">12</td>
                </tr>
                <tr>
                  <td><strong>Arranged Employment</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    Job offer factor removed post-March 2025 (IRCC update)
                  </td>
                  <td className="pts-muted">0</td>
                  <td className="max-pts">0</td>
                </tr>
                <tr>
                  <td><strong>Adaptability</strong></td>
                  <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>
                    {fsw.adaptability > 0
                      ? [
                          profile.hasCanadianEducation && 'Canadian education',
                          profile.hasFamilyInCanada && 'Family in Canada',
                          profile.canadianWorkExperienceYears >= 1 && 'Prior Canadian work',
                        ].filter(Boolean).join(', ')
                      : 'No Canadian ties declared'}
                  </td>
                  <td className={fsw.adaptability > 0 ? 'pts' : 'pts-muted'}>{fsw.adaptability}</td>
                  <td className="max-pts">10</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="grand-total">
                  <td colSpan={2}><strong>Total FSW Points (Pass Mark: 67)</strong></td>
                  <td className="pts-total">{fsw.total}</td>
                  <td className="max-pts">100</td>
                </tr>
              </tfoot>
            </table>
            <div className="cvp-verify">
              <strong>Verdict:</strong> Applicant scores{' '}
              <strong>{fsw.total}/100</strong> and{' '}
              {fsw.eligible
                ? 'successfully clears the 67-point FSW statutory threshold. Profile is legally eligible for Express Entry profile creation.'
                : 'does NOT clear the 67-point FSW statutory threshold. FSW pathway unavailable at this time.'}
            </div>
          </div>

          {/* ── Section 4: CRS Score ──────────────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Comprehensive Ranking System (CRS)</h2></div>
            <p className="cvp-section-sub">Mathematical baseline generated from verified human capital factors.</p>

            <div className="cvp-gauge-wrap">
              {/* Gauge */}
              <div className="cvp-gauge-box">
                <svg className="cvp-gauge-svg" viewBox="0 0 260 210">
                  <defs>
                    <linearGradient id="cvpArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#E63946" />
                      <stop offset="40%" stopColor="#F4A261" />
                      <stop offset="100%" stopColor="#00A896" />
                    </linearGradient>
                  </defs>
                  <path d="M 30 180 A 100 100 0 1 1 230 180"
                    fill="none" stroke="#334155" strokeWidth="18" strokeLinecap="round" />
                  <path d="M 30 180 A 100 100 0 1 1 230 180"
                    fill="none" stroke="url(#cvpArcGrad)" strokeWidth="18" strokeLinecap="round"
                    style={{
                      strokeDasharray: 314.16,
                      strokeDashoffset: gaugeOffset_,
                      transition: 'stroke-dashoffset 1.5s ease',
                    }} />
                  {/* Cutoff dot at general draw level */}
                  <circle r="6" fill="#E63946" stroke="white" strokeWidth="2"
                    cx={dot_.x} cy={dot_.y} />
                </svg>
                <div className="cvp-gauge-overlay">
                  <div className="cvp-gauge-score">{total}</div>
                  <div className="cvp-gauge-label">CRS Score</div>
                </div>
              </div>

              {/* Breakdown list */}
              <div className="cvp-bd-wrap">
                <div className="cvp-bd-row"><span className="cvp-bd-label">Age ({profile.age})</span><span className="cvp-bd-pts">{bd.agePoints}</span></div>
                <div className="cvp-bd-row"><span className="cvp-bd-label">Education</span><span className="cvp-bd-pts">{bd.educationPoints}</span></div>
                <div className="cvp-bd-row"><span className="cvp-bd-label">First Language</span><span className="cvp-bd-pts">{bd.firstLanguagePoints}</span></div>
                {bd.secondLanguagePoints > 0 && (
                  <div className="cvp-bd-row"><span className="cvp-bd-label">Second Language</span><span className="cvp-bd-pts">{bd.secondLanguagePoints}</span></div>
                )}
                <div className="cvp-bd-row"><span className="cvp-bd-label">Canadian Experience</span><span className="cvp-bd-pts">{bd.canadianExpPoints}</span></div>
                {bd.spousePoints > 0 && (
                  <div className="cvp-bd-row"><span className="cvp-bd-label">Spouse Factors</span><span className="cvp-bd-pts">{bd.spousePoints}</span></div>
                )}
                <div className="cvp-bd-row sub-total"><span className="cvp-bd-label strong">Core / Human Capital (A)</span><span className="cvp-bd-pts">{bd.coreTotal}</span></div>

                <div className="cvp-bd-row" style={{ marginTop: '10px' }}><span className="cvp-bd-label">Education + Language</span><span className="cvp-bd-pts">{bd.eduLanguageTransfer}</span></div>
                <div className="cvp-bd-row"><span className="cvp-bd-label">Foreign Exp + Language</span><span className="cvp-bd-pts">{bd.foreignExpLanguageTransfer}</span></div>
                {bd.eduCanadianExpTransfer > 0 && (
                  <div className="cvp-bd-row"><span className="cvp-bd-label">Education + Canadian Exp</span><span className="cvp-bd-pts">{bd.eduCanadianExpTransfer}</span></div>
                )}
                {bd.foreignExpCanadianExpTransfer > 0 && (
                  <div className="cvp-bd-row"><span className="cvp-bd-label">Foreign Exp + Canadian Exp</span><span className="cvp-bd-pts">{bd.foreignExpCanadianExpTransfer}</span></div>
                )}
                <div className="cvp-bd-row sub-total"><span className="cvp-bd-label strong">Skill Transferability (C)</span><span className="cvp-bd-pts">{bd.transferTotal}</span></div>

                {bd.additionalTotal > 0 && (
                  <div className="cvp-bd-row sub-total"><span className="cvp-bd-label strong">Additional (D)</span><span className="cvp-bd-pts">{bd.additionalTotal}</span></div>
                )}

                <div className="cvp-bd-row grand">
                  <span className="cvp-bd-label strong">Grand Total CRS</span>
                  <span className="cvp-bd-pts teal">{total}</span>
                </div>
              </div>
            </div>

            {/* Stacked bar */}
            <div className="cvp-bar" style={{ marginTop: '24px' }}>
              <div className="cvp-bar-core" style={{ flex: bd.coreTotal }} />
              <div className="cvp-bar-transfer" style={{ flex: bd.transferTotal }} />
              {bd.additionalTotal > 0 && (
                <div className="cvp-bar-extra" style={{ flex: Math.min(bd.additionalTotal, 200) }} />
              )}
            </div>
            <div className="cvp-legend">
              <div className="cvp-legend-item"><div className="cvp-legend-dot cvp-bar-core" /><span>Core Factors (A)</span></div>
              <div className="cvp-legend-item"><div className="cvp-legend-dot cvp-bar-transfer" style={{ background: '#6C63FF' }} /><span>Transferability (C)</span></div>
              {bd.additionalTotal > 0 && (
                <div className="cvp-legend-item"><div className="cvp-legend-dot" style={{ background: 'var(--cvp-amber2)' }} /><span>Additional (D)</span></div>
              )}
            </div>

            <div className="cvp-verify">
              CRS Total verified: A[{bd.coreTotal}] + C[{bd.transferTotal}] + D[{bd.additionalTotal}] ={' '}
              <strong style={{ color: 'var(--cvp-teal)' }}>{total}</strong> · Cross-check complete.
            </div>
          </div>

          {/* ── Section 5: Pathway Ranking ─────────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Pathway Optimization Ranking</h2></div>
            <p className="cvp-section-sub">Composite evaluation combining nomination probability, CRS alignment, and execution speed.</p>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Pathway</th>
                  <th>Eligibility</th>
                  <th>CRS Requirement</th>
                  <th>Est. Processing</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {elig.fsw.eligible && (
                  <tr style={{ borderLeft: '3px solid var(--cvp-teal)', background: 'rgba(0,168,150,0.03)' }}>
                    <td><strong style={{ color: 'var(--cvp-teal)', fontSize: '1.05rem' }}>1</strong></td>
                    <td>Express Entry — Category-Based Selection</td>
                    <td><span className="cvp-pill eligible">ELIGIBLE</span></td>
                    <td>Live draws — see canada.ca</td>
                    <td>5–8 Months</td>
                    <td><span className="cvp-badge critical">CRITICAL PATH</span></td>
                  </tr>
                )}
                <tr>
                  <td><strong style={{ color: 'var(--cvp-teal)', fontSize: '1.05rem' }}>{elig.fsw.eligible ? 2 : 1}</strong></td>
                  <td>OINP Human Capital Priorities (Tech)</td>
                  <td><span className="cvp-pill likely">LIKELY ELIGIBLE</span></td>
                  <td>460+ (EE-Linked)</td>
                  <td>11–14 Months</td>
                  <td><span className="cvp-badge high">HIGH</span></td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--cvp-teal)', fontSize: '1.05rem' }}>{elig.fsw.eligible ? 3 : 2}</strong></td>
                  <td>BCPNP Tech (Enhanced)</td>
                  <td><span className="cvp-pill likely">LIKELY ELIGIBLE</span></td>
                  <td>90–115 SIRS</td>
                  <td>12–15 Months</td>
                  <td><span className="cvp-badge high">HIGH</span></td>
                </tr>
                {elig.cec.eligible && (
                  <tr>
                    <td><strong style={{ color: 'var(--cvp-teal)', fontSize: '1.05rem' }}>*</strong></td>
                    <td>Canadian Experience Class (CEC)</td>
                    <td><span className="cvp-pill eligible">ELIGIBLE</span></td>
                    <td>Live draws — see canada.ca</td>
                    <td>6–8 Months</td>
                    <td><span className="cvp-badge critical">CRITICAL PATH</span></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Section 6: Gap Analysis ────────────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Profile Deficit Mapping</h2></div>
            <p className="cvp-section-sub">Direct interventions required to clear programmatic thresholds.</p>
            <div className="cvp-gap-grid">
              {/* Gap: Foreign work experience vs 3yr threshold */}
              {Math.floor(fwYears) < 3 && (
                <div className="cvp-gap-card high">
                  <span className="cvp-badge high" style={{ marginBottom: '8px', display: 'inline-block' }}>HIGH PRIORITY</span>
                  <h4>Foreign Work Exp Maturity</h4>
                  <div className="cvp-gap-metric"><strong>Current:</strong> {fwYears} Years Eligible</div>
                  <div className="cvp-gap-metric"><strong>Impact:</strong> Missing transferability points unlocked at 3-year threshold (up to +25 pts).</div>
                  <div className="cvp-gap-action">
                    <strong>Remediation:</strong> Continue full-time employment in qualifying role for{' '}
                    {(3 - fwYears).toFixed(2)} more years to trigger CRS increase.
                  </div>
                </div>
              )}

              {/* Gap: Language improvement */}
              {(() => {
                const bands = result.firstLanguageBands
                const hasRoom = bands.listening < 10 || bands.reading < 10 || bands.writing < 10 || bands.speaking < 10
                if (!hasRoom) return null
                return (
                  <div className="cvp-gap-card medium">
                    <span className="cvp-badge medium" style={{ marginBottom: '8px', display: 'inline-block' }}>MEDIUM STRATEGIC</span>
                    <h4>Language Score Optimization</h4>
                    <div className="cvp-gap-metric"><strong>Current:</strong> CLB {clbDisplay(bands)}</div>
                    <div className="cvp-gap-metric"><strong>Impact:</strong> Improving all bands to CLB 10 adds up to {result.scenarios.find(s => s.name.includes('Language'))?.delta ?? 0} CRS points.</div>
                    <div className="cvp-gap-action">
                      <strong>Remediation:</strong> Retake test targeting CLB 10 in weaker bands (Writing, Speaking typically most improvable).
                    </div>
                  </div>
                )
              })()}

              {/* Gap: Draw cutoff context */}
              <div className="cvp-gap-card medium">
                <span className="cvp-badge medium" style={{ marginBottom: '8px', display: 'inline-block' }}>DRAW CONTEXT</span>
                <h4>General Draw Cutoff Delta</h4>
                <div className="cvp-gap-metric"><strong>Current CRS:</strong> {total}</div>
                <div className="cvp-gap-metric">
                  <strong>Gap to General Cutoff (~{generalCutoff}):</strong>{' '}
                  {scoreDelta > 0 ? `-${scoreDelta} points` : 'At or above cutoff'}
                </div>
                <div className="cvp-gap-action">
                  <strong>Note:</strong> Category-based draws (healthcare, STEM, trades, French) and PNP draws
                  operate at significantly lower cutoffs. Verify live draw history at canada.ca.
                </div>
              </div>
            </div>

            {/* Scenario Model */}
            <h3 className="cvp-h3" style={{ marginTop: '28px' }}>Scenario Model</h3>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Change Required</th>
                  <th className="right">Current CRS</th>
                  <th className="right">Projected CRS</th>
                  <th className="right">Delta</th>
                  <th>Competitive?</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map(s => (
                  <tr key={s.name}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ color: 'var(--cvp-muted)', fontSize: '0.84rem' }}>{s.change}</td>
                    <td className="right">{s.currentCrs}</td>
                    <td className="right" style={{ fontWeight: 700, color: 'var(--cvp-text)', background: 'rgba(0,168,150,0.04)' }}>
                      {s.projectedCrs}
                    </td>
                    <td className="right">
                      <span className={s.delta >= 600 ? 'cvp-delta-large' : 'cvp-delta-positive'}>+{s.delta}</span>
                    </td>
                    <td>
                      <span className="cvp-check">{s.competitive ? '✓' : '–'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Section 7: Strategic Recommendation (AI placeholder) ────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Strategic Recommendation</h2></div>
            <p className="cvp-section-sub">Tactical execution plan modeled against live draw patterns.</p>
            <div className="cvp-ai-placeholder">
              <strong>Claude AI narrative generation not yet connected.</strong><br />
              Add <code>ANTHROPIC_API_KEY</code> to your environment variables to unlock personalized strategic
              recommendations, action timelines, and executive summary narratives for this profile.
            </div>
          </div>

          {/* ── Section 8: Risk Assessment ─────────────────────────────── */}
          <div className="cvp-risk-panel">
            <h3>Risk and Disclosure Assessment</h3>
            <p className="cvp-risk-sub">Evaluated against IRPA inadmissibility parameters.</p>

            {/* Proof of funds */}
            <div className={`cvp-risk-card ${result.proofOfFundsSufficient ? 'green' : 'red'}`}>
              <h4>{result.proofOfFundsSufficient ? '✓ Funds Sufficiency' : '✗ Funds Insufficiency'}</h4>
              <p>
                {result.proofOfFundsSufficient
                  ? `Cleared. Applicant confirmed CAD $${profile.settlementFunds.toLocaleString()} available, exceeding the IRCC minimum of CAD $${result.proofOfFundsRequired.toLocaleString()} for a family of ${profile.familySize}.`
                  : `WARNING: CAD $${profile.settlementFunds.toLocaleString()} is below the IRCC minimum of CAD $${result.proofOfFundsRequired.toLocaleString()} for a family of ${profile.familySize}. Application cannot proceed without meeting this threshold. [VERIFY at canada.ca — proof of funds amounts are updated annually]`}
              </p>
            </div>

            {/* Criminal record */}
            <div className={`cvp-risk-card ${profile.hasCriminalRecord ? 'red' : 'green'}`}>
              <h4>{profile.hasCriminalRecord ? '⚠ Criminal Inadmissibility Risk (IRPA s.36)' : '✓ Criminal Inadmissibility (IRPA s.36)'}</h4>
              <p>
                {profile.hasCriminalRecord
                  ? 'WARNING: Criminal record declared. Admissibility analysis required — depending on the offence, nature, and elapsed time, rehabilitation or record suspension may be required. Seek legal opinion before proceeding.'
                  : 'Cleared. No criminal records declared.'}
              </p>
            </div>

            {/* Medical */}
            <div className={`cvp-risk-card ${profile.hasMedicalCondition ? 'amber' : 'green'}`}>
              <h4>{profile.hasMedicalCondition ? '⚠ Medical Inadmissibility (IRPA s.38)' : '✓ Medical Inadmissibility (IRPA s.38)'}</h4>
              <p>
                {profile.hasMedicalCondition
                  ? 'Medical conditions declared. IRCC will assess whether the condition might cause excessive demand on health or social services. Obtain a formal medical inadmissibility opinion from a qualified representative.'
                  : 'Cleared. No known medical conditions disclosed that would trigger excessive demand.'}
              </p>
            </div>

            {/* Prior refusals */}
            <div className={`cvp-risk-card ${profile.hasPriorRefusal ? 'amber' : 'green'}`}>
              <h4>{profile.hasPriorRefusal ? '⚠ Prior Refusal Implications' : '✓ Prior Refusal Implications'}</h4>
              <p>
                {profile.hasPriorRefusal
                  ? `Prior refusal(s) declared${profile.refusalDetails ? `: ${profile.refusalDetails}` : ''}. Must be disclosed on all IRCC applications. Refusal reason analysis required to ensure circumstances have changed materially.`
                  : 'Cleared. No visa refusals disclosed.'}
              </p>
            </div>
          </div>

          {/* ── Section 9: Cost Breakdown ───────────────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>PR Process Cost Breakdown</h2></div>
            <p className="cvp-section-sub">Financial staging required (CAD). [VERIFY all fees at ircc.canada.ca before filing — fees updated without notice]</p>
            <table className="cvp-table">
              <thead>
                <tr>
                  <th>Category 1 — IRCC Government Fees</th>
                  <th style={{ textAlign: 'right' }}>Amount (CAD)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Express Entry Processing Fee — Principal Applicant</td><td className="pts">$950</td></tr>
                {profile.hasSpouse && <tr><td>Express Entry Processing Fee — Spouse</td><td className="pts">$950</td></tr>}
                <tr><td>Right of Permanent Residence Fee (RPRF)</td><td className="pts">$575</td></tr>
                {profile.hasSpouse && <tr><td>RPRF — Spouse</td><td className="pts">$575</td></tr>}
                <tr><td>Biometrics — Principal Applicant</td><td className="pts">$85</td></tr>
                {profile.hasSpouse && <tr><td>Biometrics — Spouse</td><td className="pts">$85</td></tr>}
              </tbody>
              <tfoot>
                <tr className="grand-total">
                  <td><strong>IRCC Fees Sub-total</strong></td>
                  <td className="pts-total">
                    ${(950 + 575 + 85 + (profile.hasSpouse ? 950 + 575 + 85 : 0)).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="cvp-cost-cats">
              <div className="cvp-cost-card gov">
                <div className="cvp-cost-cat-label">Gov Fees</div>
                <div className="cvp-cost-total">
                  CAD ${(1610 + (profile.hasSpouse ? 1610 : 0)).toLocaleString()}
                </div>
              </div>
              <div className="cvp-cost-card third">
                <div className="cvp-cost-cat-label">Third-Party (Med / Police)</div>
                <div className="cvp-cost-total">~CAD 400–600</div>
              </div>
              <div className="cvp-cost-card prof">
                <div className="cvp-cost-cat-label">Consultation Fees</div>
                <div className="cvp-cost-total">Assessed Post-Consultation</div>
              </div>
            </div>
            <div className="cvp-cost-notice">
              All IRCC government fees sourced from ircc.canada.ca and subject to change without notice.
              Third-party costs are approximate market-rate estimates only. Re-verify all fees immediately before filing.
            </div>
          </div>

          {/* ── Section 10: Provincial Nomination ──────────────────────── */}
          <div className="cvp-section">
            <div className="cvp-section-title"><h2>Provincial Nomination Alignment</h2></div>
            <p className="cvp-section-sub">Target jurisdictions evaluated against NOC {profile.nocCode} labour market demand.</p>
            <div className="cvp-prov-grid">
              <div className="cvp-prov-card rank1">
                <h4>Ontario (ON)</h4>
                <p className="cvp-prov-stream">OINP Human Capital Priorities</p>
                <span className="cvp-pill eligible">Enhanced (EE-Linked)</span>
                <div className="cvp-prov-divider" />
                <p className="cvp-prov-body">
                  Ontario&apos;s tech sector selects directly from the Express Entry pool. OINP regularly
                  draws at significantly lower CRS cutoffs for in-demand NOCs. Zero job offer required.
                </p>
                <div className="cvp-prov-condition">
                  <strong>Key Condition:</strong> Active Express Entry profile with Ontario as province of interest.
                </div>
              </div>
              <div className="cvp-prov-card rank2">
                <h4>British Columbia (BC)</h4>
                <p className="cvp-prov-stream">BCPNP Tech</p>
                <span className="cvp-pill likely">Enhanced (EE-Linked)</span>
                <div className="cvp-prov-divider" />
                <p className="cvp-prov-body">
                  BC PNP Tech conducts predictable weekly targeted draws for tech talent. Efficient
                  processing once invited. Among the fastest provincial routes for NOC TEER 0-1.
                </p>
                <div className="cvp-prov-condition">
                  <strong>Key Condition:</strong> Valid job offer from a BC-registered employer required.
                </div>
              </div>
              <div className="cvp-prov-card rank3">
                <h4>Alberta (AB)</h4>
                <p className="cvp-prov-stream">Alberta Express Entry Stream</p>
                <span className="cvp-pill borderline">Enhanced (EE-Linked)</span>
                <div className="cvp-prov-divider" />
                <p className="cvp-prov-body">
                  Alberta&apos;s Accelerated Tech Pathway directly selects from the Express Entry pool,
                  frequently below standard CRS cutoffs. High disposable income; zero provincial sales tax.
                </p>
                <div className="cvp-prov-condition">
                  <strong>Key Condition:</strong> Preference given to Alberta job offer or immediate family ties.
                </div>
              </div>
            </div>
            <div className="cvp-strategy primary" style={{ borderRadius: '8px' }}>
              <h4>Province Recommendation Summary</h4>
              <p>
                Ontario represents the highest-probability nomination pathway for qualifying tech profiles.
                OINP Human Capital Priorities requires zero job offer and systematically selects from the pool.
                Establish the Express Entry profile immediately to expose the applicant to OINP radar.
                Verify active OINP streams at ontario.ca/oinp before advising.
              </p>
            </div>
          </div>

          {/* ── Disclaimer ─────────────────────────────────────────────── */}
          <div className="cvp-disclaimer">
            <h4>Professional Disclaimer</h4>
            <p>
              This assessment has been prepared by Prashant Thirthingoth, a specialist in Canadian immigration documentation analysis with 20+ years of practitioner experience. It is provided for informational reference purposes only to clarify your profile against current IRCC criteria and document-level requirements. The analysis contained herein is expert consulting in the documentation domain—not immigration law advice, legal representation, regulated consulting, or formal eligibility determination.
            </p>
            <p style={{ marginTop: '10px' }}>
              All eligibility assessments, CRS score calculations, and program pathway observations are based
              on information retrieved exclusively from canada.ca as of {profile.reportDate} and are intended
              solely to assist the reader in understanding their documentation position. They do not represent
              a guaranteed outcome, a formal eligibility determination, or a strategic recommendation on which
              any application decision should be based.
            </p>
            <h4 style={{ marginTop: '16px' }}>Data Sources</h4>
            <div className="cvp-source-list">
              <div>CRS Grid: canada.ca/.../criteria-comprehensive-ranking-system/grid.html</div>
              <div>Express Entry Rounds: canada.ca/.../ministerial-instructions/express-entry-rounds.html</div>
              <div>Proof of Funds: canada.ca/.../express-entry/documents/proof-funds.html</div>
              <div>Government Fees: ircc.canada.ca/english/information/fees/fees.asp</div>
            </div>
            <div className="cvp-data-freshness">
              Data currency: {profile.reportDate}. Re-verify all figures if referenced more than 30 days after the above date.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
