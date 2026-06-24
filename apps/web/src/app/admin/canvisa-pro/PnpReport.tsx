'use client'

import './pnp-report.css'
import { type ApplicantProfile } from '@/lib/crs-calculator'
import {
  type EligibilityCheck,
  type PnpAssessmentResult,
  type PnpStreamMatch,
  type PnpVerdict,
} from '@/lib/pnp-eligibility'

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
          <span className="pnp-elig-req">requires {c.requirement}</span>
        </div>
      ))}
    </div>
  )
}

// Deterministic, data-driven decision support built from the assessment itself —
// what to prioritise, what is fastest, and the single change with the widest impact.
function buildInsights(pnp: PnpAssessmentResult): { label: string; body: string }[] {
  const out: { label: string; body: string }[] = []
  const shortlist = pnp.shortlist
  const topEe = pnp.eeLinked[0]

  if (topEe) {
    out.push({
      label: 'Highest-leverage route',
      body: `${topEe.stream.province} — ${topEe.stream.streamName} is Express Entry-linked. A nomination here adds 600 CRS points, which in practice guarantees an Invitation to Apply. Prioritise it wherever its conditions can be met.`,
    })
  } else if (shortlist.length > 0) {
    out.push({
      label: 'Highest-leverage route',
      body: `No Express Entry-linked stream fits this profile yet, so the base pathways are the route to PR. Raising language to CLB 9 or securing an in-province job offer is what typically unlocks the faster Express Entry-linked streams.`,
    })
  }

  const withSpeed = shortlist.filter((m) => m.stream.indicativeProcessingMonths != null)
  if (withSpeed.length > 0) {
    const fastest = withSpeed.reduce((a, b) =>
      a.stream.indicativeProcessingMonths! <= b.stream.indicativeProcessingMonths! ? a : b
    )
    out.push({
      label: 'Fastest pathway',
      body: `${fastest.stream.province} — ${fastest.stream.streamName} carries the shortest indicative processing on your shortlist (about ${fastest.stream.indicativeProcessingMonths} months after nomination). Where speed matters most, start here.`,
    })
  }

  const buckets: { test: RegExp; advice: string }[] = [
    { test: /job offer/i, advice: 'an eligible in-province job offer' },
    { test: /Expression of Interest|EOI/i, advice: 'registering an Expression of Interest and competing in the ranked draws' },
    { test: /connection/i, advice: 'a demonstrable connection to the province (study, work, or family)' },
    { test: /Educational Credential|ECA/i, advice: 'an Educational Credential Assessment' },
    { test: /occupation list/i, advice: "confirming your NOC is on the stream's current in-demand list" },
  ]
  let best: { count: number; advice: string } | null = null
  for (const b of buckets) {
    const count = shortlist.filter((m) => m.conditionalRequirements.some((c) => b.test.test(c))).length
    if (count > 0 && (!best || count > best.count)) best = { count, advice: b.advice }
  }
  if (best) {
    out.push({
      label: 'Highest-impact next step',
      body: `${best.count} of your ${shortlist.length} shortlisted streams hinge on ${best.advice}. Securing it is the single change that improves your odds across multiple provinces at once.`,
    })
  }

  const targeted = shortlist.filter((m) => m.relevance === 'targeted').length
  if (targeted > 0) {
    out.push({
      label: 'Strongest occupation fit',
      body: `${targeted} of your shortlisted streams specifically target your occupation field, not just your general eligibility. These carry the lowest documentation risk because your NOC duties align with what the province is actively selecting.`,
    })
  }

  out.push({
    label: 'Apply in parallel',
    body: `A nomination from any single province is enough for permanent residence. Where you qualify for more than one stream, pursuing them in parallel raises your overall probability without added risk — PNP streams open and close on short notice.`,
  })

  return out
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

export default function PnpReport({ profile, pnp, onBack, onDownload }: PnpReportProps): React.JSX.Element {
  const { noc } = pnp
  // Only streams the applicant can realistically pursue: passes the hard gates AND is
  // not locked to a different occupation field than the classified NOC.
  const allPassing = [...pnp.eeLinked, ...pnp.base]
  const eligible = allPassing.filter((m) => m.relevance !== 'mismatch')
  const fieldExcluded = allPassing.length - eligible.length
  const topEe = pnp.eeLinked[0]
  const insights = buildInsights(pnp)

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
          <div className="pnp-meta">NOC {noc.nocCode} · TEER {noc.teer} · {noc.title}</div>
          <div className="pnp-meta">Verified: {pnp.dataVersion} · Source: canada.ca</div>
          <div className="pnp-toolbar">
            <button className="pnp-btn" onClick={onBack}>← Back to form</button>
            <button className="pnp-btn" onClick={() => window.print()}>Print / Save PDF</button>
            <button className="pnp-btn pnp-btn--primary" onClick={onDownload}>↓ Download report source (.md)</button>
          </div>
        </div>
      </header>

      <div className="pnp-inner">
        {/* Occupation classification */}
        <section className="pnp-section">
          <SectionHead eyebrow="Occupation Classification" title="Closest NOC match" />
          <div className="pnp-noc-winner">
            <div className="pnp-noc-code">NOC {noc.nocCode}</div>
            <div className="pnp-noc-title">{noc.title}</div>
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
                      <span style={{ color: 'var(--pnp-muted)', fontSize: '0.9rem' }}> — {c.title}</span>
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
            {profile.name || 'The applicant'}&rsquo;s documented duties classify to <strong>NOC {noc.nocCode} (TEER {noc.teer})</strong>, {noc.title}.
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
                  <div className="pnp-why"><strong>Why this fits:</strong> {m.whyRelevant}</div>
                  <EligibilityChecks checks={m.eligibilityChecks} />
                  <ScoreBreakdown m={m} />
                  {m.conditionalRequirements.length > 0 && (
                    <ul className="pnp-conds">
                      {m.conditionalRequirements.map((c, i) => (
                        <li key={i}><span className="pnp-secure">Secure:</span> {c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="pnp-empty">No stream currently matches this profile. Improving language scores or securing an in-province job offer typically opens these pathways.</div>
          )}
        </section>

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

        {/* All jurisdictions matrix (secondary) */}
        <section className="pnp-section">
          <SectionHead eyebrow="Reference" title="All eligible jurisdictions" hint="full assessment" />
          <div className="pnp-table-wrap">
            <table className="pnp-table">
              <thead>
                <tr><th>Province</th><th>Stream</th><th>Category</th><th>Fit</th><th>Verdict</th><th className="pnp-num">Score</th></tr>
              </thead>
              <tbody>
                {eligible.map((m) => (
                  <tr key={m.stream.id}>
                    <td>{m.stream.province}</td>
                    <td>{m.stream.streamName}</td>
                    <td>{m.stream.category === 'ee-linked' ? 'EE-linked' : 'Base'}</td>
                    <td>{m.relevance === 'targeted' ? 'Field match' : 'Open'}</td>
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
          visaforte.com · hello@visaforte.com · Secunderabad, India<br />
          PNP Pathway Assessment · For client reference only
        </div>
      </div>
    </div>
  )
}
