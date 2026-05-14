// visas/page.tsx — Canadian immigration programs overview
// Server component — no client-side interactivity needed

import type { Metadata } from "next";
import Link from "next/link";
import "./visas.css";
import timesData from "@/lib/processing-times.json";
import drawHistory from "@/lib/crs-draw-history.json";
import feeData from "@/lib/fee-schedule.json";

export const metadata: Metadata = {
  title: "Canadian Immigration Programs — Visa Forte | Express Entry · PNP · Pathways",
  description:
    "Every Canadian PR pathway explained — eligibility, steps, documents, fees, and processing times. Express Entry (FSWP, CEC, FSTP), Provincial Nominee Programs, and more.",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"] as const;

function formatDrawDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function formatNumber(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const SHORT_LABELS: Record<string, string> = {
  ee_fswp:            "Express Entry — FSWP",
  ee_cec:             "Express Entry — CEC",
  ee_fstp:            "Express Entry — FSTP",
  pnp_enhanced:       "PNP — Enhanced Stream",
  pnp_base:           "PNP — Base Stream",
  sponsorship_spouse: "Spousal Sponsorship",
};

function urgencyClass(months: number): string {
  if (months <= 6) return "time-fast";
  if (months <= 12) return "time-moderate";
  return "time-slow";
}

const PROGRAMS = [
  {
    id: "express-entry",
    name: "Express Entry",
    tag: "Federal",
    streams: "FSWP · CEC · FSTP",
    summary:
      "Canada's primary pathway for skilled workers. Applications enter a pool, compete on CRS score, and receive Invitations to Apply via periodic draws.",
    anchor: "#express-entry",
  },
  {
    id: "pnp",
    name: "Provincial Nominee Programs",
    tag: "Provincial",
    streams: "13 provinces and territories",
    summary:
      "Each province operates independent streams targeting specific skills, occupations, and regional needs. A provincial nomination adds 600 CRS points in the EE pool.",
    anchor: "#pnp",
  },
  {
    id: "other",
    name: "Other Federal Pathways",
    tag: "Targeted",
    streams: "AIP · RNIP · SUV · Caregivers",
    summary:
      "Employer-driven, community-driven, and sector-specific programs for profiles that do not fit the Express Entry criteria or regional PNP streams.",
    anchor: "#other-pathways",
  },
] as const;

const PROCESS_STEPS = [
  {
    n: "01",
    title: "Confirm eligibility",
    body: "Determine which stream you qualify for — FSWP, CEC, or FSTP. Each has distinct minimum requirements. Meeting the minimum places you in the pool; your CRS score determines when you receive an invitation.",
  },
  {
    n: "02",
    title: "Complete language testing",
    body: "IELTS General Training, CELPIP, or TEF Canada (French). Results must be less than two years old at the date of application submission. CLB 7 is the baseline for FSWP and CEC TEER 0/1; CLB 5 applies to CEC TEER 2/3 and FSTP.",
  },
  {
    n: "03",
    title: "Obtain Educational Credential Assessment",
    body: "Required if your credential was earned outside Canada. Designated bodies include WES, ICAS, and Comparative Education Service. Allow 8–14 weeks. Begin this first — it is consistently the longest step in the preparation phase.",
  },
  {
    n: "04",
    title: "Assemble employment documentation",
    body: "Reference letters from every employer you are claiming points for. Each letter must state: duties performed, hours per week, dates of employment, and supervisor contact information — aligned with the current TEER framework, not the retired 2016 NOC duty matrix.",
  },
  {
    n: "05",
    title: "Create your Express Entry profile",
    body: "Submit your profile through the IRCC portal. You receive a CRS score based on core factors, spouse factors (if applicable), and skill transferability. Your profile remains active in the pool for 12 months.",
  },
  {
    n: "06",
    title: "Receive an Invitation to Apply (ITA)",
    body: "IRCC issues ITAs through draws — either comprehensive (all streams) or category-based (targeted occupations or profiles). The invitation arrives when your CRS score meets or exceeds the round's cutoff. You cannot control timing; you can only improve your score.",
  },
  {
    n: "07",
    title: "Submit your complete application — within 60 days",
    body: "The window is absolute. From ITA to submission: 60 calendar days. Every supporting document must be assembled, verified for compliance, and uploaded through the IRCC portal before the deadline. There are no extensions. Late submissions are not accepted.",
  },
  {
    n: "08",
    title: "Biometrics, medical examination, and IRCC processing",
    body: "After submission: biometrics (if not already on file), medical examination with an IRCC-designated physician, police clearance certificates, and any additional documents IRCC requests. A decision follows — approval, Additional Document Request, or refusal.",
  },
] as const;

const DOCUMENT_CATEGORIES = [
  {
    category: "Identity & Status",
    items: [
      "Valid passport — all pages required",
      "National identity card (if applicable)",
      "Current immigration status documents (work permit, study permit)",
    ],
  },
  {
    category: "Language",
    items: [
      "IELTS General Training, CELPIP, or TEF Canada results",
      "Results must be less than two years old at submission",
      "Both primary and spouse language results (if accompanying spouse)",
    ],
  },
  {
    category: "Education",
    items: [
      "Degree certificates and official transcripts",
      "Educational Credential Assessment (ECA) from a designated body",
      "ECA must correspond exactly to the credentials submitted",
    ],
  },
  {
    category: "Work Experience",
    items: [
      "Reference letters for every employer claimed — TEER-aligned duty descriptions",
      "T4 slips, pay stubs, or tax records (supplementary evidence)",
      "Statutory declarations for employment gaps exceeding 90 days",
    ],
  },
  {
    category: "Settlement Funds",
    items: [
      "Six months of bank statements per financial institution",
      "Funds must be consistent, traceable, and convertible to CAD at IRCC-specified rates",
      "Explanatory letters for any unexplained large deposits",
    ],
  },
  {
    category: "Police & Medical",
    items: [
      "Police clearance certificates — every country where you lived for 6+ consecutive months",
      "Upfront Medical Examination with an IRCC-designated Panel Physician",
    ],
  },
] as const;


export default function VisasPage() {
  return (
    <main className="visas-main">

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="visas-hero">
        <div className="visas-hero-inner">
          <p className="eyebrow r">Canadian Immigration Pathways</p>
          <h1 className="visas-hero-headline r d1">
            Canada&apos;s permanent residency system<br />
            has one rule: <em>qualify, then document.</em>
          </h1>
          <div className="rule r d2" />
          <p className="visas-hero-lead r d2">
            Every pathway below begins with the same two gates: meeting the eligibility threshold,
            then submitting a documentation package that survives IRCC scrutiny. The first gate is
            determined by your profile. The second is entirely within your control — if you know
            exactly what IRCC requires, in the format it requires it.
          </p>
          <div className="visas-hero-actions r d3">
            <a href="#express-entry" className="btn-primary">Explore Express Entry</a>
            <a href="#pnp" className="link-ghost">Provincial Nominee Programs</a>
          </div>
        </div>
      </section>

      {/* ── PROGRAM NAVIGATOR ──────────────────────────────── */}
      <section className="sec visas-nav-section">
        <div className="sec-inner">
          <p className="eyebrow r">Programs at a Glance</p>
          <h2 className="headline r d1">Three routes. One standard.</h2>
          <div className="rule r d2" />
          <div className="visas-nav-grid r d3">
            {PROGRAMS.map(({ id, name, tag, streams, summary, anchor }) => (
              <a href={anchor} className="visas-nav-card" key={id}>
                <div className="visas-nav-tag">{tag}</div>
                <h3 className="visas-nav-name">{name}</h3>
                <p className="visas-nav-streams">{streams}</p>
                <p className="visas-nav-summary">{summary}</p>
                <span className="visas-nav-link">See full requirements →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── LATEST CRS DRAW DATA ───────────────────────────── */}
      {(() => {
        const draw = drawHistory.draws[0];
        return (
          <section className="sec visas-draw-section">
            <div className="sec-inner">
              <p className="eyebrow r">Live Draw Data</p>
              <h2 className="headline r d1">Latest Express Entry round.</h2>
              <div className="rule r d2" />
              <div className="visas-draw-grid">
                <div className="visas-draw-card r d2">
                  <span className="visas-draw-card-label">CRS Cutoff Score</span>
                  <span className="visas-draw-card-value">{draw.cutoffScore}</span>
                  <span className="visas-draw-card-sub">Minimum score to receive an invitation</span>
                </div>
                <div className="visas-draw-card r d3">
                  <span className="visas-draw-card-label">Type of Draw</span>
                  <span className="visas-draw-card-value visas-draw-card-value--text">{draw.type}</span>
                  <span className="visas-draw-card-sub">Program stream targeted this round</span>
                </div>
                <div className="visas-draw-card r d4">
                  <span className="visas-draw-card-label">Invitations Issued</span>
                  <span className="visas-draw-card-value">{formatNumber(draw.invitationsIssued)}</span>
                  <span className="visas-draw-card-sub">Total ITAs issued in this draw</span>
                </div>
                <div className="visas-draw-card r d5">
                  <span className="visas-draw-card-label">Date of Draw</span>
                  <span className="visas-draw-card-value visas-draw-card-value--date">{formatDrawDate(draw.date)}</span>
                  <span className="visas-draw-card-sub">Most recent IRCC round</span>
                </div>
              </div>
              <p className="visas-draw-synced r">
                Source: canada.ca · Updated {drawHistory.lastUpdated}
              </p>
            </div>
          </section>
        );
      })()}

      {/* ── EXPRESS ENTRY ──────────────────────────────────── */}
      <section className="sec visas-program-section" id="express-entry">
        <div className="sec-inner">
          <p className="eyebrow r">Express Entry</p>
          <h2 className="headline r d1">
            Canada&apos;s primary managed migration system.<br />Three streams. One pool.
          </h2>
          <div className="rule r d2" />
          <p className="visas-program-lead r d2">
            Express Entry is not a visa — it is a competitive pool. You submit a profile, receive a
            Comprehensive Ranking System (CRS) score, and wait for an Invitation to Apply when your
            score meets or exceeds the cutoff of a draw. Three federal programs feed this pool.
            Which one applies to you depends on where your work experience was earned.
          </p>

          <div className="visas-streams-grid r d3">
            <div className="visas-stream">
              <div className="visas-stream-header">
                <span className="visas-stream-code">FSWP</span>
                <h3 className="visas-stream-name">Federal Skilled Worker Program</h3>
              </div>
              <p className="visas-stream-who">For skilled workers with foreign work experience.</p>
              <div className="visas-stream-reqs">
                <p className="visas-stream-req-label">Minimum requirements</p>
                <ul className="visas-stream-list">
                  <li>1 year skilled work experience (TEER 0, 1, 2, or 3) in the past 10 years</li>
                  <li>Language: CLB 7 in each of the four abilities</li>
                  <li>Education: ECA required for points credit</li>
                  <li>67 points on the six selection factors</li>
                  <li>Ability to settle financially in Canada</li>
                </ul>
              </div>
              <p className="visas-stream-note">
                Points factors: age, education, language, work experience, Canadian relatives, and
                adaptability. Arranged employment no longer adds CRS points (March 2025 change).
              </p>
            </div>

            <div className="visas-stream">
              <div className="visas-stream-header">
                <span className="visas-stream-code">CEC</span>
                <h3 className="visas-stream-name">Canadian Experience Class</h3>
              </div>
              <p className="visas-stream-who">For skilled workers with Canadian work experience.</p>
              <div className="visas-stream-reqs">
                <p className="visas-stream-req-label">Minimum requirements</p>
                <ul className="visas-stream-list">
                  <li>1 year of skilled Canadian work experience (TEER 0, 1, 2, or 3) in the past 3 years</li>
                  <li>Language: CLB 7 for TEER 0/1 occupations</li>
                  <li>Language: CLB 5 for TEER 2/3 occupations</li>
                  <li>No minimum education requirement</li>
                  <li>No settlement funds requirement</li>
                </ul>
              </div>
              <p className="visas-stream-note">
                No job offer required. Category-based draws frequently target CEC profiles —
                Canadian experience is a strong competitive advantage in the current draw environment.
              </p>
            </div>

            <div className="visas-stream">
              <div className="visas-stream-header">
                <span className="visas-stream-code">FSTP</span>
                <h3 className="visas-stream-name">Federal Skilled Trades Program</h3>
              </div>
              <p className="visas-stream-who">For workers in qualifying skilled trade occupations.</p>
              <div className="visas-stream-reqs">
                <p className="visas-stream-req-label">Minimum requirements</p>
                <ul className="visas-stream-list">
                  <li>2 years full-time skilled trades work experience in the past 5 years</li>
                  <li>Language: CLB 5 (speaking and listening), CLB 4 (reading and writing)</li>
                  <li>Job offer of at least 1 year, OR certificate of qualification from a Canadian province</li>
                  <li>No minimum education requirement</li>
                </ul>
              </div>
              <p className="visas-stream-note">
                Not all trades qualify. Eligible TEER codes are specified in IRCC regulations.
                Confirm your occupation code before investing in FSTP-specific documentation.
              </p>
            </div>
          </div>

          <div className="visas-crs-box r">
            <p className="visas-crs-label">How CRS Scoring Works</p>
            <div className="visas-crs-grid">
              <div className="visas-crs-factor">
                <span className="visas-crs-factor-name">Core Human Capital</span>
                <span className="visas-crs-factor-desc">Age, education, language proficiency, Canadian work experience</span>
              </div>
              <div className="visas-crs-factor">
                <span className="visas-crs-factor-name">Spouse / Partner Factors</span>
                <span className="visas-crs-factor-desc">Education, language, and Canadian work experience of accompanying spouse</span>
              </div>
              <div className="visas-crs-factor">
                <span className="visas-crs-factor-name">Skill Transferability</span>
                <span className="visas-crs-factor-desc">Combined education + foreign experience, and language + education combinations</span>
              </div>
              <div className="visas-crs-factor">
                <span className="visas-crs-factor-name">Additional Points</span>
                <span className="visas-crs-factor-desc">Provincial nomination (+600), sibling in Canada (+15), French language ability (+25–50)</span>
              </div>
            </div>
            <p className="visas-crs-note">
              Arranged employment points were removed from CRS scoring in March 2025. A valid Canadian
              job offer no longer adds CRS points under any Express Entry stream.
            </p>
          </div>
        </div>
      </section>

      {/* ── APPLICATION PROCESS ────────────────────────────── */}
      <section className="sec visas-process-section">
        <div className="sec-inner">
          <p className="eyebrow r">The Application Process</p>
          <h2 className="headline r d1">
            Eight stages. The 60-day window at stage seven<br />admits no extension.
          </h2>
          <div className="rule r d2" />
          <div className="visas-steps r d3">
            {PROCESS_STEPS.map(({ n, title, body }) => (
              <div className="visas-step" key={n}>
                <div className="visas-step-n">{n}</div>
                <div className="visas-step-content">
                  <h3 className="visas-step-title">{title}</h3>
                  <p className="visas-step-body">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOCUMENTS ──────────────────────────────────────── */}
      <section className="sec visas-docs-section">
        <div className="sec-inner">
          <p className="eyebrow r">Documents Required</p>
          <h2 className="headline r d1">What IRCC examines — and where packages fail.</h2>
          <div className="rule r d2" />
          <p className="visas-docs-lead r d2">
            The categories below cover the standard Express Entry documentation package. Every
            document is reviewed against the regulatory criteria current at the time of submission —
            not when it was originally drafted. Documents prepared for last year&apos;s framework may
            fail this year&apos;s review.
          </p>
          <div className="visas-docs-grid r d3">
            {DOCUMENT_CATEGORIES.map(({ category, items }) => (
              <div className="visas-doc-category" key={category}>
                <h3 className="visas-doc-cat-name">{category}</h3>
                <ul className="visas-doc-list">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="visas-docs-callout r">
            <p>
              <strong>The most common documentation failure:</strong> Employment reference letters
              drafted against the 2016 NOC duty matrix rather than the current TEER framework. IRCC
              treats misaligned duty descriptions as unverifiable work experience — every point
              attached to that employer is forfeited in its entirety.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEES & PROCESSING TIMES ────────────────────────── */}
      <section className="sec visas-fees-section" id="processing-times">
        <div className="sec-inner">
          <p className="eyebrow r">Government Fees &amp; Processing Times</p>
          <h2 className="headline r d1">What you pay. How long it takes.</h2>
          <div className="rule r d2" />
          <div className="visas-fees-layout r d3">
            <div>
              <p className="visas-fees-sublabel">Government Processing Fees (CAD)</p>
              <table className="visas-fees-table">
                <thead>
                  <tr>
                    <th>Fee Item</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {feeData.fees.map(({ item, amount }) => (
                    <tr key={item}>
                      <td>{item}</td>
                      <td className="visas-fee-amount">{amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="visas-fees-note">
                Government fees are subject to change. Verify current amounts at{" "}
                <a href={feeData.url} target="_blank" rel="noreferrer">
                  ircc.canada.ca
                </a>
                {" "}before payment. Synced {feeData.lastUpdated}.
              </p>
              <p className="visas-fees-note">
                The above are government processing fees only. Third-party costs — ECA (CAD 200–350),
                language testing (CAD 270–320), medical examination, and police certificates —
                are separate and vary by provider and country of origin.
              </p>
            </div>

            <div>
              <p className="visas-fees-sublabel">Processing Times</p>
              <div className="visas-times-cards">
                {timesData.programs.map((p) => (
                  <div key={p.id} className={`visas-time-card ${urgencyClass(p.months)}`}>
                    <span className="visas-time-program">
                      {SHORT_LABELS[p.id] ?? p.label}
                    </span>
                    <span className="visas-time-target">{p.months} mo</span>
                    <span className="visas-time-basis">80% of complete applications</span>
                  </div>
                ))}
              </div>
              <span className="visas-time-synced">
                Live from canada.ca · Synced {timesData.lastUpdated}
              </span>
              <p className="visas-fees-note">
                Times reflect 80% of complete applications and change frequently with IRCC
                volumes. Incomplete packages extend timelines. Verify current times at{" "}
                <a href={timesData.url} target="_blank" rel="noreferrer">
                  canada.ca
                </a>{" "}
                before taking any action.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROVINCIAL NOMINEE PROGRAMS ────────────────────── */}
      <section className="sec visas-pnp-section" id="pnp">
        <div className="sec-inner">
          <p className="eyebrow r">Provincial Nominee Programs</p>
          <h2 className="headline r d1">
            Thirteen provinces. Independent criteria.<br />One strategic advantage.
          </h2>
          <div className="rule r d2" />
          <p className="visas-pnp-lead r d2">
            Every province and territory (except Quebec and Nunavut) operates its own Provincial
            Nominee Program with streams targeting specific skills, occupations, and regional labour
            needs. A provincial nomination adds 600 points to your CRS score — enough to guarantee
            an Express Entry invitation from the next available draw.
          </p>
          <div className="visas-pnp-grid r d3">
            <div className="visas-pnp-type">
              <div className="visas-pnp-type-tag">EE-Aligned Streams</div>
              <h3 className="visas-pnp-type-name">Enhanced Nomination</h3>
              <p className="visas-pnp-type-body">
                Provinces nominate candidates directly from the Express Entry pool. If nominated,
                your CRS score increases by 600 points. An ITA follows in the next available draw.
              </p>
              <ul className="visas-pnp-list">
                <li>Ontario Immigrant Nominee Program (OINP)</li>
                <li>BC Provincial Nominee Program (BC PNP)</li>
                <li>Alberta Advantage Immigration Program (AAIP)</li>
                <li>Nova Scotia Nominee Program (NSNP)</li>
                <li>Saskatchewan Immigrant Nominee Program (SINP)</li>
              </ul>
            </div>
            <div className="visas-pnp-type">
              <div className="visas-pnp-type-tag">Base Streams</div>
              <h3 className="visas-pnp-type-name">Direct Application</h3>
              <p className="visas-pnp-type-body">
                Applied to directly, outside the Express Entry pool. Processing is slower but
                available to profiles that do not meet Express Entry minimums. Nomination leads
                directly to a federal PR application.
              </p>
              <ul className="visas-pnp-list">
                <li>Employer-specific streams (valid job offer required)</li>
                <li>Business and entrepreneur streams</li>
                <li>Community-driven and rural pilot streams</li>
                <li>International graduate streams</li>
              </ul>
            </div>
          </div>
          <div className="visas-pnp-callout r">
            <p>
              PNP stream availability changes frequently. Provinces open, pause, and close streams
              based on provincial labour market conditions. A stream accepting applications last
              quarter may be suspended today. Verify current stream status directly with each
              provincial authority before building a PNP-specific documentation strategy.
            </p>
          </div>
        </div>
      </section>

      {/* ── OTHER PATHWAYS ─────────────────────────────────── */}
      <section className="sec visas-other-section" id="other-pathways">
        <div className="sec-inner">
          <p className="eyebrow r">Other Federal Pathways</p>
          <h2 className="headline r d1">For profiles outside the Express Entry framework.</h2>
          <div className="rule r d2" />
          <div className="visas-other-grid r d3">
            <div className="visas-other-card">
              <p className="visas-other-tag">AIP · Employer-designated</p>
              <h3 className="visas-other-name">Atlantic Immigration Program</h3>
              <p className="visas-other-body">
                For skilled workers and international graduates with a job offer from a designated
                employer in Atlantic Canada — Nova Scotia, New Brunswick, Prince Edward Island,
                or Newfoundland and Labrador. The designated employer initiates the nomination.
              </p>
            </div>
            <div className="visas-other-card">
              <p className="visas-other-tag">RNIP · Community-driven</p>
              <h3 className="visas-other-name">Rural and Northern Immigration Pilot</h3>
              <p className="visas-other-body">
                For workers with a job offer in a participating rural or northern community. Each
                community recommends candidates based on local labour needs and sets eligibility
                criteria beyond the federal minimums. Availability varies by community.
              </p>
            </div>
            <div className="visas-other-card">
              <p className="visas-other-tag">SUV · Entrepreneur stream</p>
              <h3 className="visas-other-name">Start-Up Visa Program</h3>
              <p className="visas-other-body">
                For entrepreneurs with an innovative business concept and a Letter of Support from
                a designated Canadian venture capital fund, angel investor group, or business
                incubator. Language requirement: CLB 5 in all four abilities.
              </p>
            </div>
            <div className="visas-other-card">
              <p className="visas-other-tag">Caregiver pilots</p>
              <h3 className="visas-other-name">Home Child Care &amp; Support Workers</h3>
              <p className="visas-other-body">
                Two pathways for home child care providers and home support workers holding valid
                Canadian work permits in the relevant occupation. CLB 5 language requirement.
                No job offer required at the point of application.
              </p>
            </div>
          </div>
          <p className="visas-other-note r">
            Quebec operates entirely separate immigration programs (QSWP, Quebec Experience Program)
            with its own selection criteria. Visa Forte does not practice in the Quebec immigration stream.
          </p>
        </div>
      </section>

      {/* ── DISCLAIMER ─────────────────────────────────────── */}
      <section className="sec visas-disclaimer-section">
        <div className="sec-inner">
          <div className="visas-disclaimer r">
            <p className="visas-disclaimer-label">Important Notice</p>
            <p>
              The information on this page is provided for educational and guidance purposes only,
              based on publicly available Immigration, Refugees and Citizenship Canada (IRCC)
              regulations and policies. This does not constitute legal advice, and no
              consultant-client relationship is created by accessing this content. Immigration
              regulations, program requirements, processing times, and CRS cutoff scores are subject
              to frequent change without notice. Verify all information at{" "}
              <a
                href="https://www.canada.ca/en/immigration-refugees-citizenship.html"
                target="_blank"
                rel="noreferrer"
              >
                canada.ca
              </a>{" "}
              before taking any action.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="visas-cta-section">
        <div className="visas-cta-inner">
          <p className="eyebrow r">Your Documentation</p>
          <h2 className="visas-cta-headline r d1">
            Eligibility opens the door.<br />Documentation determines whether you walk through it.
          </h2>
          <p className="visas-cta-body r d2">
            Meeting the eligibility threshold is step one. What IRCC actually evaluates — the
            employment letters, the financial proofs, the ECA alignment — is where 20 years of
            documentation practice becomes the difference between submission and rejection.
          </p>
          <div className="visas-cta-actions r d3">
            <Link href="/intake" className="btn-primary">
              Request a Triage Assessment →
            </Link>
            <Link href="/assessment" className="link-ghost">
              Check your CRS score
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}