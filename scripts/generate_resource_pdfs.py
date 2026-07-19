"""Generate the six Visa Forte resource PDFs sold/served on /resources.

Free (written to apps/web/public/downloads/):
  - ee-document-checklist.pdf
  - ielts-clb-crs-cheatsheet.pdf
  - ita-to-pr-roadmap.pdf

Premium (written to apps/web/private/downloads/ - never publicly served;
streamed only through the token-gated premium-download API route):
  - loe-master-template-pack.pdf
  - ee-pre-submission-audit-guide.pdf
  - crs-gap-analysis-action-plan.pdf

Every CRS/CLB figure printed here is READ from apps/web/src/lib/crs-rules.json
(the project's single source of truth, cross-checked live against canada.ca on
2026-07-19). Policy facts in the prose were each verified against canada.ca on
2026-07-19 - the exact source URLs are printed in each document's Sources block.

Run:  python scripts/generate_resource_pdfs.py
"""

import json
from datetime import date
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# ── Brand system (visa-forte-brand skill) ────────────────────────────────────
PRUSSIAN = HexColor("#0C2340")
SAFFRON = HexColor("#C97B1E")
PEARL = HexColor("#F8F4EE")
TEAL = HexColor("#1A5C72")
INK = HexColor("#1A2B3C")
SAND = HexColor("#E2DBD1")
AMBER = HexColor("#EDD9B0")

REPO = Path(__file__).resolve().parent.parent
RULES = json.loads(
    (REPO / "apps/web/src/lib/crs-rules.json").read_text(encoding="utf-8")
)
FREE_DIR = REPO / "apps/web/public/downloads"
PREMIUM_DIR = REPO / "apps/web/private/downloads"

TODAY = date(2026, 7, 19)
VERIFIED = "Verified: July 2026 - Source: canada.ca"
PAGE_W, PAGE_H = A4
MARGIN = 16 * mm
HEADER_H = 22 * mm
FOOTER_H = 14 * mm

DISCLAIMER = (
    "The information provided is for informational and guidance purposes only, "
    "based on publicly available Immigration, Refugees and Citizenship Canada "
    "(IRCC) regulations and policies. This does not constitute legal advice, and "
    "no solicitor-client or consultant-client relationship is created by "
    "accessing this content. Immigration regulations, program requirements, "
    "processing times, and CRS cutoff scores are subject to frequent change "
    "without notice. You are responsible for verifying all information with "
    "official IRCC sources (www.canada.ca/immigration) and confirming current "
    "eligibility requirements before taking any action."
)

EE_BASE = (
    "canada.ca/en/immigration-refugees-citizenship/services/"
    "immigrate-canada/express-entry"
)

# ── Paragraph styles ─────────────────────────────────────────────────────────
S = {
    "title": ParagraphStyle(
        "title", fontName="Helvetica-Bold", fontSize=21, leading=25,
        textColor=PRUSSIAN, spaceAfter=2,
    ),
    "subtitle": ParagraphStyle(
        "subtitle", fontName="Helvetica", fontSize=10.5, leading=15,
        textColor=INK, spaceAfter=6,
    ),
    "h2": ParagraphStyle(
        "h2", fontName="Helvetica-Bold", fontSize=13, leading=16,
        textColor=PRUSSIAN, spaceBefore=10, spaceAfter=4,
    ),
    "h3": ParagraphStyle(
        "h3", fontName="Helvetica-Bold", fontSize=10.5, leading=13,
        textColor=TEAL, spaceBefore=7, spaceAfter=3,
    ),
    "p": ParagraphStyle(
        "p", fontName="Helvetica", fontSize=9.5, leading=13.5,
        textColor=INK, spaceAfter=5,
    ),
    "bullet": ParagraphStyle(
        "bullet", fontName="Helvetica", fontSize=9.5, leading=13.5,
        textColor=INK, leftIndent=10, bulletIndent=2, spaceAfter=2.5,
    ),
    "note": ParagraphStyle(
        "note", fontName="Helvetica-Oblique", fontSize=8.5, leading=11.5,
        textColor=TEAL, spaceAfter=5,
    ),
    "callout": ParagraphStyle(
        "callout", fontName="Helvetica", fontSize=9, leading=12.5,
        textColor=INK,
    ),
    "tcell": ParagraphStyle(
        "tcell", fontName="Helvetica", fontSize=9, leading=11.5, textColor=INK,
    ),
    "tcellb": ParagraphStyle(
        "tcellb", fontName="Helvetica-Bold", fontSize=9, leading=11.5,
        textColor=INK,
    ),
    "thead": ParagraphStyle(
        "thead", fontName="Helvetica-Bold", fontSize=9, leading=11.5,
        textColor=PEARL,
    ),
    "small": ParagraphStyle(
        "small", fontName="Helvetica", fontSize=8, leading=10.5, textColor=INK,
        spaceAfter=3,
    ),
    "tpl": ParagraphStyle(
        "tpl", fontName="Courier", fontSize = 8.6, leading=12,
        textColor=INK, leftIndent=6, spaceAfter=5,
    ),
}


class Doc:
    """Accumulates flowables with a tiny content DSL, then renders the branded
    page (Prussian header band, saffron rule, sand footer rule) on every page."""

    def __init__(self, out_path: Path, doc_name: str) -> None:
        self.out_path = out_path
        self.doc_name = doc_name
        self.story: list = []

    # ── content DSL ──────────────────────────────────────────────────────────
    def title(self, text: str, subtitle: str) -> None:
        self.story.append(Spacer(1, 2 * mm))
        self.story.append(Paragraph(text, S["title"]))
        rule = Table([[""]], colWidths=[34 * mm], rowHeights=[1.2 * mm])
        rule.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), SAFFRON)]))
        rule.hAlign = "LEFT"
        self.story.append(rule)
        self.story.append(Spacer(1, 3 * mm))
        self.story.append(Paragraph(subtitle, S["subtitle"]))

    def h2(self, text: str) -> None:
        self.story.append(Paragraph(text, S["h2"]))

    def h3(self, text: str) -> None:
        self.story.append(Paragraph(text, S["h3"]))

    def p(self, text: str) -> None:
        self.story.append(Paragraph(text, S["p"]))

    def note(self, text: str) -> None:
        self.story.append(Paragraph(text, S["note"]))

    def bullets(self, items: list) -> None:
        for it in items:
            self.story.append(Paragraph(it, S["bullet"], bulletText="•"))
        self.story.append(Spacer(1, 2 * mm))

    def checklist(self, items: list) -> None:
        # Each row: an empty bordered cell (the checkbox) + the item text.
        rows = [["", Paragraph(it, S["tcell"])] for it in items]
        t = Table(rows, colWidths=[7 * mm, None])
        t.setStyle(TableStyle([
            ("BOX", (0, 0), (0, -1), 0.8, PRUSSIAN),
            ("INNERGRID", (0, 0), (0, -1), 0.8, PRUSSIAN),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (1, 0), (1, -1), 6),
        ]))
        self.story.append(t)
        self.story.append(Spacer(1, 2.5 * mm))

    def table(self, header: list, rows: list, widths: list = None) -> None:
        data = [[Paragraph(h, S["thead"]) for h in header]]
        for r in rows:
            data.append([
                Paragraph(str(c), S["tcellb"] if i == 0 else S["tcell"])
                for i, c in enumerate(r)
            ])
        t = Table(data, colWidths=widths, repeatRows=1)
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), PRUSSIAN),
            ("GRID", (0, 0), (-1, -1), 0.5, SAND),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]
        # Sand alternating body rows (brand table spec).
        for i in range(2, len(data), 2):
            style.append(("BACKGROUND", (0, i), (-1, i), SAND))
        t.setStyle(TableStyle(style))
        self.story.append(t)
        self.story.append(Spacer(1, 3 * mm))

    def callout(self, text: str, heading: str = "") -> None:
        # Amber box with a saffron left border (brand callout spec).
        body = (f"<b>{heading}</b><br/>" if heading else "") + text
        inner = Table([[Paragraph(body, S["callout"])]], colWidths=[None])
        inner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), AMBER),
            ("LINEBEFORE", (0, 0), (0, -1), 2.5, SAFFRON),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        self.story.append(Spacer(1, 1.5 * mm))
        self.story.append(inner)
        self.story.append(Spacer(1, 3 * mm))

    def template_block(self, text: str) -> None:
        # Monospaced letter template on a pearl panel with a sand border.
        inner = Table(
            [[Paragraph(text.replace("\n", "<br/>"), S["tpl"])]],
            colWidths=[None],
        )
        inner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PEARL),
            ("BOX", (0, 0), (-1, -1), 0.7, SAND),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        self.story.append(inner)
        self.story.append(Spacer(1, 2.5 * mm))

    def page_break(self) -> None:
        self.story.append(PageBreak())

    def sources(self, urls: list) -> None:
        self.h2("Sources")
        self.p(
            "Every rule and figure in this document was verified against the "
            "following official pages on 19 July 2026:"
        )
        self.bullets([f'<font color="#1A5C72">{u}</font>' for u in urls])

    def disclaimer(self) -> None:
        self.story.append(Spacer(1, 2 * mm))
        self.callout(DISCLAIMER, heading="Important - please read")

    # ── page furniture + build ───────────────────────────────────────────────
    def _decorate(self, canvas, _doc) -> None:
        c = canvas
        c.saveState()
        # Prussian header band with the wordmark and verification line.
        c.setFillColor(PRUSSIAN)
        c.rect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)
        c.setFillColor(SAFFRON)
        c.rect(0, PAGE_H - HEADER_H - 1.2 * mm, PAGE_W, 1.2 * mm, fill=1, stroke=0)
        c.setFillColor(PEARL)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(MARGIN, PAGE_H - 11 * mm, "VISA FORTE")
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawString(MARGIN, PAGE_H - 15.5 * mm, "Engineered for Passage.")
        c.setFont("Helvetica", 7.5)
        c.drawRightString(PAGE_W - MARGIN, PAGE_H - 11 * mm, self.doc_name)
        c.drawRightString(PAGE_W - MARGIN, PAGE_H - 15.5 * mm, VERIFIED)
        # Sand footer rule + contact/version line + page number.
        c.setStrokeColor(SAND)
        c.setLineWidth(0.7)
        c.line(MARGIN, FOOTER_H, PAGE_W - MARGIN, FOOTER_H)
        c.setFillColor(INK)
        c.setFont("Helvetica", 7)
        c.drawString(
            MARGIN, FOOTER_H - 4 * mm,
            "visaforte.com - hello@visaforte.com - Secunderabad, India",
        )
        c.drawRightString(
            PAGE_W - MARGIN, FOOTER_H - 4 * mm,
            f"{self.doc_name} - v1.0 - {TODAY.strftime('%B %Y')} - "
            f"For client reference only - Page {c.getPageNumber()}",
        )
        c.restoreState()

    def build(self) -> None:
        self.out_path.parent.mkdir(parents=True, exist_ok=True)
        doc = BaseDocTemplate(
            str(self.out_path), pagesize=A4,
            leftMargin=MARGIN, rightMargin=MARGIN,
            topMargin=HEADER_H + 6 * mm, bottomMargin=FOOTER_H + 5 * mm,
            title=self.doc_name, author="Visa Forte",
        )
        frame = Frame(
            doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body",
        )
        doc.addPageTemplates(
            [PageTemplate(id="vf", frames=[frame], onPage=self._decorate)]
        )
        doc.build(self.story)
        print(f"  wrote {self.out_path.relative_to(REPO)}")


