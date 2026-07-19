// refusal-patterns.ts — deterministic refusal-letter classifier.
//
// IRCC refusal letters are built from a small set of standard template
// sentences. Each ground below is keyed on the phrases those templates use,
// with the documentation root causes behind the ground and the reapplication
// strategy that addresses it. Pure function, no network, no storage — the
// letter text is processed in memory and never persisted or logged.
//
// Pattern library seeded from documented refusal-letter phrasing; Prash
// sharpens signals with real anonymised cases over time (see RT-5 in
// tasks/todo.md).

export interface RefusalGround {
  id: string;
  label: string;
  appliesTo: string;
  signals: RegExp[];
  rootCauses: string[];
  strategy: string[];
}

export type Confidence = 'strong' | 'moderate' | 'possible';

export interface GroundMatch {
  id: string;
  label: string;
  appliesTo: string;
  confidence: Confidence;
  matchCount: number;
  rootCauses: string[];
  strategy: string[];
}

export interface RefusalAnalysis {
  matches: GroundMatch[];
  generalGuidance: string[];
}

const GROUNDS: RefusalGround[] = [
  {
    id: 'would-not-leave',
    label: 'Officer not satisfied you would leave Canada',
    appliesTo: 'Visitor visa · Study permit · Work permit',
    signals: [
      /not satisfied that you (would|will) leave canada/i,
      /leave canada at the end of (your|the) (stay|visit|period)/i,
      /purpose of (your )?visit/i,
      /temporary (stay|resident) status/i,
    ],
    rootCauses: [
      'The application did not build a documented case that your life is anchored outside Canada — the officer weighs stated intent at zero and documented anchors at full value.',
      'The stated purpose was generic ("tourism", "visiting friends") without an itinerary, invitation, or event that explains why this trip, at this time, for this duration.',
      'Something in the file suggested immigration intent that was never addressed head-on (relatives in Canada, a pending PR profile, a previous long stay).',
    ],
    strategy: [
      'Rebuild the file around evidence of return: employment letter with approved leave dates, business ownership documents, property records, dependents remaining home, ongoing studies.',
      "Replace the generic purpose with a specific, dated, documented one — a day-by-day itinerary, an invitation letter with the host's status documents, event registrations, return tickets.",
      'If a fact in your profile suggests immigration intent, address it directly in a letter of explanation rather than hoping it is not noticed — dual intent is legal and can be argued.',
    ],
  },
  {
    id: 'financial-insufficiency',
    label: 'Financial resources insufficient or not credible',
    appliesTo: 'Visitor visa · Study permit · Express Entry',
    signals: [
      /personal assets and financial status/i,
      /(insufficient|sufficient) (funds|financial)/i,
      /financial (resources|status|situation)/i,
      /(afford|cover) (the )?(cost|expenses)/i,
      /source of (the )?funds/i,
    ],
    rootCauses: [
      'The balance shown did not comfortably cover the trip or programme plus a margin — or it appeared without history, so the officer read it as borrowed window-dressing.',
      'Large recent deposits were left unexplained, undermining the credibility of the entire financial picture.',
      "Sponsor finances were offered without proving the sponsor's relationship, status, and capacity.",
    ],
    strategy: [
      "Show 6 months of bank statements with a stable pattern, not a snapshot balance. Explain every large or recent deposit with its paper trail (property sale deed, maturity certificate, gift letter with the donor's own statements).",
      'Budget the trip or programme explicitly — costs on one side, available funds on the other, with a visible surplus.',
      "If a sponsor is involved, document the relationship, the sponsor's income and status, and a signed undertaking — a bare bank balance from a third party carries little weight.",
    ],
  },
  {
    id: 'travel-history',
    label: 'Travel history considered insufficient',
    appliesTo: 'Visitor visa · Study permit',
    signals: [/travel history/i, /(previous|prior) travel/i, /limited travel/i],
    rootCauses: [
      'Little or no prior international travel gives the officer no compliance record to rely on — this ground almost never stands alone and usually signals a weak file overall.',
    ],
    strategy: [
      'Travel history cannot be manufactured, so overcompensate on the grounds you can control: ties, funds, and purpose must be conspicuously strong.',
      "If you have any compliant travel (including regional trips), document it with entry/exit stamps and visas — officers weigh demonstrated compliance with any country's visa terms.",
      'Consider building a history deliberately: one or two compliant trips to visa-required countries before reapplying materially changes this line of the assessment.',
    ],
  },
  {
    id: 'ties-to-home',
    label: 'Family or economic ties to home country judged weak',
    appliesTo: 'Visitor visa · Study permit · Work permit',
    signals: [
      /family ties in canada and in your country of residence/i,
      /(family|economic|social) ties/i,
      /ties to (your )?(home|country)/i,
      /establishment in (your )?country/i,
    ],
    rootCauses: [
      'The file listed ties without evidencing them — a claimed job with no employment letter, claimed dependents with no records, claimed property with no documents.',
      'Close family already in Canada shifted the balance of ties toward Canada, and the application did not counterweight it.',
    ],
    strategy: [
      'Evidence every tie: employment letter stating position, tenure, salary and approved leave; business registration and tax filings; property ownership documents; marriage and birth certificates for dependents staying behind.',
      'If immediate family is in Canada, acknowledge it and document the stronger anchors that remain at home — career trajectory, elderly parents in your care, assets under management.',
    ],
  },
  {
    id: 'work-experience-not-demonstrated',
    label: 'Work experience not accepted as claimed',
    appliesTo: 'Express Entry / PR',
    signals: [
      /work experience/i,
      /reference letter/i,
      /(duties|responsibilities) (described|listed|performed)/i,
      /national occupational classification|NOC/i,
      /primary occupation/i,
    ],
    rootCauses: [
      'Reference letters missing mandatory elements (letterhead, supervisor signature, hours per week, salary, duties) — the experience is discounted as unverifiable, not merely imperfect.',
      'The duties in the letter did not correspond to the lead statement and main duties of the claimed NOC — a title match with a duties mismatch fails.',
      'Self-employment claimed with self-declared duties or affidavits, which IRCC explicitly does not accept.',
    ],
    strategy: [
      "Rebuild every reference letter against the IRCC completeness standard: company letterhead, contact details, supervisor's name/title/signature, all positions with dates, hours per week, salary plus benefits, and duties.",
      "Rewrite duty descriptions in the language of the claimed NOC's main duties — factually accurate to your work, but mapped so an officer can trace each claim.",
      'If the claimed NOC was wrong, reapply under the code your duties actually support (verify with the official ESDC profile) rather than defending the original choice.',
      'For self-employment: incorporate evidence of business ownership, income records, and third-party client documentation with payment details.',
    ],
  },
  {
    id: 'proof-of-funds',
    label: 'Settlement funds below the required minimum',
    appliesTo: 'Express Entry (FSWP / FSTP)',
    signals: [
      /proof of funds/i,
      /settlement funds/i,
      /low[- ]income cut[- ]?off|LICO/i,
      /funds (available|required) (for|to) settle/i,
    ],
    rootCauses: [
      'Funds dipped below the required threshold at some point during processing — the requirement is continuous, not a one-day snapshot.',
      "Funds were held in instruments IRCC does not count (property, locked retirement accounts, borrowed money) or in accounts not in your or your spouse's name.",
      'The required amount rose with the annual update, or with a family-size change, and the file was not topped up.',
    ],
    strategy: [
      'Check the current requirement for your family size on canada.ca (the table updates annually) and maintain a comfortable buffer above it for the entire processing window.',
      "Hold funds in unencumbered, liquid accounts in your own or your spouse's name, with 6 months of statements and letters from each institution.",
      'Document the origin of every major balance component — unexplained money is treated as unavailable money.',
    ],
  },
  {
    id: 'incomplete-application',
    label: 'Application rejected as incomplete',
    appliesTo: 'All application types',
    signals: [
      /rejected as incomplete/i,
      /incomplete application/i,
      /(missing|did not (include|provide|submit)) .{0,40}(document|form|signature|fee)/i,
      /returned (to you )?(because|as)/i,
    ],
    rootCauses: [
      'A mandatory document, signature, or fee was missing — completeness rejections are mechanical, not discretionary, and no argument reopens them.',
      'A document was submitted but non-compliant (untranslated, expired, wrong form version), which counts as missing.',
    ],
    strategy: [
      'This is the most recoverable refusal type: the merits were never judged. Rebuild the full document set against the official checklist and resubmit.',
      'Audit every document for compliance, not just presence: certified translations where required, current form versions, signatures in every field, validity dates that cover the processing window.',
      'If a document genuinely cannot be obtained, include a letter of explanation with evidence of your attempts — an explained gap is treated differently from a silent one.',
    ],
  },
  {
    id: 'misrepresentation',
    label: 'Misrepresentation finding or concern',
    appliesTo: 'All application types — highest severity',
    signals: [
      /misrepresent(ation|ed|ing)?/i,
      /false (information|document|statement)/i,
      /withheld (material )?(information|facts)/i,
      /procedural fairness letter/i,
    ],
    rootCauses: [
      'Information in the application conflicted with other evidence available to the officer — including your own previous applications to Canada or other countries.',
      'A document failed verification (employer unreachable, institution denies the record, bank letter not confirmed).',
      'An omission (a previous refusal, a relative in Canada, a period of employment) was treated as withholding a material fact.',
    ],
    strategy: [
      'Treat this as the most serious ground on this list — a misrepresentation finding makes you inadmissible and bars future applications for a period set by IRPA (see the inadmissibility pages on canada.ca).',
      'If you received a procedural fairness letter, the response window is short and the response is your one chance to explain — this is the point to engage licensed representation (RCIC or immigration lawyer), not after the finding.',
      'Never reapply hoping the issue is forgotten: every future application asks about previous refusals, and the record is permanent. Address the discrepancy with documentary evidence of the truth.',
    ],
  },
  {
    id: 'medical',
    label: 'Medical inadmissibility',
    appliesTo: 'All application types',
    signals: [
      /medical(ly)? inadmissib/i,
      /excessive demand/i,
      /danger to public health|public safety/i,
      /medical (exam|examination|condition)/i,
    ],
    rootCauses: [
      'A panel-physician exam identified a condition assessed as a danger to public health/safety or an excessive demand on health or social services.',
    ],
    strategy: [
      'Excessive-demand findings can sometimes be answered with a credible mitigation plan showing how costs would be covered — this is specialist territory; engage licensed representation.',
      'Verify whether your category is exempt from excessive-demand rules (some family classes are) and whether the assessment used current thresholds — both change over time; check canada.ca medical inadmissibility pages.',
      'Respond within the procedural fairness window with updated specialist reports — silence converts a concern into a finding.',
    ],
  },
  {
    id: 'criminality',
    label: 'Criminal inadmissibility / police certificate issue',
    appliesTo: 'All application types',
    signals: [
      /criminal(ity| record| inadmissib)/i,
      /police (certificate|clearance)/i,
      /rehabilitat(ion|ed)/i,
      /convicted|conviction/i,
    ],
    rootCauses: [
      'A conviction abroad has a Canadian equivalent that triggers inadmissibility, or a required police certificate was missing, expired, or from the wrong authority.',
    ],
    strategy: [
      "If the issue is a missing or non-compliant certificate, this is documentation: obtain the correct certificate from every country of 6+ months' residence since age 18 and resubmit.",
      "If the issue is an actual conviction, the routes are deemed rehabilitation, individual rehabilitation, or a temporary resident permit — eligibility depends on the offence's Canadian equivalent and time elapsed; engage licensed representation.",
    ],
  },
  {
    id: 'language-validity',
    label: 'Language test result invalid or below threshold',
    appliesTo: 'Express Entry / PR',
    signals: [
      /language test/i,
      /(test )?results? (were|was|are|is) (expired|no longer valid)/i,
      /minimum language (requirement|threshold|level)/i,
      /CLB|NCLC/i,
    ],
    rootCauses: [
      'Test results expired before the application was submitted (results are valid 2 years from the result date), or the claimed CLB did not meet the program minimum in every ability.',
      'The test taken is not accepted for the program (e.g. Academic-format tests, or single-skill retake products).',
    ],
    strategy: [
      'Retest early: book the moment your current result is within 6 months of expiry against your realistic submission date.',
      'Verify the per-ability minimum for your specific program on canada.ca — the minimum applies to each of the four abilities, and one weak ability fails the whole requirement.',
      'Confirm the exact test product is on the accepted list before booking.',
    ],
  },
  {
    id: 'education-eca',
    label: 'Education / credential assessment issue',
    appliesTo: 'Express Entry / PR',
    signals: [
      /educational credential assessment|ECA/i,
      /credential (was|is) not (assessed|recognized)/i,
      /equivalen(cy|t)/i,
      /education(al)? (requirement|documents?)/i,
    ],
    rootCauses: [
      'The ECA expired (5-year validity), was the wrong report type, came from a non-designated organization, or assessed a different credential than the one claimed.',
      'Points were claimed for a credential level the assessment did not support.',
    ],
    strategy: [
      'Order a fresh ECA for immigration purposes from a designated organization and claim exactly the equivalency stated on the report — no more.',
      'If you hold two or more credentials, have both assessed; the combined level can lawfully raise your education claim.',
    ],
  },
  {
    id: 'study-plan',
    label: 'Study plan / purpose of study not credible',
    appliesTo: 'Study permit',
    signals: [
      /purpose of (your )?study/i,
      /study plan/i,
      /(chosen|proposed) program (of study)?/i,
      /academic (progression|background|record)/i,
      /local(ly)? available (program|course)/i,
    ],
    rootCauses: [
      'The chosen programme did not follow logically from your academic or career history (a step down, a sideways move, or a field change with no explanation).',
      'The study plan did not explain why this programme in Canada rather than a comparable local option, or how it advances a career in your home country.',
    ],
    strategy: [
      'Write the study plan as a career document: where you are, the specific gap this programme fills, why this institution and country, and the position it leads to at home.',
      'Address apparent regressions head-on — a lower-level credential in a new field can be justified, but only if you justify it.',
      "Align every supporting document (employer letters, funds, family ties) with the plan's narrative.",
    ],
  },
  {
    id: 'previous-noncompliance',
    label: 'Previous refusal, overstay, or status issue weighed against you',
    appliesTo: 'All application types',
    signals: [
      /previous(ly)? (refus|den)/i,
      /immigration (status|history)/i,
      /overstay|remained beyond/i,
      /current immigration status/i,
      /non[- ]?compliance/i,
    ],
    rootCauses: [
      'A previous refusal (in Canada or elsewhere) or a period of non-compliance was either undeclared or declared without explanation, and the new application did not overcome the recorded concern.',
    ],
    strategy: [
      'Always declare every previous refusal from any country — non-declaration converts a survivable history into a misrepresentation risk.',
      "Obtain your file notes (GCMS via an access-to-information request) so you answer the officer's actual recorded concern rather than guessing at it.",
      'The new application must visibly answer the old concern with new evidence — an unchanged file resubmitted is an invitation to an identical refusal.',
    ],
  },
];

