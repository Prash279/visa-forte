'use client'

import { type ApplicantProfile } from '@/lib/crs-calculator'
import {
  type PnpAssessmentResult,
  type PnpStreamMatch,
  type PnpVerdict,
} from '@/lib/pnp-eligibility'

const TEAL = '#2DD4BF'
const AMBER = '#FDE047'
const RED = '#FCA5A5'
const GREEN = '#86EFAC'
const CARD = '#1E293B'
const BORDER = '#334155'
const TEXT = '#F1F5F9'
const MUTED = '#94A3B8'
const DIM = '#64748B'

const ROADMAPS_SHOWN = 6

const VERDICT_COLOR: Record<PnpVerdict, string> = {
  confirmed: GREEN,
  likely: TEAL,
  marginal: AMBER,
  ineligible: RED,
}

interface PnpReportProps {
  profile: ApplicantProfile
  pnp: PnpAssessmentResult
  onBack: () => void
  onDownload: () => void
}

function Badge({ verdict }: { verdict: PnpVerdict }): React.JSX.Element {
  const c = VERDICT_COLOR[verdict]
  return (
    <span style={{ background: `${c}22`, color: c, padding: '2px 9px', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700 }}>
      {verdict}
    </span>
  )
}

function StreamCard({ m }: { m: PnpStreamMatch }): React.JSX.Element {
  const s = m.stream
  return (
    <div style={{ background: CARD, borderLeft: `4px solid ${VERDICT_COLOR[m.verdict]}`, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{s.province} — {s.streamName}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <Badge verdict={m.verdict} />
          <span style={{ color: TEAL, fontSize: 14, fontWeight: 700 }}>{m.score}</span>
        </div>
      </div>
      <div style={{ color: DIM, fontSize: 11, marginTop: 3 }}>
        {s.programName} · {s.status.toUpperCase()}{s.feeCad ? ` · Fee CAD $${s.feeCad.toLocaleString()}` : ''}
      </div>
      {m.conditionalRequirements.length > 0 && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: MUTED, fontSize: 12, lineHeight: 1.6 }}>
          {m.conditionalRequirements.map((c, i) => (
            <li key={i}><span style={{ color: AMBER }}>Must secure:</span> {c}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function PnpReport({ profile, pnp, onBack, onDownload }: PnpReportProps): React.JSX.Element {
  const eligible = [...pnp.eeLinked, ...pnp.base]
  const roadmapTargets = [...eligible].sort((a, b) => b.score - a.score).slice(0, ROADMAPS_SHOWN)

  return (
    <div style={{ background: '#020617', minHeight: '100vh', color: TEXT, padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ color: TEAL, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700 }}>CanVisa Pro · PNP Pathway Assessment</div>
            <div style={{ color: TEXT, fontSize: 26, fontWeight: 700, marginTop: 4 }}>{profile.name || 'Applicant'}</div>
            <div style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>NOC {pnp.noc.nocCode} · TEER {pnp.noc.teer} · {pnp.noc.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={onBack} style={btnStyle(false)}>← Back to form</button>
            <button onClick={() => window.print()} style={btnStyle(false)}>Print / Save PDF</button>
            <button onClick={onDownload} style={btnStyle(true)}>↓ Download PPTX Source (.md)</button>
          </div>
        </div>

        {/* NOC classification + ambiguity */}
        <div style={{ background: CARD, padding: '14px 16px', marginBottom: 14, borderTop: `3px solid ${TEAL}` }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Occupation Classification</div>
          <div style={{ color: TEXT, fontSize: 14 }}>
            Duties classified to <strong style={{ color: TEAL }}>NOC {pnp.noc.nocCode} (TEER {pnp.noc.teer}) — {pnp.noc.title}</strong> · {pnp.noc.confidence} confidence
          </div>
          <a href={pnp.noc.citationUrl} target="_blank" rel="noopener noreferrer" style={{ color: TEAL, fontSize: 11, wordBreak: 'break-all' }}>
            Verify on canada.ca NOC finder ↗
          </a>
        </div>

        {pnp.noc.ambiguity.flag && (
          <div style={{ background: `${RED}1A`, borderLeft: `4px solid ${RED}`, padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ color: RED, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>[NOC Ambiguity]</div>
            <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.6 }}>
              The duties plausibly match more than one NOC at materially different TEER levels
              {pnp.noc.ambiguity.alternatives.length > 0 && (
                <>: {pnp.noc.ambiguity.alternatives.map(a => `${a.nocCode} (TEER ${a.teer})`).join(', ')}</>
              )}. Confirm the correct code against the employment reference letter before relying on these results — a wrong NOC is the single highest-frequency PR refusal trigger.
            </div>
          </div>
        )}

        {/* Flags */}
        {pnp.flags.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            {pnp.flags.map((f, i) => (
              <div key={i} style={{ background: CARD, borderLeft: `3px solid ${AMBER}`, padding: '10px 14px', marginBottom: 6, color: MUTED, fontSize: 12, lineHeight: 1.5 }}>{f}</div>
            ))}
          </div>
        )}

        {/* Ranked recommendations — two structurally separate columns */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <SectionTitle text={`Express Entry-linked (${pnp.eeLinked.length})`} hint="+600 CRS · guarantees an ITA" />
            {pnp.eeLinked.length > 0
              ? pnp.eeLinked.map(m => <StreamCard key={m.stream.id} m={m} />)
              : <Empty text="No EE-linked stream currently matches. Improving language or securing an in-province job offer typically opens these." />}
          </div>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <SectionTitle text={`Base / Non-Express Entry (${pnp.base.length})`} hint="Paper-based PR after nomination" />
            {pnp.base.length > 0
              ? pnp.base.map(m => <StreamCard key={m.stream.id} m={m} />)
              : <Empty text="No Base stream currently matches this profile." />}
          </div>
        </div>

        {/* Eligibility matrix */}
        <SectionTitle text="Jurisdiction Eligibility Matrix" />
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 560 }}>
            <thead>
              <tr style={{ color: MUTED, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'left' }}>
                <th style={th}>Province</th><th style={th}>Stream</th><th style={th}>Category</th><th style={th}>Verdict</th><th style={{ ...th, textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map(m => (
                <tr key={m.stream.id}>
                  <td style={td}>{m.stream.province}</td>
                  <td style={td}>{m.stream.streamName}</td>
                  <td style={{ ...td, color: m.stream.category === 'ee-linked' ? TEAL : MUTED }}>{m.stream.category === 'ee-linked' ? 'EE-linked' : 'Base'}</td>
                  <td style={td}><Badge verdict={m.verdict} /></td>
                  <td style={{ ...td, color: TEAL, fontWeight: 700, textAlign: 'right' }}>{m.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ color: DIM, fontSize: 11, marginBottom: 18 }}>
          {eligible.length} eligible/likely/marginal streams; {pnp.ineligible.length} excluded for a hard requirement gap. Stream data verified {pnp.dataVersion}.
        </div>

        {/* Roadmaps */}
        <SectionTitle text="Application Roadmaps — Top Pathways" />
        <div style={{ marginBottom: 18 }}>
          {roadmapTargets.length > 0 ? roadmapTargets.map(m => (
            <div key={m.stream.id} style={{ background: CARD, padding: '14px 16px', marginBottom: 12, borderTop: `3px solid ${VERDICT_COLOR[m.verdict]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{m.stream.province} — {m.stream.streamName}</div>
                <Badge verdict={m.verdict} />
              </div>
              {m.stream.roadmap.map(st => (
                <div key={st.step} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: '0 0 22px', height: 22, borderRadius: '50%', background: `${TEAL}22`, color: TEAL, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{st.step}</div>
                  <div>
                    <div style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{st.title}</div>
                    <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.5 }}>{st.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )) : <Empty text="No eligible pathway to map yet — resolve the conditions above first." />}
        </div>

        {/* Source & Verification Log */}
        <SectionTitle text="Source & Verification Log" />
        <div style={{ overflowX: 'auto', marginBottom: 18 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 560 }}>
            <thead>
              <tr style={{ color: MUTED, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'left' }}>
                <th style={th}>Province</th><th style={th}>Stream</th><th style={th}>Source</th><th style={th}>Verified</th>
              </tr>
            </thead>
            <tbody>
              {pnp.sourceLog.map(e => (
                <tr key={e.streamId}>
                  <td style={td}>{e.province}</td>
                  <td style={{ ...td, color: MUTED }}>{e.streamName}</td>
                  <td style={td}><a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: TEAL, wordBreak: 'break-all' }}>{e.sourceUrl}</a></td>
                  <td style={{ ...td, color: MUTED, whiteSpace: 'nowrap' }}>{e.lastVerified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <div style={{ background: '#0D1B2A', padding: '18px 20px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ color: TEAL, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Legal Disclaimer</div>
          <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.8, margin: 0 }}>
            The information provided is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements before taking any action.
          </p>
        </div>

      </div>
    </div>
  )
}

function SectionTitle({ text, hint }: { text: string; hint?: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 3, height: 16, background: TEAL }} />
      <span style={{ color: MUTED, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>{text}</span>
      {hint && <span style={{ color: DIM, fontSize: 11 }}>· {hint}</span>}
    </div>
  )
}

function Empty({ text }: { text: string }): React.JSX.Element {
  return <div style={{ color: MUTED, fontSize: 13, background: CARD, padding: '12px 14px' }}>{text}</div>
}

const th: React.CSSProperties = { padding: '6px 10px' }
const td: React.CSSProperties = { padding: '6px 10px', borderBottom: `1px solid ${BORDER}`, color: TEXT }

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    background: primary ? TEAL : 'transparent',
    color: primary ? '#020617' : TEAL,
    border: `1px solid ${TEAL}`,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }
}
