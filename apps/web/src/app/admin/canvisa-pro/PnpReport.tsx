'use client'

import './pnp-report.css'
import { type ApplicantProfile } from '@/lib/crs-calculator'
import {
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
  const eligible = [...pnp.eeLinked, ...pnp.base]
  const topEe = pnp.eeLinked[0]

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
          <div className="pnp-section-head">
            <span className="pnp-eyebrow">Occupation Classification</span>
            <h2 className="pnp-h2">Closest NOC match</h2>
          </div>
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
                      <span className="pnp-cand-code">NOC {c.nocCode}</span> <span className="pnp-cand-teer">TEER {c.teer}</span>
                      <span> — {c.title}</span>
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
          <div className="pnp-section-head">
            <span className="pnp-eyebrow">Executive Summary</span>
            <h2 className="pnp-h2">Recommended direction</h2>
          </div>
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
          <div className="pnp-section-head">
            <span className="pnp-eyebrow">Recommended Pathways</span>
            <h2 className="pnp-h2">Your strongest {pnp.shortlist.length} streams</h2>
          </div>
          {pnp.shortlist.length > 0 ? (
            <div className={`pnp-cards ${pnp.shortlist.length < 2 ? 'pnp-cards--single' : ''}`}>
              {pnp.shortlist.map((m) => (
                <div key={m.stream.id} className={`pnp-card ${m.relevance === 'targeted' ? 'pnp-card--targeted' : ''}`}>
                  <div className="pnp-card-top">
                    <div>
                      <div className="pnp-card-name">{m.stream.province}</div>
                      <div className="pnp-card-sub">{m.stream.streamName} · {m.stream.category === 'ee-linked' ? 'EE-linked' : 'Base'}</div>
                    </div>
                    <div className="pnp-card-score">{m.score}</div>
                  </div>
                  <div style={{ marginTop: '0.4rem' }}><Badge verdict={m.verdict} /></div>
                  <div className="pnp-why"><strong>Why this fits:</strong> {m.whyRelevant}</div>
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
            <div className="pnp-section-head">
              <span className="pnp-eyebrow">How to Apply</span>
              <h2 className="pnp-h2">Step-by-step, per stream</h2>
            </div>
            {pnp.shortlist.map((m) => <ApplicationGuide key={m.stream.id} m={m} nocCode={noc.nocCode} />)}
          </section>
        )}

        {/* Flags */}
        {pnp.flags.length > 0 && (
          <section className="pnp-section">
            <div className="pnp-section-head">
              <span className="pnp-eyebrow">Notes &amp; Flags</span>
              <h2 className="pnp-h2">Things to verify</h2>
            </div>
            {pnp.flags.map((f, i) => <div key={i} className="pnp-flag">{f}</div>)}
          </section>
        )}

        {/* All jurisdictions matrix (secondary) */}
        <section className="pnp-section">
          <div className="pnp-section-head">
            <span className="pnp-eyebrow">Reference</span>
            <h2 className="pnp-h2">All eligible jurisdictions</h2>
            <span className="pnp-hint">full assessment</span>
          </div>
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
            {eligible.length} eligible streams; {pnp.ineligible.length} excluded for a hard requirement gap. Stream data verified {pnp.dataVersion}.
          </div>
        </section>

        {/* Source & verification log */}
        <section className="pnp-section">
          <div className="pnp-section-head">
            <span className="pnp-eyebrow">Provenance</span>
            <h2 className="pnp-h2">Source &amp; verification log</h2>
          </div>
          <div className="pnp-table-wrap">
            <table className="pnp-table">
              <thead><tr><th>Province</th><th>Stream</th><th>Source</th><th>Verified</th></tr></thead>
              <tbody>
                {pnp.sourceLog.map((e) => (
                  <tr key={e.streamId}>
                    <td>{e.province}</td>
                    <td>{e.streamName}</td>
                    <td><a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">{e.sourceUrl}</a></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{e.lastVerified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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
