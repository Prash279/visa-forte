// PNP Pathway Assessment — MARP report builder.
// Mirrors the CRS report's Visa Forte dark theme. Narrative sections are prose;
// tables are reserved for the Eligibility Matrix and the Source & Verification Log.
// The legal disclaimer (immigration-consulting skill §17) is included verbatim.

import { type ApplicantProfile } from './crs-calculator'
import { type PnpAssessmentResult, type PnpStreamMatch, type PnpVerdict } from './pnp-eligibility'

const BG = '#020617'
const NAVY = '#0D1B2A'
const CARD = '#1E293B'
const BORDER = '#334155'
const TEAL = '#2DD4BF'
const AMBER = '#FDE047'
const RED = '#FCA5A5'
const GREEN = '#86EFAC'
const TEXT = '#F1F5F9'
const MUTED = '#94A3B8'
const DIM = '#64748B'

const ROADMAP_STREAMS_SHOWN = 3

// Escape text that originates from the consultant or the classifier before it
// goes into HTML/markdown, so stray characters can't break the layout.
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const VERDICT_COLOR: Record<PnpVerdict, string> = {
  confirmed: GREEN,
  likely: TEAL,
  marginal: AMBER,
  ineligible: RED,
}
const VERDICT_LABEL: Record<PnpVerdict, string> = {
  confirmed: 'CONFIRMED',
  likely: 'LIKELY',
  marginal: 'MARGINAL',
  ineligible: 'INELIGIBLE',
}

function verdictBadge(v: PnpVerdict): string {
  const c = VERDICT_COLOR[v]
  return `<span style="background:${c}22;color:${c};padding:3px 10px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;font-family:system-ui">${VERDICT_LABEL[v]}</span>`
}

