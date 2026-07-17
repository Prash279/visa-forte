// PNP Pathway Assessment — MARP report builder.
// Canonical Visa Forte document look: Pearl ground, Prussian headers, Saffron accents,
// Cormorant display headings, Sand rules. Narrative sections are prose; tables are
// reserved for the Eligibility Matrix and the Source & Verification Log.
// The legal disclaimer (immigration-consulting skill §17) is included verbatim.

import { type ApplicantProfile } from './crs-calculator';
import { titleCaseOccupation } from './noc-format';
import {
  type PnpAssessmentResult,
  type PnpStreamMatch,
  type PnpVerdict,
} from './pnp-eligibility';

const PEARL = '#F8F4EE';
const PRUSSIAN = '#0C2340';
const WHITE = '#FFFFFF';
const SAND = '#E2DBD1';
const SAFFRON = '#C97B1E';
const TEAL = '#1A5C72';
const AMBER = '#EDD9B0';
const INK = '#1A2B3C';
const MUTED = '#475569';
const GREEN = '#1F7A4D';
const RED = '#B23A3A';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS = "system-ui, 'Segoe UI', sans-serif";

const ROADMAP_STREAMS_SHOWN = 5;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const VERDICT_COLOR: Record<PnpVerdict, string> = {
  confirmed: GREEN,
  likely: TEAL,
  marginal: SAFFRON,
  ineligible: RED,
};
const VERDICT_LABEL: Record<PnpVerdict, string> = {
  confirmed: 'CONFIRMED',
  likely: 'LIKELY',
  marginal: 'MARGINAL',
  ineligible: 'INELIGIBLE',
};

function verdictBadge(v: PnpVerdict): string {
  const c = VERDICT_COLOR[v];
  return `<span style="background:${c}1F;color:${c};padding:3px 10px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;font-family:${SANS}">${VERDICT_LABEL[v]}</span>`;
}