# ── Shared derived figures (all read from crs-rules.json) ────────────────────
def lang_points(table_key: str) -> dict:
    return {row["minClb"]: row["points"] for row in RULES["sectionA"][table_key]}


FL_SINGLE = lang_points("firstLanguageSingle")      # per ability, no spouse
FL_SPOUSE = lang_points("firstLanguageWithSpouse")  # per ability, with spouse
SL = lang_points("secondLanguage")                  # second official language
SP_LANG = {r["minClb"]: r["points"] for r in RULES["sectionB"]["spouseLanguage"]}
D = RULES["sectionD"]
C = RULES["sectionC"]
IELTS = RULES["languageConversion"]["IELTS_GT"]


def ielts_min(ability: str, clb: int) -> str:
    for row in IELTS[ability]:
        if row["clb"] == clb:
            return f"{row['min']:.1f}"
    return "-"


# ═════════════════════════════════════════════════════════════════════════════
# FREE 1 - Express Entry Document Checklist
# ═════════════════════════════════════════════════════════════════════════════
def build_ee_checklist() -> None:
    d = Doc(FREE_DIR / "ee-document-checklist.pdf", "Express Entry Document Checklist")
    d.title(
        "Express Entry Document Checklist",
        "A complete, phase-by-phase list of every document required for an "
        "Express Entry application - FSWP, CEC, and FSTP. Work through each "
        "phase in order and tick items off as they are confirmed ready.",
    )
    d.callout(
        "Documents must be ready <b>before</b> the Invitation to Apply (ITA) "
        "arrives, not after. Once invited, you have <b>60 days</b> to submit a "
        "complete application - a hard deadline with no extensions. Police "
        "certificates, medical exams, and credential assessments can each take "
        "weeks to months to obtain.",
        heading="The one rule that decides most files",
    )

    d.h2("Phase 1 - Before you create your profile")
    d.checklist([
        "<b>Passport</b> - valid, with the biographical data page scanned. "
        "Renew now if it expires within the next 12 months.",
        "<b>Language test results</b> - from an accepted test: CELPIP-General, "
        "IELTS General Training, or PTE Core for English; TEF Canada or TCF "
        "Canada for French. Results must be less than 2 years old when you "
        "apply. IELTS One Skill Retake is not accepted.",
        "<b>Educational Credential Assessment (ECA)</b> - required if your "
        "education is from outside Canada and you want education points. Use a "
        "designated organization: WES, ICAS, CES (University of Toronto), IQAS "
        "(Alberta), or ICES (BCIT). Architects, doctors, and pharmacists must "
        "use their profession's designated body instead. The ECA must be less "
        "than 5 years old both when you complete your profile and when you apply.",
        "<b>NOC 2021 code confirmed</b> - matched to your actual job duties, "
        "not your job title. Your reference letters must describe duties that "
        "correspond to this code.",
        "<b>Provincial nomination certificate</b> - if you hold one (adds "
        f"{D['provincialNomination']} CRS points).",
    ])

    d.h2("Phase 2 - While you are in the pool")
    d.checklist([
        "<b>Keep the profile accurate</b> - update language results, work "
        "history, and family status the moment they change.",
        "<b>Proof of funds kept current</b> - IRCC updates the required "
        "amounts every year (based on 50% of the low-income cut-off). Check "
        "the current table at canada.ca and update your profile when it changes. "
        "Required for FSWP and FSTP; not required for CEC, or if you are "
        "authorized to work in Canada and hold a valid job offer.",
        "<b>Order police certificates early</b> - you will need one for "
        "yourself and every family member 18 or older, from every country "
        "stayed in for 6 consecutive months or longer during the last 10 years "
        "(time before age 18 and time in Canada excluded).",
        "<b>Locate your nearest IRCC panel physician</b> - only a panel "
        "physician can do the immigration medical exam. Know where yours is "
        "before the ITA arrives.",
        "<b>Employment reference letters drafted</b> - see the standard on "
        "the next page. Getting a compliant letter from a past employer is "
        "often the slowest single document.",
    ])

    d.h2("Phase 3 - After the ITA: your e-APR upload set (60 days)")
    d.p(
        "The online system generates a personalized checklist from your "
        "profile. Expect it to ask for the items below."
    )
    d.checklist([
        "<b>Police certificates</b> - per the rule in Phase 2. If one cannot "
        "arrive in time, upload proof that you requested it plus an explanation.",
        "<b>Proof of funds</b> - official letter on bank letterhead: account "
        "holder name, account numbers, opening dates, current balance, 6-month "
        "average balance, and outstanding debts. CEC applicants and valid "
        "job-offer holders upload a letter explaining the exemption instead.",
        "<b>Immigration medical exam</b> - done by a panel physician after "
        "your ITA, as close as possible to your application date. Upload the "
        "information printout sheet or IMM 1017B Upfront Medical Report. "
        "Family members need exams even if they are not coming with you.",
        "<b>Employment reference letters</b> - for every position claimed for "
        "points (see standard below).",
        "<b>Birth certificate(s)</b> - if declaring dependent children.",
        "<b>Marriage certificate</b> - if married; <b>IMM 5409</b> statutory "
        "declaration if common-law; <b>divorce certificate and separation "
        "agreement</b> if divorced; <b>death certificate</b> if widowed; "
        "<b>adoption certificate</b> for adopted dependants.",
        "<b>IMM 5476 Use of Representative</b> - only if you hired a "
        "representative.",
        "<b>Digital photos</b> - to confirm identity, if requested in your "
        "personalized checklist.",
        "<b>Certified translations</b> - any document not in English or "
        "French needs a stamped certified translation (or a translator's "
        "affidavit) plus a scan of the original or certified photocopy. Stamps "
        "and seals must be translated too.",
    ])

    d.h2("The employment reference letter standard")
    d.p(
        "The single most common documentation failure in Express Entry files. "
        "Every letter must contain all of the following:"
    )
    d.checklist([
        "Printed on official company letterhead with full company address, "
        "phone number, and email",
        "Recent issue date, and the signatory's name, job title, and direct "
        "company contact details",
        "Your full legal name exactly as in your passport",
        "All job titles held, with exact start and end dates for each",
        "Minimum 5 specific duties per role - matching the NOC description "
        "you claimed",
        "Hours per week stated explicitly (full-time = 30+ hours/week)",
        "Annual salary or hourly rate, with the currency stated",
        "Company stamp or seal (expected practice for Indian employers)",
    ])
    d.callout(
        "Dates must match across every document: reference letters, payslips, "
        "appointment letters, relieving letters, and tax records. A mismatch "
        "an officer cannot reconcile is treated as a credibility problem, and "
        "at worst as misrepresentation - which carries a 5-year ban.",
        heading="Consistency check before you upload",
    )

    d.sources([
        f"{EE_BASE}/documents.html",
        f"{EE_BASE}/apply-permanent-residence.html",
        f"{EE_BASE}/documents/language-test.html",
        f"{EE_BASE}/documents/education-assessment.html",
        f"{EE_BASE}/documents/police-certificates.html",
        f"{EE_BASE}/documents/proof-funds.html",
    ])
    d.disclaimer()
    d.build()


