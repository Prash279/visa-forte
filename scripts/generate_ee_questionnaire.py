#!/usr/bin/env python3
"""
Visa Forte — Canada Express Entry Assessment Questionnaire
Fillable PDF Generator v1.0 | April 2026
Output: Visa_Forte_Express_Entry_Assessment_Questionnaire.pdf

Sections:
  Cover | 1. Personal Info | 2. Spouse/Partner | 3. Contact & Residency
  4. Language (Principal) | 5. Language (Spouse) | 6. Education
  7. Canadian Work Experience | 8. Foreign Work Experience
  9. Job Offer & PNP | 10. Canadian Connections | 11. Inadmissibility
  12. Dependent Children | 13. Declaration & Consent
"""

import os
import re as _re
import pikepdf
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from datetime import date


# ── JavaScript strings injected via pikepdf after PDF is generated ─────────────
# Date fields are now inline Day/Month/Year dropdowns — no JS date picker needed.
# Only marital status + spouse conditional logic remains.

# Helper shared by marital and spouse scripts: toggle all Section 2 sp_ fields.
_JS_TOGGLE_SECTION2 = r"""
function vfToggleSection2(disable) {
    var n = this.numFields;
    for (var i = 0; i < n; i++) {
        var fn = this.getNthFieldName(i);
        if (fn.indexOf("sp_") === 0) {
            var f = this.getField(fn);
            if (f) {
                f.display  = disable ? display.hidden : display.visible;
                if (disable) {
                    try { f.value = (f.type === "radiobutton" || f.type === "checkbox") ? "Off" : ""; } catch(e) {}
                }
            }
        }
    }
}
"""

# Helper: toggle all Section 11 child fields.
# Targets: child1_*, child2_*, child3_*, pa_children_yn, pa_num_children.
_JS_TOGGLE_SECTION11 = r"""
function vfToggleSection11(disable) {
    var n = this.numFields;
    for (var i = 0; i < n; i++) {
        var fn = this.getNthFieldName(i);
        if (fn.indexOf("child") === 0 || fn === "pa_children_yn" || fn === "pa_num_children") {
            var f = this.getField(fn);
            if (f) {
                f.display = disable ? display.hidden : display.visible;
                if (disable) {
                    try { f.value = (f.type === "radiobutton" || f.type === "checkbox") ? "Off" : ""; } catch(e) {}
                }
            }
        }
    }
}
"""

# Fires when pa_marital_status value is committed.
# Single → hide spouse radio AND all Section 2 fields AND Section 11 child fields.
# Any other status → show spouse radio and Section 2.
# Section 11 (children) is only disabled for Single (never married).
_JS_MARITAL_VALIDATE = _JS_TOGGLE_SECTION2 + _JS_TOGGLE_SECTION11 + r"""
var noSpouse = (event.value === "Single (never married)" ||
                event.value === "Widowed" ||
                event.value === "Divorced" ||
                event.value === "Separated" ||
                event.value === "Annulled Marriage");
var f = this.getField("pa_spouse_accompanying");
if (f) {
    f.display = noSpouse ? display.hidden : display.visible;
    if (noSpouse) { try { f.value = "Off"; } catch(e) {} }
}
vfToggleSection2.call(this, noSpouse);
var noChildren = (event.value === "Single (never married)");
vfToggleSection11.call(this, noChildren);
"""

# Fires when pa_spouse_accompanying (Yes/No radio) value is committed.
# If "No" → disable all sp_ fields. If "Yes" → enable them.
_JS_SPOUSE_RADIO_VALIDATE = _JS_TOGGLE_SECTION2 + r"""
var noSpouse = (event.value === "No");
vfToggleSection2.call(this, noSpouse);
"""

# Runs at document open — restores correct visibility state.
_JS_DOC_OPEN = _JS_TOGGLE_SECTION2 + _JS_TOGGLE_SECTION11 + r"""
var ms = this.getField("pa_marital_status");
var noSpouse = false;
if (ms) {
    noSpouse = (ms.value === "Single (never married)" ||
                ms.value === "Widowed" ||
                ms.value === "Divorced" ||
                ms.value === "Separated" ||
                ms.value === "Annulled Marriage");
    var fRadio = this.getField("pa_spouse_accompanying");
    if (fRadio) {
        fRadio.display = noSpouse ? display.hidden : display.visible;
    }
    vfToggleSection11.call(this, ms.value === "Single (never married)");
}
if (!noSpouse) {
    var fAcc = this.getField("pa_spouse_accompanying");
    if (fAcc && fAcc.value === "No") noSpouse = true;
}
vfToggleSection2.call(this, noSpouse);
"""


def _inject_js(pdf_path: str) -> None:
    """Post-process the ReportLab PDF using pikepdf to embed JavaScript
    directly in field AA (Additional Actions) dictionaries and the document
    OpenAction.  Works in Adobe Acrobat Reader (free)."""

    def js_action(js_code: str) -> pikepdf.Dictionary:
        return pikepdf.Dictionary(
            S=pikepdf.Name('/JavaScript'),
            JS=pikepdf.String(js_code),
        )

    with pikepdf.open(pdf_path, allow_overwriting_input=True) as pdf:

        # ── 1. OpenAction: restore state on document open ─────────────────────
        pdf.Root.OpenAction = pdf.make_indirect(js_action(_JS_DOC_OPEN))

        # ── 2. Patch target field widgets ─────────────────────────────────────
        for page in pdf.pages:
            if '/Annots' not in page:
                continue
            for annot in page.Annots:
                if '/Subtype' not in annot or str(annot.Subtype) != '/Widget':
                    continue
                if '/T' not in annot:
                    continue
                fname = str(annot.T)

                if fname == 'pa_marital_status':
                    annot.AA = pikepdf.Dictionary(
                        V=js_action(_JS_MARITAL_VALIDATE),
                    )
                elif fname == 'pa_spouse_accompanying':
                    annot.AA = pikepdf.Dictionary(
                        V=js_action(_JS_SPOUSE_RADIO_VALIDATE),
                    )
                elif fname == 'cover_consultant':
                    annot.Q = pikepdf.Integer(1)  # center-align the pre-filled consultant text

        # Force PDF reader to regenerate field appearances (picks up Q=1 centering)
        if '/AcroForm' in pdf.Root:
            pdf.Root.AcroForm['/NeedAppearances'] = pikepdf.Boolean(True)

        pdf.save()

# ── Brand Palette ──────────────────────────────────────────────────────────────
PRUSSIAN = HexColor('#0C2340')
SAFFRON  = HexColor('#C97B1E')
PEARL    = HexColor('#F8F4EE')
TEAL     = HexColor('#1A5C72')
INK      = HexColor('#1A2B3C')
SAND     = HexColor('#E2DBD1')
AMBER    = HexColor('#EDD9B0')
WHITE    = HexColor('#FFFFFF')
DARK_PRUSSIAN = HexColor('#091929')

# ── Layout Constants ───────────────────────────────────────────────────────────
PW, PH   = A4           # 595.28 x 841.89 pt
ML       = 20 * mm      # margin left
MR       = PW - 20 * mm # margin right
CW       = MR - ML      # content width
FH       = 17           # standard field height (points)
HEADER_H = 21 * mm      # header bar height
FOOTER_H = 18 * mm      # footer reserved area
Y_START  = PH - HEADER_H - 7 * mm   # y after header + padding
Y_END    = FOOTER_H + 5 * mm        # minimum y before footer
TODAY    = date.today().strftime("%B %Y")
SEL      = "-- Select --"   # placeholder for dropdown default (avoids reportlab empty-string bug)


def opts(lst: list) -> list:
    """Replace leading empty string with SEL placeholder for reportlab choice fields."""
    if lst and lst[0] == "":
        return [SEL] + lst[1:]
    return lst


# ── Reference Data ─────────────────────────────────────────────────────────────
COUNTRIES = [""] + sorted([
    "Afghanistan","Albania","Algeria","Argentina","Armenia","Australia","Austria",
    "Azerbaijan","Bangladesh","Belarus","Belgium","Bolivia","Bosnia-Herzegovina",
    "Botswana","Brazil","Brunei","Bulgaria","Cambodia","Cameroon","Canada",
    "Chile","China","Colombia","Costa Rica","Croatia","Cuba","Cyprus",
    "Czech Republic","DR Congo","Denmark","Dominican Republic","Ecuador","Egypt",
    "El Salvador","Ethiopia","Finland","France","Germany","Ghana","Greece",
    "Guatemala","Haiti","Honduras","Hungary","Iceland","India","Indonesia",
    "Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan",
    "Kazakhstan","Kenya","Kuwait","Laos","Latvia","Lebanon","Libya","Lithuania",
    "Malaysia","Maldives","Mexico","Moldova","Mongolia","Morocco","Mozambique",
    "Myanmar","Nepal","Netherlands","New Zealand","Nicaragua","Nigeria","Norway",
    "Oman","Pakistan","Palestine","Panama","Paraguay","Peru","Philippines",
    "Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia",
    "Senegal","Serbia","Singapore","Slovakia","Somalia","South Africa",
    "South Korea","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria",
    "Taiwan","Tanzania","Thailand","Trinidad & Tobago","Tunisia","Turkey",
    "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
    "Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
])

