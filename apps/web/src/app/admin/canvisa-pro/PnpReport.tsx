'use client'

import './pnp-report.css'
import { type ApplicantProfile } from '@/lib/crs-calculator'
import {
  buildPnpInsights,
  type EligibilityCheck,
  type PnpAssessmentResult,
  type PnpStreamMatch,
  type PnpVerdict,
} from '@/lib/pnp-eligibility'
import { scoreSinp, SINP_MAX_POINTS, type SinpScore } from '@/lib/sinp-points'
import { analyzeSinpDraws, type SinpDrawAnalysis, type SinpDrawVerdict } from '@/lib/sinp-draws'
import { classifySinpPathway, type SinpPathway } from '@/lib/sinp-pathway'
import { titleCaseOccupation } from '@/lib/noc-format'
import sinp2026 from '@/lib/sinp-2026.json'

interface PnpReportProps {
  profile: ApplicantProfile
  pnp: PnpAssessmentResult
  onBack: () => void
  onDownload: () => void
}

function Badge({ verdict }: { verdict: PnpVerdict }): React.JSX.Element {
  return <span className={`pnp-badge pnp-badge--${verdict}`}>{verdict}</span>
}

function SectionHead({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }): React.JSX.Element {
  return (
    <div className="pnp-section-head">
      <div className="pnp-section-head-text">
        <span className="pnp-eyebrow">{eyebrow}</span>
        <h2 className="pnp-h2">{title}</h2>
      </div>
      {hint && <span className="pnp-hint">{hint}</span>}
    </div>
  )
}

