# spec.md — Visa Forte Platform: Product Specification
> Complete product and feature specification for Claude Code.
> Read this file before building any feature, route, or component.
> Last updated: April 2026 | Owner: Prashant Thirthingoth

---

## 1. Platform Overview

Visa Forte is a premium Canadian immigration documentation practice operating at visaforte.com. The platform is the operational infrastructure that delivers documentation services to clients globally.

**Governing commercial principle:** Clients buy certainty of outcome, not hours of work. Every feature either directly serves outcome delivery or is removed.

**Build philosophy:** This is a solo-founder practice. The platform must be operationally self-sufficient — minimal manual intervention required from Prash once built. Automation over administration.

---

## 2. Service Tier Architecture

The platform serves eight distinct service tiers. These are not interchangeable. The booking engine, CRM, and messaging system must treat them as separate entities.

| Tier | Name | Description |
|---|---|---|
| 1 | Pre-Application Eligibility Assessment | Paid assessment of applicant profile before any commitment |
| 2 | PNP Stream Matching | Identification and ranking of applicable Provincial Nominee streams |
| 3 | Document Review & Compliance Audit | Review of assembled document package against IRCC standards |
| 4 | Refusal Analysis & Reapplication Strategy | Root cause analysis of a prior refusal; reapplication roadmap |
| 5 | ITA Response Preparation | Full document assembly and verification within the 60-day ITA window |
| 6 | Full Application File Management | End-to-end file preparation and submission readiness audit |
| 7 | Post-Submission Monitoring | Active monitoring of application status; response to IRCC queries |
| 8 | Retainer-Based Ongoing Support | Monthly retainer for continuous advisory and document maintenance |

---

## 3. Product Inventory

### 3.1 CanVisa Pro
**Type:** Single-file HTML/React — self-hosted, local execution
**Access:** Internal use + client-facing (Phase 1 public version planned)
**Purpose:** Canadian PR eligibility assessment engine. Scores client profile, generates McKinsey-style PDF report.
**Skill file:** `/mnt/skills/user/canvisa-pro/SKILL.md` — read before any work on this product
**Critical constraints:**
- Single-file architecture (all HTML + CSS + JS in one file) unless Prash explicitly approves a split
- Permitted external endpoints: `api.anthropic.com` and `canada.ca` only
- Claude API key entered by user at runtime — never stored or logged
- All CRS tables fetched live from `canada.ca` — never hardcoded
- Every report must include the Standard Legal Disclaimer

### 3.2 GlobalVia Pro
**Type:** Self-hosted single-file assessment tool
**Access:** Internal consultant use ONLY — never expose on client-facing surfaces or public routes
**Purpose:** Assesses applicant profiles across 8 immigration jurisdictions simultaneously
**Architecture:** Policy Currency Architecture — zero hardcoded policy rules. All policy detection is systematic and jurisdiction-agnostic.

### 3.3 ProScrape
**Type:** Python/PyQt6 desktop application
**Purpose:** Web scraping and structured data collection

### 3.4 Axiom
**Type:** Python application
**Purpose:** Household shopping intelligence tool

### 3.5 Socrates
**Type:** Claude API-powered application
**Purpose:** AI-powered tutor

### 3.6 Prometheus
**Type:** Meta-prompt architecture and AI tooling
**Purpose:** Source of the Apex Architect system. Changes here cascade across all AI-powered products. Handle with care.

---

## 4. Custom Booking Engine

**Mandate:** No Calendly, no Cal.com, no third-party booking SaaS. Built in-house.

**MVP v1 (Build this first — nothing else):**
- A single page where Prash can mark himself as available or unavailable by date
- Clients select a date, choose a service tier from a dropdown, and submit their name + email
- Prash receives an email notification with the booking details
- Booking stored in PostgreSQL

**Full requirements (build after MVP v1 is live and tested):**
- Distinct slot types for each of the 8 service tiers — slots are not interchangeable
- Slot duration configurable per tier
- Buffer time configurable between slots
- Availability windows configurable by day and hour (Prash sets his own schedule)
- Booking confirmation email sent automatically on booking creation
- Reminder email sent 24 hours before appointment
- Cancellation and rescheduling with configurable lead-time rules
- Client must be authenticated to book (no anonymous bookings)
- Admin view: full calendar of upcoming bookings across all tiers
- Booking data stored in PostgreSQL — not a third-party calendar system

**SLAs enforced by the booking system:**
- Standard clients: 24-hour response commitment shown at booking
- Priority / active ITA clients (Tier 5–6): 12-hour response commitment
- Weekend bookings: next business day response commitment shown clearly

---

## 5. Custom CRM Pipeline

**Mandate:** No HubSpot, no Pipedrive, no third-party CRM. Built in-house.

**MVP v1 (Build this first — nothing else):**
- A simple table in the admin dashboard showing: client name, email, service tier, current status (a dropdown Prash updates manually), and date added
- Prash can add a client, update their status, and add a private note
- No automated triggers, no email sends, no pipeline animations — just a readable, editable list