# ═════════════════════════════════════════════════════════════════════════════
# FREE 2 - IELTS → CLB → CRS Conversion Cheat Sheet
# ═════════════════════════════════════════════════════════════════════════════
def build_cheatsheet() -> None:
    d = Doc(
        FREE_DIR / "ielts-clb-crs-cheatsheet.pdf",
        "IELTS - CLB - CRS Cheat Sheet",
    )
    d.title(
        "IELTS to CLB to CRS: The Conversion Cheat Sheet",
        "Every IELTS General Training band score converted to its Canadian "
        "Language Benchmark (CLB) level, and every CLB level converted to CRS "
        "points - first language, second language, and spouse contribution.",
    )
    d.note(
        "Accepted English tests for Express Entry: CELPIP-General, IELTS "
        "General Training, PTE Core. IELTS One Skill Retake is not accepted. "
        "French: TEF Canada, TCF Canada. Results must be less than 2 years old "
        "when you apply. CELPIP scores map to CLB levels directly (CELPIP 9 = "
        "CLB 9)."
    )

    d.h2("Step 1 - Convert IELTS bands to CLB (minimum score per ability)")
    clb_rows = []
    for clb in (10, 9, 8, 7, 6, 5, 4):
        clb_rows.append([
            f"CLB {clb}" + (" +" if clb == 10 else ""),
            ielts_min("L", clb), ielts_min("R", clb),
            ielts_min("W", clb), ielts_min("S", clb),
        ])
    d.table(
        ["CLB level", "Listening", "Reading", "Writing", "Speaking"],
        clb_rows,
        widths=[32 * mm, None, None, None, None],
    )
    d.callout(
        "Your CLB level for each ability is the highest row whose minimum you "
        "meet. Your overall claim is per-ability - one weak ability drags only "
        "that ability down, but program minimums (like CLB 7 for FSWP) must be "
        "met in <b>all four</b>.",
        heading="How to read the table",
    )

    d.h2("Step 2 - Convert CLB to CRS points: first official language")
    d.p("Points are per ability - multiply by what you hold in each of the four.")
    fl_rows = [
        [label,
         str(FL_SPOUSE.get(clb, 0)) if clb else "0",
         str(FL_SINGLE.get(clb, 0)) if clb else "0"]
        for label, clb in [
            ("CLB 4 or less", None), ("CLB 5", 5), ("CLB 6", 6), ("CLB 7", 7),
            ("CLB 8", 8), ("CLB 9", 9), ("CLB 10 or more", 10),
        ]
    ]
    d.table(
        ["CLB per ability", "With spouse (max 128)", "Without spouse (max 136)"],
        fl_rows, widths=[46 * mm, None, None],
    )
    d.note(
        f"The CLB 8 to CLB 9 jump is worth +{FL_SINGLE[9]-FL_SINGLE[8]} points "
        f"per ability (+{4*(FL_SINGLE[9]-FL_SINGLE[8])} across all four, "
        "without spouse) - and it unlocks the top tier of two skill-"
        "transferability combinations. It is the highest-ROI retest in the "
        "system."
    )

    d.h2("Step 3 - Second official language (e.g. French after English)")
    d.table(
        ["CLB per ability", "Points per ability (max 24; max 22 with spouse)"],
        [["CLB 4 or less", "0"],
         ["CLB 5 or 6", str(SL[5])],
         ["CLB 7 or 8", str(SL[7])],
         ["CLB 9 or more", str(SL[9])]],
        widths=[46 * mm, None],
    )
    d.p(
        f"French also carries a separate bonus: NCLC 7+ in all four French "
        f"abilities adds <b>{D['frenchLanguageBonus']['nclc7PlusEnglishClb5OrHigher']} "
        f"points</b> if your English is CLB 5+, or "
        f"{D['frenchLanguageBonus']['nclc7PlusEnglishClb4OrLower']} points with "
        "CLB 4 or lower English - on top of the second-language points above."
    )

    d.h2("Step 4 - Spouse or partner's language (Section B)")
    d.table(
        ["CLB per ability", "Points per ability (max 20)"],
        [["CLB 4 or less", "0"],
         ["CLB 5 or 6", str(SP_LANG[5])],
         ["CLB 7 or 8", str(SP_LANG[7])],
         ["CLB 9 or more", str(SP_LANG[9])]],
        widths=[46 * mm, None],
    )

    d.h2("Worked example")
    ex_single = 4 * FL_SINGLE[9]
    d.p(
        "IELTS General Training <b>L 8.0 / R 7.0 / W 7.0 / S 7.0</b> converts "
        "to CLB 9 in all four abilities. Without a spouse, that is "
        f"{FL_SINGLE[9]} points x 4 = <b>{ex_single} first-language points</b> "
        "- and it satisfies the CLB 9 threshold that maximises both "
        "language-based skill-transferability combinations (worth up to "
        f"{C['eduLanguage']['bachelorsPlus']['clb9']} points each, capped at "
        f"{C['maxTotal']} for Section C overall)."
    )

    d.sources([
        f"{EE_BASE}/documents/language-test.html",
        "canada.ca/en/immigration-refugees-citizenship/corporate/publications-"
        "manuals/operational-bulletins-manuals/standard-requirements/"
        "language-requirements.html",
        f"{EE_BASE}/check-score/crs-criteria.html",
    ])
    d.disclaimer()
    d.build()


# ═════════════════════════════════════════════════════════════════════════════
# FREE 3 - ITA to PR: The 11-Step Roadmap
# ═════════════════════════════════════════════════════════════════════════════
def build_roadmap() -> None:
    d = Doc(FREE_DIR / "ita-to-pr-roadmap.pdf", "ITA to PR - The 11-Step Roadmap")
    d.title(
        "ITA to PR: The 11-Step Roadmap",
        "The end-to-end path from the day your Invitation to Apply arrives to "
        "the day you land in Canada - what happens at each step, what can slow "
        "it down, and what to do about it.",
    )

    steps = [
        ("Day 0 - The ITA arrives",
         "The invitation appears in your online account and your 60-day clock "
         "starts. The invitation is valid for 60 days only - no extensions. "
         "Confirm immediately that everything in your profile is still true; "
         "you will be assessed against what you claimed."),
        ("Days 0-3 - Accept the mission, audit the claim",
         "Re-verify your CRS inputs before doing anything else: age band, "
         "language results still under 2 years old at submission, ECA still "
         "under 5 years old, work history exactly as documented. If your "
         "score was inflated by an error, declining the ITA keeps you in the "
         "pool; submitting an inaccurate application risks refusal or a "
         "misrepresentation finding."),
        ("Days 0-7 - Order every police certificate",
         "One for you and each family member 18+, from every country stayed "
         "in for 6 consecutive months or longer during the last 10 years. "
         "Some countries take months - order everything in week one. If a "
         "certificate will not arrive in time, keep dated proof that you "
         "requested it."),
        ("Days 3-10 - Book the medical exam",
         "Book an immigration medical exam with an IRCC panel physician - "
         "only panel physicians count. IRCC advises taking the exam as close "
         "as possible to the date you apply. You will receive an information "
         "printout or IMM 1017B form to upload. All family members need "
         "exams, including those not accompanying you."),
        ("Days 3-14 - Lock the employment evidence",
         "Collect reference letters for every position you claimed points "
         "for: letterhead, dates, 5+ duties matching your NOC, hours, salary, "
         "signatory contact details, company stamp. This is the most common "
         "failure point in the entire system - get it right before uploading "
         "anything."),
        ("Days 7-21 - Assemble proof of funds",
         "FSWP/FSTP: official bank letter + 6 months of statements showing a "
         "stable balance above the current canada.ca threshold for your "
         "family size (updated annually - check the live table). CEC "
         "applicants and valid job-offer holders upload an exemption letter "
         "instead. Any recent large deposit needs a documented source and an "
         "explanation letter."),
        ("Days 14-40 - Complete the e-APR and upload",
         "Fill the online application form and work through your personalized "
         "document checklist: civil status certificates, birth certificates "
         "for dependants, translations (certified translator or affidavit + "
         "original), IMM 5409 if common-law, IMM 5476 if represented. Write a "
         "Letter of Explanation for anything an officer could find "
         "inconsistent."),
        ("Days 40-55 - Final audit, pay, submit",
         "Cross-check every date against every document, confirm each upload "
         "slot, pay the processing and right-of-PR fees listed at canada.ca, "
         "and submit before day 60. Do not use the full window if you can "
         "avoid it - a buffer absorbs surprises (a rejected photo, a missing "
         "page, a certificate that needs re-issuing)."),
        ("After submission - AOR and biometrics",
         "You receive an Acknowledgment of Receipt (AOR). If asked, give "
         "biometrics (fingerprints + photo) at a collection point after "
         "paying the biometrics fee. IRCC then verifies your information and "
         "you can track status in your account."),
        ("Processing - stay ready, stay consistent",
         "IRCC may request additional documents at any point - respond fast "
         "and keep every document consistent with what you filed. Update IRCC "
         "if your family status changes. Check current processing times on "
         "the canada.ca processing-times tool rather than relying on "
         "anecdotes."),
        ("Decision - COPR and landing",
         "On approval you receive a Confirmation of Permanent Residence "
         "(COPR) and, if from a visa-required country, a PR visa. Check every "
         "detail on the COPR for errors, then complete landing - at a port of "
         "entry or virtually as instructed - before your COPR expiry. Your PR "
         "card follows by mail. Welcome to Canada."),
    ]
    for i, (head, body) in enumerate(steps, 1):
        d.h3(f"Step {i} - {head}")
        d.p(body)

    d.callout(
        "If any single document cannot arrive inside the 60 days: upload dated "
        "proof that you ordered it, plus a Letter of Explanation. If your "
        "medical cannot be booked in time, document the earliest available "
        "appointment. Officers work with applicants who show diligence - "
        "silence and blank slots get files refused.",
        heading="If a step is delayed",
    )

    d.sources([
        f"{EE_BASE}/apply-permanent-residence.html",
        f"{EE_BASE}/after-apply.html",
        f"{EE_BASE}/application-approved.html",
        f"{EE_BASE}/documents/police-certificates.html",
        f"{EE_BASE}/documents/proof-funds.html",
    ])
    d.disclaimer()
    d.build()


