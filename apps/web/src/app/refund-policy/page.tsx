// Refund & Cancellation Policy — visaforte.com/refund-policy
// Required by Razorpay and all payment processors before account activation.
// Server component — no interactivity needed.

import "./policy.css";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Refund & Cancellation Policy — Visa Forte",
  description:
    "Visa Forte's refund and cancellation policy for consultation bookings.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <main className="policy-page">
      <section className="policy-header">
        <p className="policy-eyebrow">Legal</p>
        <h1 className="policy-title">Refund &amp; Cancellation Policy</h1>
        <p className="policy-meta">Effective date: April 2026 · Last updated: April 2026</p>
      </section>

      <article className="policy-body">

        <section className="policy-section">
          <h2 className="policy-h2">1. Overview</h2>
          <p>
            This policy applies to all consultation bookings made through visaforte.com. By
            completing a payment, you agree to the terms below. Visa Forte is operated by
            Prashant Thirthingoth, Secunderabad, Telangana, India.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">2. Cancellation by the Client</h2>
          <p>
            You may cancel or reschedule your consultation by contacting us at{" "}
            <a href="mailto:prashant@visaforte.com" className="policy-link">
              prashant@visaforte.com
            </a>{" "}
            at least <strong>48 hours before your scheduled consultation date</strong>.
          </p>
          <ul className="policy-list">
            <li>
              <strong>Cancellation 48+ hours before the session:</strong> Full refund issued
              within 5–7 business days to the original payment method.
            </li>
            <li>
              <strong>Cancellation within 48 hours of the session:</strong> No refund is
              applicable. You may request a one-time reschedule to another available date at
              no additional charge, subject to availability.
            </li>
            <li>
              <strong>No-show (no contact, no attendance):</strong> No refund or reschedule
              is applicable.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">3. Cancellation by Visa Forte</h2>
          <p>
            If Prashant Thirthingoth is unable to fulfil the consultation due to illness,
            emergency, or other unforeseen circumstances, you will be offered a full refund
            or a rescheduled session at your choice. We will notify you at least 24 hours in
            advance wherever possible.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">4. Refund Process</h2>
          <p>
            All approved refunds are processed via the original payment method (Razorpay).
            Refunds typically appear within <strong>5–7 business days</strong>, depending on
            your bank or card issuer. We do not charge any processing fee for refunds.
          </p>
          <p>
            To request a refund, email{" "}
            <a href="mailto:prashant@visaforte.com" className="policy-link">
              prashant@visaforte.com
            </a>{" "}
            with your booking date, name, and Razorpay payment ID.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">5. Service Delivery</h2>
          <p>
            Visa Forte provides immigration documentation guidance and eligibility analysis —
            not regulated legal advice. The service is considered delivered once the
            consultation session has taken place, regardless of the outcome of any subsequent
            immigration application.
          </p>
          <p>
            Refunds are not available on the basis of dissatisfaction with immigration
            outcomes, changes in IRCC policy, or processing decisions made by Canadian
            authorities, as these are outside the scope of our services.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">6. Contact</h2>
          <p>
            For any questions about this policy, please contact us at{" "}
            <a href="mailto:prashant@visaforte.com" className="policy-link">
              prashant@visaforte.com
            </a>
            . We typically respond within one business day.
          </p>
        </section>

        <section className="policy-disclaimer">
          <p>
            The information provided is for informational and guidance purposes only, based on
            publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations
            and policies. This does not constitute legal advice, and no solicitor-client or
            consultant-client relationship is created by accessing this content.
          </p>
        </section>

      </article>
    </main>
  );
}