PROVINCES = [
    "","Alberta","British Columbia","Manitoba","New Brunswick",
    "Newfoundland and Labrador","Northwest Territories","Nova Scotia",
    "Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon",
]

EDUCATION_LEVELS = [
    "",
    "Less than secondary / high school",
    "Secondary diploma (high school graduation)",
    "1-year post-secondary certificate or diploma",
    "2-year post-secondary certificate or diploma",
    "Post-secondary certificate or diploma (3+ years)",
    "Bachelor's degree (3+ years)",
    "Two or more degrees (one must be 3+ years)",
    "Master's degree or professional degree",
    "Doctoral degree (PhD)",
]

MARITAL_STATUS = [
    "","Single (never married)","Married","Common-law partner",
    "Widowed","Divorced","Separated","Annulled Marriage",
]

LANG_TESTS_ENG = ["","IELTS Academic","IELTS General Training","CELPIP-General"]
LANG_TESTS_FR  = ["","TEF Canada","TCF Canada"]

ECA_ORGS = [
    "","World Education Services (WES)","IQAS (Alberta)",
    "ICAS — University of Toronto","ICES (British Columbia)",
    "CES — University of Toronto","NNAS (Nursing)","MCC (Medicine)",
    "PEBC (Pharmacy)","Engineers Canada","OIQ (Quebec Engineering)",
]

TEER_CATS = [
    "","TEER 0 — Senior management","TEER 1 — University degree required",
    "TEER 2 — College diploma / apprenticeship (2+ years)",
    "TEER 3 — College diploma / apprenticeship (< 2 years)",
    "TEER 4 — High school diploma / some on-job training",
    "TEER 5 — No formal education required",
]

VISA_STATUS  = ["","Citizen","Permanent Resident","Work Permit","Study Permit","Visitor","Refugee","Other"]
YES_NO       = ["","Yes","No"]
YES_NO_NA    = ["","Yes","No","Not Applicable"]
GENDER_OPTS  = ["","Male","Female","Non-binary / Other","Prefer not to say"]
NUM_CHILDREN = ["","0","1","2","3","4","5+"]
EMP_TYPE     = ["","Full-time","Part-time"]
HOURS_OPTS   = ["","30 or more hrs/week","Less than 30 hrs/week"]
CLB_SCORES   = [""] + [str(i) for i in range(3, 13)]
YEARS        = [""] + [str(y) for y in range(2026, 1989, -1)]

# ── Date picker dropdown data ──────────────────────────────────────────────────
# Replaces amber text date fields with three inline dropdowns (Day / Month / Year).
# Works in every PDF viewer — no JavaScript required.
DATE_DAYS   = [""] + [f"{d:02d}" for d in range(1, 32)]
DATE_MONTHS = [
    "", "01 — January", "02 — February", "03 — March",
    "04 — April", "05 — May", "06 — June",
    "07 — July", "08 — August", "09 — September",
    "10 — October", "11 — November", "12 — December",
]
DATE_YEARS_PAST  = [""] + [str(y) for y in range(2026, 1929, -1)]  # DOB / historical
DATE_YEARS_RANGE = [""] + [str(y) for y in range(2035, 1979, -1)]  # employment / expiry