# ═════════════════════════════════════════════════════════════════════════════
# PREMIUM 1 - Letter of Explanation (LOE) Master Template Pack
# ═════════════════════════════════════════════════════════════════════════════
LOE_TEMPLATES = [
    (
        "Employment gap",
        "Use when there is any period in your work history not covered by "
        "employment - between jobs, after graduation, or during a career break.",
        "Officers are not penalising the gap itself; they are checking that "
        "the timeline is complete and honest. An unexplained hole invites "
        "speculation - a declared, dated, evidenced gap closes the question.",
        """Subject: Letter of Explanation - Employment gap, [start month year] to [end month year]

Dear Officer,

I am writing regarding the period between [date] and [date], during which
I was not employed.

During this period I was [reason: caring for a family member / completing
a professional certification / relocating and conducting a job search /
recovering from illness]. I have declared this period in my application
in the personal history section.

Supporting evidence enclosed:
  1. [e.g. Course enrolment and completion certificate]
  2. [e.g. Medical documentation covering the period]
  3. [e.g. Travel records confirming relocation dates]

My employment before this period ended on [date] ([employer]), and my
subsequent employment began on [date] ([employer]), as confirmed by the
reference letters enclosed with this application. No work experience
points are claimed for the gap period.

Sincerely,
[Full name as in passport] - [UCI / application number]""",
    ),
    (
        "Travel history discrepancy",
        "Use when passport stamps, visas, or records show travel that does "
        "not obviously match your declared address or personal history.",
        "The officer's concern is completeness of your travel and address "
        "history. Reconcile each specific trip to a line in your form - do "
        "not write generally about being a frequent traveller.",
        """Subject: Letter of Explanation - Travel history clarification

Dear Officer,

I write to clarify the following entries in my travel history that may
appear inconsistent with my declared address history.

  1. [Country], [dates] - [purpose: short business trip]. My residential
     address remained [address], as this visit was under [n] weeks.
  2. [Country], [dates] - [purpose]. This trip is reflected in the stamps
     on passport [number], page [n].

My address history in the application lists only residences of 6 months
or longer, per the form instructions; the trips above were shorter stays
and did not change my residential address.

Supporting evidence enclosed:
  1. Passport pages showing entry/exit stamps
  2. [Flight itineraries / visa copies / employer travel letter]

Sincerely,
[Full name as in passport] - [UCI / application number]""",
    ),
    (
        "Study-to-work transition",
        "Use when your first skilled role began soon after graduation and "
        "the early employment overlaps study, or your job preceded the "
        "credential officers would expect it to require.",
        "The officer needs the sequence to make sense: what was studied, "
        "when it ended, when the work began, and whether any overlap was "
        "permitted (e.g. part-time work as a student, or a role obtained "
        "before convocation).",
        """Subject: Letter of Explanation - Study-to-work transition timeline

Dear Officer,

I write to clarify the relationship between my education and early
employment.

I completed the final requirements of my [credential] at [institution]
on [date], with the degree formally conferred on [convocation date]. I
accepted an offer from [employer] on [date] and began work on [date].

[If overlapping: Between [date] and [date] I worked part-time ([n]
hours/week) while completing my studies, which was permitted under
[basis]. No skilled work experience points are claimed for this period.]

Work experience points in this application are claimed only from [date],
when I began full-time employment as [job title].

Supporting evidence enclosed:
  1. Final transcript showing completion date
  2. Degree certificate / provisional certificate
  3. Offer letter and first appointment letter from [employer]

Sincerely,
[Full name as in passport] - [UCI / application number]""",
    ),
    (
        "Large or recent deposit in proof of funds",
        "Use when your bank balance shows a significant deposit in the "
        "6-month window that could look like borrowed or parked money.",
        "Unexplained spikes are one of the most common proof-of-funds "
        "refusal triggers. The officer needs the source, the paper trail, "
        "and confirmation the money is genuinely yours and non-repayable.",
        """Subject: Letter of Explanation - Source of funds, deposit of [amount] on [date]

Dear Officer,

My bank statement for [bank, account ending ####] shows a deposit of
[amount] on [date]. I write to document its source.

The funds originate from [source: sale of property at [address] /
maturity of fixed deposit [number] / gift from [name, relationship]].

Paper trail enclosed:
  1. [Sale deed / FD maturity advice / notarized gift deed stating the
     funds are non-repayable]
  2. [Buyer's/donor's bank statement showing the outgoing transfer]
  3. [Bank advice slip confirming the credit]

These funds are unencumbered, held in my own name, and remain available
for settlement in Canada. The 6-month statements enclosed show all other
balances arise from my declared salary of [amount]/month from [employer].

Sincerely,
[Full name as in passport] - [UCI / application number]""",
    ),
    (
        "Name variation across documents",
        "Use when documents show different spellings, orderings, or forms "
        "of your name (or a maiden name / single-name passport).",
        "Officers must be certain every document belongs to the same "
        "person. List each variant, say which documents carry it, and "
        "anchor everything to the passport name.",
        """Subject: Letter of Explanation - Name variation across documents

Dear Officer,

My name appears in the following variations across my documents:

  1. [Name exactly as in passport] - passport, this application
  2. [Variant] - [documents: degree certificate, transcripts]
  3. [Variant] - [documents: earlier employment letters]

All variants refer to me. The variation arises from [reason: transliteration
practice / maiden name before marriage on [date] / initial-expanded form
customary in [country]].

Supporting evidence enclosed:
  1. [Affidavit of one and the same person / gazette notification]
  2. [Marriage certificate linking former and current names]

I request that all enclosed documents be read under my passport name,
[full name].

Sincerely,
[Full name as in passport] - [UCI / application number]""",
    ),
    (
        "Police certificate not yet received",
        "Use when a required police certificate cannot arrive before your "
        "60-day submission deadline.",
        "IRCC's own guidance is to submit proof that you ordered the "
        "certificate. Show the order date, the authority's stated "
        "processing time, and commit to uploading on arrival.",
        """Subject: Letter of Explanation - Police certificate from [country] pending

Dear Officer,

My application requires a police certificate from [country], where I
resided from [date] to [date]. I applied for this certificate on
[application date] - before receiving my ITA / immediately upon
receiving my ITA - and it has not yet been issued.

The issuing authority ([name]) states a current processing time of
[n weeks/months]. Enclosed as proof of my request:
  1. Application receipt / acknowledgment dated [date]
  2. Payment confirmation
  3. [Correspondence with the authority]

I will upload the certificate to my account immediately upon receipt. I
respectfully request that my application be processed in the interim.

Sincerely,
[Full name as in passport] - [UCI / application number]""",
    ),
    (
        "NOC duties clarification",
        "Use when your job title does not obviously match the NOC code "
        "claimed, or a reference letter's wording could read as a "
        "different TEER level.",
        "The officer cross-references your letter's duties against the "
        "NOC lead statement and main duties. Map your actual duties to "
        "the NOC's language explicitly - title is irrelevant, duties "
        "decide.",
        """Subject: Letter of Explanation - NOC [code] classification for role at [employer]

Dear Officer,

My position at [employer] carries the internal title [title]. I have
classified this role under NOC [code] ([NOC title]) based on duties
actually performed, as detailed in the enclosed reference letter.

Mapping of my duties to NOC [code] main duties:

  1. NOC: [main duty from canada.ca] - My role: [matching duty from
     reference letter]
  2. NOC: [main duty] - My role: [matching duty]
  3. NOC: [main duty] - My role: [matching duty]

The internal title reflects [company naming convention]; the substance
of the role is that of [NOC title]. My reporting line, [qualification
requirements], and salary band enclosed further support this level.

Sincerely,
[Full name as in passport] - [UCI / application number]""",
    ),
    (
        "Common-law relationship evidence",
        "Use when declaring a common-law partner and your cohabitation "
        "evidence needs context (different lease names, periods apart, "
        "family-owned housing).",
        "Common-law status requires 12 continuous months of cohabitation "
        "in a conjugal relationship (declared on IMM 5409). Officers look "
        "for layered, dated evidence; explain any document that seems to "
        "point the other way.",
        """Subject: Letter of Explanation - Common-law cohabitation evidence

Dear Officer,

[Partner name] and I have cohabited continuously as a couple since
[date], as declared in our statutory declaration (IMM 5409). I write to
give context to our supporting evidence.

  1. [Lease is in one name only because the building required a single
     leaseholder; enclosed letter from the landlord confirms joint
     occupancy since [date].]
  2. [Between [date] and [date], I travelled for work ([n] weeks); our
     shared residence and relationship continued, as shown by ongoing
     joint expenses during that period.]

Evidence enclosed:
  1. IMM 5409 statutory declaration, sworn [date]
  2. Joint [bank account / utility bills / insurance] from [date]
  3. Correspondence addressed to both of us at [address]
  4. [Photographs, travel bookings, and declarations from family]

Sincerely,
[Full name as in passport] - [UCI / application number]""",
    ),
]


