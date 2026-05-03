"use client";

// Homepage — visaforte.com/
// Nav, footer, and scroll-reveal observer are provided by layout.tsx.
// This component only owns: accordion interaction.

import { useEffect } from "react";
import "./home.css";

export default function Home() {
  useEffect(() => {
    // Accordion for the FAQ/objections section
    document.querySelectorAll<HTMLButtonElement>(".accord-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".accord-item");
        if (!item) return;
        const isOpen = item.classList.contains("open");

        document.querySelectorAll<HTMLElement>(".accord-item").forEach((i) => {
          i.classList.remove("open");
          i.querySelector<HTMLButtonElement>(".accord-btn")?.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
          item.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }, []);

  return (
    <main>
      <section className="hero">
        <span className="hero-watermark" aria-hidden="true">20</span>
        <div className="hero-inner">
          <p className="hero-eyebrow">Express Entry · Federal Skilled Worker · Provincial Nominee Programs</p>
          <h1 className="hero-headline">
            The IRCC Doesn't Reject<br />Candidates. It Rejects <em>Documents.</em>
          </h1>
          <div className="hero-rule" />
          <p className="hero-sub">
            Your CRS score qualified you. Your ITA arrived. Now <strong>the documentation phase determines everything</strong> — and it is precisely where 90% of otherwise eligible applications fail. Visa Forte exists at exactly that boundary.
          </p>
          <div className="hero-actions">
            <a
              href="#triage"
              className="btn-primary"
              onClick={(e) => {
                e.preventDefault();
                const subject = encodeURIComponent("Document Triage Assessment — [Your Name]");
                const body = encodeURIComponent(
                  "Dear Prashant,\n\nI am writing to request a Document Triage Assessment for my Express Entry application. I want to ensure my documentation is in order before I proceed.\n\nMy details:\n\nFull name:\nCurrent location (city, country):\nExpress Entry program: CEC / FSWP / FSTP\nCurrent CRS score:\nITA received: Yes / No\nPrimary documentation concern:\n\nI am ready to proceed and look forward to hearing from you.\n\n[Full name]\n[WhatsApp / Phone]"
                );
                window.location.href = `mailto:prashant@visaforte.com?subject=${subject}&body=${body}`;
              }}
            >
              Request Document Triage →
            </a>
            <a href="#evidence" className="link-ghost">See client outcomes</a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-n">20<sup>+</sup></span>
              <span className="stat-label">Years Documentation Practice</span>
            </div>
            <div className="stat">
              <span className="stat-n">1</span>
              <span className="stat-label">Consultant. Every File.</span>
            </div>
            <div className="stat">
              <span className="stat-n">0</span>
              <span className="stat-label">Junior Clerks. Zero Hand-offs.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sec stakes">
        <div className="sec-inner">
          <p className="eyebrow r">Where Applications Fail</p>
          <h2 className="headline r d1">Your Eligibility Is Not the Question. Your Documentation Is.</h2>
          <div className="rule r d2" />
          <p className="stakes-lead r d2">
            The IRCC does not reject unqualified candidates — it rejects incomplete, inconsistent, and non-compliant documentation packages. Even a competitive CRS score and a clean ITA cannot protect an application where the supporting file carries any of the following structural vulnerabilities. Each one below represents a documented grounds-of-rejection that a forensic review catches before the file is submitted.
          </p>
          <div className="stakes-grid r d3">
            <div className="stake">
              <div className="stake-n">01</div>
              <div className="stake-title">NOC / TEER Misalignment</div>
              <p className="stake-body">
                Employment reference letters written to the 2016 NOC duty matrix — not the current TEER framework adopted in November 2022 — create a direct grounds-of-rejection. The declared occupation cannot be verified. Work experience points attached to that employer are forfeited in their entirety.
              </p>
            </div>
            <div className="stake">
              <div className="stake-n">02</div>
              <div className="stake-title">Financial Proof Inconsistencies</div>
              <p className="stake-body">
                Settlement funds must be traceable, consistent across all submitted bank statements, and converted to CAD at IRCC-specified exchange rates. Unexplained deposits, balance gaps, or conversion errors trigger mandatory secondary review — the most common cause of preventable processing delays.
              </p>
            </div>
            <div className="stake">
              <div className="stake-n">03</div>
              <div className="stake-title">Missing Mandatory Employer Data</div>
              <p className="stake-body">
                Work experience letters lacking a direct-contact signatory, business registration documentation, or specific hourly and weekly duration statements are treated by IRCC as unverifiable. The experience claim fails, regardless of how legitimate the underlying employment was.
              </p>
            </div>
            <div className="stake">
              <div className="stake-n">04</div>
              <div className="stake-title">ECA and Education Gaps</div>
              <p className="stake-body">
                Educational Credential Assessments that do not correspond exactly to the credentials submitted — or that cover only a subset of a multi-degree profile — create discrepancies that generate IRCC information requests. Most applicants are not prepared to respond to them accurately under time pressure.
              </p>
            </div>
            <div className="stake">
              <div className="stake-n">05</div>
              <div className="stake-title">Unexplained Employment Gaps</div>
              <p className="stake-body">
                Any gap in employment history exceeding 90 days requires explicit documentation with supporting evidence. An unprepared explanation creates more questions than it resolves. IRCC may discount the work history surrounding the gap entirely if the explanation is inconsistent with other submitted documents.
              </p>
            </div>
            <div className="stake">
              <div className="stake-n">06</div>
              <div className="stake-title">Outdated Regulatory Framework</div>
              <p className="stake-body">
                With arranged employment points removed in March 2025 and category-based draws replacing simple CRS ranking, the strategic sequencing of how a file is presented has changed materially. Documentation prepared against last year's criteria may be structurally misaligned with what IRCC is currently evaluating.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec forensic">
        <div className="forensic-bg-line" aria-hidden="true" />
        <div className="sec-inner">
          <p className="eyebrow r">The Visa Forte Method</p>
          <h2 className="headline r d1">Forensic Documentation Review. Not a Checklist. Not a Form-Fill Service.</h2>
          <div className="rule r d2" />
          <p className="forensic-lead r d2">
            I am not an RCIC, and I do not provide legal representation. My expertise lies at precisely the point where <strong>most applications fail: the paperwork</strong>. At large immigration firms, your file moves through a queue and is reviewed by a junior associate working from a standard checklist. The senior practitioner whose name appears on the website may never read your documents. At Visa Forte, every document in your file is personally reviewed by a single practitioner who has spent 20 years doing exactly this work — and has seen every failure mode there is.
          </p>
          <div className="forensic-callout r d3">
            <p>
              "Big agencies pass your file to junior clerks. I provide forensic-level document triage to ensure your application is structurally perfect and bulletproof before it ever enters the IRCC system."
            </p>
            <cite>Prashant Thirthingoth · Senior Documentation Consultant · Visa Forte</cite>
          </div>
          <div className="forensic-grid">
            <div className="f-card r d1">
              <div className="f-card-bar" />
              <h3 className="f-card-title">Every File Is My File</h3>
              <p className="f-card-body">
                There is no hand-off. Your documentation package is reviewed personally, beginning to end, by one practitioner. The person answering your questions is the same person who reviewed your employment letters, checked your financial proofs, and verified your ECA alignment. No junior clerk. No checklist substituting for judgment. No delegation.
              </p>
            </div>
            <div className="f-card r d2">
              <div className="f-card-bar" />
              <h3 className="f-card-title">Current Criteria. Every Time.</h3>
              <p className="f-card-body">
                IRCC requirements shift without announcement. The NOC-to-TEER transition. The removal of arranged employment points in March 2025. Category-based draw priorities replacing simple CRS ranking. Every review is conducted against what IRCC is evaluating today — not last year's template, not a cached checklist from the previous draw cycle.
              </p>
            </div>
            <div className="f-card r d3">
              <div className="f-card-bar" />
              <h3 className="f-card-title">Edge Cases Are the Routine</h3>
              <p className="f-card-body">
                Two decades of documentation practice produces exposure to every scenario a standard checklist does not anticipate: dual-jurisdiction work histories, regulated profession crossover, employers in jurisdictions with opaque record-keeping, gaps that require documentation strategies rather than explanations. These are not exceptions here. They are the routine.
              </p>
            </div>
            <div className="f-card r d4">
              <div className="f-card-bar" />
              <h3 className="f-card-title">Structured Communication Throughout</h3>
              <p className="f-card-body">
                Every active file receives milestone communication at each processing stage, pre-prepared response templates for IRCC correspondence, and a documented file status that allows you to respond to any query within 24 hours. The waiting period is not a silence. It is a managed phase with defined checkpoints and no information gaps.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec evidence" id="evidence">
        <div className="sec-inner">
          <p className="eyebrow r">Client Outcomes</p>
          <h2 className="headline r d1">What Forensic Review Finds — and Corrects</h2>
          <div className="rule r d2" />
          <div className="case-grid r d3">
            <div className="case">
              <div className="case-meta">
                <span className="case-num">01</span>
                <span className="case-tag">Documentation Triage</span>
              </div>
              <div>
                <h3 className="case-title">Three Employment Letters. Three TEER Violations. One Automatic Rejection — Averted.</h3>
                <p className="case-detail">
                  A senior IT professional submitted a pre-review profile with three international employment reference letters — each from a different employer, each from a different country. All three had been drafted using NOC 2016 duty language: the matrix replaced by the TEER framework in November 2022. Each letter described duties that no longer corresponded to the claimed TEER code. IRCC would have rejected the stated work experience claim in its entirety, forfeiting every points allocation attached to those employers. The discrepancy was identified at triage. Every letter was documented with the specific TEER misalignment, reconstructed against current criteria, and returned to the applicant for employer reissuance. The application proceeded with fully compliant experience documentation.
                </p>
                <div className="case-result">
                  <span className="case-result-label">Outcome</span>
                  <span className="case-result-text">Application submitted with TEER-compliant documentation. Automatic rejection of three experience claims averted.</span>
                </div>
              </div>
            </div>
            <div className="case">
              <div className="case-meta">
                <span className="case-num">02</span>
                <span className="case-tag">Edge-Case Navigation</span>
              </div>
              <div>
                <h3 className="case-title">Dual-Jurisdiction Profile. Contradictory NOC Mapping. Resolved Without Points Forfeiture.</h3>
                <p className="case-detail">
                  A professional with regulated work experience across two jurisdictions presented a profile where experience from the second country was not cleanly mappable to a single TEER code without creating a direct contradiction in the primary occupation declaration. Standard approaches produced two outcomes, both unacceptable: forfeit the secondary experience points entirely, or submit an internally inconsistent occupation declaration that would trigger an IRCC Request for Evidence under time pressure. The experience inventory was restructured to lead with the dominant TEER code, with secondary experience documented as supplementary and explicitly tied to the primary occupation narrative through a prepared explanatory letter. No points were forfeited. No inconsistency remained in the file.
                </p>
                <div className="case-result">
                  <span className="case-result-label">Outcome</span>
                  <span className="case-result-text">Full experience points preserved. Profile structured to withstand IRCC scrutiny on the most complex element of the application.</span>
                </div>
              </div>
            </div>
            <div className="case">
              <div className="case-meta">
                <span className="case-num">03</span>
                <span className="case-tag">Processing Management</span>
              </div>
              <div>
                <h3 className="case-title">18-Month Processing Timeline. Three IRCC Information Requests. Every One Answered the Same Day.</h3>
                <p className="case-detail">
                  A professional couple on a joint Express Entry application faced an 18-month processing timeline with three separate IRCC information requests issued at irregular intervals. Each request arrived without advance notice and carried a response deadline. A structured milestone communication plan was implemented from the point of ITA acceptance: documented file status at each processing stage, pre-prepared response templates for all anticipated IRCC correspondence types, and a direct-access contact structure for any query that arose between milestones. All three information requests were answered the same business day they were received, with fully prepared and accurate supporting documentation already on file.
                </p>
                <div className="case-result">
                  <span className="case-result-label">Outcome</span>
                  <span className="case-result-text">Three IRCC information requests resolved same-day. Confirmation of Permanent Residence received without further administrative delay.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec objections">
        <div className="sec-inner">
          <p className="eyebrow r">Direct Answers</p>
          <h2 className="headline r d1">The Questions Serious Applicants Ask</h2>
          <div className="rule r d2" />
          <div className="accord r d3">
            <div className="accord-item">
              <button className="accord-btn" aria-expanded="false">
                <span className="accord-q">"Can't I just do this myself using free online forums and the IRCC website?"</span>
                <span className="accord-icon" aria-hidden="true">+</span>
              </button>
              <div className="accord-panel" role="region">
                <div className="accord-body">
                  You can. The forums contain genuine, useful information contributed by people who have navigated the process themselves, and the IRCC website is authoritative. The limitation is not information availability — it is <strong>information currency and profile specificity</strong>. Forum advice may be six months out of date, written before the arranged employment points were removed, written before the most recent category-based draw changed which profiles IRCC is prioritising. It is written for generic profiles, not yours. And there is no one reviewing your actual documents to catch the discrepancy between your employment letter's duty description and the TEER code you've declared — the kind of structural error that is invisible until IRCC flags it with a rejection notice. The forums are an excellent orientation tool. They are not a substitute for a forensic review of your specific file against the current regulatory framework.
                </div>
              </div>
            </div>
            <div className="accord-item">
              <button className="accord-btn" aria-expanded="false">
                <span className="accord-q">"Why a solo consultant over a large, established immigration firm?"</span>
                <span className="accord-icon" aria-hidden="true">+</span>
              </button>
              <div className="accord-panel" role="region">
                <div className="accord-body">
                  At a large firm, your file is assigned to a queue. A junior associate — often with fewer than two years of experience — reviews it against a standard checklist and flags anything that deviates from the template. The senior practitioner whose name appears on the website, whose credentials are cited, whose face is on the About page, may never read your documents. The checklist becomes the ceiling of what is found. <strong>At Visa Forte, every document in your file is personally reviewed by a practitioner with 20 years of domain experience</strong> — the same person who answers your questions, the same person who built your document checklist, the same person who reviewed your employer letters against current TEER criteria. There is no hand-off. There is no checklist substituting for judgment. What you engage is not a firm's brand — it is 20 years of accumulated edge-case experience, applied personally to your profile.
                </div>
              </div>
            </div>
            <div className="accord-item">
              <button className="accord-btn" aria-expanded="false">
                <span className="accord-q">"What if my application is delayed or rejected due to factors outside anyone's control?"</span>
                <span className="accord-icon" aria-hidden="true">+</span>
              </button>
              <div className="accord-panel" role="region">
                <div className="accord-body">
                  Processing timelines, administrative decisions, and IRCC operational capacity are not within anyone's control — not mine, not a licensed RCIC's, not an immigration lawyer's. That is a truthful statement, and any practitioner who implies otherwise is misrepresenting the process. <strong>What I control — and what this engagement guarantees — is that your documentation is structurally sound, complete, and current at the moment it leaves your hands.</strong> Applications fail for two distinct reasons: documentation errors and processing variability. Forensic document triage eliminates the first category entirely. Processing variability is a systemic risk I prepare you to navigate: with pre-prepared IRCC correspondence templates, documented file status, and a communication structure that allows you to respond to any administrative request within 24 hours. You cannot eliminate processing risk. You can eliminate documentation risk. That is what this engagement delivers.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec offer" id="triage">
        <div className="sec-inner">
          <p className="eyebrow r">The Engagement</p>
          <h2 className="headline r d1">Visa Forte Premium Starter Kit &amp; Comprehensive Document Triage</h2>
          <div className="rule r d2" />
          <div className="offer-layout r d3">
            <div>
              <p className="offer-prose">
                This is a bespoke, one-on-one documentation engagement. Not a form-fill service. Not a template subscription. Not an automated eligibility calculator that produces a generic report. Every deliverable is produced specifically for your profile, your program stream, and the current IRCC regulatory framework at the time of engagement.
              </p>
              <p className="offer-prose">
                The engagement begins with an offline eligibility assessment — a personal, manual review of your profile against current FSW, CEC, or targeted PNP stream criteria. From that assessment, every subsequent deliverable is calibrated to your specific profile, your specific employers, and the specific documentation challenges your history presents.
              </p>
              <p className="offer-prose">
                Capacity is limited to the number of files that can receive the personal attention this review requires. This is not a scalable product. It is a practice.
              </p>
              <div className="positioning-block">
                <p>
                  <strong>On scope:</strong> Every application lives or dies on documentation. Visa Forte is built around that single point. What you engage is a practitioner with two decades of specialisation in this exact domain—someone who has reviewed every document type, caught every structural error, and navigated every edge case the Canadian immigration process produces. This is personal documentation consulting delivered to the highest standard available outside of law practice.
                </p>
              </div>
            </div>
            <div className="kit">
              <p className="kit-header">What Is Included</p>
              {[
                ["Offline CRS Eligibility Assessment", "Personal, manual profile review — not an automated calculator output"],
                ["Program-Specific Document Checklist", "FSW, CEC, or targeted PNP stream — no generic templates applied"],
                ["Forensic Document Triage", "Every supporting document reviewed against current IRCC criteria, personally"],
                ["Employment Letter Compliance Review", "NOC / TEER alignment verified for every employer and every jurisdiction"],
                ["Financial Proof Analysis", "Consistency, completeness, and CAD conversion compliance checked"],
                ["Gap & Anomaly Documentation", "Explanations drafted and structured for every employment or financial gap"],
                ["Step-by-Step Application Guide", "Submission sequence specific to your program stream and current IRCC portal"],
                ["GC Key Account Creation Guide", "Step-by-step IRCC portal setup and account management"],
                ["Milestone Communication Plan", "Structured updates and IRCC correspondence templates through the processing period"],
                ["Priority Direct Access", "Direct contact for any IRCC correspondence during your active file period"],
              ].map(([name, desc]) => (
                <div className="kit-item" key={name}>
                  <div className="kit-check">
                    <svg viewBox="0 0 10 10">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  </div>
                  <div className="kit-text">
                    <span className="kit-name">{name}</span>
                    <span className="kit-desc">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-inner">
          <p className="eyebrow r">Begin Your Assessment</p>
          <h2 className="final-headline r d1">
            Your Documentation Is Either <em>Bulletproof</em> —<br />or It Isn't.
          </h2>
          <p className="final-body r d2">
            Request a Document Triage Assessment to find out precisely where your file stands. This is a personal review, not an automated response. Capacity is limited to the files that can be reviewed with the attention they require.
          </p>
          <a
            href="#triage"
            onClick={(e) => {
              e.preventDefault();
              const subject = encodeURIComponent("Document Triage Assessment — [Your Name]");
              const body = encodeURIComponent(
                "Dear Prashant,\n\nI am writing to request a Document Triage Assessment for my Express Entry application. I want to ensure my documentation is in order before I proceed.\n\nMy details:\n\nFull name:\nCurrent location (city, country):\nExpress Entry program: CEC / FSWP / FSTP\nCurrent CRS score:\nITA received: Yes / No\nPrimary documentation concern:\n\nI am ready to proceed and look forward to hearing from you.\n\n[Full name]\n[WhatsApp / Phone]"
              );
              window.location.href = `mailto:prashant@visaforte.com?subject=${subject}&body=${body}`;
            }}
            className="btn-primary r d3"
          >
            Request Triage Assessment →
          </a>
          <p className="final-contact r d4">
            <a href="mailto:prashant@visaforte.com">prashant@visaforte.com</a>
            &nbsp;·&nbsp;
            <a href="https://visaforte.com" target="_blank" rel="noreferrer">visaforte.com</a>
          </p>
        </div>
      </section>
    </main>
  );
}