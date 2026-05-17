/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect } from "react";

export default function AccordionSection() {
  useEffect(() => {
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
  );
}