def build_loe_pack() -> None:
    d = Doc(
        PREMIUM_DIR / "loe-master-template-pack.pdf",
        "LOE Master Template Pack",
    )
    d.title(
        "Letter of Explanation: Master Template Pack",
        "Eight professionally structured LOE templates for the most common "
        "explanation scenarios in Express Entry files - each with usage "
        "guidance and an annotation on exactly what the reviewing officer is "
        "looking for.",
    )
    d.h2("How to use an LOE - the four-part structure")
    d.p(
        "A Letter of Explanation is not an apology and not an essay. Every "
        "effective LOE does four things in under a page: <b>(1) names the "
        "specific issue</b> an officer would notice, <b>(2) states the facts</b> "
        "with dates, <b>(3) points to enclosed evidence</b> item by item, and "
        "<b>(4) closes</b> without pleading. Attach it in the slot IRCC "
        "provides (or merged with the related document), one issue per letter."
    )
    d.callout(
        "Never explain what needs no explanation - an unnecessary LOE invites "
        "scrutiny of a non-issue. Write one only when a reasonable officer, "
        "reading your file cold, would pause and ask a question. Then answer "
        "exactly that question.",
        heading="The golden rule",
    )
    for i, (name, when, officer, tpl) in enumerate(LOE_TEMPLATES, 1):
        d.page_break() if i in (2, 3, 4, 5, 6, 7, 8) else None
        d.h2(f"Template {i} - {name}")
        d.h3("When to use it")
        d.p(when)
        d.h3("What the officer is looking for")
        d.p(officer)
        d.h3("Template")
        d.template_block(tpl)

    d.page_break()
    d.h2("Final checks before you attach any LOE")
    d.checklist([
        "One issue per letter - never combine unrelated explanations",
        "Every date in the letter matches the application forms exactly",
        "Every piece of evidence named in the letter is actually enclosed",
        "No speculation, no emotion, no filler - facts, dates, documents",
        "Signed, with your full passport name and UCI/application number",
        "Under one page wherever possible",
    ])
    d.sources([
        f"{EE_BASE}/apply-permanent-residence.html",
        f"{EE_BASE}/documents/police-certificates.html",
        f"{EE_BASE}/documents/proof-funds.html",
    ])
    d.disclaimer()
    d.build()


# ═════════════════════════════════════════════════════════════════════════════
# PREMIUM 2 - Express Entry Pre-Submission Audit Guide (40 points)
# ═════════════════════════════════════════════════════════════════════════════
AUDIT_SECTIONS = [
    ("A. Identity and civil status", [
        ("Passport validity",
         "Passport valid well beyond submission; biographical page scan is "
         "sharp, complete, uncropped.",
         "Renew first if expiry is near - your PR visa/COPR cannot outlive "
         "the passport it is issued against."),
        ("One name, everywhere",
         "Name identical across passport, forms, letters, ECA, and test "
         "results - or every variant is explained.",
         "Add a name-variation LOE plus linking evidence (affidavit, "
         "marriage certificate) for any mismatch, however small."),
        ("Date and place of birth consistency",
         "DOB and birthplace match on passport, birth certificate, and every "
         "form field.",
         "A single transposed digit here reads as carelessness at best, "
         "misrepresentation at worst. Fix at source before filing."),
        ("Marital status evidence",
         "Married: certificate. Common-law: IMM 5409 + 12-month cohabitation "
         "evidence. Divorced: certificate + separation agreement. Widowed: "
         "death certificate.",
         "The declared status must match the evidence AND the history in "
         "both partners' documents."),
        ("Dependants documented",
         "Birth certificate for each dependent child; adoption certificate "
         "where applicable; all dependants declared - accompanying or not.",
         "Undeclared family members are a classic misrepresentation finding "
         "and can bar future sponsorship."),
    ]),
    ("B. Language evidence", [
        ("Two-year validity at submission",
         "Test results will still be under 2 years old on the day you "
         "SUBMIT the e-APR - not just at ITA.",
         "If results lapse mid-window, retest immediately or the claimed "
         "points evaporate and the file fails eligibility."),
        ("Accepted test and format",
         "English: CELPIP-General, IELTS General Training, or PTE Core. "
         "IELTS Academic and One Skill Retake are not accepted.",
         "A perfect score on the wrong test is worth zero points."),
        ("Per-ability CLB claims match the TRF",
         "Each ability's claimed CLB matches the equivalency chart exactly "
         "against your actual report form.",
         "Check the per-ability minimums - your weakest ability sets your "
         "program eligibility."),
        ("Report is verifiable",
         "TRF/report number legible; the copy uploaded is the complete "
         "official document, not a screenshot.",
         "Officers verify scores directly with the test provider."),
        ("Spouse language evidence",
         "If claiming spouse language points, their test meets the same "
         "validity and format rules.",
         "Spouse points claimed without a valid test on file is a common "
         "silent eligibility error."),
    ]),
    ("C. Education and ECA", [
        ("Designated organization",
         "ECA from WES, ICAS, CES, IQAS, or ICES - or the designated "
         "professional body for architects, doctors, pharmacists.",
         "Any other assessor's report is not accepted for Express Entry."),
        ("Five-year ECA validity",
         "ECA under 5 years old at profile AND at submission.",
         "An expired ECA invalidates the education points it supported."),
        ("Claimed level equals assessed level",
         "The credential level in your profile matches the ECA outcome - "
         "not the certificate's own title.",
         "If the ECA assessed your Master's as Bachelor's-equivalent, the "
         "profile must say Bachelor's. Recalculate CRS accordingly."),
        ("Transcripts and certificates enclosed",
         "Degree certificate + transcripts uploaded where the checklist "
         "requires them, translations included.",
         "The ECA report alone is not always sufficient - follow your "
         "personalized checklist."),
        ("Canadian credentials evidenced",
         "Canadian study claimed for points has the credential + proof it "
         "met the in-Canada study conditions.",
         f"Canadian post-secondary credentials add "
         f"{RULES['sectionD']['canadianEducation']['credential1to2Years']}"
         f"-{RULES['sectionD']['canadianEducation']['credential3YearsOrLonger']}"
         " Section D points - officers check the basis."),
    ]),
    ("D. Work history", [
        ("The 11-element reference letter",
         "Every letter: letterhead, date, full name, titles, dates per role, "
         "5+ duties, hours/week, salary + currency, signatory details, "
         "stamp/seal, signature.",
         "Reissue any letter missing even one element - this is the single "
         "most common refusal trigger."),
        ("Duties mirror the NOC",
         "Duties in each letter substantively match the NOC lead statement "
         "and main duties for the code claimed.",
         "Copy-pasting the NOC text verbatim looks fabricated; mirror the "
         "substance in the employer's own language."),
        ("TEER level supported",
         "Nothing in any letter reads like a lower-TEER role than claimed.",
         "One stray 'data entry and filing' line can sink a TEER 1 claim."),
        ("Dates reconcile everywhere",
         "Start/end dates identical across letters, payslips, appointment "
         "and relieving letters, tax records, and the form.",
         "Build a one-page timeline first; fix discrepancies at source or "
         "explain them in an LOE."),
        ("Gaps declared",
         "Every period since the personal-history start date is accounted "
         "for - employment, study, unemployment, travel.",
         "Blank months invite procedural fairness letters. Declare, date, "
         "and where needed explain."),
        ("Self-employment fully evidenced",
         "Self-employed periods have registration, client contracts, "
         "invoices, and income proof - not just a self-declaration.",
         "Thin self-employment evidence is treated as unverifiable and "
         "scores zero."),
        ("Current job letter is current",
         "The letter for ongoing employment is recently issued and states "
         "'to present'.",
         "A letter older than ~6 months at submission invites an updated "
         "request - pre-empt it."),
    ]),
    ("E. Police certificates", [
        ("Coverage map complete",
         "Certificate for every country of 6+ consecutive months in the "
         "last 10 years, for you and each family member 18+.",
         "Draw the residence map first; a missed country is an automatic "
         "incompleteness problem."),
        ("Scope of each certificate",
         "Each certificate covers the full relevant period and any names "
         "used during it.",
         "Order under every name variant the issuing authority indexes."),
        ("In-time strategy",
         "Any certificate that cannot arrive by day 60 has dated proof of "
         "request + LOE ready.",
         "IRCC accepts proof-of-request at submission; silence it does not."),
        ("Validity at submission",
         "Certificates are recent enough per the country-specific rules in "
         "your personalized checklist.",
         "Some countries' certificates age out quickly - sequence your "
         "orders so none expires before you file."),
    ]),
    ("F. Medical", [
        ("Panel physician only",
         "Exam done by an IRCC-designated panel physician - a family doctor's "
         "checkup does not count.",
         "Book via the canada.ca panel physician finder; one appointment "
         "only, close to your application date."),
        ("Proof uploaded",
         "Information printout sheet or IMM 1017B uploaded in the medical "
         "slot.",
         "The clinic transmits results electronically, but your proof "
         "document must still be in the file."),
        ("Whole family examined",
         "Every family member has an exam - including dependants not "
         "coming to Canada.",
         "A missing non-accompanying dependant's exam stalls the whole "
         "application."),
    ]),
    ("G. Funds", [
        ("Live threshold check",
         "Balance clears the CURRENT canada.ca amount for your family size "
         "- checked this week, not last year.",
         "Amounts update annually from LICO figures; keep a buffer of "
         "several thousand dollars above the line."),
        ("Family size arithmetic",
         "Family size counts your spouse and all dependent children - even "
         "if not accompanying.",
         "The most common threshold miscalculation."),
        ("Six-month stability",
         "Statements show a stable 6-month history; every large credit has "
         "a documented source.",
         "Sudden spikes without a paper trail are a leading refusal cause - "
         "see the source-of-funds LOE."),
        ("Bank letter contents",
         "Official letterhead letter: accounts, opening dates, current and "
         "6-month average balance, and outstanding debts.",
         "A plain statement printout is not a bank letter."),
        ("Acceptable funds only",
         "Liquid, unencumbered, in your (or partner's) name. No property "
         "equity, no borrowed money, no locked accounts.",
         "Gifted funds need a notarized non-repayable gift deed + donor "
         "evidence."),
        ("Exemption letter if exempt",
         "CEC applicants and valid-job-offer holders upload a letter "
         "explaining the exemption in the POF slot.",
         "The system asks everyone for a POF document - the letter is how "
         "exempt applicants answer it."),
    ]),
    ("H. Final form and submission", [
        ("Every checklist slot filled",
         "Each slot in the personalized checklist has the right document - "
         "nothing skipped, nothing misfiled.",
         "A wrong-slot upload is functionally a missing document."),
        ("Translation compliance",
         "Non-English/French documents: certified translation (or "
         "translator's affidavit) + original/certified copy, stamps "
         "translated too.",
         "Untranslated seals are a surprisingly common completeness flag."),
        ("Representative and consent forms",
         "IMM 5476 if anyone assists you for a fee or represents you; "
         "IMM 5475 if authorising information release.",
         "Undeclared paid representation is itself a misrepresentation "
         "risk."),
        ("The cold-read",
         "Someone (ideally not you) reads the entire file start to finish "
         "as an officer would, flagging anything that raises a question.",
         "Every flag gets fixed or gets an LOE - before submission, not "
         "after a fairness letter."),
        ("Beat the clock deliberately",
         "Submission planned with buffer days before the 60-day deadline; "
         "fees ready; account access confirmed.",
         "Day-59 submissions have no room for a rejected upload or a "
         "payment failure."),
    ]),
]