function sectionBar(label: string): string {
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
    <div style="width:4px;height:22px;background:${SAFFRON};flex-shrink:0;"></div>
    <span style="color:${PRUSSIAN};font-family:${SERIF};font-size:26px;font-weight:600;line-height:1;">${label}</span>
    <div style="flex:1;height:2px;background:${SAND};"></div>
  </div>`;
}

function streamCard(m: PnpStreamMatch): string {
  const s = m.stream;
  const conds = m.conditionalRequirements.length
    ? `<div style="color:${INK};font-size:11px;margin-top:6px;line-height:1.5;"><span style="color:${SAFFRON};font-weight:700">Secure:</span> ${esc(m.conditionalRequirements.join(' '))}</div>`
    : '';
  return `<div style="background:${WHITE};border:1px solid ${SAND};border-left:4px solid ${VERDICT_COLOR[m.verdict]};padding:12px 16px;margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div style="color:${PRUSSIAN};font-size:14px;font-weight:700;font-family:${SANS}">${esc(s.province)} — ${esc(s.streamName)}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">${verdictBadge(m.verdict)}<span style="color:${SAFFRON};font-size:14px;font-weight:700;">${m.score}</span></div>
    </div>
    <div style="color:${TEAL};font-size:11px;margin-top:3px;">${esc(s.programName)} · ${s.status.toUpperCase()}${s.feeCad != null ? ` · Fee CAD $${s.feeCad}` : ''}</div>
    ${conds}
  </div>`;
}

function eligibilityMatrix(matches: PnpStreamMatch[]): string {
  if (matches.length === 0) {
    return `<div style="color:${MUTED};font-size:13px;">No streams currently match this profile. Securing an in-province job offer or improving language scores opens most PNP pathways.</div>`;
  }
  const rows = matches
    .map(
      (m) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid ${SAND};color:${INK};">${esc(m.stream.province)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid ${SAND};color:${INK};">${esc(m.stream.streamName)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid ${SAND};color:${m.stream.category === 'ee-linked' ? SAFFRON : TEAL};">${m.stream.category === 'ee-linked' ? 'EE-linked' : 'Base'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid ${SAND};">${verdictBadge(m.verdict)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid ${SAND};color:${SAFFRON};font-weight:700;text-align:right;">${m.score}</td>
      </tr>`,
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;font-family:${SANS};font-size:12px;">
    <thead><tr style="color:${PEARL};background:${PRUSSIAN};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;text-align:left;">
      <th style="padding:7px 10px;">Province</th><th style="padding:7px 10px;">Stream</th><th style="padding:7px 10px;">Category</th><th style="padding:7px 10px;">Verdict</th><th style="padding:7px 10px;text-align:right;">Score</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// A thorough per-stream guide: conditions to secure first, then the numbered steps.
function roadmapBlock(m: PnpStreamMatch): string {
  const conds = m.conditionalRequirements.length
    ? `<div style="color:${SAFFRON};font-size:10px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;margin:4px 0 6px;font-family:${SANS}">Before you apply</div>
       <div style="color:${INK};font-size:11px;line-height:1.5;margin-bottom:8px;">${esc(m.conditionalRequirements.join(' · '))}</div>`
    : '';
  const steps = m.stream.roadmap
    .map(
      (st) => `<div style="display:flex;gap:12px;margin-bottom:8px;">
        <div style="flex:0 0 22px;height:22px;border-radius:50%;background:${PRUSSIAN};color:${PEARL};font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:${SANS};">${st.step}</div>
        <div><div style="color:${PRUSSIAN};font-size:13px;font-weight:700;font-family:${SANS}">${esc(st.title)}</div><div style="color:${INK};font-size:11px;line-height:1.5;">${esc(st.detail)}</div></div>
      </div>`,
    )
    .join('');
  return `<div style="background:${WHITE};border:1px solid ${SAND};padding:14px 18px;margin-bottom:12px;border-top:3px solid ${VERDICT_COLOR[m.verdict]};">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="color:${PRUSSIAN};font-size:15px;font-weight:700;font-family:${SERIF};">${esc(m.stream.province)} — ${esc(m.stream.streamName)}</div>
      ${verdictBadge(m.verdict)}
    </div>
    ${conds}
    ${steps}
    <div style="border-top:1px solid ${SAND};margin-top:6px;padding-top:6px;color:${TEAL};font-size:10px;">Official source: ${esc(m.stream.sourceUrl)}</div>
  </div>`;
}

function sourceLog(pnp: PnpAssessmentResult): string {
  const rows = pnp.sourceLog
    .map(
      (e) => `<tr>
        <td style="padding:5px 10px;border-bottom:1px solid ${SAND};color:${INK};">${esc(e.province)}</td>
        <td style="padding:5px 10px;border-bottom:1px solid ${SAND};color:${MUTED};">${esc(e.streamName)}</td>
        <td style="padding:5px 10px;border-bottom:1px solid ${SAND};color:${TEAL};font-size:10px;word-break:break-all;">${esc(e.sourceUrl)}</td>
        <td style="padding:5px 10px;border-bottom:1px solid ${SAND};color:${MUTED};white-space:nowrap;">${e.lastVerified}</td>
      </tr>`,
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;font-family:${SANS};font-size:11px;">
    <thead><tr style="color:${PEARL};background:${PRUSSIAN};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;text-align:left;">
      <th style="padding:6px 10px;">Province</th><th style="padding:6px 10px;">Stream</th><th style="padding:6px 10px;">Source</th><th style="padding:6px 10px;">Verified</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function executiveSummary(
  profile: ApplicantProfile,
  pnp: PnpAssessmentResult,
): string {
  const name = profile.name || 'The applicant';
  const ee = pnp.eeLinked;
  const base = pnp.base;
  const parts: string[] = [];

  parts.push(
    `${esc(name)}'s detailed duties classify to NOC ${pnp.noc.nocCode} (TEER ${pnp.noc.teer}), ${esc(titleCaseOccupation(pnp.noc.title))}. ` +
      `This assessment scores that profile against ${pnp.sourceLog.length} active Provincial and Territorial Nominee streams (Quebec excluded), and surfaces the ${pnp.shortlist.length} most occupation-relevant pathways below.`,
  );

  if (ee.length > 0) {
    const top = ee[0]!;
    parts.push(
      `The strongest Express-Entry-linked option is ${esc(top.stream.province)} — ${esc(top.stream.streamName)} (${VERDICT_LABEL[top.verdict].toLowerCase()} match). ` +
        `An EE-linked nomination adds 600 CRS points and effectively guarantees an Invitation to Apply, making it the highest-leverage pathway where eligibility holds.`,
    );
  } else {
    parts.push(
      `No Express-Entry-linked stream currently matches this profile. The Base pathways below remain available and lead to a paper-based PR application after nomination.`,
    );
  }

  if (base.length > 0) {
    const top = base[0]!;
    parts.push(
      `Among Base streams, ${esc(top.stream.province)} — ${esc(top.stream.streamName)} ranks highest. Base nominations do not require an Express Entry profile but proceed through a slower, paper-based PR application.`,
    );
  }

  parts.push(
    `Most PNP pathways depend on conditions that cannot be read from the profile alone — chiefly an in-province job offer, a provincial connection, or selection from an Expression of Interest draw. Each recommendation states exactly what must still be secured.`,
  );

  return parts
    .map(
      (p) =>
        `<p style="color:${INK};font-size:14px;line-height:1.7;margin:0 0 12px;">${p}</p>`,
    )
    .join('');
}

export function buildPnpMarpMarkdown(
  profile: ApplicantProfile,
  pnp: PnpAssessmentResult,
): string {
  const name = profile.name || 'Applicant';
  const eligibleCount = pnp.eeLinked.length + pnp.base.length;

  const topEe = pnp.eeLinked.slice(0, 5);
  const topBase = pnp.base.slice(0, 5);
  const matrix = [...pnp.eeLinked, ...pnp.base];
  const roadmapTargets = pnp.shortlist.slice(0, ROADMAP_STREAMS_SHOWN);

  const candidatesBlock =
    pnp.noc.candidates.length > 1
      ? pnp.noc.candidates
          .map(
            (
              c,
              i,
            ) => `<div style="background:${WHITE};border:1px solid ${SAND};border-left:3px solid ${i === 0 ? SAFFRON : SAND};padding:8px 12px;margin-bottom:6px;">
            <span style="color:${SAFFRON};font-weight:700;font-family:${SERIF};font-size:15px;">${i + 1}.</span>
            <span style="color:${PRUSSIAN};font-weight:700;font-family:${SANS};font-size:12px;"> NOC ${c.nocCode} (TEER ${c.teer})</span>
            <span style="color:${INK};font-size:12px;"> — ${esc(titleCaseOccupation(c.title))}</span>
            <div style="color:${MUTED};font-size:11px;line-height:1.5;margin-top:2px;">${esc(c.rationale)}</div>
          </div>`,
          )
          .join('')
      : '';

  const shortlistBlock = pnp.shortlist.length
    ? pnp.shortlist.map(streamCard).join('')
    : `<div style="color:${MUTED};font-size:13px;">No stream currently matches this profile. Improving language scores or securing an in-province job offer typically opens these pathways.</div>`;

  const ambiguityCallout = pnp.noc.ambiguity.flag
    ? `<div style="background:${AMBER};border-left:4px solid ${SAFFRON};padding:12px 16px;margin-bottom:14px;">
        <div style="color:${PRUSSIAN};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-bottom:4px;font-family:${SANS}">[NOC AMBIGUITY]</div>
        <div style="color:${INK};font-size:12px;line-height:1.6;">The duties plausibly match more than one NOC at materially different TEER levels${
          pnp.noc.ambiguity.alternatives.length
            ? `: ${esc(pnp.noc.ambiguity.alternatives.map((a) => `${a.nocCode} (TEER ${a.teer})`).join(', '))}`
            : ''
        }. Confirm the correct code against the employment reference letter before relying on these results — a wrong NOC is the single highest-frequency PR refusal trigger.</div>
      </div>`
    : '';

  const flagsBlock = pnp.flags.length
    ? pnp.flags
        .map(
          (f) =>
            `<div style="background:${WHITE};border:1px solid ${SAND};border-left:3px solid ${SAFFRON};padding:10px 14px;margin-bottom:6px;color:${INK};font-size:12px;line-height:1.5;">${esc(f)}</div>`,
        )
        .join('')
    : `<div style="color:${MUTED};font-size:12px;">No classification or data-freshness flags raised for this assessment.</div>`;

  const verifiedChip = pnp.noc.verified
    ? `<span style="background:${GREEN}1F;color:${GREEN};padding:2px 8px;font-size:11px;font-weight:700;font-family:${SANS}">✓ Verified on Statistics Canada</span>`
    : `<span style="background:${SAND};color:${INK};padding:2px 8px;font-size:11px;font-weight:700;font-family:${SANS}">Grounded in StatCan data</span>`;

  return `---
marp: true
theme: default
size: 16:9
paginate: true
style: |
  section {
    background: ${PEARL};
    color: ${INK};
    font-family: ${SANS};
    font-size: 16px;
    padding: 0;
    display: block;
  }
  section::after { color: ${TEAL}; font-size: 12px; }
  header { display: none; }
---

<!-- _paginate: false -->

<div style="background:${PRUSSIAN};height:100%;padding:52px 60px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">
  <div>
    <div style="color:${PEARL};font-weight:700;letter-spacing:5px;font-size:15px;font-family:${SANS};">VISA FORTE</div>
    <div style="color:${SAFFRON};font-family:${SERIF};font-style:italic;font-size:18px;margin-top:2px;">Engineered for Passage.</div>
    <div style="width:48px;height:3px;background:${SAFFRON};margin:28px 0;"></div>
    <div style="color:${PEARL};font-family:${SERIF};font-size:52px;font-weight:600;line-height:1.05;">PNP Pathway Assessment</div>
    <div style="color:${SAND};font-size:15px;margin-top:14px;">Prepared for: <span style="color:${PEARL};font-weight:600;">${esc(name)}</span></div>
    <div style="color:${SAFFRON};font-size:15px;margin-top:4px;">NOC ${pnp.noc.nocCode} · TEER ${pnp.noc.teer} · ${esc(titleCaseOccupation(pnp.noc.title))}</div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid rgba(248,244,238,0.2);">
    <div style="color:${SAND};font-size:11px;">Verified ${pnp.dataVersion} · Source: canada.ca · ${pnp.sourceLog.length} streams assessed</div>
    <div style="color:${SAND};font-size:11px;">visaforte.com · hello@visaforte.com</div>
  </div>
</div>

---

<div style="background:${PEARL};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Executive Summary')}
  ${executiveSummary(profile, pnp)}
</div>

---

<div style="background:${PEARL};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Job Duties & NOC Classification')}
  ${ambiguityCallout}
  <div style="background:${WHITE};border:1px solid ${SAND};border-top:3px solid ${SAFFRON};padding:12px 16px;margin-bottom:12px;">
    <div style="color:${PRUSSIAN};font-family:${SERIF};font-size:22px;">NOC ${pnp.noc.nocCode} — ${esc(titleCaseOccupation(pnp.noc.title))}</div>
    <div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <span style="background:${PRUSSIAN};color:${PEARL};padding:2px 8px;font-size:11px;font-weight:700;font-family:${SANS}">TEER ${pnp.noc.teer}</span>
      <span style="background:${AMBER};color:${PRUSSIAN};padding:2px 8px;font-size:11px;font-weight:700;font-family:${SANS}">${pnp.noc.confidence} confidence</span>
      ${verifiedChip}
    </div>
  </div>
  ${candidatesBlock ? `<div style="color:${SAFFRON};font-size:10px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;margin:0 0 6px;font-family:${SANS}">Ranked matches considered</div>${candidatesBlock}` : ''}
  <div style="color:${MUTED};font-size:11px;line-height:1.6;margin:8px 0 0;">Classification is duties-driven, not title-driven. Citation: ${esc(pnp.noc.citationUrl)}</div>
</div>

---

<div style="background:${PEARL};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Recommended Pathways')}
  <div style="color:${MUTED};font-size:12px;margin-bottom:12px;">The ${pnp.shortlist.length} streams with the strongest, most occupation-relevant fit for this NOC.</div>
  ${shortlistBlock}
</div>

---

<div style="background:${PEARL};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Jurisdiction Eligibility Matrix')}
  ${eligibilityMatrix(matrix)}
  <div style="color:${MUTED};font-size:11px;margin-top:12px;">${eligibleCount} eligible streams shown; ${pnp.ineligible.length} did not meet a hard requirement and are excluded. Verdicts and scores reflect the curated data verified ${pnp.dataVersion}.</div>
</div>

---

<div style="background:${PEARL};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Ranked Recommendations — Express Entry-linked')}
  ${topEe.length ? topEe.map(streamCard).join('') : `<div style="color:${MUTED};font-size:13px;">No Express-Entry-linked streams currently match. Improving language scores or securing an in-province job offer typically opens these.</div>`}
</div>

---

<div style="background:${PEARL};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Ranked Recommendations — Base / Non-Express Entry')}
  ${topBase.length ? topBase.map(streamCard).join('') : `<div style="color:${MUTED};font-size:13px;">No Base streams currently match this profile.</div>`}
</div>

---

<div style="background:${PEARL};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('How to Apply — Step by Step')}
  ${roadmapTargets.length ? roadmapTargets.map(roadmapBlock).join('') : `<div style="color:${MUTED};font-size:13px;">No eligible pathway to map yet — resolve the conditions noted above first.</div>`}
</div>

---

<div style="background:${PEARL};height:100%;padding:40px 52px;box-sizing:border-box;">
  ${sectionBar('Risks & Flags')}
  ${flagsBlock}
  <div style="background:${WHITE};border:1px solid ${SAND};border-left:3px solid ${TEAL};padding:10px 14px;margin-top:10px;color:${INK};font-size:12px;line-height:1.6;">A provincial nomination and permanent residence are never guaranteed. PNP streams open and close without notice and selection is competitive — verify current intake on each provincial site before acting.</div>
</div>

---

<div style="background:${PEARL};height:100%;padding:36px 52px;box-sizing:border-box;">
  ${sectionBar('Source & Verification Log')}
  ${sourceLog(pnp)}
</div>

---

<div style="background:${PRUSSIAN};height:100%;padding:52px 60px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">
  <div>
    <div style="color:${SAFFRON};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:${SANS};margin-bottom:20px;">Legal Disclaimer</div>
    <div style="background:rgba(237,217,176,0.12);border-left:4px solid ${SAFFRON};padding:18px 22px;">
      <div style="color:${PEARL};font-size:13px;line-height:1.9;max-width:880px;">
        The information provided is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements before taking any action.
      </div>
    </div>
  </div>
  <div style="padding-top:20px;border-top:1px solid rgba(248,244,238,0.2);display:flex;justify-content:space-between;align-items:center;">
    <div style="color:${SAND};font-size:11px;">PNP Pathway Assessment · Generated ${profile.reportDate} · Stream data verified ${pnp.dataVersion}</div>
    <div style="color:${SAND};font-size:11px;">Visa Forte · visaforte.com · hello@visaforte.com</div>
  </div>
</div>
`;
}
