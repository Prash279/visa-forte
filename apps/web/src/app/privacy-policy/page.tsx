// Privacy Policy — visaforte.com/privacy-policy
// Required by Razorpay and all payment processors before account activation.
// Server component — no interactivity needed.

import type { Metadata } from "next";
import "../refund-policy/policy.css";

export const metadata: Metadata = {
  title: "Privacy Policy — Visa Forte",
  description:
    "How Visa Forte collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="policy-page">
      <section className="policy-header">
        <p className="policy-eyebrow">Legal</p>
        <h1 className="policy-title">Privacy Policy</h1>
        <p className="policy-meta">Effective date: April 2026 · Last updated: April 2026</p>
      </section>

      <article className="policy-body">

        <section className="policy-section">
          <h2 className="policy-h2">1. Who We Are</h2>
          <p>
            Visa Forte is operated by Prashant Thirthingoth, Secunderabad, Telangana, India.
            We provide immigration documentation guidance and eligibility analysis at
            visaforte.com. You can reach us at{" "}
            <a href="mailto:prashant@visaforte.com" className="policy-link">
              prashant@visaforte.com
            </a>
            .
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">2. Information We Collect</h2>
          <p>We collect the following personal information when you use our services:</p>
          <ul className="policy-list">
            <li>
              <strong>Consultation bookings:</strong> Full name, email address, preferred
              consultation date, service tier selected, and a description of your immigration
              query.
            </li>
            <li>
              <strong>Intake form submissions:</strong> Full name, email address, phone number
              (optional), service interest, and any notes you provide.
            </li>
            <li>
              <strong>Contact form submissions:</strong> Full name, email address, phone number
              (optional), and your message.
            </li>
            <li>
              <strong>Payment information:</strong> Payment is processed by Razorpay. We do not
              store your card number, CVV, or full payment credentials. We retain only the
              Razorpay order ID and payment ID for record-keeping and refund purposes.
            </li>
            <li>
              <strong>Account data:</strong> If you create a client account, we store your
              email address and encrypted authentication credentials.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">3. How We Use Your Information</h2>
          <ul className="policy-list">
            <li>To schedule and conduct your consultation session.</li>
            <li>To respond to your inquiries and provide the services you requested.</li>
            <li>To send you appointment confirmation and follow-up communications related
              to your booking.</li>
            <li>To process payments and issue refunds where applicable.</li>
            <li>To comply with applicable legal obligations.</li>
          </ul>
          <p>
            We do not use your information for advertising, profiling, or automated
            decision-making. We do not sell your personal data to any third party.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">4. Data Storage and Security</h2>
          <p>
            Your data is stored in a secured PostgreSQL database hosted on Neon (cloud
            infrastructure in Singapore). All connections are encrypted using TLS. Access
            to the database is restricted to authorised systems only.
          </p>
          <p>
            We retain your consultation and intake data for as long as required to deliver the
            service and comply with applicable record-keeping obligations, or for a maximum of
            3 years from your last interaction with us, whichever is earlier.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">5. Third-Party Services</h2>
          <p>We use the following third-party services to operate visaforte.com:</p>
          <ul className="policy-list">
            <li>
              <strong>Razorpay</strong> — payment processing. Razorpay&apos;s privacy policy
              governs how they handle payment credentials.
            </li>
            <li>
              <strong>Resend</strong> — transactional email delivery (booking confirmations,
              notifications). Only your name and email address are shared with Resend for
              the purpose of sending emails.
            </li>
            <li>
              <strong>Vercel</strong> — website hosting and deployment.
            </li>
            <li>
              <strong>Neon</strong> — database hosting.
            </li>
          </ul>
          <p>
            No personal data is shared with any other third party without your explicit
            consent, except where required by law.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="policy-list">
            <li>Request a copy of the personal data we hold about you.</li>
            <li>Request correction of inaccurate personal data.</li>
            <li>Request deletion of your personal data, subject to any legal obligations
              requiring us to retain it.</li>
            <li>Withdraw consent for any processing based on consent.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:prashant@visaforte.com" className="policy-link">
              prashant@visaforte.com
            </a>
            . We will respond within 30 days.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">7. Cookies</h2>
          <p>
            visaforte.com uses only essential session cookies required for authentication.
            We do not use tracking cookies, analytics cookies, or advertising cookies.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">8. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted on this page
            with an updated effective date. Continued use of our services after a change
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">9. Contact</h2>
          <p>
            For any privacy-related questions or requests, contact us at{" "}
            <a href="mailto:prashant@visaforte.com" className="policy-link">
              prashant@visaforte.com
            </a>
            .
          </p>
        </section>

      </article>
    </main>
  );
}