def build_audit_guide() -> None:
    d = Doc(
        PREMIUM_DIR / "ee-pre-submission-audit-guide.pdf",
        "EE Pre-Submission Audit Guide",
    )
    d.title(
        "Express Entry Pre-Submission Audit Guide",
        "A 40-point audit of your complete e-APR, organised the way a "
        "reviewing officer reads your file. Work through every point; each "
        "one states what to check and how to fix what you find.",
    )
    d.p(
        "Most refusals are not eligibility failures - they are documentation "
        "failures on files that would otherwise have been approved. This "
        "audit is designed to be run twice: once when your documents are "
        "assembled, and once in the final week before submission."
    )
    d.callout(
        "Auditing is adversarial reading. For every document, ask the "
        "officer's question: <i>can I verify this, and does it contradict "
        "anything else in the file?</i> Anything you cannot answer cleanly "
        "needs fixing at source or a Letter of Explanation.",
        heading="How to run the audit",
    )
    n = 0
    for section, items in AUDIT_SECTIONS:
        d.h2(section)
        for check, what, fix in items:
            n += 1
            d.h3(f"{n}. {check}")
            d.p(f"<b>Check:</b> {what}")
            d.p(f"<b>Why / fix:</b> {fix}")
    d.page_break()
    d.h2("Scoring your audit")
    d.table(
        ["Result", "Reading", "Action"],
        [
            ["40 / 40 clean", "File is submission-ready.",
             "Submit with your planned buffer."],
            ["1-3 flags", "Typical first audit.",
             "Fix at source where possible; LOE where not; re-run."],
            ["4+ flags", "Do not submit yet.",
             "The pattern itself signals rushed assembly - rebuild the weak "
             "sections, then re-run the full audit."],
        ],
        widths=[30 * mm, 52 * mm, None],
    )
    d.sources([
        f"{EE_BASE}/apply-permanent-residence.html",
        f"{EE_BASE}/documents/language-test.html",
        f"{EE_BASE}/documents/education-assessment.html",
        f"{EE_BASE}/documents/police-certificates.html",
        f"{EE_BASE}/documents/proof-funds.html",
        f"{EE_BASE}/after-apply.html",
    ])
    d.disclaimer()
    d.build()


# ═════════════════════════════════════════════════════════════════════════════
# PREMIUM 3 - CRS Gap Analysis & Score-Boost Action Plan
# ═════════════════════════════════════════════════════════════════════════════
def build_gap_analysis() -> None:
    d = Doc(
        PREMIUM_DIR / "crs-gap-analysis-action-plan.pdf",
        "CRS Gap Analysis & Action Plan",
    )
    fr = D["frenchLanguageBonus"]
    ced = D["canadianEducation"]
    d.title(
        "CRS Gap Analysis & Score-Boost Action Plan",
        "A 20-point diagnostic that finds exactly where CRS points are being "
        "left on the table - then a ranked plan of the levers that move your "
        "score, with the real point values for each.",
    )
    d.p(
        "Every point value in this document is taken from the official CRS "
        "criteria grid on canada.ca (verified July 2026). Where a draw cutoff "
        "matters, check the live rounds-of-invitations page - cutoffs move "
        "with every draw and are deliberately not printed here."
    )

    d.h2("Part 1 - The 20-point diagnostic")
    d.p(
        "Answer each question honestly against your current profile. Every "
        "'no' is a numbered gap; Part 2 gives the fix and its point value."
    )
    diagnostics = [
        ("Language - your largest controllable block",
         ["Have you reached CLB 9 in ALL four abilities of your first "
          "official language?",
          "If below CLB 9: have you actually attempted a retest since your "
          "scores plateaued?",
          "Have you tested in your second official language at all (CLB/NCLC "
          "5 or better)?",
          "If you have any French: have you pushed it to NCLC 7 in all four "
          "abilities?"]),
        ("Work experience",
         ["Are you within 12 months of your next full year of Canadian work "
          "experience?",
          "Is every year of foreign experience you actually hold declared "
          "and documentable?",
          "Does your foreign + Canadian experience combination reach a "
          "transferability tier boundary (1yr / 2-3yr)?"]),
        ("Education",
         ["Is your HIGHEST credential the one assessed and claimed (including "
          "a second credential that could reach 'two or more credentials')?",
          "Would a 1-2 year Canadian credential be feasible for you?",
          "If you studied in Canada already: are those Section D bonus "
          "points reflected in your profile?"]),
        ("Provincial and additional points",
         ["Have you assessed every PNP stream you plausibly qualify for in "
          "the last 90 days (streams change without notice)?",
          "Do you (or your spouse) have a sibling in Canada who is a citizen "
          "or PR?",
          "Are you monitoring category-based draws for your occupation and "
          "language profile?"]),
        ("Spouse or partner (if applicable)",
         ["Has your spouse taken a language test at all?",
          "Is your spouse's education ECA-assessed and claimed?",
          "Is your spouse's Canadian work experience (if any) claimed?",
          "Have you modelled whether the with-spouse or without-spouse "
          "configuration scores higher for your household?"]),
        ("Profile hygiene",
         ["Does your profile reflect your CURRENT age band before your next "
          "birthday reduces it?",
          "Are your language results and ECA far enough from expiry to "
          "survive processing?",
          "Is your NOC code the one your reference letters actually "
          "support?"]),
    ]
    qn = 0
    for head, qs in diagnostics:
        d.h3(head)
        numbered = []
        for q in qs:
            qn += 1
            numbered.append(f"<b>{qn}.</b> {q}")
        d.bullets(numbered)

    d.page_break()
    d.h2("Part 2 - The levers, ranked by real point value")

    d.h3(f"Lever 1 - Provincial nomination: +{D['provincialNomination']} points")
    d.p(
        "A nomination from an Express-Entry-linked provincial stream "
        f"effectively guarantees an ITA ({D['provincialNomination']} points "
        "puts any eligible profile above any historical cutoff). Streams "
        "open, close, and change criteria without notice - re-check every "
        "province's official page quarterly, and run a PNP strategy in "
        "parallel with pool time, never instead of it."
    )

    gain_per = FL_SINGLE[9] - FL_SINGLE[8]
    d.h3(f"Lever 2 - CLB 8 to CLB 9 first language: +{4*gain_per} core points, "
         "plus transferability")
    d.p(
        f"Each ability moving from CLB 8 to CLB 9 gains +{gain_per} core "
        f"points (single applicant). All four abilities at CLB 9 adds "
        f"+{4*gain_per} - and simultaneously upgrades both language-based "
        "skill-transferability combinations from their 25-point tier to "
        "their 50-point tier. For most candidates stuck below a cutoff, "
        "this single retest is the highest-ROI action available:"
    )
    d.table(
        ["Combination", "CLB 7-8 tier", "CLB 9+ tier"],
        [
            ["Post-secondary degree + language",
             str(C["eduLanguage"]["bachelorsPlus"]["clb7"]),
             str(C["eduLanguage"]["bachelorsPlus"]["clb9"])],
            ["3+ yrs foreign experience + language",
             str(C["foreignExpLanguage"]["fwe3plus"]["clb7"]),
             str(C["foreignExpLanguage"]["fwe3plus"]["clb9"])],
        ],
        widths=[None, 34 * mm, 34 * mm],
    )
    d.note(
        f"Section C is capped at {C['maxTotal']} points total - compute your "
        "combined tier gain against the cap, not by simple addition."
    )

    d.h3(
        f"Lever 3 - French: +{fr['nclc7PlusEnglishClb5OrHigher']} bonus points "
        "(and category draws)"
    )
    d.p(
        f"NCLC 7+ in all four French abilities adds "
        f"+{fr['nclc7PlusEnglishClb5OrHigher']} points when your English is "
        f"CLB 5+ (or +{fr['nclc7PlusEnglishClb4OrLower']} otherwise), plus up "
        f"to +{4*SL[9]} second-language points (CLB 9+: {SL[9]}/ability). "
        "French speakers also qualify for French-language category draws, "
        "which historically invite at lower cutoffs than general draws - "
        "verify current draw activity on the rounds-of-invitations page."
    )

    d.h3("Lever 4 - The next year of Canadian work experience")
    cwe = {r["minYears"]: r["points"] for r in RULES["sectionA"]["canadianExpSingle"]}
    d.table(
        ["Years (single applicant)", "Core points", "Gain vs previous year"],
        [[str(y), str(cwe[y]), f"+{cwe[y] - cwe.get(y-1, 0)}" if y > 1 else "-"]
         for y in (1, 2, 3, 4, 5)],
        widths=[None, 30 * mm, 42 * mm],
    )
    d.p(
        "Canadian experience also feeds the experience-based transferability "
        "combinations (each with a 1-year and a 2-plus-year tier). If you are "
        "employed in Canada, the 1-to-2-year boundary is usually worth "
        f"+{cwe[2]-cwe[1]} core points plus a transferability tier jump."
    )

    d.h3(
        f"Lever 5 - Canadian education: +{ced['credential1to2Years']} or "
        f"+{ced['credential3YearsOrLonger']} bonus points"
    )
    d.p(
        f"A 1-2 year Canadian post-secondary credential adds "
        f"+{ced['credential1to2Years']} Section D points; 3+ years adds "
        f"+{ced['credential3YearsOrLonger']} - on top of any core education "
        "points the credential itself earns, and on top of unlocking the "
        "education transferability combinations. A significant but "
        "slow-burn lever: cost it against your age decay first (Lever 8)."
    )

    d.h3("Lever 6 - The spouse block: up to 40 points, or a configuration switch")
    d.p(
        f"Spouse education adds up to {RULES['sectionB']['spouseEducation']['masters']} "
        f"points, spouse language up to {4*SP_LANG[9]} ({SP_LANG[9]}/ability at "
        f"CLB 9+), spouse Canadian experience up to "
        f"{RULES['sectionB']['spouseCwe'][0]['points']}. A spouse language test "
        "is usually the cheapest of these. Also model the reverse: if your "
        "spouse's profile is stronger, THEY apply as principal - and always "
        "check whether the without-spouse column (available when a spouse is "
        "non-accompanying) scores your household higher."
    )

    d.h3(f"Lever 7 - Sibling in Canada: +{D['sibling']} points")
    d.p(
        "A full or adoptive sibling in Canada who is a citizen or PR adds "
        f"+{D['sibling']} points (either spouse's sibling counts). Frequently "
        "forgotten - and free."
    )

    d.h3("Lever 8 - Age: the lever working against you")
    d.p(
        "Age points decay every year after the peak band and reach zero in "
        "the mid-40s. You cannot gain here - but every slow lever (a Canadian "
        "credential, waiting for a lower cutoff) must be costed against the "
        "points your next birthdays will remove. This is why the fast levers "
        "- retest, French, PNP breadth - come first in this ranking."
    )

    d.page_break()
    d.h2("Part 3 - Your 90-day action plan")
    d.table(
        ["Window", "Action", "Success measure"],
        [
            ["Days 1-7",
             "Run the 20-point diagnostic; list every 'no' with its lever "
             "number.",
             "Written gap list with point value per gap."],
            ["Days 1-14",
             "Book the highest-ROI language retest (Lever 2) if below CLB 9; "
             "start French assessment if Lever 3 is plausible.",
             "Test dates booked."],
            ["Days 1-30",
             "PNP sweep: check every province's official stream page against "
             "your profile; diarise a 90-day re-check.",
             "Stream shortlist with entry requirements."],
            ["Days 15-45",
             "Close the free gaps: sibling points, spouse test booking, "
             "missing credential assessment, NOC correction.",
             "Profile updated; every claimed point documentable."],
            ["Days 30-90",
             "Execute retests; update the profile the day new results "
             "arrive; re-model your score after each change.",
             "New CRS score vs recent cutoffs on the live rounds page."],
        ],
        widths=[22 * mm, None, 52 * mm],
    )
    d.callout(
        "Waiting is a strategy only when a specific lever is in flight. "
        "'Waiting for a lower cutoff' while your age points decay is not a "
        "plan - it is a slow leak. Decide which levers you are pulling, date "
        "them, and re-run this diagnostic every 90 days.",
        heading="The operating principle",
    )
    d.sources([
        f"{EE_BASE}/check-score/crs-criteria.html",
        f"{EE_BASE}/rounds-invitations.html",
        f"{EE_BASE}/documents/language-test.html",
    ])
    d.disclaimer()
    d.build()


