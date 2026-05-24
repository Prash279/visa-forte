// Services page — visaforte.com/services
// Server component. Lists all 8 service tiers from spec.md §2.

import type { Metadata } from "next";
import Link from "next/link";
import MailtoButton from "@/components/MailtoButton";
import "./services.css";

export const metadata: Metadata = {
  title: "Services — Visa Forte | Eight Immigration Documentation Mandates",
  description:
    "Eight service tiers for Canadian PR applicants — from initial eligibility assessment to retainer-based ongoing support. Every engagement personally delivered.",
};

const SERVICES = [
  {
    n: "01",
    name: "Pre-Application Eligibility Assessment",
    tag: "Foundation",
    description:
      "A personal, manual review of your profile against current Express Entry, FSW, CEC, and PNP stream criteria before any commitment is made. Not an automated score. A practitioner's judgment on your specific history.",
    delivers: [
      "CRS score verification and gap analysis",
      "Program stream eligibility mapping (FSW / CEC / PNP)",
      "Documentation risk identification before you begin",
      "Written assessment summary with recommended path forward",
    ],
  },
  {
    n: "02",
    name: "PNP Stream Matching",
    tag: "Pathway Strategy",
    description:
      "Identification and ranking of the Provincial Nominee Program streams for which your profile qualifies. Canada's thirteen provinces each operate independent streams with distinct criteria. This engagement determines which ones apply to you — and in what order.",
    delivers: [
      "Full PNP stream eligibility mapping across applicable provinces",
      "Ranked stream list with success probability assessment",
      "NOC/TEER alignment check for each eligible stream",
      "Strategic sequencing recommendation: which to pursue first and why",
    ],
  },
  {
    n: "03",
    name: "Document Review & Compliance Audit",
    tag: "Core Service",
    description:
      "A forensic review of your assembled documentation package against the IRCC criteria that will be applied on the day of submission. Every document examined for completeness, consistency, and current regulatory compliance.",
    delivers: [
      "Line-by-line review of all employment reference letters (NOC/TEER alignment)",
      "Financial proof consistency check — balances, CAD conversion, traceability",
      "ECA verification against declared credentials",
      "Gap and anomaly documentation — every irregular element addressed",
      "Written compliance report with specific remediation for each finding",
    ],
  },
  {
    n: "04",
    name: "Refusal Analysis & Reapplication Strategy",
    tag: "Recovery",
    description:
      "Root cause analysis of a prior refusal. IRCC refusal letters state conclusions, not causes. This engagement identifies the structural failure in the original submission and constructs a reapplication strategy that addresses it.",
    delivers: [
      "Refusal letter analysis — identifying the actual documentation failure",
      "Comparison of original submission against current criteria",
      "Gap identification: what changed, what was missing, what was misaligned",
      "Reapplication roadmap with specific documentation corrections required",
      "Timeline and sequencing strategy for resubmission",
    ],
  },
  {
    n: "05",
    name: "ITA Response Preparation",
    tag: "Time-Critical",
    description:
      "Full document assembly and verification within the 60-day Invitation to Apply window. This is the highest-stakes phase of the Express Entry process. The window is fixed. The documentation standard is absolute. This engagement exists to ensure your submission is complete and compliant before the deadline.",
    delivers: [
      "Complete documentation package assembly against current IRCC checklist",
      "Priority review of all employment and financial evidence",
      "IRCC portal submission guidance — step-by-step, portal-specific",
      "Same-day response to any IRCC requests during the window",
      "Pre-submission final audit: every field, every document, every attachment",
    ],
  },
  {
    n: "06",
    name: "Full Application File Management",
    tag: "Comprehensive",
    description:
      "End-to-end file preparation and submission readiness audit for the complete application. From the initial document assembly through the final submission, every element of the file is managed against the regulatory standard that applies at each stage.",
    delivers: [
      "Complete document package preparation and compliance review",
      "Employment letter drafting guidelines for every employer",
      "Financial documentation structuring and consistency audit",
      "Submission sequence planning and portal setup guidance",
      "Pre-submission audit: every document verified before submission",
      "Post-submission monitoring setup and IRCC correspondence templates",
    ],
  },
  {
    n: "07",
    name: "Post-Submission Monitoring",
    tag: "Processing Support",
    description:
      "Active monitoring of application status through the processing period, with pre-prepared responses to IRCC correspondence. Processing timelines are variable. IRCC queries are not. This engagement ensures you can respond to any information request within 24 hours.",
    delivers: [
      "Milestone status tracking throughout the processing period",
      "Pre-prepared response templates for all standard IRCC query types",
      "Same-day turnaround on IRCC information requests",
      "Document retrieval and supplementary evidence support",
      "Processing timeline guidance and expectation management",
    ],
  },
] as const;

