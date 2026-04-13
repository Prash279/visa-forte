// SiteFooter — shared footer rendered via root layout on all public pages.
// Server component: no client-side JS needed.

import Link from "next/link";

const DISCLAIMER =
  "The information provided is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements before taking any action. Visa Forte provides documentation consulting services only. Prashant Thirthingoth is not a Regulated Canadian Immigration Consultant (RCIC) and does not provide legal advice or immigration representation.";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-wordmark">Visa Forte</span>
          <span className="footer-tagline">Engineered for Passage.</span>
          <div className="footer-contact">
            <a href="mailto:prashant@visaforte.com">prashant@visaforte.com</a>
            &nbsp;·&nbsp;Secunderabad, India
          </div>
        </div>

        <nav className="footer-nav" aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/services">Services</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Client Login</Link>
          <Link href="/refund-policy">Refund Policy</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
        </nav>
      </div>

      <p className="footer-disclaimer">{DISCLAIMER}</p>
    </footer>
  );
}