# ── Free batch 2 (2026-07-19): one document per remaining resource type ──────

OPS_MANUAL_BASE = (
    "canada.ca/en/immigration-refugees-citizenship/corporate/"
    "publications-manuals/operational-bulletins-manuals/permanent-residence/"
    "express-entry"
)


def build_eca_guide() -> None:
    d = Doc(FREE_DIR / "eca-application-guide.pdf", "ECA Application Guide")
    d.title(
        "The ECA Application Guide",
        "How to get your foreign education assessed for Express Entry - which "
        "organization to use, what the report does for your file, and the "
        "mistakes that cost applicants months.",
    )
    d.callout(
        "Your ECA must be <b>less than 5 years old</b> both when you complete "
        "your Express Entry profile and when you apply. IRCC's own wording: "
        "applying with an expired ECA means <b>your application will be "
        "refused</b>. If it will expire before you can apply, contact the "
        "issuing organization - some report types can be re-issued.",
        heading="The 5-year rule",
    )

    d.h2("Who needs an ECA")
    d.bullets([
        "<b>Federal Skilled Worker applicants</b> with foreign education - "
        "mandatory. Without it you cannot meet the FSWP education requirement.",
        "<b>Anyone claiming CRS points for education completed outside "
        "Canada</b> - CEC and FSTP have no education requirement, but without "
        "an ECA your foreign credential earns zero education points.",
        "<b>Not needed</b> for education completed in Canada at a Canadian "
        "high school or post-secondary institution.",
    ])

    d.h2("Step 1 - Choose your designated organization")
    d.p(
        "Most applicants may use any one of the five designated organizations. "
        "Processing times and costs vary by organization - compare before you "
        "commit, because the report is tied to the organization that issued it."
    )
    d.table(
        ["Designated organization", "Commonly known as"],
        [
            ["Comparative Education Service - University of Toronto "
             "School of Continuing Studies", "CES"],
            ["International Credential Assessment Service of Canada", "ICAS"],
            ["World Education Services", "WES"],
            ["International Qualifications Assessment Service (Alberta)", "IQAS"],
            ["International Credential Evaluation Service - British "
             "Columbia Institute of Technology", "ICES"],
        ],
    )
    d.note(
        "Ask for the report type for immigration purposes ('ECA for IRCC'). A "
        "standard academic evaluation from the same organization is not valid "
        "for Express Entry."
    )

    d.h3("Regulated professions use their professional body instead")
    d.bullets([
        "<b>Architects (NOC 21200)</b> - Canadian Architectural Certification "
        "Board (CACB), designated 20 May 2024. An ECA issued for this "
        "occupation by another designated organization before 31 October 2024 "
        "is still accepted while it remains valid.",
        "<b>Doctors</b> - Medical Council of Canada, if your primary "
        "occupation is a physician NOC.",
        "<b>Pharmacists</b> - Pharmacy Examining Board of Canada, if you need "
        "a licence to practise. Pharmacists who do not need a licence for "
        "their intended work may use a designated organization instead.",
    ])

    d.h2("Step 2 - Submit your documents")
    d.p(
        "Once you choose the organization, they tell you exactly how to submit "
        "your documents - requirements differ by organization and by country "
        "of study. Most require transcripts sent directly from your "
        "institution, which is usually the slowest step. Start the "
        "institution's transcript process the same week you open the ECA file."
    )

    d.h2("Step 3 - Use the report correctly in your profile")
    d.checklist([
        "Enter the ECA report number and result exactly as issued - the "
        "assessed Canadian equivalency, not your original credential name.",
        "Assess your <b>highest</b> credential at minimum. If you hold two or "
        "more credentials, ask the organization to assess both - 'two or more "
        "credentials' is its own CRS education level and can be worth more "
        "than the higher credential alone.",
        "Check the expiry math against your realistic timeline in the pool - "
        "a report issued 4.5 years ago is a liability, not an asset.",
        "Keep the name on the report identical to your passport name; a "
        "mismatch triggers requests for explanation.",
    ])

    d.sources([
        f"{EE_BASE}/documents/education-assessment.html",
        f"{EE_BASE}/who-can-apply/federal-skilled-workers.html",
    ])
    d.disclaimer()
    d.build()


