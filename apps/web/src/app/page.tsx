"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const revealEls = document.querySelectorAll<HTMLElement>(".r");
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("vis");
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    revealEls.forEach((el) => revealObs.observe(el));

    const nav = document.getElementById("nav");
    const onScroll = () => {
      if (nav) {
        nav.classList.toggle("scrolled", window.scrollY > 60);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

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

    return () => {
      window.removeEventListener("scroll", onScroll);
      revealObs.disconnect();
    };
  }, []);

  return (
    <main>
      <nav id="nav">
        <div className="nav-brand">
          <span className="nav-wordmark">Visa Forte</span>
          <span className="nav-tagline">Engineered for Passage.</span>
        </div>
        <a href="#triage" className="nav-cta">
          Request Triage
        </a>
      </nav>

      <section className="hero">
        <span className="hero-watermark" aria-hidden="true">
          20
        </span>
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
            <a href="#triage" className="btn-primary">
              Request Document Triage →
            </a>
            <a href="#evidence" className="link-ghost">
              See client outcomes
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-n">
                20<sup>+</sup>
              </span>
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
                  A professional couple on a joint Express Entry application faced an 18-month processing timeline with three separate IRCC information requests issued at irregular intervals. Each request arrived without advance notice and carried a response deadline. A structured milestone communication plan was implemented from the point of ITA acceptance: documented file status at each processing stage, pre-prepared response templates for all anticipated IRCC correspondence types, and a direct-access contact structure for any query that arose between milestones. All three information requests were answered the same business day they were received, with fully prepared and accurate supporting documentation already on file. The waiting period was not experienced as uncertainty. It was managed as a defined phase with clear checkpoints throughout.
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
                  <strong>On scope:</strong> Visa Forte provides documentation consulting, not legal advice or immigration representation. Prashant Thirthingoth is not a Regulated Canadian Immigration Consultant (RCIC). What you engage is the most thorough documentation review available outside of a regulated legal practice — delivered personally, against current criteria, by a practitioner who has prepared every document type in every scenario this process produces over 20 years of active practice.
                </p>
              </div>
            </div>
            <div className="kit">
              <p className="kit-header">What Is Included</p>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">Offline CRS Eligibility Assessment</span>
                  <span className="kit-desc">Personal, manual profile review — not an automated calculator output</span>
                </div>
              </div>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">Program-Specific Document Checklist</span>
                  <span className="kit-desc">FSW, CEC, or targeted PNP stream — no generic templates applied</span>
                </div>
              </div>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">Forensic Document Triage</span>
                  <span className="kit-desc">Every supporting document reviewed against current IRCC criteria, personally</span>
                </div>
              </div>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">Employment Letter Compliance Review</span>
                  <span className="kit-desc">NOC / TEER alignment verified for every employer and every jurisdiction</span>
                </div>
              </div>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">Financial Proof Analysis</span>
                  <span className="kit-desc">Consistency, completeness, and CAD conversion compliance checked</span>
                </div>
              </div>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">Gap &amp; Anomaly Documentation</span>
                  <span className="kit-desc">Explanations drafted and structured for every employment or financial gap</span>
                </div>
              </div>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">Step-by-Step Application Guide</span>
                  <span className="kit-desc">Submission sequence specific to your program stream and current IRCC portal</span>
                </div>
              </div>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">GC Key Account Creation Guide</span>
                  <span className="kit-desc">Step-by-step IRCC portal setup and account management</span>
                </div>
              </div>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">Milestone Communication Plan</span>
                  <span className="kit-desc">Structured updates and IRCC correspondence templates through the processing period</span>
                </div>
              </div>
              <div className="kit-item">
                <div className="kit-check">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
                <div className="kit-text">
                  <span className="kit-name">Priority Direct Access</span>
                  <span className="kit-desc">Direct contact for any IRCC correspondence during your active file period</span>
                </div>
              </div>
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
            href="mailto:hello@visaforte.com?subject=Document%20Triage%20Assessment%20Request&body=I%20would%20like%20to%20request%20a%20Document%20Triage%20Assessment%20for%20my%20Express%20Entry%20application."
            className="btn-primary r d3"
          >
            Request Triage Assessment →
          </a>
          <p className="final-contact r d4">
            <a href="mailto:hello@visaforte.com">hello@visaforte.com</a>
            &nbsp;·&nbsp;
            <a href="https://visaforte.com" target="_blank" rel="noreferrer">
              visaforte.com
            </a>
            &nbsp;·&nbsp;
            Secunderabad, India
          </p>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <span className="footer-wordmark">Visa Forte</span>
          <span className="footer-tagline">Engineered for Passage.</span>
          <span className="footer-contact">
            <a href="mailto:hello@visaforte.com">hello@visaforte.com</a>
            &nbsp;·&nbsp;
            <a href="https://visaforte.com" target="_blank" rel="noreferrer">
              visaforte.com
            </a>
          </span>
        </div>
        <p className="footer-disclaimer">
          Visa Forte provides immigration documentation consulting services. Prashant Thirthingoth is not a Regulated Canadian Immigration Consultant (RCIC) and does not provide legal advice or immigration representation. All services constitute documentation preparation and review only. For legal representation or regulated advice, consult a licensed RCIC or immigration lawyer authorised to practise in Canada.
        </p>
      </footer>

      <style jsx global>{`
        :root {
          --prussian: #0C2340;
          --saffron: #C97B1E;
          --pearl: #F8F4EE;
          --teal: #1A5C72;
          --ink: #1A2B3C;
          --sand: #E2DBD1;
          --amber: #EDD9B0;
          --font-display: 'Cormorant Garamond', Georgia, serif;
          --font-body: 'DM Sans', 'Helvetica Neue', Helvetica, sans-serif;
          --max-w: 1200px;
          --text-w: 740px;
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html {
          font-size: 16px;
          scroll-behavior: smooth;
        }

        body {
          font-family: var(--font-body);
          background: var(--pearl);
          color: var(--ink);
          line-height: 1.65;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        img {
          max-width: 100%;
          display: block;
        }

        a {
          color: var(--teal);
          text-decoration: none;
        }

        button {
          font-family: inherit;
        }

        nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.2rem 2.5rem;
          background: rgba(12, 35, 64, 0.97);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(201, 123, 30, 0.18);
          transition: padding 0.3s ease;
        }

        nav.scrolled {
          padding: 0.9rem 2.5rem;
        }

        .nav-brand {
          display: flex;
          flex-direction: column;
          gap: 0.08rem;
        }

        .nav-wordmark {
          font-family: var(--font-display);
          font-size: 1.2rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: var(--pearl);
          text-transform: uppercase;
        }

        .nav-tagline {
          font-family: var(--font-body);
          font-size: 0.6rem;
          font-weight: 400;
          letter-spacing: 0.22em;
          color: var(--saffron);
          text-transform: uppercase;
        }

        .nav-cta {
          background: var(--saffron);
          color: var(--prussian);
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.65rem 1.6rem;
          border: none;
          cursor: pointer;
          transition: background 0.22s ease, color 0.22s ease;
        }

        .nav-cta:hover {
          background: var(--pearl);
          color: var(--prussian);
        }

        .hero {
          min-height: 100vh;
          background-color: var(--prussian);
          display: flex;
          align-items: flex-end;
          padding: 9rem 2.5rem 6rem;
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.55;
          z-index: 0;
        }

        .hero::after {
          content: '';
          position: absolute;
          left: 2.5rem;
          top: 0;
          bottom: 0;
          width: 1px;
          background: linear-gradient(to bottom, transparent 10%, rgba(201,123,30,0.5) 30%, rgba(201,123,30,0.5) 70%, transparent 90%);
          z-index: 0;
        }

        .hero-watermark {
          position: absolute;
          right: -0.02em;
          top: 50%;
          transform: translateY(-50%);
          font-family: var(--font-display);
          font-size: clamp(14rem, 28vw, 28rem);
          font-weight: 700;
          color: rgba(248, 244, 238, 0.024);
          line-height: 1;
          pointer-events: none;
          user-select: none;
          z-index: 0;
          letter-spacing: -0.05em;
        }

        .hero-inner {
          max-width: var(--max-w);
          margin: 0 auto;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        .hero-eyebrow {
          font-family: var(--font-body);
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--saffron);
          margin-bottom: 1.75rem;
          opacity: 0;
          animation: riseIn 0.7s ease 0.15s forwards;
        }

        .hero-headline {
          font-family: var(--font-display);
          font-size: clamp(3rem, 6.5vw, 6rem);
          font-weight: 400;
          line-height: 1.04;
          color: var(--pearl);
          max-width: 880px;
          margin-bottom: 2rem;
          letter-spacing: -0.015em;
          opacity: 0;
          animation: riseIn 0.8s ease 0.3s forwards;
        }

        .hero-headline em {
          font-style: italic;
          color: var(--saffron);
        }

        .hero-rule {
          width: 52px;
          height: 1px;
          background: var(--saffron);
          margin-bottom: 2rem;
          opacity: 0;
          animation: riseIn 0.5s ease 0.5s forwards;
        }

        .hero-sub {
          font-family: var(--font-body);
          font-size: 1.08rem;
          font-weight: 300;
          line-height: 1.82;
          color: rgba(248, 244, 238, 0.68);
          max-width: 600px;
          margin-bottom: 3rem;
          opacity: 0;
          animation: riseIn 0.7s ease 0.62s forwards;
        }

        .hero-sub strong {
          color: var(--pearl);
          font-weight: 500;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 2.5rem;
          flex-wrap: wrap;
          opacity: 0;
          animation: riseIn 0.7s ease 0.78s forwards;
        }

        .btn-primary {
          display: inline-block;
          background: var(--saffron);
          color: var(--prussian);
          font-family: var(--font-body);
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 1.05rem 2.6rem;
          border: none;
          cursor: pointer;
          transition: background 0.22s ease;
        }

        .btn-primary:hover {
          background: var(--pearl);
        }

        .link-ghost {
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 400;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(248, 244, 238, 0.42);
          border-bottom: 1px solid rgba(248, 244, 238, 0.18);
          padding-bottom: 2px;
          transition: color 0.22s ease, border-color 0.22s ease;
        }

        .link-ghost:hover {
          color: var(--pearl);
          border-color: rgba(248,244,238,0.5);
        }

        .hero-stats {
          margin-top: 5rem;
          padding-top: 2.5rem;
          border-top: 1px solid rgba(226, 219, 209, 0.12);
          display: flex;
          gap: 5rem;
          flex-wrap: wrap;
          opacity: 0;
          animation: riseIn 0.7s ease 0.95s forwards;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .stat-n {
          font-family: var(--font-display);
          font-size: 2.8rem;
          font-weight: 300;
          color: var(--pearl);
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .stat-n sup {
          font-size: 1.2rem;
          color: var(--saffron);
          vertical-align: super;
          letter-spacing: 0;
        }

        .stat-label {
          font-family: var(--font-body);
          font-size: 0.65rem;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(248, 244, 238, 0.38);
        }

        .sec {
          padding: 7rem 2.5rem;
        }

        .sec-inner {
          max-width: var(--max-w);
          margin: 0 auto;
        }

        .eyebrow {
          font-family: var(--font-body);
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--saffron);
          margin-bottom: 1.4rem;
        }

        .headline {
          font-family: var(--font-display);
          font-size: clamp(2rem, 4vw, 3.6rem);
          font-weight: 400;
          line-height: 1.12;
          letter-spacing: -0.012em;
        }

        .rule {
          width: 40px;
          height: 2px;
          background: var(--saffron);
          margin: 1.6rem 0 2.4rem;
        }

        .r {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }

        .r.vis {
          opacity: 1;
          transform: translateY(0);
        }

        .r.d1 {
          transition-delay: 0.08s;
        }

        .r.d2 {
          transition-delay: 0.16s;
        }

        .r.d3 {
          transition-delay: 0.24s;
        }

        .r.d4 {
          transition-delay: 0.32s;
        }

        .r.d5 {
          transition-delay: 0.40s;
        }

        .stakes {
          background: var(--pearl);
        }

        .stakes .headline {
          color: var(--prussian);
          max-width: 780px;
        }

        .stakes-lead {
          font-family: var(--font-body);
          font-size: 1.05rem;
          font-weight: 300;
          line-height: 1.85;
          color: var(--ink);
          max-width: 680px;
          margin-bottom: 3.5rem;
        }

        .stakes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--sand);
          border: 1px solid var(--sand);
        }

        .stake {
          background: var(--pearl);
          padding: 2.2rem 2rem;
          transition: background 0.25s ease;
        }

        .stake:hover {
          background: #f3efe8;
        }

        .stake-n {
          font-family: var(--font-display);
          font-size: 3rem;
          font-weight: 300;
          color: var(--sand);
          line-height: 1;
          margin-bottom: 1rem;
        }

        .stake-title {
          font-family: var(--font-body);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--prussian);
          margin-bottom: 0.8rem;
        }

        .stake-body {
          font-family: var(--font-body);
          font-size: 0.88rem;
          font-weight: 300;
          line-height: 1.75;
          color: var(--ink);
        }

        .forensic {
          background: var(--prussian);
          position: relative;
          overflow: hidden;
        }

        .forensic-bg-line {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(201,123,30,0.15) 40%, rgba(201,123,30,0.15) 60%, transparent);
        }

        .forensic .headline {
          color: var(--pearl);
          max-width: 820px;
        }

        .forensic .eyebrow {
          color: var(--saffron);
        }

        .forensic-lead {
          font-family: var(--font-body);
          font-size: 1.05rem;
          font-weight: 300;
          line-height: 1.85;
          color: rgba(248, 244, 238, 0.65);
          max-width: 700px;
          margin-bottom: 4rem;
        }

        .forensic-lead strong {
          color: var(--pearl);
          font-weight: 500;
        }

        .forensic-callout {
          padding: 1.5rem 2rem;
          border-left: 3px solid var(--saffron);
          background: rgba(201, 123, 30, 0.06);
          margin-bottom: 4rem;
          max-width: 700px;
        }

        .forensic-callout p {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 400;
          font-style: italic;
          color: rgba(248, 244, 238, 0.85);
          line-height: 1.5;
        }

        .forensic-callout cite {
          display: block;
          margin-top: 0.5rem;
          font-family: var(--font-body);
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--saffron);
          font-style: normal;
        }

        .forensic-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .f-card {
          border: 1px solid rgba(201, 123, 30, 0.15);
          padding: 2.2rem;
          position: relative;
          overflow: hidden;
          transition: border-color 0.3s ease;
        }

        .f-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: var(--saffron);
          transform: scaleY(0);
          transform-origin: top;
          transition: transform 0.35s ease;
        }

        .f-card:hover {
          border-color: rgba(201, 123, 30, 0.35);
        }

        .f-card:hover::before {
          transform: scaleY(1);
        }

        .f-card-bar {
          width: 32px;
          height: 1px;
          background: var(--saffron);
          margin-bottom: 1.6rem;
          opacity: 0.7;
        }

        .f-card-title {
          font-family: var(--font-display);
          font-size: 1.45rem;
          font-weight: 500;
          color: var(--pearl);
          margin-bottom: 0.75rem;
          line-height: 1.2;
        }

        .f-card-body {
          font-family: var(--font-body);
          font-size: 0.88rem;
          font-weight: 300;
          line-height: 1.8;
          color: rgba(248, 244, 238, 0.58);
        }

        .evidence {
          background: var(--pearl);
        }

        .evidence .headline {
          color: var(--prussian);
        }

        .case-grid {
          margin-top: 3.5rem;
          border: 1px solid var(--sand);
        }

        .case {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 3rem;
          padding: 3rem;
          border-bottom: 1px solid var(--sand);
          align-items: start;
          transition: background 0.25s ease;
        }

        .case:last-child {
          border-bottom: none;
        }

        .case:hover {
          background: rgba(237, 217, 176, 0.1);
        }

        .case-meta {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .case-num {
          font-family: var(--font-display);
          font-size: 4rem;
          font-weight: 300;
          color: var(--sand);
          line-height: 1;
        }

        .case-tag {
          font-family: var(--font-body);
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--saffron);
        }

        .case-title {
          font-family: var(--font-display);
          font-size: 1.55rem;
          font-weight: 500;
          color: var(--prussian);
          line-height: 1.22;
          margin-bottom: 1.2rem;
        }

        .case-detail {
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 300;
          line-height: 1.85;
          color: var(--ink);
          margin-bottom: 1.4rem;
        }

        .case-result {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.45rem 1.1rem 0.45rem 0.75rem;
          border-left: 2px solid var(--saffron);
          background: rgba(201, 123, 30, 0.07);
        }

        .case-result-label {
          font-family: var(--font-body);
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--saffron);
        }

        .case-result-text {
          font-family: var(--font-body);
          font-size: 0.82rem;
          font-weight: 400;
          color: var(--ink);
        }

        .objections {
          background: var(--prussian);
        }

        .objections .headline {
          color: var(--pearl);
          max-width: 680px;
        }

        .accord {
          margin-top: 3.5rem;
        }

        .accord-item {
          border-bottom: 1px solid rgba(226, 219, 209, 0.1);
        }

        .accord-item:first-child {
          border-top: 1px solid rgba(226, 219, 209, 0.1);
        }

        .accord-btn {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 2.2rem 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
        }

        .accord-q {
          font-family: var(--font-display);
          font-size: 1.45rem;
          font-weight: 400;
          color: rgba(248, 244, 238, 0.9);
          line-height: 1.3;
        }

        .accord-icon {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border: 1px solid rgba(201, 123, 30, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--saffron);
          font-size: 1.1rem;
          transition: transform 0.35s ease, border-color 0.25s ease;
        }

        .accord-item.open .accord-icon {
          transform: rotate(45deg);
          border-color: rgba(201, 123, 30, 0.7);
        }

        .accord-panel {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .accord-item.open .accord-panel {
          max-height: 350px;
        }

        .accord-body {
          padding-bottom: 2.5rem;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 300;
          line-height: 1.85;
          color: rgba(248, 244, 238, 0.6);
          max-width: 740px;
        }

        .accord-body strong {
          color: var(--pearl);
          font-weight: 500;
        }

        .offer {
          background: var(--pearl);
        }

        .offer .headline {
          color: var(--prussian);
        }

        .offer-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5rem;
          margin-top: 3.5rem;
          align-items: start;
        }

        .offer-prose {
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 300;
          line-height: 1.88;
          color: var(--ink);
          margin-bottom: 2rem;
        }

        .positioning-block {
          padding: 1.6rem 2rem;
          background: var(--amber);
          border-left: 3px solid var(--saffron);
        }

        .positioning-block p {
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 400;
          line-height: 1.78;
          color: var(--ink);
        }

        .kit {
          background: var(--prussian);
          padding: 2.5rem;
        }

        .kit-header {
          font-family: var(--font-body);
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--saffron);
          margin-bottom: 1.8rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(226, 219, 209, 0.1);
        }

        .kit-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 0.8rem 0;
          border-bottom: 1px solid rgba(226, 219, 209, 0.07);
        }

        .kit-item:last-child {
          border-bottom: none;
        }

        .kit-check {
          width: 18px;
          height: 18px;
          border: 1px solid rgba(201, 123, 30, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 3px;
        }

        .kit-check svg {
          width: 9px;
          height: 9px;
          stroke: var(--saffron);
          fill: none;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .kit-text {
          flex: 1;
        }

        .kit-name {
          font-family: var(--font-body);
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--pearl);
          display: block;
          margin-bottom: 0.15rem;
        }

        .kit-desc {
          font-family: var(--font-body);
          font-size: 0.78rem;
          font-weight: 300;
          line-height: 1.55;
          color: rgba(248, 244, 238, 0.45);
        }

        .final-cta {
          background: var(--prussian);
          padding: 10rem 2.5rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .final-cta::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,123,30,0.055) 0%, transparent 68%);
          pointer-events: none;
        }

        .final-cta-inner {
          max-width: 700px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .final-headline {
          font-family: var(--font-display);
          font-size: clamp(2.2rem, 5vw, 4.2rem);
          font-weight: 400;
          color: var(--pearl);
          line-height: 1.08;
          margin-bottom: 1.5rem;
          letter-spacing: -0.01em;
        }

        .final-headline em {
          font-style: italic;
          color: var(--saffron);
        }

        .final-body {
          font-family: var(--font-body);
          font-size: 1.02rem;
          font-weight: 300;
          line-height: 1.8;
          color: rgba(248, 244, 238, 0.55);
          margin-bottom: 3rem;
        }

        .final-contact {
          margin-top: 2rem;
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 300;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(248, 244, 238, 0.3);
        }

        .final-contact a {
          color: rgba(248, 244, 238, 0.45);
          transition: color 0.22s ease;
        }

        .final-contact a:hover {
          color: var(--saffron);
        }

        footer {
          background: var(--ink);
          padding: 2rem 2.5rem;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          border-top: 1px solid rgba(201, 123, 30, 0.15);
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .footer-wordmark {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          color: var(--pearl);
          text-transform: uppercase;
        }

        .footer-tagline {
          font-family: var(--font-body);
          font-size: 0.6rem;
          font-weight: 300;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--saffron);
        }

        .footer-contact {
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 300;
          color: rgba(248, 244, 238, 0.35);
          margin-top: 0.5rem;
          letter-spacing: 0.05em;
        }

        .footer-contact a {
          color: rgba(248, 244, 238, 0.4);
          transition: color 0.2s;
        }

        .footer-contact a:hover {
          color: var(--saffron);
        }

        .footer-disclaimer {
          max-width: 520px;
          font-family: var(--font-body);
          font-size: 0.7rem;
          font-weight: 300;
          line-height: 1.65;
          color: rgba(248, 244, 238, 0.25);
          text-align: right;
        }

        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          .stakes-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .forensic-grid {
            grid-template-columns: 1fr;
          }
          .offer-layout {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .case {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        @media (max-width: 640px) {
          nav {
            padding: 1rem 1.25rem;
          }
          .sec {
            padding: 5rem 1.25rem;
          }
          .hero {
            padding: 8rem 1.25rem 5rem;
          }
          .hero-stats {
            gap: 2.5rem;
          }
          .stakes-grid {
            grid-template-columns: 1fr;
          }
          .case {
            padding: 2rem 1.5rem;
          }
          .kit {
            padding: 1.75rem;
          }
          .footer-disclaimer {
            text-align: left;
          }
        }
      `}</style>
    </main>
  );
}