const GENERAL_GUIDANCE: string[] = [
  "Order your GCMS notes (access-to-information request) before reapplying — the refusal letter is a template; the officer's real reasoning is in the notes.",
  'A reapplication must change the evidence, not just the wording. Identify each concern above, attach the document that answers it, and flag the change in a letter of explanation.',
  'There is no waiting period after most refusals — but reapplying with a materially unchanged file usually produces a faster identical refusal and a longer paper trail.',
  'If any ground involves misrepresentation, inadmissibility, or a procedural fairness letter, engage a licensed representative (RCIC or immigration lawyer) before responding.',
];

// Signals needed for each confidence tier.
const STRONG_AT = 3;
const MODERATE_AT = 2;

function confidenceFor(matchCount: number): Confidence {
  if (matchCount >= STRONG_AT) return 'strong';
  if (matchCount >= MODERATE_AT) return 'moderate';
  return 'possible';
}

// Classify a refusal letter against the pattern library. Deterministic and
// side-effect free: the text is read, scored, and discarded by the caller.
export function analyseRefusalLetter(letterText: string): RefusalAnalysis {
  const matches: GroundMatch[] = [];

  for (const ground of GROUNDS) {
    const matchCount = ground.signals.filter((s) => s.test(letterText)).length;
    if (matchCount === 0) continue;
    matches.push({
      id: ground.id,
      label: ground.label,
      appliesTo: ground.appliesTo,
      confidence: confidenceFor(matchCount),
      matchCount,
      rootCauses: ground.rootCauses,
      strategy: ground.strategy,
    });
  }

  matches.sort((a, b) => b.matchCount - a.matchCount);

  return { matches, generalGuidance: GENERAL_GUIDANCE };
}
