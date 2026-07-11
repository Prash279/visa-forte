import './processing-times.css'
import timesData from '@/lib/processing-times.json'
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'IRCC Processing Times | Visa Forte',
  description:
    'Current IRCC processing times for Express Entry, Provincial Nominee Program, and spousal sponsorship — updated daily from canada.ca.',
  path: '/processing-times',
});
const STREAM_ICONS: Record<string, string> = {
  ee_fswp:            '⚖',
  ee_cec:             '🍁',
  ee_fstp:            '🔧',
  pnp_enhanced:       '🏛',
  pnp_base:           '🏛',
  sponsorship_spouse: '♡',
}

function barWidth(months: number | null): string {
  if (!months) return '0%'
  const pct = Math.min(100, Math.round((months / 24) * 100))
  return `${pct}%`
}

function urgencyClass(months: number | null): string {
  if (!months) return 'pt-unknown'
  if (months <= 6)  return 'pt-fast'
  if (months <= 12) return 'pt-moderate'
  return 'pt-slow'
}

export default function ProcessingTimesPage() {
  const { programs, lastUpdated, note, url } = timesData

  return (
    <main className="pt-page">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="pt-hero">
        <div className="pt-hero-inner">
          <p className="pt-eyebrow">Live from canada.ca · Updated daily</p>
          <h1 className="pt-headline">
            IRCC Processing<br />
            <em>Times</em>
          </h1>
          <p className="pt-sub">
            How long IRCC is currently taking to process 80% of complete applications,
            pulled directly from the official IRCC website every morning.
          </p>
          <p className="pt-updated">Last synced: {lastUpdated}</p>
        </div>
      </section>

      {/* ── DISCLAIMER ───────────────────────────────────── */}
      <section className="pt-disclaimer-section">
        <div className="pt-disclaimer-inner">
          <p className="pt-disclaimer-text">
            Processing times reflect 80% of applications and change frequently based on application
            volumes, staffing, and IRCC policy. Always verify current times on{' '}
            <a href={url} target="_blank" rel="noopener noreferrer">
              canada.ca
            </a>{' '}
            before making decisions. Times shown are for complete applications only — incomplete
            packages significantly extend timelines.
          </p>
        </div>
      </section>

      {/* ── CARDS ────────────────────────────────────────── */}
      <section className="pt-cards-section">
        <div className="pt-cards-inner">

          <div className="pt-group">
            <h2 className="pt-group-heading">Express Entry</h2>
            <div className="pt-cards-grid">
              {programs
                .filter(p => p.id.startsWith('ee_'))
                .map(p => (
                  <div key={p.id} className={`pt-card ${urgencyClass(p.months)}`}>
                    <div className="pt-card-icon">{STREAM_ICONS[p.id] ?? '◆'}</div>
                    <h3 className="pt-card-label">{p.label}</h3>
                    <div className="pt-card-time">
                      {p.months != null ? (
                        <>
                          <span className="pt-months">{p.months}</span>
                          <span className="pt-months-label">months</span>
                        </>
                      ) : (
                        <span className="pt-pending">Pending sync</span>
                      )}
                    </div>
                    <div className="pt-bar-track">
                      <div className="pt-bar-fill" style={{ width: barWidth(p.months) }} />
                    </div>
                    <p className="pt-card-note">{note}</p>
                  </div>
                ))}
            </div>
          </div>

          <div className="pt-group">
            <h2 className="pt-group-heading">Provincial Nominee Program</h2>
            <div className="pt-cards-grid">
              {programs
                .filter(p => p.id.startsWith('pnp_'))
                .map(p => (
                  <div key={p.id} className={`pt-card ${urgencyClass(p.months)}`}>
                    <div className="pt-card-icon">{STREAM_ICONS[p.id] ?? '◆'}</div>
                    <h3 className="pt-card-label">{p.label}</h3>
                    <div className="pt-card-time">
                      {p.months != null ? (
                        <>
                          <span className="pt-months">{p.months}</span>
                          <span className="pt-months-label">months</span>
                        </>
                      ) : (
                        <span className="pt-pending">Pending sync</span>
                      )}
                    </div>
                    <div className="pt-bar-track">
                      <div className="pt-bar-fill" style={{ width: barWidth(p.months) }} />
                    </div>
                    <p className="pt-card-note">{note}</p>
                  </div>
                ))}
            </div>
          </div>

          <div className="pt-group">
            <h2 className="pt-group-heading">Family Sponsorship</h2>
            <div className="pt-cards-grid">
              {programs
                .filter(p => p.id.startsWith('sponsorship_'))
                .map(p => (
                  <div key={p.id} className={`pt-card ${urgencyClass(p.months)}`}>
                    <div className="pt-card-icon">{STREAM_ICONS[p.id] ?? '◆'}</div>
                    <h3 className="pt-card-label">{p.label}</h3>
                    <div className="pt-card-time">
                      {p.months != null ? (
                        <>
                          <span className="pt-months">{p.months}</span>
                          <span className="pt-months-label">months</span>
                        </>
                      ) : (
                        <span className="pt-pending">Pending sync</span>
                      )}
                    </div>
                    <div className="pt-bar-track">
                      <div className="pt-bar-fill" style={{ width: barWidth(p.months) }} />
                    </div>
                    <p className="pt-card-note">{note}</p>
                  </div>
                ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── WHAT AFFECTS YOUR TIMELINE ───────────────────── */}
      <section className="pt-factors-section">
        <div className="pt-factors-inner">
          <p className="pt-eyebrow-dark">Know before you apply</p>
          <h2 className="pt-factors-heading">What affects your processing time?</h2>
          <div className="pt-factors-grid">
            <div className="pt-factor">
              <h3>Complete documentation</h3>
              <p>
                A missing police certificate or incorrect ECA can pause your file for months.
                Visa Forte reviews every document before submission.
              </p>
            </div>
            <div className="pt-factor">
              <h3>Biometrics</h3>
              <p>
                IRCC will not begin processing until biometrics are collected. Book your
                appointment the day you receive your instruction letter.
              </p>
            </div>
            <div className="pt-factor">
              <h3>Medical exam validity</h3>
              <p>
                Medical exams are valid for 12 months. If your exam expires during processing,
                IRCC will require a new one — adding weeks or months.
              </p>
            </div>
            <div className="pt-factor">
              <h3>Application volumes</h3>
              <p>
                IRCC processing times fluctuate with the number of applications received.
                High-volume invitation rounds (1,000+) can lengthen queues across all streams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="pt-cta-section">
        <div className="pt-cta-inner">
          <h2 className="pt-cta-heading">Ready to start your application?</h2>
          <p className="pt-cta-sub">
            Visa Forte prepares complete, IRCC-ready documentation packages — so your
            file moves through the queue without delays.
          </p>
          <div className="pt-cta-actions">
            <a href="/intake" className="btn-primary">Start your profile</a>
            <a href="/assessment" className="link-ghost">Get a free assessment →</a>
          </div>
        </div>
      </section>

      {/* ── LEGAL DISCLAIMER ─────────────────────────────── */}
      <section className="pt-legal-section">
        <div className="pt-legal-inner">
          <p className="pt-legal-text">
            The information provided is for informational and guidance purposes only, based on
            publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and
            policies. This does not constitute legal advice, and no solicitor-client or
            consultant-client relationship is created by accessing this content. Immigration
            regulations, program requirements, processing times, and CRS cutoff scores are subject
            to frequent change without notice. You are responsible for verifying all information
            with official IRCC sources (
            <a href="https://www.canada.ca/immigration" target="_blank" rel="noopener noreferrer">
              canada.ca/immigration
            </a>
            ) and confirming current eligibility requirements before taking any action.
          </p>
        </div>
      </section>

    </main>
  )
}