**Full pipeline stages (build after MVP v1 is live):**
1. Lead (enquiry received, not yet qualified)
2. Qualified (profile assessed, service tier identified)
3. Proposal Sent (service agreement issued)
4. Active Client (agreement signed, service in progress)
5. ITA Window (client has received ITA — highest priority, 12-hour SLA)
6. Submitted (application submitted to IRCC)
7. Decision Pending (awaiting IRCC decision)
8. Completed (PR granted or case closed)
9. Archived (inactive, data retained per DPDP policy)

**Requirements:**
- Each client record linked to their service tier and booking history
- Notes field per client (Prash's internal observations — never client-visible)
- Document upload and storage linked to client record (Cloudflare R2)
- Status change triggers notification to Prash
- ITA Window status triggers high-priority flag across the entire interface
- Export: client list exportable to CSV for offline backup

---

## 6. Client Portal

**MVP v1 (Build this first):**
- Client logs in and sees: their name, their current status (set by Prash from the CRM), and a list of documents they need to upload
- Client can upload files — files go to their folder in Cloudflare R2
- Nothing else. No messaging, no reports, no consent management in v1.

**Full requirements (build after MVP v1 is live):**
- Secure login via Better Auth
- Dashboard showing: current pipeline stage, next action required, document checklist with status indicators (Ready / In Progress / Not Started)
- Document upload (client uploads to their own folder in Cloudflare R2)
- Messaging thread with Prash (see §7)
- Read-only view of their assessment report
- DPDP consent management: client can view what data is held and submit a deletion request

---

## 7. Messaging System

**MVP v1 (Phase 3 only — do not build in Phase 1 or 2):**
- Prash sends a message to a client from the admin dashboard
- Client sees the message when they log in and can reply once
- No file attachments, no read receipts, no SLA indicators in v1

**Full requirements (build after MVP v1 messaging is stable):**
- Threaded messages per client case
- Prash can initiate and reply; client can reply only (not initiate new threads — reduces noise)
- Message timestamps and read receipts
- File attachments (stored in Cloudflare R2, linked in message)
- Transcript download: admin-only, requires explicit approval action, generates time-limited signed URL — no direct database export
- SLA indicators: messages older than SLA threshold (24hr standard / 12hr ITA) flagged visually in Prash's admin view

---

## 8. Phase Architecture

### Phase 1 — Foundation (Build First)
- Landing page (visaforte.com)
- Authentication (Better Auth)
- CanVisa Pro integration (public-facing version embedded in platform)
- Basic client intake form
- Booking engine (core slot management for all 8 tiers)
- Vercel Blob document storage
- Razorpay payment integration

### Phase 2 — Client Management
- Full CRM pipeline (all 9 stages)
- Client portal (dashboard + document checklist)
- Admin dashboard (pipeline overview, booking calendar)

### Phase 3 — Communication & Automation
- Messaging system
- Automated email notifications (booking confirmation, SLA reminders)
- DPDP consent interface + automated deletion cron
- Post-submission monitoring workflow

**Rule:** Do not build Phase 2 features during Phase 1. Do not build Phase 3 features during Phase 2. Scope is enforced by phase.

---

## 9. In-House Build Mandate — What to Build vs. What to Use

| Capability | Decision | Rationale |
|---|---|---|
| CRM | Build (Phase 2) | Needs to be tightly coupled to immigration workflow |
| Booking engine | Build (Phase 1) | 8 distinct service tiers; no generic tool maps cleanly |
| Analytics | Build (Phase 2) | Simple metrics only; no need for a full analytics platform |
| Search | Build (Phase 2) | Client search within CRM only; Postgres full-text search sufficient |
| Notifications | Build (Phase 3) | Email only initially; no push notifications needed |
| Authentication | Better Auth | Well-maintained open-source; not worth building from scratch |
| Payments | Razorpay | Only rail that onboards a non-registered individual/sole proprietor. India-first by decision (2026-07-17); revisit Stripe once the business is registered and revenue justifies a second rail |
| Storage | Vercel Blob | Private blobs, Mumbai region; zero extra accounts — same Vercel dashboard |
| Database | PostgreSQL (managed) | Infrastructure commodity; managed instance at hosting platform |
| Email delivery | TBD pipe (Resend or similar) | Commodity; vendor-agnostic interface, swap without app changes |

---

## 10. Landing Page Architecture

The visaforte.com landing page uses a Stakes → Forensic Difference → Evidence → Objections → Offer → CTA conversion architecture.

**Fixed assets on the landing page:**
- Tagline: `Engineered for Passage.` — never altered, never omitted
- Brand colours: Prussian `#0C2340` dominant, Saffron `#C97B1E` accent, Pearl `#F8F4EE` ground
- Typography: Cormorant Garamond (display) · DM Sans (body)
- Full brand system: `/mnt/skills/user/visa-forte-brand/SKILL.md`

---

*spec.md — Visa Forte Platform | Read-before-build reference*
