'use client';

// SiteNav — universal navigation bar rendered via root layout.
// Appears on all public pages. Hidden on /admin, /login, /signup, /logout.
// Handles: scroll compaction, mobile hamburger menu, active link state,
// and the "Book a Consultation" mailto CTA.

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

// Routes where the public nav should not appear (these pages have their own headers)
const HIDDEN_PREFIXES = ['/admin', '/portal', '/login', '/signup', '/logout'];

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/visas', label: 'Visas' },
  { href: '/resources', label: 'Resources' },
  { href: '/assessment', label: 'Assessment' },
  { href: '/contact', label: 'Contact' },
];

// Built as a constant so it is never recalculated on render
const TRIAGE_SUBJECT = encodeURIComponent(
  'Document Triage Assessment — [Your Name]',
);
const TRIAGE_BODY = encodeURIComponent(
  'Dear Prashant,\n\nI am writing to request a Document Triage Assessment for my Express Entry application. I want to ensure my documentation is in order before I proceed.\n\nMy details:\n\nFull name:\nCurrent location (city, country):\nExpress Entry program: CEC / FSWP / FSTP\nCurrent CRS score:\nITA received: Yes / No\nPrimary documentation concern:\n\nI am ready to proceed and look forward to hearing from you.\n\n[Full name]\n[WhatsApp / Phone]',
);

export default function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Determine visibility before rendering — all hooks must run above this
  const isHidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  // Scroll compaction effect
  useEffect(() => {
    if (isHidden) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHidden]);

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  if (isHidden) return null;

  function handleTriage() {
    window.location.href = `mailto:prashant@visaforte.com?subject=${TRIAGE_SUBJECT}&body=${TRIAGE_BODY}`;
  }

  return (
    <>
      <nav id="nav" className={scrolled ? 'scrolled' : ''}>
        {/* Brand — links to homepage */}
        <Link href="/" className="nav-brand">
          <Image
            src="/brand/logo-primary-white.svg"
            alt="Visa Forte — Engineered for Passage."
            width={200}
            height={54}
            priority
            className="nav-logo"
          />
        </Link>

        {/* Desktop nav links */}
        <ul className="nav-links" role="list">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={pathname === href ? 'active' : ''}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop right actions */}
        <div className="nav-actions">
          <Link href="/login" className="nav-login">
            Log In
          </Link>
          <button className="nav-cta" onClick={handleTriage}>
            Get Reviewed
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`nav-hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile drawer — slides down below nav */}
      <div
        className={`nav-mobile-drawer${menuOpen ? ' open' : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-mobile-link${pathname === href ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
        <Link href="/login" className="nav-mobile-link">
          Log In
        </Link>
        <button
          className="nav-mobile-link nav-mobile-triage"
          onClick={handleTriage}
        >
          Get Reviewed →
        </button>
      </div>
    </>
  );
}