class EEQuestionnaire:
    """Build a multi-page fillable PDF Express Entry questionnaire."""

    def __init__(self, output_path: str) -> None:
        self.c = canvas.Canvas(output_path, pagesize=A4)
        self.c.setTitle("Canada Express Entry — Assessment Questionnaire | Visa Forte")
        self.c.setAuthor("Visa Forte — Prashant Thirthingoth")
        self.c.setSubject("Express Entry Eligibility Assessment Questionnaire")
        self.c.setCreator("Visa Forte PDF Generator v1.0")
        self.form     = self.c.acroForm
        self.y        = Y_START
        self.page_num = 0
        self._cur_section_title = ""
        self._cur_section_num   = 0
        self._compact = True    # consistent compact spacing throughout all sections

    # ──────────────────────────────────────────────────────────────────────────
    # PAGE CHROME
    # ──────────────────────────────────────────────────────────────────────────

    def _draw_header(self, section_title: str, section_num: int) -> None:
        c = self.c
        # Prussian bar
        c.setFillColor(PRUSSIAN)
        c.rect(0, PH - HEADER_H, PW, HEADER_H, fill=1, stroke=0)
        # Saffron bottom accent on header
        c.setFillColor(SAFFRON)
        c.rect(0, PH - HEADER_H, PW, 2, fill=1, stroke=0)
        # Wordmark
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(ML, PH - 9 * mm, "VISA FORTE")
        c.setFillColor(SAFFRON)
        c.setFont("Helvetica", 7)
        c.drawString(ML, PH - 14 * mm, "Engineered for Passage.")
        # Right: document and section label
        c.setFillColor(WHITE)
        c.setFont("Helvetica", 7.5)
        c.drawRightString(MR, PH - 9 * mm, "Canada Express Entry — Assessment Questionnaire")
        c.setFont("Helvetica-Bold", 7.5)
        if section_num > 0:
            c.drawRightString(MR, PH - 14 * mm, f"Section {section_num}: {section_title}")

    def _draw_footer(self) -> None:
        c = self.c
        c.setStrokeColor(SAND)
        c.setLineWidth(0.5)
        c.line(ML, 14 * mm, MR, 14 * mm)
        # Single line: left = branding, right = doc title + page
        c.setFillColor(TEAL)
        c.setFont("Helvetica", 7)
        c.drawString(ML, 9 * mm,
            "\u00a9 Visa Forte  \u00b7  visaforte.com  \u00b7  prashant@visaforte.com")
        c.setFillColor(INK)
        c.setFont("Helvetica", 7)
        c.drawRightString(MR, 9 * mm,
            f"Express Entry Assessment Questionnaire  \u00b7  For client reference only  \u00b7  Page {self.page_num}")

    def _new_page(self, section_title: str = "", section_num: int = 0) -> None:
        if self.page_num > 0:
            self._draw_footer()
            self.c.showPage()
        self.page_num += 1
        title = section_title or self._cur_section_title
        num   = section_num   or self._cur_section_num
        self._cur_section_title = title
        self._cur_section_num   = num
        self._draw_header(title, num)
        self.y = Y_START

    def _check_space(self, needed: float) -> None:
        """Start new page if not enough vertical space remains."""
        if self.y - needed < Y_END:
            self._new_page()

    # ──────────────────────────────────────────────────────────────────────────
    # DRAWING PRIMITIVES
    # ──────────────────────────────────────────────────────────────────────────

    def _sec_header(self, text: str) -> None:
        self._check_space((26 if self._compact else 38) * mm)  # header(14mm) + at least one field row
        c = self.c
        self.y -= 3 * mm
        c.setFillColor(PRUSSIAN)
        c.rect(ML, self.y - 6.5 * mm, CW, 8 * mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(ML + 3 * mm, self.y - 3.5 * mm, text.upper())
        self.y -= 11 * mm

    def _sub_header(self, text: str) -> None:
        self._check_space(34 * mm)  # sub-header(11mm) + at least one field row(23mm)
        c = self.c
        self.y -= 2 * mm
        c.setFillColor(AMBER)
        c.rect(ML, self.y - 5 * mm, CW, 7 * mm, fill=1, stroke=0)
        c.setFillColor(SAFFRON)
        c.rect(ML, self.y - 5 * mm, 2.5, 7 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(ML + 4 * mm, self.y - 1.5 * mm, text)
        self.y -= 9 * mm

    def _note(self, text: str) -> None:
        c = self.c
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(ML, self.y, f"\u2139  {text}")
        self.y -= 6 * mm

    def _instruction_box(self, text: str) -> None:
        c   = self.c
        lines = self._wrap(text, CW - 10 * mm, "Helvetica-Oblique", 8.5)
        bh  = len(lines) * 5.5 * mm + 6 * mm
        self._check_space(bh + 4 * mm)
        c.setFillColor(AMBER)
        c.rect(ML, self.y - bh, CW, bh, fill=1, stroke=0)
        c.setFillColor(SAFFRON)
        c.rect(ML, self.y - bh, 3, bh, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Oblique", 8.5)
        for i, line in enumerate(lines):
            c.drawString(ML + 5 * mm, self.y - 4.5 * mm - i * 5.5 * mm, line)
        self.y -= bh + 4 * mm

    def _divider(self) -> None:
        c = self.c
        c.setStrokeColor(SAND)
        c.setLineWidth(0.3)
        c.line(ML, self.y, MR, self.y)
        self.y -= 3 * mm

    def _gap(self, size: float = 3 * mm) -> None:
        self.y -= size

    def _wrap(self, text: str, max_w: float, font: str, size: float) -> list:
        words, lines, cur = text.split(), [], ""
        for w in words:
            test = f"{cur} {w}".strip()
            if self.c.stringWidth(test, font, size) <= max_w:
                cur = test
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines

    def _label_wrapped(self, text: str, x: float, y: float, required: bool = False,
                       max_w: float = None) -> float:
        """Draw a label that word-wraps if too long. Returns total height used (points)."""
        c   = self.c
        mw  = max_w if max_w is not None else (MR - x)
        lines = self._wrap(text, mw, "Helvetica", 9)
        line_h = 11   # ~9pt font + leading
        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        for i, ln in enumerate(lines):
            c.drawString(x, y - i * line_h, ln)
        # Only append * if the label doesn't already end with one (avoid double asterisk)
        if required and not text.rstrip().endswith("*"):
            last_ln = lines[-1]
            last_y  = y - (len(lines) - 1) * line_h
            c.setFillColor(HexColor('#B03A2E'))
            c.drawString(x + c.stringWidth(last_ln, "Helvetica", 9) + 1, last_y, " *")
            c.setFillColor(INK)
        return len(lines) * line_h

    def _label(self, text: str, x: float, y: float, required: bool = False) -> None:
        c = self.c
        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        c.drawString(x, y, text)
        # Only append * if the label doesn't already end with one (avoid double asterisk)
        if required and not text.rstrip().endswith("*"):
            c.setFillColor(HexColor('#B03A2E'))
            c.drawString(x + c.stringWidth(text, "Helvetica", 9) + 1, y, " *")
            c.setFillColor(INK)

    # ── Field helpers (all take absolute x, and use self.y for vertical flow) ──

    def _tf(self, name: str, x: float, w: float, multiline: bool = False,
            bg: HexColor = None, border: HexColor = None, value: str = "") -> None:
        """Draw a text field at position x, width w, at current self.y baseline."""
        fh = FH if not multiline else 40
        self.form.textfield(
            name=name, tooltip=name.replace("_", " ").title(),
            x=x, y=self.y - fh,
            width=w, height=fh,
            borderColor=border or SAND,
            fillColor=bg or WHITE,
            textColor=HexColor('#111111'),   # near-black so typed text is always visible
            borderWidth=0.5,
            fontSize=9,
            fontName="Helvetica",
            value=value,
        )
        return fh

    def _date_dropdowns(self, name: str, x: float, year_list: list = None) -> None:
        """Draw three inline dropdowns: Day (18mm) | Month (38mm) | Year (22mm).
        Total width ≈ 85mm.  Fits both full-width and half-column contexts.
        year_list defaults to DATE_YEARS_RANGE; pass DATE_YEARS_PAST for DOB fields."""
        if year_list is None:
            year_list = DATE_YEARS_RANGE
        c = self.c
        # Column widths
        dw = 18 * mm   # Day
        mw = 38 * mm   # Month
        yw = 22 * mm   # Year
        gap = 2 * mm

        def _small_dd(fname: str, fx: float, fw: float, options: list) -> None:
            safe = opts(options)
            self.form.choice(
                name=fname, tooltip=fname,
                x=fx, y=self.y - FH,
                width=fw, height=FH,
                options=safe, value=safe[0],
                borderColor=SAFFRON,
                fillColor=AMBER,
                textColor=HexColor('#111111'),
                borderWidth=0.7,
                fontSize=8,
                fontName="Helvetica",
            )

        _small_dd(f"{name}_d", x,                       dw, DATE_DAYS)
        _small_dd(f"{name}_m", x + dw + gap,             mw, DATE_MONTHS)
        _small_dd(f"{name}_y", x + dw + gap + mw + gap, yw, year_list)

        # Draw small sub-labels below the dropdowns
        c.setFont("Helvetica", 7)
        c.setFillColor(INK)
        c.drawString(x + 2,                          self.y - FH - 4 * mm, "Day")
        c.drawString(x + dw + gap + 2,               self.y - FH - 4 * mm, "Month")
        c.drawString(x + dw + gap + mw + gap + 2,    self.y - FH - 4 * mm, "Year")

    def _dd(self, name: str, x: float, w: float, options: list) -> None:
        """Draw a dropdown (choice) field."""
        safe_opts = opts(options)
        self.form.choice(
            name=name, tooltip=name.replace("_", " ").title(),
            x=x, y=self.y - FH,
            width=w, height=FH,
            options=safe_opts,
            value=safe_opts[0],   # always non-empty string — avoids reportlab lbextras bug
            borderColor=SAND,
            fillColor=WHITE,
            textColor=HexColor('#111111'),   # near-black so selected text is always visible
            borderWidth=0.5,
            fontSize=9,
            fontName="Helvetica",
        )

    def _cb(self, name: str, x: float, label: str) -> None:
        """Draw a single checkbox with an inline label that wraps if needed."""
        c = self.c
        self.form.checkbox(
            name=name, tooltip=label,
            x=x, y=self.y - 10,
            size=10,
            borderColor=SAND,
            fillColor=WHITE,
            textColor=HexColor('#111111'),
            borderWidth=0.5,
        )
        # Wrap label text so it never overflows the content width
        max_lbl_w = MR - x - 16
        lines = self._wrap(label, max_lbl_w, "Helvetica", 9)
        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        for j, ln in enumerate(lines):
            c.drawString(x + 16, self.y - 8 - j * 11, ln)

    # ──────────────────────────────────────────────────────────────────────────
    # ROW BUILDERS  (each advances self.y)
    # ──────────────────────────────────────────────────────────────────────────

    def _row_text(self, name: str, label: str, required: bool = False,
                  x: float = None, w: float = None) -> None:
        x = x if x is not None else ML
        w = w if w is not None else CW
        self._check_space(20 * mm)
        self._label(label, x, self.y, required)
        self.y -= 5 * mm
        self._tf(name, x, w)
        self.y -= FH + (4 if self._compact else 7) * mm

    def _row_date(self, name: str, label: str, required: bool = False,
                  x: float = None, w: float = None,
                  year_list: list = None) -> None:
        x = x if x is not None else ML
        self._check_space(26 * mm)
        self._label(label, x, self.y, required)
        self.y -= 5 * mm
        self._date_dropdowns(name, x, year_list=year_list)
        self.y -= FH + (8 if self._compact else 11) * mm   # extra mm for sub-labels below dropdowns

    def _row_dd(self, name: str, label: str, options: list, required: bool = False,
                x: float = None, w: float = None) -> None:
        x = x if x is not None else ML
        w = w if w is not None else CW
        self._check_space(20 * mm)
        self._label(label, x, self.y, required)
        self.y -= 5 * mm
        self._dd(name, x, w, options)
        self.y -= FH + (4 if self._compact else 7) * mm

    def _row_textarea(self, name: str, label: str, required: bool = False,
                      height: int = 40) -> None:
        h = height
        self._check_space(28 * mm)
        self._label(label, ML, self.y, required)
        self.y -= 5 * mm
        self.form.textfield(
            name=name, tooltip=label,
            x=ML, y=self.y - h,
            width=CW, height=h,
            borderColor=SAND, fillColor=WHITE, textColor=HexColor('#111111'),
            borderWidth=0.5, fontSize=9, fontName="Helvetica",
            fieldFlags='multiline', maxlen=0,
        )
        self.y -= h + (4 if self._compact else 8) * mm

    def _row_2col_text(self, n1: str, l1: str, n2: str, l2: str,
                        r1: bool = False, r2: bool = False) -> None:
        hw = (CW - 5 * mm) / 2
        self._check_space(20 * mm)
        self._label(l1, ML, self.y, r1)
        self._label(l2, ML + hw + 5 * mm, self.y, r2)
        self.y -= 5 * mm
        self._tf(n1, ML, hw)
        self._tf(n2, ML + hw + 5 * mm, hw)
        self.y -= FH + (4 if self._compact else 7) * mm

    def _row_2col_dd(self, n1: str, l1: str, o1: list,
                      n2: str, l2: str, o2: list,
                      r1: bool = False, r2: bool = False) -> None:
        hw = (CW - 5 * mm) / 2
        self._check_space(20 * mm)
        self._label(l1, ML, self.y, r1)
        self._label(l2, ML + hw + 5 * mm, self.y, r2)
        self.y -= 5 * mm
        self._dd(n1, ML, hw, o1)
        self._dd(n2, ML + hw + 5 * mm, hw, o2)
        self.y -= FH + (4 if self._compact else 7) * mm

    def _row_text_dd(self, n1: str, l1: str, n2: str, l2: str, o2: list,
                      r1: bool = False, r2: bool = False,
                      w1_ratio: float = 0.5) -> None:
        w1 = CW * w1_ratio - 2.5 * mm
        w2 = CW * (1 - w1_ratio) - 2.5 * mm
        self._check_space(20 * mm)
        self._label(l1, ML, self.y, r1)
        self._label(l2, ML + w1 + 5 * mm, self.y, r2)
        self.y -= 5 * mm
        self._tf(n1, ML, w1)
        self._dd(n2, ML + w1 + 5 * mm, w2, o2)
        self.y -= FH + (4 if self._compact else 7) * mm

    def _row_dd_text(self, n1: str, l1: str, o1: list, n2: str, l2: str,
                      r1: bool = False, r2: bool = False,
                      w1_ratio: float = 0.5) -> None:
        w1 = CW * w1_ratio - 2.5 * mm
        w2 = CW * (1 - w1_ratio) - 2.5 * mm
        self._check_space(20 * mm)
        self._label(l1, ML, self.y, r1)
        self._label(l2, ML + w1 + 5 * mm, self.y, r2)
        self.y -= 5 * mm
        self._dd(n1, ML, w1, o1)
        self._tf(n2, ML + w1 + 5 * mm, w2)
        self.y -= FH + (4 if self._compact else 7) * mm

    def _row_3col_text(self, fields: list) -> None:
        """fields = [(name, label, required), ...]"""
        third = (CW - 10 * mm) / 3
        self._check_space(20 * mm)
        for i, (n, l, r) in enumerate(fields):
            self._label(l, ML + i * (third + 5 * mm), self.y, r)
        self.y -= 5 * mm
        for i, (n, l, r) in enumerate(fields):
            self._tf(n, ML + i * (third + 5 * mm), third)
        self.y -= FH + (4 if self._compact else 7) * mm

    def _row_date_dd(self, n1: str, l1: str, n2: str, l2: str, o2: list,
                      r1: bool = False, r2: bool = False,
                      year_list: list = None) -> None:
        hw = (CW - 5 * mm) / 2
        self._check_space(26 * mm)
        self._label(l1, ML, self.y, r1)
        self._label(l2, ML + hw + 5 * mm, self.y, r2)
        self.y -= 5 * mm
        self._date_dropdowns(n1, ML, year_list=year_list)
        self._dd(n2, ML + hw + 5 * mm, hw, o2)
        self.y -= FH + (8 if self._compact else 11) * mm

    def _row_2col_date(self, n1: str, l1: str, n2: str, l2: str,
                        r1: bool = False, r2: bool = False,
                        year_list: list = None) -> None:
        hw = (CW - 5 * mm) / 2
        self._check_space(26 * mm)
        self._label(l1, ML, self.y, r1)
        self._label(l2, ML + hw + 5 * mm, self.y, r2)
        self.y -= 5 * mm
        self._date_dropdowns(n1, ML, year_list=year_list)
        self._date_dropdowns(n2, ML + hw + 5 * mm, year_list=year_list)
        self.y -= FH + (8 if self._compact else 11) * mm

    def _row_score_group(self, prefix: str, header_label: str) -> None:
        """4-column score row: Listening | Reading | Writing | Speaking."""
        skills = ["Listening", "Reading", "Writing", "Speaking"]
        fw = (CW - 3 * 4 * mm) / 4
        self._check_space(20 * mm)
        c = self.c
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(ML, self.y, header_label)
        self.y -= 5 * mm
        for i, sk in enumerate(skills):
            xi = ML + i * (fw + 4 * mm)
            self._label(sk, xi, self.y)
        self.y -= 5 * mm
        for i, sk in enumerate(skills):
            xi = ML + i * (fw + 4 * mm)
            self._tf(f"{prefix}_{sk.lower()}", xi, fw)
        self.y -= FH + (4 if self._compact else 7) * mm

    def _row_clb_group(self, prefix: str) -> None:
        """4-column CLB score dropdowns."""
        skills = ["Listening", "Reading", "Writing", "Speaking"]
        fw = (CW - 3 * 4 * mm) / 4
        self._check_space(20 * mm)
        for i, sk in enumerate(skills):
            xi = ML + i * (fw + 4 * mm)
            self._label(f"CLB — {sk}", xi, self.y)
        self.y -= 5 * mm
        for i, sk in enumerate(skills):
            xi = ML + i * (fw + 4 * mm)
            self._dd(f"{prefix}_clb_{sk.lower()}", xi, fw, CLB_SCORES)
        self.y -= FH + (4 if self._compact else 7) * mm

    def _row_yn_radio(self, name: str, label: str, required: bool = False) -> None:
        """Yes / No radio row with auto-wrapping label."""
        c = self.c
        self._check_space((24 if self._compact else 30) * mm)
        lbl_h = self._label_wrapped(label, ML, self.y, required, max_w=CW)
        self.y -= lbl_h + 4 * mm   # gap between wrapped label and radio buttons
        for i, opt in enumerate(["Yes", "No"]):
            xi = ML + i * 45 * mm
            self.form.radio(
                name=name, tooltip=opt, value=opt,
                x=xi, y=self.y - 10,
                size=10,
                borderColor=SAND, fillColor=WHITE, textColor=HexColor('#111111'), borderWidth=0.5,
            )
            c.setFillColor(INK)
            c.setFont("Helvetica", 9)
            c.drawString(xi + 14, self.y - 8, opt)
        self.y -= (8 if self._compact else 14) * mm

    def _row_radio(self, name: str, label: str, options: list,
                   required: bool = False) -> None:
        """Multi-option radio row with auto-wrapping label."""
        c = self.c
        self._check_space((28 if self._compact else 35) * mm)
        lbl_h = self._label_wrapped(label, ML, self.y, required, max_w=CW)
        self.y -= lbl_h + 4 * mm   # gap between wrapped label and radio options
        per_row = 3
        opt_w   = CW / per_row
        for i, opt in enumerate(options):
            row_i = i // per_row
            col_i = i %  per_row
            xi = ML + col_i * opt_w
            yi = self.y - row_i * 10 * mm
            self.form.radio(
                name=name, tooltip=opt, value=opt,
                x=xi, y=yi - 10,
                size=10,
                borderColor=SAND, fillColor=WHITE, textColor=HexColor('#111111'), borderWidth=0.5,
            )
            c.setFillColor(INK)
            c.setFont("Helvetica", 9)
            c.drawString(xi + 14, yi - 8, opt)
        rows_used = (len(options) - 1) // per_row + 1
        self.y -= (rows_used * 10 + (4 if self._compact else 8)) * mm

    def _row_checkboxes(self, label: str, items: list, group: str) -> None:
        """One checkbox per row — long labels fit without overflow."""
        c = self.c
        row_h = 11 * mm   # height per checkbox row
        self._check_space((len(items) + 2) * row_h)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(ML, self.y, label)
        self.y -= 7 * mm
        for val, lbl in items:
            self._cb(f"{group}_{val}", ML, lbl)
            self.y -= row_h
        self.y -= 3 * mm

    def _work_block(self, prefix: str, title: str) -> None:
        """A reusable work experience block (title, TEER, employer, dates, etc.)."""
        self._sub_header(title)
        self._row_2col_text(f"{prefix}_job_title", "Job Title / Occupation",
                             f"{prefix}_noc_code", "NOC Code (if known)", r1=True)
        self._row_dd(f"{prefix}_teer", "TEER Category", TEER_CATS, required=True)
        self._row_text(f"{prefix}_employer", "Employer / Company Name", required=True)
        self._row_2col_date(f"{prefix}_from", "Employment Start Date",
                             f"{prefix}_to",   "Employment End Date (or 'Present')", r1=True)
        self._row_2col_dd(
            f"{prefix}_emp_type", "Employment Type", EMP_TYPE,
            f"{prefix}_hours",    "Hours per Week",  HOURS_OPTS,
            r1=True,
        )

    def _foreign_work_block(self, prefix: str, title: str) -> None:
        """A reusable FOREIGN work experience block."""
        self._sub_header(title)
        self._row_2col_text(f"{prefix}_job_title", "Job Title / Occupation",
                             f"{prefix}_noc_code", "NOC Code (if known)", r1=True)
        self._row_dd(f"{prefix}_teer", "TEER Category", TEER_CATS, required=True)
        self._row_text_dd(f"{prefix}_employer", "Employer Name",
                           f"{prefix}_country",  "Country of Employment", COUNTRIES,
                           r1=True, r2=True)
        self._row_2col_date(f"{prefix}_from", "Employment Start Date",
                             f"{prefix}_to",   "Employment End Date", r1=True)
        self._row_2col_dd(
            f"{prefix}_emp_type", "Employment Type", EMP_TYPE,
            f"{prefix}_hours",    "Hours per Week",  HOURS_OPTS,
            r1=True,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # COVER PAGE
    # ──────────────────────────────────────────────────────────────────────────

    def _build_cover(self) -> None:
        c = self.c
        self.page_num = 0   # stay 0 so _new_page() for section 1 won't draw a ghost footer

        # Full Prussian background
        c.setFillColor(PRUSSIAN)
        c.rect(0, 0, PW, PH, fill=1, stroke=0)

        # Top saffron stripe
        c.setFillColor(SAFFRON)
        c.rect(0, PH - 6 * mm, PW, 6 * mm, fill=1, stroke=0)

        # Bottom saffron stripe
        c.setFillColor(SAFFRON)
        c.rect(0, 0, PW, 4 * mm, fill=1, stroke=0)

        # Left vertical accent — pushed to ML - 8mm so the box at ML has clear visual breathing room
        c.setFillColor(SAFFRON)
        c.rect(ML - 8 * mm, 0, 2.5, PH, fill=1, stroke=0)

        # VISA FORTE wordmark — 7mm from ML gives clear gap from the vertical saffron accent
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 30)
        c.drawString(ML + 7 * mm, PH - 58 * mm, "VISA FORTE")
        c.setFillColor(SAFFRON)
        c.setFont("Helvetica", 11)
        c.drawString(ML + 7 * mm, PH - 68 * mm, "Engineered for Passage.")

        # Saffron rule under tagline
        c.setStrokeColor(SAFFRON)
        c.setLineWidth(1)
        c.line(ML + 7 * mm, PH - 73 * mm, MR, PH - 73 * mm)

        # Document title
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 22)
        c.drawString(ML + 7 * mm, PH - 96 * mm, "Canada Express Entry")
        c.setFont("Helvetica-Bold", 19)
        c.drawString(ML + 7 * mm, PH - 110 * mm, "Assessment Questionnaire")
        c.setFillColor(SAND)
        c.setFont("Helvetica", 9.5)
        c.drawString(ML + 7 * mm, PH - 122 * mm,
            "Federal Skilled Worker  ·  Canadian Experience Class  ·  Federal Skilled Trades")

        # ── Client info box ───────────────────────────────────────────────────
        # Layout: label on its own line ABOVE its field — clear, readable alignment
        # 3 rows: (1) Client Full Name, (2) Assessment Date | Reference No., (3) Consultant
        ROW_H  = 18 * mm   # per row: label(4mm) + gap(2mm) + field(6mm) + gap(6mm)
        bx     = ML
        bh     = 11 * mm + 3 * ROW_H   # header(11mm) + 3 rows × 18mm = 65mm
        by     = PH - 195 * mm         # box bottom: fixed position (130mm from top)

        c.setFillColor(HexColor('#0E2D52'))
        c.rect(bx, by, CW, bh, fill=1, stroke=0)
        c.setStrokeColor(SAFFRON)
        c.setLineWidth(1.2)
        c.rect(bx, by, CW, bh, fill=0, stroke=1)

        c.setFillColor(SAFFRON)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(bx + 8 * mm, by + bh - 9 * mm, "CLIENT INFORMATION")

        # Helper for one cover field (label on its own line above the input field)
        def cover_field(fname, lbl, fx, fy, fw, default=""):
            c.setFillColor(SAND)
            c.setFont("Helvetica", 9)
            c.drawString(fx, fy, lbl)
            self.form.textfield(
                name=fname,
                x=fx, y=fy - 3 * mm - 17,
                width=fw, height=17,
                borderColor=SAFFRON,
                fillColor=WHITE,
                textColor=HexColor('#111111'),
                borderWidth=0.5,
                fontSize=9,
                fontName="Helvetica",
                value=default,
            )

        pad   = 8 * mm                # generous left/right pad inside box
        fw    = CW - 2 * pad          # full-width field width
        hw    = (CW - 3 * pad) / 2    # half-width field width
        row1y = by + bh - 13 * mm     # first row label baseline (13mm below header text)
        row2y = row1y - ROW_H
        row3y = row2y - ROW_H

        # Row 1: Client Full Name (full width)
        cover_field("cover_client_name", "Client Full Name", bx + pad, row1y, fw)

        # Row 2: Assessment Date (left)  |  Reference No. (right)
        cover_field("cover_date", "Assessment Date",  bx + pad,            row2y, hw)
        cover_field("cover_ref",  "Reference No.",    bx + 2*pad + hw,     row2y, hw)

        # Row 3: Consultant (full width, pre-filled)
        cover_field(
            "cover_consultant", "Consultant",
            bx + pad, row3y, fw,
            default="Prashant Thirthingoth  ·  Senior Documentation Consultant  ·  Visa Forte",
        )

        # ── How to complete box ───────────────────────────────────────────────
        hbx = ML
        hbh = 48 * mm
        hby = PH - 248 * mm           # fixed: 200mm from top, 6mm below client info box

        c.setFillColor(HexColor('#0E2D52'))
        c.rect(hbx, hby, CW, hbh, fill=1, stroke=0)
        c.setFillColor(SAFFRON)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(hbx + 5 * mm, hby + hbh - 8 * mm, "HOW TO COMPLETE THIS QUESTIONNAIRE")
        c.setFillColor(WHITE)
        c.setFont("Helvetica", 8.5)
        instructions = [
            "1.  All fields marked with * are required for eligibility assessment.",
            "2.  Use the dropdown menus where provided — do not type into dropdown fields.",
            "3.  Enter all dates in DD/MM/YYYY format (e.g. 15/03/1990).",
            "4.  Save this PDF using Adobe Acrobat Reader after completing all sections.",
            "5.  Email the completed file to prashant@visaforte.com — your consultant will respond within 2 business days.",
        ]
        for i, line in enumerate(instructions):
            c.drawString(hbx + 5 * mm, hby + hbh - 19 * mm - i * 6.5 * mm, line)

        # ── Disclaimer ─────────────────────────────────────────────────────────
        disc = (
            "This questionnaire collects information for documentation education and eligibility guidance purposes only. "
            "Submission does not create a consultant-client relationship or constitute regulated immigration advice. "
            "All information remains confidential and is used solely for your assessment."
        )
        disc_lines = self._wrap(disc, CW, "Helvetica", 7)
        disc_start = hby - 5 * mm      # 5mm below the instructions box
        c.setFillColor(SAND)
        c.setFont("Helvetica", 7)
        for i, ln in enumerate(disc_lines):
            c.drawString(ML, disc_start - i * 4 * mm, ln)

        # Cover footer — single line, no page number, no date
        c.setStrokeColor(HexColor('#1A3A5C'))
        c.setLineWidth(0.5)
        c.line(ML, 14 * mm, MR, 14 * mm)
        c.setFillColor(TEAL)
        c.setFont("Helvetica", 7)
        c.drawString(ML, 9 * mm,
            "\u00a9 Visa Forte  \u00b7  visaforte.com  \u00b7  prashant@visaforte.com")
        c.setFillColor(SAND)
        c.setFont("Helvetica", 7)
        c.drawRightString(MR, 9 * mm, "Express Entry Assessment Questionnaire  \u00b7  For client reference only")

        c.showPage()

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1 — Personal Information (Principal Applicant)
    # ──────────────────────────────────────────────────────────────────────────

    def _section1(self) -> None:
        self._new_page("Personal Information", 1)
        self._instruction_box(
            "Complete all fields exactly as they appear on your valid passport. "
            "Fields marked * are required. If a field does not apply, leave it blank."
        )

        self._sec_header("1.1  Principal Applicant — Full Legal Name")
        self._row_3col_text([
            ("pa_first_name",  "First / Given Name *",  True),
            ("pa_middle_name", "Middle Name(s)",         False),
            ("pa_last_name",   "Family Name / Surname *", True),
        ])

        self._sec_header("1.2  Date of Birth, Gender & Nationality")
        # Date of Birth (left half) | Gender (right half) — side by side
        self._row_date_dd("pa_dob", "Date of Birth", "pa_gender", "Gender", GENDER_OPTS, r1=True, r2=True, year_list=DATE_YEARS_PAST)

        self._row_2col_dd(
            "pa_country_birth",   "Country of Birth *",                COUNTRIES,
            "pa_citizenship_1",   "Primary Country of Citizenship *",  COUNTRIES,
            r1=True, r2=True,
        )
        self._row_dd(
            "pa_citizenship_2",
            "Second Country of Citizenship (if applicable — leave blank if none)",
            COUNTRIES,
        )

        self._sec_header("1.3  Marital Status")
        self._row_dd("pa_marital_status", "Current Marital Status *", MARITAL_STATUS, required=True)
        self._row_yn_radio(
            "pa_spouse_accompanying",
            "Do you have a spouse or common-law partner who will accompany you to Canada? *",
            required=True,
        )
        self._note(
            "If Yes — complete Section 2. If No — skip Section 2 and proceed to Section 3."
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2 — Spouse / Partner Information
    # ──────────────────────────────────────────────────────────────────────────

    def _section2(self) -> None:
        self._new_page("Spouse / Partner Information", 2)
        self._instruction_box(
            "Complete this section only if your spouse or common-law partner will be included "
            "in your Express Entry profile. Skip to Section 3 if not applicable."
        )

        self._sec_header("2.1  Spouse / Partner — Identity")
        self._row_3col_text([
            ("sp_first_name",  "First / Given Name *",   True),
            ("sp_middle_name", "Middle Name(s)",          False),
            ("sp_last_name",   "Family Name / Surname *", True),
        ])
        self._row_date(
            "sp_dob", "Date of Birth *", required=True, year_list=DATE_YEARS_PAST,
        )
        self._row_2col_dd(
            "sp_gender",       "Gender *",       GENDER_OPTS,
            "sp_citizenship",  "Country of Citizenship *", COUNTRIES,
            r1=True, r2=True,
        )

        self._sec_header("2.2  Spouse / Partner — Language")
        self._row_yn_radio(
            "sp_lang_test_done",
            "Has your spouse / partner taken an official Canadian language test?",
        )
        self._row_radio(
            "sp_lang_test_type",
            "Language Test Type (if completed)",
            ["IELTS Academic", "IELTS General Training", "CELPIP-General", "TEF Canada", "TCF Canada"],
        )
        self._row_score_group("sp_lang", "Test Scores (Actual band / score):")
        self._row_clb_group("sp_lang")

        self._sec_header("2.3  Spouse / Partner — Education (Highest Level)")
        self._row_2col_dd(
            "sp_education", "Highest Level of Education", EDUCATION_LEVELS,
            "sp_edu_country", "Country of Study", COUNTRIES,
            r1=True,
        )
        self._row_yn_radio("sp_eca_done", "Does spouse have an ECA (Educational Credential Assessment)?")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3 — Contact & Residency
    # ──────────────────────────────────────────────────────────────────────────

    def _section3(self) -> None:
        self._new_page("Contact & Residency Information", 3)

        self._sec_header("3.1  Contact Details")
        self._row_2col_text(
            "pa_email", "Email Address *",
            "pa_phone", "Phone Number (with country code) *",
            r1=True, r2=True,
        )
        self._row_text("pa_address_line1", "Current Street Address *", required=True)
        self._row_3col_text([
            ("pa_address_city",    "City *",               True),
            ("pa_address_state",   "State / Province",     False),
            ("pa_address_zipcode", "Postal / ZIP Code",    False),
        ])
        self._row_dd("pa_address_country", "Country *", COUNTRIES, required=True)

        self._sec_header("3.2  Current Residency Status")
        self._row_2col_dd(
            "pa_residence_country", "Current Country of Residence *",    COUNTRIES,
            "pa_visa_status",       "Immigration Status in that Country *", VISA_STATUS,
            r1=True, r2=True,
        )
        self._row_2col_date(
            "pa_residence_from", "Residing in this Country Since",
            "pa_status_expiry",  "Current Status Expiry Date (if applicable)",
        )

        self._sec_header("3.3  Other Countries of Residence (Past 10 Years)")
        self._instruction_box(
            "List any country (other than your country of citizenship or current residence) "
            "where you have lived for 6 or more consecutive months in the past 10 years."
        )
        self._row_yn_radio(
            "pa_other_country_yn",
            "Have you lived in any other country for 6+ consecutive months in the past 10 years?",
        )
        self._row_2col_dd(
            "pa_other_country_1",      "Other Country",  COUNTRIES,
            "pa_other_visa_status_1",  "Status",         VISA_STATUS,
        )
        self._row_2col_date(
            "pa_other_from_1", "From Date",
            "pa_other_to_1",   "To Date",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4 — Language Proficiency (Principal Applicant)
    # ──────────────────────────────────────────────────────────────────────────

    def _section4(self) -> None:
        self._new_page("Language Proficiency — Principal Applicant", 4)
        self._instruction_box(
            "Express Entry requires an approved language test result. "
            "IELTS General Training or CELPIP-General are the most common. "
            "Enter scores exactly as shown on your official result. "
            "If you have not yet taken a test, enter estimated scores and indicate 'Not yet taken' in the notes."
        )

        self._sec_header("4.1  First Official Language (English)")
        self._row_radio(
            "pa_eng_test_type",
            "English Language Test Taken *",
            ["IELTS Academic", "IELTS General Training", "CELPIP-General", "Not yet taken"],
            required=True,
        )
        # Test Date dropdowns (left) | Reference Number text field (right)
        hw = (CW - 5 * mm) / 2
        self._check_space(26 * mm)
        self._label("Test Date", ML, self.y)
        self._label("Test Reference / Registration Number", ML + hw + 5 * mm, self.y)
        self.y -= 5 * mm
        self._date_dropdowns("pa_eng_test_date", ML, year_list=DATE_YEARS_RANGE)
        self._tf("pa_eng_ref_no", ML + hw + 5 * mm, hw)
        self.y -= FH + 9 * mm   # 9mm: Day/Month/Year sub-labels at FH+4mm, leaving 5mm gap before score header
        self._row_score_group("pa_eng", "Actual Test Scores (e.g. IELTS: 7.0 | CELPIP: 9):")
        self._row_clb_group("pa_eng")
        self._gap(6 * mm)

        self._sec_header("4.2  Second Official Language (French — Optional)")
        self._row_yn_radio(
            "pa_fr_test_done",
            "Have you taken a French language test (TEF Canada or TCF Canada)?",
        )
        self._row_radio(
            "pa_fr_test_type",
            "French Language Test Type (if taken)",
            ["TEF Canada", "TCF Canada", "Not taken"],
        )
        # French Test Date dropdowns (left) | Registration Number text field (right)
        hw_fr = (CW - 5 * mm) / 2
        self._check_space(26 * mm)
        self._label("French Test Date", ML, self.y)
        self._label("Registration Number", ML + hw_fr + 5 * mm, self.y)
        self.y -= 5 * mm
        self._date_dropdowns("pa_fr_test_date", ML, year_list=DATE_YEARS_RANGE)
        self._tf("pa_fr_reg_no", ML + hw_fr + 5 * mm, hw_fr)
        self.y -= FH + 9 * mm   # 9mm: Day/Month/Year sub-labels at FH+4mm, leaving 5mm gap before score header
        self._row_score_group("pa_fr", "French Test Scores:")
        self._row_clb_group("pa_fr")
        self._note(
            "French language skills can significantly boost your CRS score — "
            "speak to your consultant about the Francophone stream if applicable."
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5 — Education (Principal Applicant)
    # ──────────────────────────────────────────────────────────────────────────

    def _section5(self) -> None:
        self._new_page("Education — Principal Applicant", 5)
        self._instruction_box(
            "Report your highest completed credential. "
            "If your education was obtained outside Canada, an Educational Credential Assessment (ECA) "
            "from a IRCC-designated organisation is required for Express Entry. "
            "WES (World Education Services) is the most commonly used organisation."
        )

        self._sec_header("5.1  Highest Level of Education")
        self._row_dd("pa_edu_level", "Highest Level of Education Completed *", EDUCATION_LEVELS, required=True)
        self._row_text("pa_edu_field", "Field of Study / Major *", required=True)
        self._row_text("pa_edu_institution", "Name of Institution / University", required=False)
        self._row_2col_dd(
            "pa_edu_country", "Country Where Credential Was Obtained *", COUNTRIES,
            "pa_edu_year",    "Year of Completion *",                     YEARS,
            r1=True, r2=True,
        )

        self._sec_header("5.2  Canadian Education (Bonus Points)")
        self._row_yn_radio(
            "pa_canadian_edu",
            "Have you completed a post-secondary program in Canada of 2 or more years? *",
            required=True,
        )
        self._row_text("pa_canadian_edu_institution", "Canadian Institution Name (if applicable)")
        self._row_2col_dd(
            "pa_canadian_edu_level",   "Level of Canadian Credential", EDUCATION_LEVELS,
            "pa_canadian_edu_year",    "Year of Completion",           YEARS,
        )

        self._sec_header("5.3  Educational Credential Assessment (ECA)")
        self._row_yn_radio(
            "pa_eca_done",
            "Have you obtained an ECA for your foreign credential? *",
            required=True,
        )
        self._row_2col_dd(
            "pa_eca_org",     "ECA Organisation *",      ECA_ORGS,
            "pa_eca_year",    "Year ECA Was Issued",     YEARS,
        )
        self._row_2col_text(
            "pa_eca_ref",     "ECA Reference / Application Number",
            "pa_eca_level",   "ECA Assessed Level (as stated in ECA)",
        )
        self._note(
            "ECA must have been issued within 5 years of your Express Entry application date."
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6 — Canadian Work Experience
    # ──────────────────────────────────────────────────────────────────────────

    def _section6(self) -> None:
        self._new_page("Canadian Work Experience", 6)
        self._instruction_box(
            "List all paid Canadian work experience in the past 10 years. "
            "For CEC eligibility, you need a minimum of 1 year (1,560 hours) of skilled work experience in Canada "
            "in a TEER 0, 1, 2, or 3 occupation within the last 3 years. "
            "Include experience on a work permit, post-graduate work permit (PGWP), etc."
        )

        self._row_yn_radio(
            "pa_can_work_yn",
            "Do you have any paid Canadian work experience in the past 10 years? *",
            required=True,
        )

        for i in range(1, 4):
            self._work_block(f"ca_job{i}", f"Canadian Position {i}")
            if i < 3:
                self._divider()

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7 — Foreign Work Experience
    # ──────────────────────────────────────────────────────────────────────────

    def _section7(self) -> None:
        self._new_page("Foreign Work Experience", 7)
        self._instruction_box(
            "List foreign (non-Canadian) paid work experience in the past 10 years. "
            "FSW requires at least 1 year (1,560+ hours) of continuous full-time paid skilled work "
            "in a TEER 0, 1, 2, or 3 occupation in the last 10 years. "
            "Self-employment counts only if you were contributing to the EI program."
        )

        self._row_yn_radio(
            "pa_for_work_yn",
            "Do you have foreign skilled work experience in the past 10 years? *",
            required=True,
        )

        for i in range(1, 4):
            self._foreign_work_block(f"fw_job{i}", f"Foreign Position {i}")
            if i < 3:
                self._divider()

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 8 — Job Offer & Provincial Nomination
    # ──────────────────────────────────────────────────────────────────────────

    def _section8(self) -> None:
        self._new_page("Job Offer & Provincial Nomination", 8)

        self._sec_header("8.1  Valid Canadian Job Offer")
        self._instruction_box(
            "A valid job offer in Express Entry must be full-time, non-seasonal, continuous, and at a wage "
            "at or above the median wage for that NOC in the province of employment. "
            "Note: As of March 2025, job offer points have been removed from the CRS scoring formula."
        )
        self._row_yn_radio("pa_job_offer_yn", "Do you have a valid Canadian job offer? *", required=True)
        self._row_2col_text(
            "pa_job_offer_employer", "Employer Name",
            "pa_job_offer_title",    "Job Title",
        )
        self._row_2col_dd(
            "pa_job_offer_teer",     "NOC TEER Category",      TEER_CATS,
            "pa_job_offer_province", "Province of Employment", PROVINCES,
        )
        self._row_text("pa_job_offer_noc", "NOC Code (5-digit)")
        self._row_2col_dd(
            "pa_job_offer_lmia",  "Is the job offer LMIA-supported?", YES_NO_NA,
            "pa_job_offer_exempt","Is it LMIA-exempt (e.g. IEC, ICT)?", YES_NO_NA,
        )

        self._sec_header("8.2  Provincial Nominee Program (PNP)")
        self._instruction_box(
            "A valid provincial nomination adds 600 CRS points — virtually guaranteeing an ITA. "
            "Some provinces (e.g. Ontario, BC, Alberta) have Enhanced streams aligned with Express Entry."
        )
        self._row_yn_radio(
            "pa_pnp_yn",
            "Do you currently hold a valid Provincial Nomination Certificate (PNC)? *",
            required=True,
        )
        self._row_2col_dd(
            "pa_pnp_province", "Nominating Province / Territory", PROVINCES,
            "pa_pnp_stream",   "PNP Stream (if known)",           ["","Not known","Human Capital Priorities",
                "Employer Job Offer","International Student","French-speaking Skilled Worker","Other"],
        )
        self._row_2col_date(
            "pa_pnp_issue_date",  "Nomination Date",
            "pa_pnp_expiry_date", "Nomination Expiry Date",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 9 — Canadian Connections & Adaptability
    # ──────────────────────────────────────────────────────────────────────────

    def _section9(self) -> None:
        self._new_page("Canadian Connections & Adaptability", 9)
        self._instruction_box(
            "These factors can add points to your CRS score or open specific pathways. "
            "Answer honestly — your consultant will advise which apply to your profile."
        )

        self._sec_header("9.1  Family Connections in Canada")
        self._row_yn_radio(
            "pa_sibling_canada",
            "Do you have a sibling (18+) who is a Canadian citizen or permanent resident?",
        )
        self._row_yn_radio(
            "pa_sibling_spouse_canada",
            "Does your spouse / common-law partner have a sibling in Canada (citizen or PR, 18+)?",
        )
        self._row_yn_radio(
            "pa_spouse_is_citizen_pr",
            "Is your spouse or common-law partner a Canadian citizen or permanent resident?",
        )

        self._sec_header("9.2  Previous Study in Canada")
        self._row_yn_radio(
            "pa_studied_canada",
            "Have you completed a post-secondary program of 2+ years in Canada?",
        )
        self._row_2col_text(
            "pa_study_institution", "Institution Name",
            "pa_study_program",     "Program / Field of Study",
        )

        self._sec_header("9.3  Previous Work in Canada (Outside Section 6)")
        self._row_yn_radio(
            "pa_prev_work_canada",
            "Have you worked in Canada on a work permit outside the experience listed in Section 6?",
        )

        self._sec_header("9.4  Spouse's Canadian Education / Work Experience")
        self._row_yn_radio(
            "sp_studied_canada",
            "Has your spouse / partner studied in Canada (post-secondary, 1+ year)?",
        )
        self._row_yn_radio(
            "sp_worked_canada",
            "Has your spouse / partner worked in Canada on a valid work permit in the past 5 years?",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 10 — Inadmissibility & Background
    # ──────────────────────────────────────────────────────────────────────────

    def _section10(self) -> None:
        self._new_page("Inadmissibility & Background", 10)
        self._instruction_box(
            "Canadian immigration law requires full disclosure of criminal, health, and immigration history. "
            "Providing false information may result in a permanent ban from Canada. "
            "If Yes to any question below, use the details field at the bottom of this section."
        )

        self._sec_header("10.1  Criminal History")
        self._row_yn_radio(
            "pa_criminal_yn",
            "Have you or any family member ever been convicted of or charged with a criminal offence in any country? *",
            required=True,
        )

        self._sec_header("10.2  Visa / Permit Refusals")
        self._row_yn_radio(
            "pa_refusal_yn",
            "Have you or any family member ever been refused a visa, permit, or entry to any country? *",
            required=True,
        )

        self._sec_header("10.3  Removal / Deportation Orders")
        self._row_yn_radio(
            "pa_removal_yn",
            "Have you ever been removed, deported, or ordered to leave Canada or any other country? *",
            required=True,
        )

        self._sec_header("10.4  Health Conditions")
        self._row_yn_radio(
            "pa_health_yn",
            "Do you or any family member have a health condition requiring significant health or social services? *",
            required=True,
        )

        self._sec_header("10.5  Previous Canadian Applications")
        self._row_yn_radio(
            "pa_prev_app_yn",
            "Have you previously applied for Canadian PR, a study permit, work permit, or visitor visa?",
        )

        # One shared details field — applicant references the question number for each Yes answer
        self._row_textarea(
            "pa_inadmissibility_details",
            "If Yes to any question above — provide details (question no., offence / refusal, country, year, outcome):",
            height=80,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 11 — Dependent Children
    # ──────────────────────────────────────────────────────────────────────────

    def _section11(self) -> None:
        self._new_page("Dependent Children", 11)
        self._instruction_box(
            "List all dependent children — biological/adopted, under 22 without a spouse or partner, "
            "or 22+ and financially dependent on a parent since before age 22. "
            "Include children not accompanying you to Canada."
        )

        self._row_yn_radio(
            "pa_children_yn",
            "Do you have any dependent children to declare? *",
            required=True,
        )
        self._row_dd("pa_num_children", "Number of Dependent Children", NUM_CHILDREN)

        for i in range(1, 4):
            self._sub_header(f"Child {i}")
            self._row_3col_text([
                (f"child{i}_first_name", "First Name",  False),
                (f"child{i}_last_name",  "Family Name", False),
                (f"child{i}_gender",     "Gender",      False),
            ])
            # Date of Birth (left) | Country of Citizenship dropdown (right)
            self._row_date_dd(
                f"child{i}_dob",          "Date of Birth",
                f"child{i}_citizenship",  "Country of Citizenship", COUNTRIES,
                year_list=DATE_YEARS_PAST,
            )
            self._row_2col_dd(
                f"child{i}_accompanying", "Will this child accompany you to Canada?", YES_NO,
                f"child{i}_canada_status","Current Canadian Status (if any)",          VISA_STATUS,
            )

    # ──────────────────────────────────────────────────────────────────────────
    # ADDITIONAL INFORMATION PAGE
    # ──────────────────────────────────────────────────────────────────────────

    def _section_additional(self) -> None:
        self._cur_section_num = 0   # suppress "Section N:" prefix in header
        self._new_page("Additional Information")
        self._instruction_box(
            "Use this space to share any additional details relevant to your Express Entry assessment — "
            "unusual personal circumstances, pending applications, additional family members, prior "
            "immigration history, or anything else your consultant should know before the review."
        )
        self._row_textarea(
            "additional_information",
            "Additional Information (optional):",
            height=350,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 12 — Declaration & Consent
    # ──────────────────────────────────────────────────────────────────────────

    def _section12(self) -> None:
        self._new_page("Declaration & Consent", 12)

        self._instruction_box(
            "Please read the following declaration carefully before signing. "
            "By completing and submitting this questionnaire you confirm the accuracy "
            "of all information provided."
        )

        self._sec_header("12.1  Declaration of Accuracy")
        c = self.c

        # Declaration text block
        self._check_space(35 * mm)
        declaration = (
            "I declare that the information I have provided in this questionnaire is true, complete, "
            "and accurate to the best of my knowledge. I understand that providing false or misleading "
            "information may result in my application being refused and may affect my ability to apply "
            "for Canadian immigration in the future. I authorise Visa Forte (Prashant Thirthingoth) to "
            "use this information for the sole purpose of conducting an Express Entry eligibility assessment "
            "and preparing documentation guidance."
        )
        dec_lines = self._wrap(declaration, CW - 8 * mm, "Helvetica", 8)
        bh = len(dec_lines) * 5 * mm + 6 * mm
        c.setFillColor(AMBER)
        c.rect(ML, self.y - bh, CW, bh, fill=1, stroke=0)
        c.setFillColor(PRUSSIAN)
        c.rect(ML, self.y - bh, 3, bh, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica", 8)
        for i, ln in enumerate(dec_lines):
            c.drawString(ML + 5 * mm, self.y - 4.5 * mm - i * 5 * mm, ln)
        self.y -= bh + 4 * mm

        self._sec_header("12.2  Acknowledgements")
        self._row_checkboxes(
            "Please check all that apply:",
            [
                ("accuracy",   "I confirm all information in this questionnaire is accurate and complete."),
                ("privacy",    "I consent to Visa Forte storing and processing my data for assessment purposes."),
                ("updates",    "I agree to promptly inform Visa Forte of any changes to my circumstances."),
                ("disclaimer", "I have read and understood the legal disclaimer on the cover page."),
            ],
            group="consent",
        )

        self._sec_header("12.3  Signature & Date")
        self._row_2col_text(
            "decl_full_name", "Full Legal Name (print clearly) *",
            "decl_date",      "Date of Completion (DD/MM/YYYY) *",
            r1=True, r2=True,
        )
        self._gap(4 * mm)
        # Signature field
        self._label("Signature (type your full name as electronic signature) *", ML, self.y, required=True)
        self.y -= 5 * mm
        self.form.textfield(
            name="decl_signature",
            tooltip="Electronic Signature — type your full name",
            x=ML, y=self.y - 20,
            width=CW, height=20,
            borderColor=PRUSSIAN,
            fillColor=AMBER,
            textColor=PRUSSIAN,
            borderWidth=1,
            fontSize=12,
            fontName="Helvetica-BoldOblique",
        )
        self.y -= 20 + 5 * mm

        self._divider()

        # Consultant use only box
        self._check_space(30 * mm)
        c.setFillColor(PRUSSIAN)
        c.rect(ML, self.y - 30 * mm, CW, 30 * mm, fill=1, stroke=0)
        c.setFillColor(SAFFRON)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(ML + 5 * mm, self.y - 6 * mm, "FOR CONSULTANT USE ONLY")
        c.setFillColor(WHITE)
        c.setFont("Helvetica", 8)
        labels_cu = [
            ("Received Date:",     "cu_received",  ML + 5 * mm,  self.y - 14 * mm),
            ("CRS Score Estimate:", "cu_crs",       ML + 85 * mm, self.y - 14 * mm),
            ("EE Stream Eligible:", "cu_stream",    ML + 5 * mm,  self.y - 22 * mm),
            ("Next Action:",        "cu_action",    ML + 85 * mm, self.y - 22 * mm),
        ]
        for lbl, fname, lx, fy in labels_cu:
            c.drawString(lx, fy, lbl)
            self.form.textfield(
                name=fname, x=lx + 35 * mm, y=fy - 3,
                width=40 * mm, height=11,
                borderColor=SAFFRON,
                fillColor=HexColor('#091929'),
                textColor=WHITE,
                borderWidth=0.5,
                fontSize=8,
                fontName="Helvetica",
            )
        self.y -= 30 * mm

        # ── Final disclaimer ─────────────────────────────────────────────────
        self._gap(4 * mm)
        self._check_space(18 * mm)
        disclaimer_full = (
            "The information provided in this questionnaire is for informational and guidance purposes only, "
            "based on publicly available Immigration, Refugees and Citizenship Canada (IRCC) regulations and policies. "
            "This does not constitute legal advice, and no solicitor-client or consultant-client relationship is created "
            "by submitting this form. Immigration regulations, program requirements, processing times, and CRS cutoff "
            "scores are subject to frequent change without notice. You are responsible for verifying all information "
            "with official IRCC sources (www.canada.ca/immigration) and confirming current eligibility requirements "
            "before taking any action. Visa Forte provides documentation education and guidance only."
        )
        disc_lines = self._wrap(disclaimer_full, CW - 10 * mm, "Helvetica", 6.5)
        bh2 = len(disc_lines) * 4 * mm + 6 * mm
        c.setFillColor(AMBER)
        c.rect(ML, self.y - bh2, CW, bh2, fill=1, stroke=0)
        c.setFillColor(SAFFRON)
        c.rect(ML, self.y - bh2, 3, bh2, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica", 6.5)
        for i, ln in enumerate(disc_lines):
            c.drawString(ML + 5 * mm, self.y - 4 * mm - i * 4 * mm, ln)
        self.y -= bh2 + 3 * mm

    # ──────────────────────────────────────────────────────────────────────────
    # MAIN BUILD
    # ──────────────────────────────────────────────────────────────────────────

    def build(self) -> None:
        self._build_cover()
        self._section1()
        self._section2()
        self._section3()
        self._section4()
        self._section5()
        self._section6()
        self._section7()
        self._section8()
        self._section9()
        self._section10()
        self._section11()
        self._section_additional()
        self._section12()

        # Final page footer
        self._draw_footer()
        self.c.save()

        # Post-process: embed AA JavaScript directly in field widgets via pikepdf
        _inject_js(self.c._filename)

        print(f"[OK]  PDF saved — {self.c._filename}")
        print(f"[OK]  Total pages: {self.page_num}")


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import shutil, subprocess, sys

    script_dir  = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    output_dir  = os.path.join(project_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    final_path = os.path.join(
        output_dir,
        "Visa_Forte_Express_Entry_Assessment_Questionnaire.pdf"
    )
    # Write to a temp file so a locked final_path doesn't block generation
    temp_path = os.path.join(output_dir, "VF_EE_build.pdf")

    print("Building Visa Forte Express Entry Assessment Questionnaire …")
    q = EEQuestionnaire(temp_path)
    q.build()

    # Copy temp → final, overwriting even if Acrobat had the old file open
    try:
        shutil.copy2(temp_path, final_path)
        os.remove(temp_path)
        print(f"[OK]  Copied to {final_path}")
    except PermissionError:
        # Final file still locked — use cmd copy as fallback
        subprocess.run(
            ["cmd", "/c", f'copy /Y "{temp_path}" "{final_path}"'],
            check=True, capture_output=True,
        )
        print(f"[OK]  Copied (cmd fallback) to {final_path}")
