// About page — visaforte.com/about
// Server component. All sections use .r class for scroll-reveal
// (PageEffects in layout.tsx runs the observer).

import type { Metadata } from "next";
import "./about.css";

export const metadata: Metadata = {
  title: "About — Visa Forte | Prashant Thirthingoth, Senior Documentation Consultant",
  description:
    "Twenty years of forensic immigration documentation practice. One consultant. Every file personally reviewed. Based in Secunderabad, India.",
};

export default function AboutPage() {
  return (
    <main className="about-main">

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="about-hero">
        <div className="about-hero-inner">
          <p className="eyebrow r">The Practice</p>
          <h1 className="about-hero-headline r d1">
            Twenty Years at the Boundary<br />
            Where Applications Fail.
          </h1>
          <div className="rule r d2" />
          <p className="about-hero-lead r d2">
            A solo immigration documentation practice based in Secunderabad, India.
            Every client file reviewed personally — beginning to end — by one practitioner.
            No hand-offs. No junior clerks. No exceptions.
          </p>
        </div>
      </section>

      {/* ── PROFILE ────────────────────────────────────────── */}
      <section className="sec about-profile">
        <div className="sec-inner">
          <div className="profile-layout">

            {/* Photo + credential block */}
            <div className="profile-photo-col">
              <div className="profile-photo-placeholder">
                <div className="profile-photo-inner">
                  <span className="profile-photo-initials">PT</span>
                  <span className="profile-photo-name">Prashant Thirthingoth</span>
                  <span className="profile-photo-title">Senior Documentation Consultant</span>
                </div>
              </div>
              <div className="profile-credential-grid">
                <div className="profile-credential">
                  <span className="profile-credential-n">20<sup>+</sup></span>
                  <span className="profile-credential-label">Years in Practice</span>
                </div>
                <div className="profile-credential">
                  <span className="profile-credential-n">1</span>
                  <span className="profile-credential-label">Consultant on Every File</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="profile-bio-col r d1">
              <p className="eyebrow">Prashant Thirthingoth</p>
              <h2 className="headline profile-headline">Senior Documentation Consultant</h2>
              <div className="rule" />
              <p className="profile-body">
                I have spent more than two decades working at exactly the point in the Canadian
                immigration process where most applications succeed or fail — the documentation phase.
                Not the eligibility assessment. Not the legal strategy. The paperwork itself: the employment
                letters, the financial evidence, the ECA alignment, the gap explanations, the consistency
                of a file reviewed against the regulatory standard that is current on the day it is submitted.
              </p>
              <p className="profile-body">
                That narrow expertise is what Visa Forte is built around. It is a solo practice by design.
                Every client who engages me receives the same practitioner throughout their file — the same
                person reviewing their employment letters is the same person who answers their questions and
                responds to any IRCC correspondence. There is no firm infrastructure between my judgment and
                your file. That is the point.
              </p>
              <p className="profile-body">
                I am based in Secunderabad, India, and I work with clients across India, Southeast Asia,
                the Middle East, and internationally — wherever qualified applicants need their documentation
                reviewed to the standard that IRCC actually applies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE APPROACH ───────────────────────────────────── */}
      <section className="sec about-approach">
        <div className="sec-inner">
          <p className="eyebrow r">The Method</p>
          <h2 className="headline about-approach-headline r d1">
            Forensic Review. Not a Checklist.
          </h2>
          <div className="rule r d2" />
          <p className="about-approach-lead r d2">
            Every document in your file is reviewed against the criteria IRCC is applying today —
            not last year's checklist, not a template from the previous draw cycle.
            This is the discipline that separates documentation consulting from form-filling.
          </p>
          <div className="approach-grid">
            <div className="approach-card r d1">
              <div className="approach-card-num">01</div>
              <h3 className="approach-card-title">Personal Review</h3>
              <p className="approach-card-body">
                Your file is not triaged by software and reviewed by an associate. Every document
                is read, assessed, and cross-referenced by one practitioner who carries twenty years
                of accumulated pattern recognition for what IRCC rejects — and why.
              </p>
            </div>
            <div className="approach-card r d2">
              <div className="approach-card-num">02</div>
              <h3 className="approach-card-title">Current Regulatory Criteria</h3>
              <p className="approach-card-body">
                IRCC requirements change without announcement. The TEER transition in 2022. The removal
                of arranged employment points in March 2025. Category-based draw prioritisation replacing
                simple CRS ranking. Every review is conducted against what is in effect today.
              </p>
            </div>
            <div className="approach-card r d3">
              <div className="approach-card-num">03</div>
              <h3 className="approach-card-title">Edge-Case Experience</h3>
              <p className="approach-card-body">
                Two decades of practice means exposure to every profile scenario a standard checklist
                does not anticipate — dual-jurisdiction histories, regulated profession crossover,
                employers in jurisdictions with opaque record-keeping, gaps that require documentation
                strategy rather than explanation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SCOPE CLARITY ──────────────────────────────────── */}
      <section className="sec about-scope">
        <div className="sec-inner">
          <p className="eyebrow r">Scope and Credentials</p>
          <h2 className="headline about-scope-headline r d1">
            Documentation Consulting. Clearly Defined.
          </h2>
          <div className="rule r d2" />
          <div className="scope-layout r d3">
            <div className="scope-what">
              <p className="scope-label">What Visa Forte Provides</p>
              <ul className="scope-list">
                <li>Forensic review of your complete documentation package against current IRCC criteria</li>
                <li>Employment letter compliance — NOC/TEER alignment for every employer</li>
                <li>Financial proof analysis — consistency, completeness, CAD conversion accuracy</li>
                <li>Gap and anomaly documentation — structured explanations for every irregular element</li>
                <li>Program-specific document checklists — FSW, CEC, or targeted PNP stream</li>
                <li>Step-by-step application and submission guidance</li>
                <li>Milestone communication plans and IRCC correspondence templates</li>
              </ul>
            </div>
            <div className="scope-what-not">
              <p className="scope-label">What This Is Not</p>
              <ul className="scope-list scope-list-not">
                <li>Legal representation before IRCC or the Immigration Appeal Division</li>
                <li>Regulated immigration consulting (RCIC-licensed services)</li>
                <li>Immigration law advice</li>
                <li>Automated or templated eligibility reports</li>
              </ul>
              <div className="scope-disclaimer-block">
                <p>
                  Prashant Thirthingoth is not a Regulated Canadian Immigration Consultant (RCIC).
                  Visa Forte provides documentation preparation and review only. For legal representation
                  or regulated advice, consult a licensed RCIC or immigration lawyer authorised to
                  practise in Canada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="about-cta-section">
        <div className="about-cta-inner">
          <p className="eyebrow r">Begin</p>
          <h2 className="about-cta-headline r d1">
            Every engagement starts with a Document Triage Assessment.
          </h2>
          <p className="about-cta-body r d2">
            A personal, manual review of your profile against current IRCC criteria.
            Not an automated calculator. Not a templated report.
          </p>
          <a
            href="mailto:prashant@visaforte.com?subject=Document%20Triage%20Assessment%20%E2%80%94%20%5BYour%20Name%5D"
            className="btn-primary r d3"
          >
            Request Triage Assessment →
          </a>
        </div>
      </section>

    </main>
  );
}