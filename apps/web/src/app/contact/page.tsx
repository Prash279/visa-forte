"use client";

// Contact page — visaforte.com/contact
// Client component: form submission uses a mailto handler (consistent with
// existing CTAs). Will be upgraded to a server action when Resend is set up in Task 3B.

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import "./contact.css";

const SERVICES = [
  "Pre-Application Eligibility Assessment",
  "PNP Stream Matching",
  "Document Review & Compliance Audit",
  "Refusal Analysis & Reapplication Strategy",
  "ITA Response Preparation",
  "Full Application File Management",
  "Post-Submission Monitoring",
  "Retainer-Based Ongoing Support",
  "General Inquiry",
];

export default function ContactPage() {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const subject = encodeURIComponent(
      `Visa Forte Enquiry — ${service || "General Inquiry"} — ${name}`
    );

    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone / WhatsApp: ${phone}` : "",
        `Service of Interest: ${service || "Not specified"}`,
        "",
        "Message:",
        message,
      ]
        .filter((line) => line !== "")
        .join("\n")
    );

    window.location.href = `mailto:prashant@visaforte.com?subject=${subject}&body=${body}`;
  }

  return (
    <main className="contact-main">

      {/* ── HERO ───────────────────────────��───────────────── */}
      <section className="contact-hero">
        <div className="contact-hero-inner">
          <p className="eyebrow r">Get in Touch</p>
          <h1 className="contact-hero-headline r d1">
            Every File Begins<br />with a Conversation.
          </h1>
          <div className="rule r d2" />
          <p className="contact-hero-lead r d2">
            Describe your situation and the documentation concern you are trying to resolve.
            A personal response follows within 24 hours — not an automated acknowledgement.
          </p>
        </div>
      </section>

      {/* ── FORM + INFO ────────────────────────────���───────── */}
      <section className="sec contact-body">
        <div className="sec-inner">
          <div className="contact-layout">

            {/* Form */}
            <div className="contact-form-col r d1">
              <form className="contact-form" onSubmit={handleSubmit} noValidate>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label" htmlFor="name">
                      Full Name <span className="form-required">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      className="form-input"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="email">
                      Email Address <span className="form-required">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="form-input"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label" htmlFor="phone">
                      Phone / WhatsApp
                      <span className="form-optional"> — optional</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      className="form-input"
                      placeholder="+91 or +1 …"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="service">
                      Service of Interest
                      <span className="form-optional"> — optional</span>
                    </label>
                    <select
                      id="service"
                      className="form-input form-select"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                    >
                      <option value="">Select a service</option>
                      {SERVICES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="message">
                    Your Situation <span className="form-required">*</span>
                  </label>
                  <textarea
                    id="message"
                    className="form-input form-textarea"
                    placeholder="Describe your profile, program stream, current CRS score, and the documentation concern you need addressed."
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="form-submit">
                  Send Message →
                </button>

                <p className="form-note">
                  Submitting opens your email client with a pre-filled message.
                  No data is stored until you send the email.
                </p>
              </form>
            </div>

            {/* Contact details */}
            <div className="contact-info-col r d2">
              <div className="contact-info-block">
                <p className="contact-info-label">Direct Contact</p>
                <a href="mailto:prashant@visaforte.com" className="contact-info-email">
                  prashant@visaforte.com
                </a>
              </div>

              <div className="contact-info-block">
                <p className="contact-info-label">Practice Location</p>
                <p className="contact-info-value">
                  Secunderabad, Telangana<br />India
                </p>
              </div>

              <div className="contact-info-block">
                <p className="contact-info-label">Response Commitment</p>
                <p className="contact-info-value">
                  All enquiries receive a personal response within
                  <strong> 24 hours</strong> on business days.
                  Priority file clients (ITA window) are responded to within
                  <strong> 12 hours</strong>.
                </p>
              </div>

              <div className="contact-info-block">
                <p className="contact-info-label">Services</p>
                <nav className="contact-services-list" aria-label="Service links">
                  {SERVICES.filter((s) => s !== "General Inquiry").map((s) => (
                    <Link key={s} href="/services" className="contact-service-link">
                      {s}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="contact-disclaimer-block">
                <p>
                  Visa Forte provides documentation consulting services only.
                  Prashant Thirthingoth is not a Regulated Canadian Immigration Consultant (RCIC)
                  and does not provide legal advice or immigration representation.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

    </main>
  );
}