function sectionBar(label: string): string {
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
    <div style="width:3px;height:18px;background:${TEAL};flex-shrink:0;"></div>
    <span style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui">${label}</span>
    <div style="flex:1;height:1px;background:${BORDER};"></div>
  </div>`
}

function streamCard(m: PnpStreamMatch): string {
  const s = m.stream
  const conds = m.conditionalRequirements.length
    ? `<div style="color:${MUTED};font-size:11px;margin-top:6px;line-height:1.5;"><span style="color:${AMBER}">Conditions:</span> ${esc(m.conditionalRequirements.join(' '))}</div>`
    : ''
  return `<div style="background:${CARD};border-left:4px solid ${VERDICT_COLOR[m.verdict]};padding:12px 16px;margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div style="color:${TEXT};font-size:13px;font-weight:600;">${esc(s.province)} — ${esc(s.streamName)}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">${verdictBadge(m.verdict)}<span style="color:${TEAL};font-size:13px;font-weight:700;">${m.score}</span></div>
    </div>
    <div style="color:${DIM};font-size:11px;margin-top:3px;">${esc(s.programName)} · ${s.status.toUpperCase()}${s.feeCad ? ` · Fee CAD $${s.feeCad}` : ''}</div>
    ${conds}
  </div>`
}

function eligibilityMatrix(matches: PnpStreamMatch[]): string {
  if (matches.length === 0) {
    return `<div style="color:${MUTED};font-size:13px;">No streams currently match this profile. Securing an in-province job offer or improving language scores opens most PNP pathways.</div>`
  }
  const rows = matches
    .map(
      m => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid ${BORDER};color:${TEXT};">${esc(m.stream.province)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid ${BORDER};color:${TEXT};">${esc(m.stream.streamName)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid ${BORDER};color:${m.stream.category === 'ee-linked' ? TEAL : MUTED};">${m.stream.category === 'ee-linked' ? 'EE-linked' : 'Base'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid ${BORDER};">${verdictBadge(m.verdict)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid ${BORDER};color:${TEAL};font-weight:700;text-align:right;">${m.score}</td>
      </tr>`
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;font-family:system-ui;font-size:12px;">
    <thead><tr style="color:${MUTED};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;text-align:left;">
      <th style="padding:6px 10px;">Province</th><th style="padding:6px 10px;">Stream</th><th style="padding:6px 10px;">Category</th><th style="padding:6px 10px;">Verdict</th><th style="padding:6px 10px;text-align:right;">Score</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function roadmapBlock(m: PnpStreamMatch): string {
  const steps = m.stream.roadmap
    .map(
      st => `<div style="display:flex;gap:12px;margin-bottom:8px;">
        <div style="flex:0 0 22px;height:22px;border-radius:50%;background:${TEAL}22;color:${TEAL};font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:system-ui;">${st.step}</div>
        <div><div style="color:${TEXT};font-size:13px;font-weight:600;">${esc(st.title)}</div><div style="color:${MUTED};font-size:11px;line-height:1.5;">${esc(st.detail)}</div></div>
      </div>`
    )
    .join('')
  return `<div style="background:${CARD};padding:14px 18px;margin-bottom:12px;border-top:3px solid ${VERDICT_COLOR[m.verdict]};">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div style="color:${TEXT};font-size:14px;font-weight:700;">${esc(m.stream.province)} — ${esc(m.stream.streamName)}</div>
      ${verdictBadge(m.verdict)}
    </div>
    ${steps}
  </div>`
}

function sourceLog(pnp: PnpAssessmentResult): string {
  const rows = pnp.sourceLog
    .map(
      e => `<tr>
        <td style="padding:5px 10px;border-bottom:1px solid ${BORDER};color:${TEXT};">${esc(e.province)}</td>
        <td style="padding:5px 10px;border-bottom:1px solid ${BORDER};color:${MUTED};">${esc(e.streamName)}</td>
        <td style="padding:5px 10px;border-bottom:1px solid ${BORDER};color:${TEAL};font-size:10px;word-break:break-all;">${esc(e.sourceUrl)}</td>
        <td style="padding:5px 10px;border-bottom:1px solid ${BORDER};color:${MUTED};white-space:nowrap;">${e.lastVerified}</td>
      </tr>`
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;font-family:system-ui;font-size:11px;">
    <thead><tr style="color:${MUTED};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;text-align:left;">
      <th style="padding:5px 10px;">Province</th><th style="padding:5px 10px;">Stream</th><th style="padding:5px 10px;">Source</th><th style="padding:5px 10px;">Verified</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

// Build the executive-summary prose from the assessment outcome.
function executiveSummary(profile: ApplicantProfile, pnp: PnpAssessmentResult): string {
  const name = profile.name || 'The applicant'
  const ee = pnp.eeLinked
  const base = pnp.base
  const parts: string[] = []

  parts.push(
    `${esc(name)}'s detailed duties classify to NOC ${pnp.noc.nocCode} (TEER ${pnp.noc.teer}), ${esc(pnp.noc.title)}. ` +
      `This assessment scores that profile against ${pnp.sourceLog.length} active Provincial and Territorial Nominee streams across Canada (Quebec excluded), split into Express-Entry-linked and Base pathways.`
  )

  if (ee.length > 0) {
    const top = ee[0]!
    parts.push(
      `The strongest Express-Entry-linked option is ${esc(top.stream.province)} — ${esc(top.stream.streamName)} (${VERDICT_LABEL[top.verdict].toLowerCase()} match). ` +
        `An EE-linked nomination adds 600 CRS points and effectively guarantees an Invitation to Apply, making it the highest-leverage pathway where eligibility holds.`
    )
  } else {
    parts.push(
      `No Express-Entry-linked stream currently matches this profile. The Base pathways below remain available and lead to a paper-based PR application after nomination.`
    )
  }

  if (base.length > 0) {
    const top = base[0]!
    parts.push(
      `Among Base streams, ${esc(top.stream.province)} — ${esc(top.stream.streamName)} ranks highest. Base nominations do not require an Express Entry profile but proceed through a slower, paper-based PR application.`
    )
  }

  parts.push(
    `Most PNP pathways depend on conditions that cannot be read from the profile alone — chiefly an in-province job offer, a provincial connection, or selection from an Expression of Interest draw. Each recommendation below states exactly what must still be secured.`
  )

  return parts.map(p => `<p style="color:${MUTED};font-size:13px;line-height:1.7;margin:0 0 10px;">${p}</p>`).join('')
}

export function buildPnpMarpMarkdown(profile: ApplicantProfile, pnp: PnpAssessmentResult): string {
  const name = profile.name || 'Applicant'
  const eligibleCount = pnp.eeLinked.length + pnp.base.length

  const topEe = pnp.eeLinked.slice(0, 5)
  const topBase = pnp.base.slice(0, 5)
  const matrix = [...pnp.eeLinked, ...pnp.base]
  const roadmapTargets = [...pnp.eeLinked, ...pnp.base]
    .sort((a, b) => b.score - a.score)
    .slice(0, ROADMAP_STREAMS_SHOWN)

  const ambiguityCallout = pnp.noc.ambiguity.flag
    ? `<div style="background:${RED}1A;border-left:4px solid ${RED};padding:12px 16px;margin-bottom:14px;">
        <div style="color:${RED};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-bottom:4px;">[NOC AMBIGUITY]</div>
        <div style="color:${MUTED};font-size:12px;line-height:1.6;">The duties plausibly match more than one NOC at materially different TEER levels${
          pnp.noc.ambiguity.alternatives.length
            ? `: ${esc(pnp.noc.ambiguity.alternatives.map(a => `${a.nocCode} (TEER ${a.teer})`).join(', '))}`
            : ''
        }. Confirm the correct code against the employment reference letter before relying on these results — a wrong NOC is the single highest-frequency PR refusal trigger.</div>
      </div>`
    : ''

  const flagsBlock = pnp.flags.length
    ? pnp.flags
        .map(
          f => `<div style="background:${CARD};border-left:3px solid ${AMBER};padding:10px 14px;margin-bottom:6px;color:${MUTED};font-size:12px;line-height:1.5;">${esc(f)}</div>`
        )
        .join('')
    : `<div style="color:${MUTED};font-size:12px;">No classification or data-freshness flags raised for this assessment.</div>`

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
      <div style="color:${MUTED};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;">PNP Pathway Assessment · Confidential</div>
    </div>
    <div style="color:${MUTED};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:12px;">Provincial Nominee Pathway Report</div>
    <div style="color:${TEXT};font-size:46px;font-weight:700;line-height:1.1;margin-bottom:8px;">${esc(name)}</div>
    <div style="color:${TEAL};font-size:16px;">NOC ${pnp.noc.nocCode} · TEER ${pnp.noc.teer} · ${esc(pnp.noc.title)}</div>
  </div>
  <div>
    <div style="display:flex;gap:12px;margin-bottom:28px;">
      <div style="background:${CARD};border-top:3px solid ${TEAL};padding:18px 22px;flex:1;">
        <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:8px;">EE-linked Matches</div>
        <div style="color:${TEAL};font-size:40px;font-weight:700;line-height:1;">${pnp.eeLinked.length}</div>
      </div>
      <div style="background:${CARD};border-top:3px solid ${AMBER};padding:18px 22px;flex:1;">
        <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:8px;">Base Matches</div>
        <div style="color:${AMBER};font-size:40px;font-weight:700;line-height:1;">${pnp.base.length}</div>
      </div>
      <div style="background:${CARD};border-top:3px solid ${GREEN};padding:18px 22px;flex:1;">
        <div style="color:${MUTED};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:8px;">Streams Evaluated</div>
        <div style="color:${GREEN};font-size:40px;font-weight:700;line-height:1;">${pnp.sourceLog.length}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid ${BORDER};">
      <div style="color:${DIM};font-size:11px;">Data verified ${pnp.dataVersion} · Sources: official provincial/territorial nominee sites</div>
      <div style="color:${DIM};font-size:11px;">Visa Forte · visaforte.com</div>
    </div>
  </div>
</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Executive Summary')}
  ${executiveSummary(profile, pnp)}
</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Job Duties & NOC Classification')}
  ${ambiguityCallout}
  <p style="color:${MUTED};font-size:13px;line-height:1.7;margin:0 0 10px;">The applicant's detailed duties were classified to <span style="color:${TEAL};font-weight:600;">NOC ${pnp.noc.nocCode} (TEER ${pnp.noc.teer}) — ${esc(pnp.noc.title)}</span>, with ${pnp.noc.confidence} confidence. Classification is duties-driven, not title-driven, because the occupational code follows the work actually performed. Verify the code against the canada.ca NOC finder and the employment reference letter before submission.</p>
  <p style="color:${DIM};font-size:11px;line-height:1.6;margin:8px 0 0;">Citation: ${esc(pnp.noc.citationUrl)}</p>
</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Jurisdiction Eligibility Matrix')}
  ${eligibilityMatrix(matrix)}
  <div style="color:${DIM};font-size:11px;margin-top:12px;">${eligibleCount} eligible/likely/marginal streams shown; ${pnp.ineligible.length} streams did not meet a hard requirement and are excluded from the shortlist. Verdicts and scores reflect the curated data verified ${pnp.dataVersion}.</div>
</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Ranked Recommendations — Express Entry-linked')}
  ${topEe.length ? topEe.map(streamCard).join('') : `<div style="color:${MUTED};font-size:13px;">No Express-Entry-linked streams currently match. Improving language scores or securing an in-province job offer typically opens these.</div>`}
</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Ranked Recommendations — Base / Non-Express Entry')}
  ${topBase.length ? topBase.map(streamCard).join('') : `<div style="color:${MUTED};font-size:13px;">No Base streams currently match this profile.</div>`}
</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Application Roadmaps — Top Pathways')}
  ${roadmapTargets.length ? roadmapTargets.map(roadmapBlock).join('') : `<div style="color:${MUTED};font-size:13px;">No eligible pathway to map yet — resolve the conditions noted above first.</div>`}
</div>

---

<div style="background:${BG};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Risks & Flags')}
  ${flagsBlock}
  <div style="background:${CARD};border-left:3px solid ${DIM};padding:10px 14px;margin-top:10px;color:${MUTED};font-size:12px;line-height:1.6;">A provincial nomination and permanent residence are never guaranteed. PNP streams open and close without notice and selection is competitive — verify current intake on each provincial site before acting.</div>
</div>

---

<div style="background:${BG};height:100%;padding:36px 52px;box-sizing:border-box;">
  ${sectionBar('Source & Verification Log')}
  ${sourceLog(pnp)}
</div>

---

<div style="background:${NAVY};height:100%;padding:52px 60px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">
  <div>
    <div style="color:${TEAL};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:system-ui;margin-bottom:20px;">Legal Disclaimer</div>
    <div style="color:${MUTED};font-size:13px;line-height:1.9;max-width:840px;">
      The information provided is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements before taking any action.
    </div>
  </div>
  <div style="padding-top:20px;border-top:1px solid ${BORDER};display:flex;justify-content:space-between;align-items:center;">
    <div style="color:${DIM};font-size:11px;">PNP Pathway Assessment · Generated ${profile.reportDate} · Stream data verified ${pnp.dataVersion}</div>
    <div style="color:${DIM};font-size:11px;">Visa Forte · visaforte.com · prashant@visaforte.com</div>
  </div>
</div>
`
}
