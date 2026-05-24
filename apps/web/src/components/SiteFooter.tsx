"use client";

// SiteFooter — shared footer on all public pages.
// Hidden on /admin, /portal, /login, /signup (those pages have their own footers).

import Link from "next/link";
import { usePathname } from "next/navigation";

const DISCLAIMER =
  "The information provided is for informational and guidance purposes only, based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created by accessing this content. Immigration regulations, program requirements, processing times, and CRS cutoff scores are subject to frequent change without notice. You are responsible for verifying all information with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements before taking any action. Visa Forte specialises in documentation forensics and regulatory alignment—where applications succeed through precision and fail through oversight.";

const HIDDEN_PREFIXES = ["/admin", "/portal", "/login", "/signup", "/logout"];

export default function SiteFooter() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

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
          <Link href="/visas">Visas</Link>
          <Link href="/resources">Resources</Link>
          <Link href="/assessment">Assessment</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Client Login</Link>
          <Link href="/refund-policy">Refund Policy</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
        </nav>
      </div>

      <p className="footer-disclaimer">{DISCLAIMER}</p>
      <div className="footer-copyright">
        © {new Date().getFullYear()} Visa Forte. All rights reserved.
      </div>
    </footer>
  );
}