# Corrections to the Work Experience & NOC Code Assessment Bible

**Applies to:** "THE WORK EXPERIENCE & NOC CODE ASSESSMENT BIBLE" (compiled 2026-08-18), the
reference document Prash maintains outside this repository.
**Verified:** 2026-08-18, against primary sources fetched live in-session.
**Why this file exists:** the Bible was embedded into the classifier logic in
`apps/web/src/lib/noc-classify.ts`. Five claims did not survive checking against the binding
text. The code was corrected at the time; this file is the record of *what* changed and *why*,
so the Bible itself can be brought into line and the same five errors are not re-derived by a
future session reading the original document.

**Fetch note:** `WebFetch` returns HTTP 403 on canada.ca. Every URL below was retrieved with
plain `curl -sSL` using the default user agent, which returns 200. Do not spoof a browser UA —
the WAF resets that connection.

---

## 1. Remote-work CEC eligibility is no longer an open gap

**Bible says:** Part IX #3 lists remote-work CEC eligibility as a confirmed gap with no located
official source.

**Correct position:** IRCC states it on the public CEC eligibility page, verbatim:

> "If you worked remotely, you must have been physically in Canada and working for a Canadian employer."

**Source:** canada.ca CEC eligibility page, *date modified* 2026-06-22.

**Action:** remove from the confirmed-gaps list and cite the page.

---

## 2. The single "primary occupation" rule is FSW-only

**Bible says:** Part IV / 7.2 frames the assessment around one primary occupation generally.

**Correct position:** that constraint is Federal Skilled Worker only, at IRPR s.75(2)(a). The
Canadian Experience Class expressly permits experience across several codes — IRPR s.87.1(2)(a)
reads "in one or more occupations", and IRCC's officer instruction restates it:

> "at least 12 months of full-time, Canadian skilled work experience ... in one or more TEER 0,
> TEER 1, TEER 2 or TEER 3 occupations within the 36 months before the date the application is
> received [R87.1(2)(a)]"

**Source:** IRCC PDI, *CEC: Qualifying work experience* (URL in §5 below), page `dcterms.modified`
2023-05-25.

**Action:** scope the rule to FSW. Note that a CEC file may legitimately carry more than one NOC.
The classifier prompt generalised this and has been corrected.

---

## 3. The employment-requirements clause is narrower than Part 2.3 implies — but the conclusion survives

**Bible says:** Part 2.3 treats "regardless of whether they meet the employment requirements" as a
general rule across programmes.

**Correct position:** those words appear only in IRPR s.80(3), which opens "For the purposes of
subsection (1)" — the FSW selection-grid experience points. IRPR s.75(2) and s.87.1(2) state the
same two limbs *without* that clause. So s.80(3) is not textually general and must not be cited as
governing CEC.

**The conclusion is still right, on better authority.** IRCC's own CEC officer instruction says it
directly:

> "The employment requirements listed in the National Occupational Classification (NOC) description
> are not applicable."

Statistics Canada independently states that an occupation's TEER requirements "may differ from
personal educational levels".

**Action:** keep the rule that credentials must never drive code choice. Change the citation: cite
the CEC officer instruction for CEC, and s.80(3) only for FSW.

---

## 4. The second digit of a NOC 2021 code IS the TEER

**Bible says:** Part 2.2 — correct as written.

**What was wrong was our own file.** `tasks/lessons.md` Lesson 5 previously claimed the second digit
is *not* the TEER. Statistics Canada states twice in the NOC 2021 V1.0 introduction that it is, and
the lesson's own examples (21232 → TEER 1, 65200 → TEER 5) demonstrate the rule they were cited to
disprove. Corrected in place on 2026-08-18, with the original text kept for the record.

**Action:** none to the Bible. Recorded here so the contradiction is not "resolved" the wrong way
later.

---

## 5. The CEC officer manual — relocated

**Bible source 15** cites the CEC officer manual for the proposition that NOC employment
requirements do not apply to CEC. That URL 404s, as do the obvious variants
(`.../economic-classes/canadian-experience-class.html`, `.../canadian-experience.html`).

**Live path**, reached from the economic-classes index and confirmed HTTP 200 on 2026-08-18:

```
https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/
operational-bulletins-manuals/permanent-residence/economic-classes/experience/
qualifying-work-experience.html
```

The directory segment is `experience`, not `canadian-experience-class`. Page `dcterms.modified`
2023-05-25.

The page confirms three things the Bible relies on:

1. Employment requirements do not apply (quoted in §3 above).
2. The two-limb duty test, verbatim at R87.1(2)(b)-(c) — "performed the actions described in the
   lead statement" and "performed a substantial number of the main duties, including all the
   essential duties".
3. CEC experience may span more than one occupation (quoted in §2 above).

**Action:** update source 15 to this URL. This closes the one Part 4.1 claim previously recorded as
unverifiable.

**Incidental finding, not yet chased:** the same instruction set refers to a CEC **Post-Graduation
stream** with its own educational credential requirement. That structure is not reflected in the
Bible's CEC section. Worth a look before advising a recent graduate.

---

## Where these now live in code

| Correction | Enforced at |
|---|---|
| §2 FSW single vs CEC multiple | `NOC_CLASSIFIER_SYSTEM` rule 1, `noc-classify.ts` |
| §3 employment requirements irrelevant | `NOC_CLASSIFIER_SYSTEM` rule 4 + `STATUTORY_DUTY_TEST` scope note |
| §5 relocated URL + quoted text | `CEC_QUALIFYING_EXPERIENCE`, `noc-classify.ts` |
| §4 TEER digit | `tasks/lessons.md`, Immigration Domain Lesson 5 |

Claims in the Bible not listed here were checked against IRPR s.75 / s.80 / s.87.1, IRPA s.40 and
the StatCan NOC 2021 V1.0 introduction on 2026-08-18 and found accurate.