def build_reference_letter_sample() -> None:
    d = Doc(
        FREE_DIR / "employment-reference-letter-sample.pdf",
        "Employment Reference Letter - Sample",
    )
    d.title(
        "Employment Reference Letter: The IRCC-Compliant Sample Format",
        "Exactly what an Express Entry reference letter must contain, why "
        "each element is mandatory, and a complete sample you can hand to "
        "your employer.",
    )
    d.callout(
        "A reference letter is <b>mandatory for every work experience you "
        "declare</b>. An application missing one - or containing one that "
        "omits a required element - can be rejected as incomplete or refused "
        "on eligibility. This is the single most common documentation failure "
        "in Express Entry files.",
        heading="Why this letter decides your file",
    )

    d.h2("The mandatory elements (IRCC completeness standard)")
    d.p(
        "Per IRCC's completeness-check instructions, the letter should be an "
        "official document printed on <b>company letterhead</b> and must "
        "include:"
    )
    d.checklist([
        "Your <b>name</b> as it appears in the application.",
        "The company's <b>contact information</b>: address, telephone number, "
        "and email address.",
        "The <b>name, title, and signature</b> of your immediate supervisor "
        "or a personnel officer.",
        "<b>All positions held</b> while employed at the company, and for "
        "each: <b>job title</b>, <b>duties and responsibilities</b>, <b>job "
        "status</b> (if it is your current job), <b>dates worked</b>, "
        "<b>number of work hours per week</b>, and <b>annual salary plus "
        "benefits</b>.",
    ])
    d.note(
        "Duties are what the officer maps to your NOC code - write them as "
        "they were actually performed, in language that corresponds to the "
        "NOC's main duties. A grand job title with vague duties earns nothing."
    )

    d.h2("Sample letter")
    d.template_block(
        "[COMPANY LETTERHEAD]\n"
        "\n"
        "Date: 4 March 2026\n"
        "\n"
        "To: Immigration, Refugees and Citizenship Canada\n"
        "\n"
        "RE: Employment reference - Ms Anjali Sharma\n"
        "\n"
        "This letter confirms that Ms Anjali Sharma has been employed by "
        "Meridian Analytics Pvt Ltd since 15 June 2021 and remains a "
        "full-time employee in good standing.\n"
        "\n"
        "Position 1 - Data Analyst (15 June 2021 to 31 May 2023)\n"
        "Full-time, 40 hours per week. Annual salary INR 9,20,000 plus "
        "health insurance and provident fund contributions.\n"
        "Duties: collected and cleaned operational datasets; built and "
        "maintained dashboards; prepared statistical summaries for "
        "management; documented data-quality procedures.\n"
        "\n"
        "Position 2 - Senior Data Analyst (1 June 2023 to present, current "
        "position)\n"
        "Full-time, 40 hours per week. Annual salary INR 14,50,000 plus "
        "health insurance, provident fund, and annual performance bonus.\n"
        "Duties: designs analytical models to support business decisions; "
        "leads a team of two junior analysts; presents findings to senior "
        "management; liaises with engineering on data pipeline requirements.\n"
        "\n"
        "Please contact the undersigned for any verification.\n"
        "\n"
        "Sincerely,\n"
        "\n"
        "(signature)\n"
        "Rahul Menon\n"
        "Head of Human Resources\n"
        "Meridian Analytics Pvt Ltd\n"
        "Plot 14, Financial District, Hyderabad 500032, India\n"
        "+91 40 0000 0000 - hr@meridiananalytics.example"
    )
    d.note(
        "The names and company above are fictional - replace every detail "
        "with your own. Keep the structure: one block per position, with "
        "status, dates, hours, salary and benefits, then duties."
    )

    d.h2("If you are self-employed")
    d.p(
        "A reference letter from yourself is not acceptable - IRCC states "
        "that self-declared main duties or affidavits are not acceptable "
        "proof of self-employed work experience. Provide instead:"
    )
    d.bullets([
        "Articles of incorporation or other evidence of business ownership.",
        "Evidence of self-employment income.",
        "Documentation from third-party clients describing the service "
        "provided, along with payment details.",
    ])

    d.h2("If the experience is in Canada")
    d.p(
        "Supporting proof may include copies of T4 tax information slips and "
        "CRA notices of assessment covering the same calendar years as the "
        "claimed experience."
    )

    d.sources([
        f"{OPS_MANUAL_BASE}/applications-received-on-after-january-1-2016-"
        "completeness-check.html",
    ])
    d.disclaimer()
    d.build()


def build_employer_request_letter() -> None:
    d = Doc(
        FREE_DIR / "employer-request-letter-template.pdf",
        "Reference Letter Request - Template",
    )
    d.title(
        "Asking Your Employer: The Reference Letter Request Template",
        "A ready-to-send letter that asks HR for an Express Entry reference "
        "letter - and gets a compliant one back the first time.",
    )
    d.p(
        "Most non-compliant reference letters are not the employer's fault - "
        "they were never told what IRCC requires. HR departments issue "
        "standard service certificates that omit duties, hours, and salary, "
        "and each corrected round trip costs weeks. This template puts the "
        "full IRCC specification in the request itself."
    )
    d.callout(
        "Send the request in writing, attach the specification below, and "
        "offer a pre-written draft your employer can put on letterhead. "
        "Employers sign accurate drafts far faster than they write letters "
        "from scratch.",
        heading="The tactic that saves a month",
    )

    d.h2("The request letter")
    d.template_block(
        "Subject: Request for employment reference letter - "
        "[your full name], [employee ID]\n"
        "\n"
        "Dear [HR manager / supervisor name],\n"
        "\n"
        "I am preparing an application for Canadian permanent residence "
        "under Express Entry, and Immigration, Refugees and Citizenship "
        "Canada (IRCC) requires a reference letter from my employer in a "
        "specific format. I would be grateful if you could issue a letter "
        "meeting the requirements below.\n"
        "\n"
        "The letter should be printed on company letterhead, and must "
        "include:\n"
        "  1. My full name as per company records;\n"
        "  2. The company's address, telephone number, and email address;\n"
        "  3. The name, title, and signature of my immediate supervisor or "
        "a personnel officer;\n"
        "  4. All positions I have held at the company, and for each: job "
        "title, duties and responsibilities, job status (for my current "
        "role), dates worked, number of work hours per week, and annual "
        "salary plus benefits.\n"
        "\n"
        "To make this as easy as possible, I have attached a draft "
        "containing the factual details, which you are welcome to verify, "
        "amend, and place on letterhead.\n"
        "\n"
        "This letter is for immigration documentation only and creates no "
        "obligation for the company. I would appreciate receiving it by "
        "[date], as my application is time-bound.\n"
        "\n"
        "Thank you for your help.\n"
        "\n"
        "Sincerely,\n"
        "[Your name]\n"
        "[Department / employee ID]\n"
        "[Phone - email]"
    )

    d.h2("If the company refuses or no longer exists")
    d.bullets([
        "Ask your direct supervisor (current or former) to sign the letter "
        "in a personal capacity, stating their role, and pair it with "
        "supporting evidence: employment contract, pay slips, promotion "
        "letters, tax records.",
        "If no letter is obtainable at all, assemble the alternative "
        "evidence and explain the situation in a Letter of Explanation - "
        "an officer can accept a documented, credible account of why the "
        "standard letter is unavailable.",
        "Never submit a letter you drafted and signed yourself as if it "
        "came from the company - that is misrepresentation territory.",
    ])

    d.sources([
        f"{OPS_MANUAL_BASE}/applications-received-on-after-january-1-2016-"
        "completeness-check.html",
    ])
    d.disclaimer()
    d.build()


def build_program_comparison() -> None:
    d = Doc(
        FREE_DIR / "fswp-cec-fstp-comparison.pdf",
        "FSWP vs CEC vs FSTP - Comparison",
    )
    d.title(
        "FSWP vs CEC vs FSTP: The Eligibility Comparison Table",
        "The three Express Entry programs side by side - work experience, "
        "language minimums, education, funds, and the requirement that "
        "usually decides which door you enter through.",
    )
    d.p(
        "All three programs feed the same Express Entry pool and use the same "
        "CRS score once you are in. Eligibility is what differs - and it is "
        "assessed per program, so strengthening one requirement (language, "
        "for instance) can open a second program and with it a second set of "
        "draw types."
    )

    d.h2("The comparison")
    d.table(
        ["Requirement", "Federal Skilled Worker",
         "Canadian Experience Class", "Federal Skilled Trades"],
        [
            ["Skilled work experience",
             "1 year continuous (1,560 h) in the last 10 years",
             "1 year (1,560 h) in the last 3 years",
             "2 years (3,120 h) in the last 5 years"],
            ["Where the experience counts",
             "Canada or abroad",
             "Canada only",
             "Canada or abroad"],
            ["Occupation type",
             "TEER 0, 1, 2 or 3 (one NOC, continuous)",
             "TEER 0, 1, 2 or 3",
             "Skilled trade: NOC Major Group 72 (excl. 726), 73, 82, 83, "
             "92 or 93 (excl. 932)"],
            ["Language minimum",
             "CLB/NCLC 7 in all four abilities",
             "CLB/NCLC 7 (TEER 0/1 job) or CLB/NCLC 5 (TEER 2/3 job)",
             "CLB/NCLC 5 speaking + listening; CLB/NCLC 4 reading + writing"],
            ["Education",
             "Secondary minimum; foreign credential needs an ECA",
             "No education requirement",
             "No education requirement"],
            ["Job offer / certificate",
             "Not required",
             "Not required",
             "1-year full-time job offer OR provincial/territorial/federal "
             "certificate of qualification in the trade"],
            ["Proof of funds",
             "Required, unless legally working in Canada with a valid "
             "job offer",
             "Not required",
             "Required, unless legally working in Canada with a valid "
             "job offer"],
            ["Extra gate",
             "67/100 on the six selection factors",
             "None",
             "None"],
        ],
        widths=[34 * mm, None, None, None],
    )
    d.note(
        "Part-time counts everywhere at the same total-hours arithmetic: "
        "e.g. 15 hours/week for 24 months equals 1 year full-time "
        "(1,560 hours). Volunteer work and unpaid internships never count - "
        "experience must have been paid in wages or commission."
    )

    d.h2("How to read this strategically")
    d.bullets([
        "<b>One year in Canada changes everything</b> - CEC removes the "
        "education requirement, the proof-of-funds requirement, and the "
        "67-point grid in one move, and CEC-only draws are a recurring "
        "draw type.",
        "<b>FSWP is the only door that opens from abroad without a job "
        "offer</b> - but it is also the only program with the 67-point "
        "selection grid; check it before investing in anything else.",
        "<b>FSTP's language bar is the lowest</b> (CLB 5/4) - but it trades "
        "that for the hardest practical gate: a 1-year job offer or a "
        "Canadian certificate of qualification. If the province where you "
        "plan to live does not certify your trade, a job offer is the only "
        "route.",
        "<b>Eligible for more than one program?</b> You enter the same pool "
        "with the same CRS either way - what changes is which "
        "program-specific draws can reach you.",
    ])

    d.sources([
        f"{EE_BASE}/who-can-apply/federal-skilled-workers.html",
        f"{EE_BASE}/who-can-apply/canadian-experience-class.html",
        f"{EE_BASE}/who-can-apply/federal-skilled-trades.html",
        f"{EE_BASE}/documents/language-test.html",
    ])
    d.disclaimer()
    d.build()


if __name__ == "__main__":
    print("Generating Visa Forte resource PDFs...")
    build_ee_checklist()
    build_cheatsheet()
    build_roadmap()
    build_eca_guide()
    build_reference_letter_sample()
    build_employer_request_letter()
    build_program_comparison()
    build_loe_pack()
    build_audit_guide()
    build_gap_analysis()
    print("Done.")