export default function ServicesPage() {
  return (
    <main className="services-main">

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="services-hero">
        <div className="services-hero-inner">
          <p className="eyebrow r">What We Do</p>
          <h1 className="services-hero-headline r d1">
            Seven Mandates.<br />One Standard.
          </h1>
          <div className="rule r d2" />
          <p className="services-hero-lead r d2">
            From initial eligibility through post-submission support, every engagement is
            delivered personally — reviewed against the regulatory standard that applies today.
          </p>
        </div>
      </section>

      {/* ── SERVICE TIERS ──────────────────────────────────── */}
      <section className="sec services-list">
        <div className="sec-inner">
          <div className="services-grid">
            {SERVICES.map(({ n, name, tag, description, delivers }) => (
              <div className="service-card r" key={n}>
                <div className="service-card-header">
                  <span className="service-card-n">{n}</span>
                  <span className="service-card-tag">{tag}</span>
                </div>
                <h2 className="service-card-name">{name}</h2>
                <p className="service-card-desc">{description}</p>
                <div className="service-card-delivers">
                  <p className="service-delivers-label">What You Receive</p>
                  <ul className="service-delivers-list">
                    {delivers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/booking"
                  className="service-card-cta"
                >
                  Assess Now →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT STARTS ──────────────────────────────────── */}
      <section className="sec services-process">
        <div className="sec-inner">
          <p className="eyebrow r">How Every Engagement Begins</p>
          <h2 className="headline services-process-headline r d1">
            All Paths Start with a Triage Assessment.
          </h2>
          <div className="rule r d2" />
          <div className="process-steps r d3">
            <div className="process-step">
              <div className="process-step-n">01</div>
              <h3 className="process-step-title">Get Reviewed</h3>
              <p className="process-step-body">
                Submit a brief profile — your program stream, current CRS score, and the
                primary documentation concern. This takes under five minutes.
              </p>
            </div>
            <div className="process-step-arrow" aria-hidden="true">→</div>
            <div className="process-step">
              <div className="process-step-n">02</div>
              <h3 className="process-step-title">Personal Review</h3>
              <p className="process-step-body">
                Your profile is reviewed manually against current IRCC criteria. A written
                assessment identifies which service tier fits your situation and why.
              </p>
            </div>
            <div className="process-step-arrow" aria-hidden="true">→</div>
            <div className="process-step">
              <div className="process-step-n">03</div>
              <h3 className="process-step-title">Engagement Begins</h3>
              <p className="process-step-body">
                Once scope is agreed and the engagement is confirmed, the documentation
                review begins. Capacity is limited — files are accepted in order of readiness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="services-cta-section">
        <div className="services-cta-inner">
          <p className="eyebrow r">Begin</p>
          <h2 className="services-cta-headline r d1">
            Capacity is limited to the files that can be reviewed with the attention they require.
          </h2>
          <p className="services-cta-body r d2">
            Not every application will be accepted. The triage assessment determines fit
            before any commitment is made — on either side.
          </p>
          <div className="services-cta-actions r d3">
            <MailtoButton className="btn-primary">
              Get Reviewed →
            </MailtoButton>
            <Link href="/about" className="btn-outline">
              About the Practice
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}