// Score breakdown bar for each dimension
function ScoreBreakdown({ m }: { m: PnpStreamMatch }): React.JSX.Element {
  const rows: { label: string; value: number; max: number }[] = [
    { label: 'Eligibility match', value: m.scoreBreakdown.matchStrength, max: 40 },
    { label: 'Strategic value',   value: m.scoreBreakdown.strategicValue, max: 30 },
    { label: 'Stream status',     value: m.scoreBreakdown.openStatus,     max: 20 },
    { label: 'Processing speed',  value: m.scoreBreakdown.processingSpeed, max: 10 },
  ]
  return (
    <div className="pnp-score-breakdown">
      {rows.map((r) => (
        <div key={r.label} className="pnp-score-row">
          <span className="pnp-score-label">{r.label}</span>
          <div className="pnp-score-bar-wrap">
            <div className="pnp-score-bar" style={{ width: `${Math.round((r.value / r.max) * 100)}%` }} />
          </div>
          <span className="pnp-score-val">
            {r.value}<span className="pnp-score-max">/{r.max}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// Per-stream eligibility breakdown: each criterion the stream sets, the applicant's
// value, and whether it is met / securable / unmet.
function EligibilityChecks({ checks }: { checks: EligibilityCheck[] }): React.JSX.Element | null {
  if (checks.length === 0) return null
  return (
    <div className="pnp-elig">
      <div className="pnp-elig-head">Eligibility breakdown</div>
      {checks.map((c) => (
        <div key={c.label} className="pnp-elig-row">
          <span className={`pnp-elig-dot pnp-elig-dot--${c.status}`} aria-hidden="true" />
          <span className="pnp-elig-label">{c.label}</span>
          <span className={`pnp-elig-val pnp-elig-val--${c.status}`}>{c.applicant}</span>
          <span className="pnp-elig-req">{c.requirementKind === 'binary' ? c.requirement : `requires ${c.requirement}`}</span>
        </div>
      ))}
    </div>
  )
}

// The single highest-impact action for a stream, and what it unlocks.
function nextMove(m: PnpStreamMatch): string {
  if (m.verdict === 'confirmed') return 'You meet every checkable requirement — proceed to documentation.'
  const lever = m.conditionalRequirements[0]
  if (!lever) return `Maintain your profile — current verdict is ${m.verdict}.`
  return `Highest-impact next step: ${lever.replace(/\.$/, '')} → moves this toward Confirmed.`
}

// Decision-support footer for a shortlist card: criteria summary, cost & timeline,
// and the next move. All derived from data already in the assessment — no new facts.
function StreamCardExtras({ m }: { m: PnpStreamMatch }): React.JSX.Element {
  const met = m.eligibilityChecks.filter((c) => c.status === 'met').length
  const cond = m.eligibilityChecks.filter((c) => c.status === 'conditional').length
  const fee = m.stream.feeCad != null ? `Fee CAD $${m.stream.feeCad.toLocaleString()}` : 'Fee varies'
  const time = m.stream.indicativeProcessingMonths != null ? ` · ~${m.stream.indicativeProcessingMonths} mo` : ''
  return (
    <>
      <div className="pnp-card-meta">
        <span>{met} met{cond > 0 ? ` · ${cond} to secure` : ''}</span>
        <span>{fee}{time}</span>
      </div>
      <div className="pnp-nextmove"><span className="pnp-nextmove-arrow">→</span> {nextMove(m)}</div>
    </>
  )
}

// Standard, stream-specific document set derived from the stream's verified criteria.
function documentsFor(m: PnpStreamMatch, nocCode: string): string[] {
  const c = m.stream.criteria
  const docs: string[] = [
    `Valid language test — IELTS General, CELPIP, or TEF${c.minClbOverall ? ` at CLB ${c.minClbOverall}+ in each ability` : ''}`,
  ]
  if (c.ecaRequired) docs.push('Educational Credential Assessment (ECA) from a designated body (e.g. WES)')
  if (c.minSettlementFundsCad) docs.push(`Proof of settlement funds — at least CAD $${c.minSettlementFundsCad.toLocaleString()}`)
  docs.push(`Employment reference letters whose duties match NOC ${nocCode}`)
  docs.push('Valid passport and a compliant digital photo')
  if (c.jobOfferRequired === 'required') docs.push(`A job offer from an eligible employer in ${m.stream.province}`)
  return docs
}

function ApplicationGuide({ m, nocCode }: { m: PnpStreamMatch; nocCode: string }): React.JSX.Element {
  const s = m.stream
  return (
    <div className="pnp-guide">
      <div className="pnp-guide-head">
        <div>
          <div className="pnp-guide-name">{s.province} — {s.streamName}</div>
          <div className="pnp-guide-sub">{s.programName} · {s.category === 'ee-linked' ? 'Express Entry-linked' : 'Base / paper-based'} · {s.status.toUpperCase()}</div>
        </div>
        <Badge verdict={m.verdict} />
      </div>

      {m.conditionalRequirements.length > 0 && (
        <>
          <div className="pnp-subhead">Before you apply — secure these first</div>
          <ul className="pnp-prep">
            {m.conditionalRequirements.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </>
      )}

      <div className="pnp-subhead">Documents to prepare</div>
      <ul className="pnp-prep">
        {documentsFor(m, nocCode).map((d, i) => <li key={i}>{d}</li>)}
      </ul>

      <div className="pnp-subhead">Application steps</div>
      {s.roadmap.map((st) => (
        <div className="pnp-step" key={st.step}>
          <div className="pnp-step-num">{st.step}</div>
          <div>
            <div className="pnp-step-title">{st.title}</div>
            <div className="pnp-step-detail">{st.detail}</div>
          </div>
        </div>
      ))}

      <div className="pnp-guide-foot">
        <span><b>Processing:</b> {s.processingTimeNote}</span>
        {s.feeCad != null && <span><b>Fee:</b> CAD ${s.feeCad.toLocaleString()}</span>}
        <span><b>Official source:</b> <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">{s.sourceUrl}</a></span>
      </div>
    </div>
  )
}

// SINP 2026 pathway: which selection route the applicant's occupation actually has
// under the sector-based model. The points-based OID/EE path is open only for TEER 0–3
// occupations that are not on the Excluded Occupation List; everything else routes to
// the employer-driven, sector-capped EPA pathway.
function SinpPathwayCard({ pathway }: { pathway: SinpPathway }): React.JSX.Element {
  const { prioritySectors, cappedSectors } = sinp2026.sectorModel
  const open = pathway.pointsPathOpen
  return (
    <div className="pnp-pathway">
      <div className="pnp-pathway-top">
        <span className={`pnp-pathway-badge pnp-pathway-badge--${open ? 'open' : 'closed'}`}>
          {open ? 'Points path open' : 'Points path closed'}
        </span>
        <span className="pnp-pathway-noc">NOC {pathway.nocCode} · TEER {pathway.teer}</span>
      </div>
      <h3 className="pnp-pathway-headline">{pathway.headline}</h3>
      <p className="pnp-pathway-detail">{pathway.detail}</p>

      <div className="pnp-pathway-sectors">
        <div className="pnp-pathway-sector pnp-pathway-sector--priority">
          <div className="pnp-pathway-sector-head">Priority sectors · continuous intake</div>
          <p className="pnp-pathway-sector-body">
            {prioritySectors.sectors.join(', ')}. {prioritySectors.allocationNote} These candidates may apply at any time, including from overseas.
          </p>
        </div>
        <div className="pnp-pathway-sector pnp-pathway-sector--capped">
          <div className="pnp-pathway-sector-head">Capped sectors · {cappedSectors.intakeWindows2026.length} intake windows (EPA)</div>
          <ul className="pnp-pathway-cap-list">
            {cappedSectors.sectors.map((s) => (
              <li key={s.name}><b>{s.name}</b> — {s.capPct}% ({s.capNominations})</li>
            ))}
          </ul>
          <p className="pnp-pathway-sector-body">
            {cappedSectors.intakeWindows2026.join(' · ')}. {cappedSectors.allocationNote}
          </p>
        </div>
      </div>

      <p className="pnp-pathway-note">
        Sector membership is set by the employer&rsquo;s job at Employer Position Assessment (EPA) time, not by a public NOC list, so the sector model above is shown as context. Source: saskatchewan.ca · verified {sinp2026.lastVerified}.
      </p>
    </div>
  )
}

// Saskatchewan SINP International Skilled Worker points estimate. Only Factor I is
// derivable from the profile; Factor II (SK connection) and a missing second-language
// test are surfaced as "to confirm" rather than scored zero silently.
function SinpCard({ sinp }: { sinp: SinpScore }): React.JSX.Element {
  const pct = Math.round((sinp.computedPoints / sinp.maxPoints) * 100)
  const markPct = Math.round((sinp.passMark / sinp.maxPoints) * 100)
  return (
    <div className="pnp-sinp">
      <div className="pnp-sinp-top">
        <div>
          <div className="pnp-sinp-total">{sinp.computedPoints}<span className="pnp-sinp-max">/{sinp.maxPoints}</span></div>
          <div className="pnp-sinp-sub">Estimated SINP points — Factor I (Labour Market Success) computed from this profile</div>
        </div>
        <div className={`pnp-sinp-verdict pnp-sinp-verdict--${sinp.meetsPassMark ? 'pass' : 'below'}`}>
          {sinp.meetsPassMark
            ? `Clears the ${sinp.passMark}-point pass mark`
            : `Below the ${sinp.passMark}-point pass mark`}
        </div>
      </div>
      <div className="pnp-sinp-track">
        <div className="pnp-sinp-fill" style={{ width: `${pct}%` }} />
        <div className="pnp-sinp-mark" style={{ left: `${markPct}%` }} aria-label={`Pass mark ${sinp.passMark}`} />
      </div>
      <div className="pnp-sinp-rows">
        {sinp.factors.map((f) => (
          <div key={f.key} className="pnp-sinp-row" title={f.detail}>
            <span className="pnp-sinp-label">{f.label}</span>
            <span className={`pnp-sinp-tag pnp-sinp-tag--${f.status === 'to-confirm' ? 'confirm' : 'counted'}`}>
              {f.status === 'to-confirm' ? 'to confirm' : 'counted'}
            </span>
            <span className="pnp-sinp-pts">{f.points}<span className="pnp-sinp-pts-max">/{f.maxPoints}</span></span>
          </div>
        ))}
      </div>
      {sinp.hasUnconfirmedFactors && (
        <p className="pnp-sinp-note">
          Items marked &ldquo;to confirm&rdquo; are not held in this profile — chiefly the Saskatchewan connection (Factor II) and any second official-language test. Confirming them can only raise the total. The SINP minimum eligibility score is {sinp.passMark} of {sinp.maxPoints}.
        </p>
      )}
    </div>
  )
}

const DRAW_VERDICT_LABEL: Record<SinpDrawVerdict, string> = {
  clears: 'Above cutoff',
  conditional: 'Conditional',
  'out-of-range': 'Below reach',
}

// Renders a SINP draw date (YYYY-MM-DD) as e.g. "12 Sep 2024" without pulling a date lib.
function formatDrawDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${y}`
}

// Matrix "Key condition" cell: the single gate standing between this profile and a
// Confirmed verdict — the first must-secure item, or a clean pass when there is none.
function keyCondition(m: PnpStreamMatch): string {
  if (m.verdict === 'confirmed') return 'Meets all checkable criteria'
  return m.conditionalRequirements[0]?.replace(/\.$/, '') ?? `Verdict: ${m.verdict}`
}

// Matrix "Fit" cell: the occupation-eligibility result takes precedence over the coarse
// field tag, so an affirmative list match reads as "On list" rather than just "Open".
function fitLabel(m: PnpStreamMatch): string {
  switch (m.occupationEligibility) {
    case 'eligible-listed': return 'On list'
    case 'unknown': return 'List unverified'
    case 'conditional-employer': return 'Employer-set'
    default: return m.relevance === 'targeted' ? 'Field match' : 'Open'
  }
}

// Standing against the last 5 SINP EOI draws. The applicant's true grid total is a
// band [floor, ceiling]; each draw cutoff is judged against it — never a probability.
function SinpDrawsCard({ analysis }: { analysis: SinpDrawAnalysis }): React.JSX.Element {
  const floorPct = (analysis.bandFloor / SINP_MAX_POINTS) * 100
  const ceilPct = (analysis.bandCeiling / SINP_MAX_POINTS) * 100
  return (
    <div className="pnp-draws">
      <div className="pnp-draws-band">
        <div className="pnp-draws-band-track">
          <div
            className="pnp-draws-band-fill"
            style={{ left: `${floorPct}%`, width: `${ceilPct - floorPct}%` }}
          />
          {analysis.comparisons.map((c) => (
            <div
              key={`${c.date}-mark`}
              className={`pnp-draws-band-cut pnp-draws-band-cut--${c.verdict}`}
              style={{ left: `${(c.cutoffScore / SINP_MAX_POINTS) * 100}%` }}
              aria-label={`Cutoff ${c.cutoffScore}`}
            />
          ))}
        </div>
        <div className="pnp-draws-band-scale">
          <span>Floor {analysis.bandFloor}</span>
          <span>Ceiling {analysis.bandCeiling}</span>
        </div>
      </div>

      <div className="pnp-draws-summary">
        <span className="pnp-draws-chip pnp-draws-chip--clears">{analysis.clears} above</span>
        <span className="pnp-draws-chip pnp-draws-chip--conditional">{analysis.conditional} conditional</span>
        <span className="pnp-draws-chip pnp-draws-chip--out-of-range">{analysis.outOfRange} below reach</span>
      </div>

      <div className="pnp-draws-table" role="table">
        {analysis.comparisons.map((c) => (
          <div className="pnp-draws-row" role="row" key={c.date}>
            <span className="pnp-draws-date">{formatDrawDate(c.date)}</span>
            <span className="pnp-draws-cat">{c.subCategories.join(' · ')}</span>
            <span className="pnp-draws-cutoff"><b>{c.cutoffScore}</b> cutoff</span>
            <span className="pnp-draws-invited"><b>{c.invitationsIssued}</b> invited</span>
            <span className={`pnp-draws-verdict pnp-draws-verdict--${c.verdict}`}>
              {DRAW_VERDICT_LABEL[c.verdict]}
            </span>
          </div>
        ))}
      </div>

      <p className="pnp-draws-note">{analysis.programStatus}</p>
      <p className="pnp-draws-note">
        &ldquo;Standing&rdquo; compares this profile&rsquo;s band against historical cutoffs only. It is
        not a prediction, probability, or guarantee of an invitation; SINP draw activity is intermittent and
        cutoffs change without notice.
      </p>
      <p className="pnp-draws-source">
        Draw data: saskatchewan.ca EOI Selection Results · last updated {formatDrawDate(analysis.lastUpdated)}
      </p>
    </div>
  )
}

export default function PnpReport({ profile, pnp, onBack, onDownload }: PnpReportProps): React.JSX.Element {
  const { noc } = pnp
  // Only streams the applicant can realistically pursue: passes the hard gates AND is
  // not locked to a different occupation field than the classified NOC.
  const allPassing = [...pnp.eeLinked, ...pnp.base]
  const eligible = allPassing.filter((m) => m.relevance !== 'mismatch')
  const fieldExcluded = allPassing.length - eligible.length
  const topEe = pnp.eeLinked[0]
  const insights = buildPnpInsights(pnp)
  // Saskatchewan-specific points estimate (pilot). Shown only when SINP is assessed.
  const sinp = scoreSinp(profile)
  const sinpDraws = analyzeSinpDraws(sinp)
  const sinpPathway = classifySinpPathway(noc.nocCode, noc.teer)
  const showSinp = pnp.sourceLog.some((s) => s.province === 'Saskatchewan')
  // Report generation date — today, taken from the profile (set when the form loads)
  // and shown separately from the stream-data verification date so the two never blur.
  const reportGenerated = formatDrawDate(profile.reportDate || new Date().toISOString().slice(0, 10))

  return (
    <div className="pnp">
      {/* Header */}
      <header className="pnp-header">
        <div className="pnp-header-inner">
          <div className="pnp-wordmark">VISA FORTE</div>
          <div className="pnp-tagline">Engineered for Passage.</div>
          <div className="pnp-rule" />
          <h1 className="pnp-doctitle">PNP Pathway Assessment</h1>
          <div className="pnp-prepared">Prepared for: <strong>{profile.name || 'Applicant'}</strong></div>
          <div className="pnp-meta">NOC {noc.nocCode} · TEER {noc.teer} · {titleCaseOccupation(noc.title)}</div>
          <div className="pnp-meta">Report generated: {reportGenerated} · Stream data verified: {pnp.dataVersion} · Source: canada.ca</div>
          <div className="pnp-toolbar">
            <button className="pnp-btn" onClick={onBack}>← Back to form</button>
            <button className="pnp-btn" onClick={() => window.print()}>Print / Save PDF</button>
            <button className="pnp-btn pnp-btn--primary" onClick={onDownload}>↓ Download presentation (.pptx)</button>
          </div>
        </div>
      </header>

      <div className="pnp-inner">
        {/* Occupation classification */}
        <section className="pnp-section">
          <SectionHead eyebrow="Occupation Classification" title="Closest NOC match" />
          <div className="pnp-noc-winner">
            <div className="pnp-noc-code">NOC {noc.nocCode}</div>
            <div className="pnp-noc-title">{titleCaseOccupation(noc.title)}</div>
            <div className="pnp-tags">
              <span className="pnp-chip pnp-chip--teer">TEER {noc.teer}</span>
              <span className="pnp-chip">{noc.confidence} confidence</span>
              <span className={`pnp-chip ${noc.verified ? 'pnp-chip--verified' : 'pnp-chip--unverified'}`}>
                {noc.verified ? '✓ Verified on Statistics Canada' : 'Grounded in StatCan data'}
              </span>
            </div>
            <div className="pnp-cite">
              <a href={noc.citationUrl} target="_blank" rel="noopener noreferrer">View the official occupational profile ↗</a>
            </div>
          </div>

          <div className="pnp-occprofile">
            <span className="pnp-occprofile-label">Broad Occupational Category</span>
            <span className="pnp-occprofile-val">
              {pnp.occupationProfile.broadCategory} — {pnp.occupationProfile.broadCategoryName}
            </span>
            <a className="pnp-occprofile-cite" href={pnp.occupationProfile.broadCategoryUrl} target="_blank" rel="noopener noreferrer">
              StatCan NOC 2021 structure ↗
            </a>
          </div>

          {noc.candidates.length > 1 && (
            <>
              <div className="pnp-subhead">Ranked matches considered</div>
              <div className="pnp-candidates">
                {noc.candidates.map((c, i) => (
                  <div key={c.nocCode} className={`pnp-candidate ${i === 0 ? 'pnp-candidate--top' : ''}`}>
                    <div className="pnp-cand-rank">{i + 1}</div>
                    <div>
                      <span className="pnp-cand-code">NOC {c.nocCode}</span>{' '}
                      <span className="pnp-cand-teer">TEER {c.teer}</span>
                      <span style={{ color: 'var(--pnp-muted)', fontSize: '0.9rem' }}> — {titleCaseOccupation(c.title)}</span>
                      <div className="pnp-cand-rationale">{c.rationale}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {noc.ambiguity.flag && (
            <div className="pnp-callout">
              <div className="pnp-callout-label">NOC ambiguity — confirm before relying on this</div>
              <p>
                The duties plausibly match more than one NOC
                {noc.ambiguity.alternatives.length > 0 && (
                  <> ({noc.ambiguity.alternatives.map((a) => `${a.nocCode} TEER ${a.teer}`).join(', ')})</>
                )}. Confirm the code against the employment reference letter — a wrong NOC is the single highest-frequency PR refusal trigger.
              </p>
            </div>
          )}
        </section>

        {/* Executive summary */}
        <section className="pnp-section">
          <SectionHead eyebrow="Executive Summary" title="Recommended direction" />
          <p className="pnp-lead">
            {profile.name || 'The applicant'}&rsquo;s documented duties classify to <strong>NOC {noc.nocCode} (TEER {noc.teer})</strong>, {titleCaseOccupation(noc.title)}.
            Of {pnp.sourceLog.length} active Provincial and Territorial Nominee streams assessed (Quebec excluded), the {pnp.shortlist.length} below
            are the strongest, most occupation-relevant pathways for this profile.
          </p>
          <p className="pnp-lead">
            {topEe
              ? `An Express Entry-linked nomination — strongest via ${topEe.stream.province} ${topEe.stream.streamName} — adds 600 CRS points and effectively guarantees an Invitation to Apply, making it the highest-leverage route where eligibility holds.`
              : 'No Express Entry-linked stream currently matches this profile; the Base pathways below lead to a paper-based PR application after nomination.'}
            {' '}Each pathway lists exactly what must still be secured.
          </p>
        </section>

        {/* Recommended pathways (shortlist) */}
        <section className="pnp-section">
          <SectionHead eyebrow="Recommended Pathways" title={`Your strongest ${pnp.shortlist.length} streams`} />
          {pnp.shortlist.length > 0 ? (
            <div className={`pnp-cards ${pnp.shortlist.length < 2 ? 'pnp-cards--single' : ''}`}>
              {pnp.shortlist.map((m) => (
                <div key={m.stream.id} className={`pnp-card ${m.relevance === 'targeted' ? 'pnp-card--targeted' : ''}`}>
                  <div className="pnp-card-top">
                    <div>
                      <div className="pnp-card-name">{m.stream.province}</div>
                      <div className="pnp-card-sub">{m.stream.streamName} · {m.stream.category === 'ee-linked' ? 'EE-linked' : 'Base'}</div>
                    </div>
                    <div className="pnp-card-score">{m.score}<span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>/100</span></div>
                  </div>
                  <div style={{ marginTop: '0.4rem' }}><Badge verdict={m.verdict} /></div>
                  {m.occupationEligibility === 'eligible-listed' && (
                    <div className="pnp-occ pnp-occ--listed">On {m.stream.province}&rsquo;s eligible occupation list</div>
                  )}
                  {m.occupationEligibility === 'unknown' && (
                    <div className="pnp-occ pnp-occ--unknown">Occupation list not yet verified — confirm on the provincial source</div>
                  )}
                  {m.occupationEligibility === 'conditional-employer' && (
                    <div className="pnp-occ">Occupation eligibility is set at the job-offer / employer-assessment stage</div>
                  )}
                  <div className="pnp-why"><strong>Why this fits:</strong> {m.whyRelevant}</div>
                  <EligibilityChecks checks={m.eligibilityChecks} />
                  <ScoreBreakdown m={m} />
                  <div className="pnp-score-caption">
                    Eligibility {m.scoreBreakdown.matchStrength} · Strategic priority {m.scoreBreakdown.strategicValue + m.scoreBreakdown.openStatus + m.scoreBreakdown.processingSpeed} — ranks fit, not your odds of selection.
                  </div>
                  {m.conditionalRequirements.length > 0 && (
                    <ul className="pnp-conds">
                      {m.conditionalRequirements.map((c, i) => (
                        <li key={i}><span className="pnp-secure">Secure:</span> {c}</li>
                      ))}
                    </ul>
                  )}
                  <StreamCardExtras m={m} />
                </div>
              ))}
            </div>
          ) : (
            <div className="pnp-empty">No stream currently matches this profile. Improving language scores or securing an in-province job offer typically opens these pathways.</div>
          )}
        </section>

        {/* Saskatchewan SINP — 2026 sector-based pathway, then points, then demoted draws */}
        {showSinp && (
          <section className="pnp-section">
            <SectionHead eyebrow="Saskatchewan · SINP" title="SINP 2026 pathway" hint="sector-based selection" />
            <SinpPathwayCard pathway={sinpPathway} />

            <SectionHead eyebrow="Saskatchewan · SINP" title="SINP points estimate" hint={`pass mark ${sinp.passMark}/${sinp.maxPoints}`} />
            <SinpCard sinp={sinp} />

            {sinpDraws.comparisons.length > 0 && (
              <details className="pnp-draws-legacy">
                <summary className="pnp-draws-legacy-summary">
                  <span className="pnp-draws-legacy-tag">Historical reference</span>
                  Standing vs last 5 EOI draws — points-draw system is dormant (last draw {formatDrawDate(sinpDraws.lastUpdated)}). Click to expand.
                </summary>
                <SinpDrawsCard analysis={sinpDraws} />
              </details>
            )}
          </section>
        )}

        {/* Application guides */}
        {pnp.shortlist.length > 0 && (
          <section className="pnp-section">
            <SectionHead eyebrow="How to Apply" title="Step-by-step, per stream" />
            {pnp.shortlist.map((m) => <ApplicationGuide key={m.stream.id} m={m} nocCode={noc.nocCode} />)}
          </section>
        )}

        {/* Flags */}
        {pnp.flags.length > 0 && (
          <section className="pnp-section">
            <SectionHead eyebrow="Notes & Flags" title="Things to verify" />
            {pnp.flags.map((f, i) => <div key={i} className="pnp-flag">{f}</div>)}
          </section>
        )}

        {/* Ranked pathways matrix (secondary) — every eligible stream, globally ranked,
            with the single key condition gating each one. */}
        <section className="pnp-section">
          <SectionHead eyebrow="Reference" title="Ranked pathways" hint="every eligible stream" />
          <div className="pnp-table-wrap">
            <table className="pnp-table">
              <thead>
                <tr><th>Province</th><th>Stream</th><th>Category</th><th>Fit</th><th>Key condition</th><th>Verdict</th><th className="pnp-num">Score</th></tr>
              </thead>
              <tbody>
                {pnp.rankedPathways.map((m) => (
                  <tr key={m.stream.id}>
                    <td>{m.stream.province}</td>
                    <td>{m.stream.streamName}</td>
                    <td>{m.stream.category === 'ee-linked' ? 'EE-linked' : 'Base'}</td>
                    <td>{fitLabel(m)}</td>
                    <td className="pnp-table-cond">{keyCondition(m)}</td>
                    <td><Badge verdict={m.verdict} /></td>
                    <td className="pnp-num">{m.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pnp-caption">
            {eligible.length} streams match both this profile&rsquo;s attributes and occupation field. {pnp.ineligible.length} excluded for a hard requirement gap{fieldExcluded > 0 ? `; ${fieldExcluded} excluded as locked to a different occupation field` : ''}. Stream data verified {pnp.dataVersion}.
          </div>
        </section>

        {/* Strategic insights — decision support derived from this assessment */}
        {insights.length > 0 && (
          <section className="pnp-section">
            <SectionHead eyebrow="Decision Support" title="Strategic insights" hint="how to act on this" />
            <div className="pnp-insights">
              {insights.map((it) => (
                <div key={it.label} className="pnp-insight">
                  <div className="pnp-insight-label">{it.label}</div>
                  <p className="pnp-insight-body">{it.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <div className="pnp-disclaimer">
          <div className="pnp-disclaimer-label">Legal Disclaimer</div>
          <p>
            The information provided is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements before taking any action.
          </p>
        </div>

        <div className="pnp-footer">
          visaforte.com · prashant@visaforte.com · Secunderabad, India<br />
          PNP Pathway Assessment · For client reference only
        </div>
      </div>
    </div>
  )
}
