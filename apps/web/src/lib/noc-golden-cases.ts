// Golden accuracy corpus for NOC classification.
//
// WHY THIS EXISTS. Every domain anchor in noc-retrieval.ts was added reactively, after
// one reported failure, with no way to tell whether it degraded a different occupation.
// Two of them turned out to be doing nothing (one was deleted on 2026-08-18 once its
// codes were measured and found already on the shortlist). This file is the measurement
// that was missing: a fixed set of duty texts whose correct code is known, so a change
// to retrieval or to the classifier prompt can be scored instead of argued about.
//
// TWO CONSUMERS, DELIBERATELY SEPARATE:
//   noc-golden-cases.test.ts  — free, always runs in CI. Asserts only that the correct
//                               code REACHES the shortlist. Claude can never pick a code
//                               retrieval did not surface, so this is the floor: fail it
//                               and the classifier had no chance, whatever the prompt says.
//   noc-live-eval.test.ts     — opt-in, spends Anthropic credits. Asserts the classifier
//                               actually PICKS the correct code. This is the real score.
//
// The duty texts are written the way an applicant or a reference letter writes them —
// paraphrased, in industry vocabulary, never in Statistics Canada wording. That is the
// whole point: noc-retrieval-recall.test.ts already feeds StatCan text back at itself and
// proves the index works. Only paraphrased input tests the vocabulary gap that actually
// breaks real files.
//
// EVERY CASE IS A TRAP FOR A SPECIFIC, OBSERVED FAILURE MODE — not a happy path. The
// `trap` field names the wrong answer each case is designed to catch, so a future session
// can tell at a glance what a regression means.

export type NocCaseProvenance =
  // Taken from a real client file where the duties were read against the official
  // StatCan text for both the returned code and the proposed code. Highest trust.
  | 'client-file'
  // A failure reported against the live tool, whose correct answer was then confirmed
  // against the official source.
  | 'reported-failure'
  // Written for this corpus to cover a failure mode with no real file behind it yet.
  // The label is justified by the cited lead statement and main duties, but no
  // applicant has been assessed on it. Lower trust than the two above.
  | 'authored';

export interface NocGoldenCase {
  id: string;
  jobTitle: string;
  duties: string;
  /** The code the duties actually describe. */
  expected: string;
  /**
   * Other codes that are genuinely defensible for these duties, if any.
   *
   * Use this ONLY where Statistics Canada itself does not draw a clean line between two
   * unit groups — never to paper over a case the classifier keeps getting wrong. A corpus
   * case whose answer is a matter of opinion measures nothing; a case with two officially
   * near-identical answers still usefully measures that the classifier stays inside the
   * right pair. Every entry here must justify itself in `why`.
   */
  alsoAcceptable?: readonly string[];
  /** The wrong code this case exists to catch, and why it is tempting. */
  trap: string;
  /** Which lead statement / main duties justify `expected`. */
  why: string;
  provenance: NocCaseProvenance;
}

export const NOC_GOLDEN_CASES: readonly NocGoldenCase[] = [
  {
    id: 'fibre-osp-drafting',
    jobTitle: 'Fibre Optic Network Designer',
    duties: `Prepared outside plant fibre route drawings in AutoCAD from field survey notes and as-built redlines for FTTH builds. Produced splice diagrams, cable schedules and conduit and duct layouts, and issued permit drawing packages to municipalities. Marked up pole line and trench routes on GIS base maps supplied by the survey crew, checked clearances against the engineer's design, and revised drawings through client review cycles. Maintained the drawing register and title blocks and produced final as-built packages for handover. Worked to a stamped design produced by the project engineer; did not size the network, select transmission equipment or perform capacity planning.`,
    expected: '22212',
    trap: '21311 Computer engineers — its example job titles literally include "fibre-optic network designer", which matches the job title exactly while its real duties (network architecture, capacity planning) are the ones this applicant explicitly did not do. Also 22214 geomatics, which TF-IDF ranks #2 on the survey and GIS vocabulary.',
    why: '22212 lead statement: prepares engineering designs, drawings and related technical information in support of engineers. Main duties include developing and preparing engineering drawings from sketches and engineering calculations, and preparing as-built drawings.',
    provenance: 'client-file',
  },
  {
    id: 'clinical-research-coordinator',
    jobTitle: 'Clinical Research Coordinator',
    duties: `Coordinated Phase II and Phase III oncology clinical trials across four hospital sites. Prepared and submitted research ethics board packages, tracked approvals and protocol amendments, and maintained the trial master file to sponsor standard operating procedures. Screened and consented participants using the approved informed consent form, scheduled study visits per protocol, and entered source data into the sponsor's electronic data capture system. Logged and reported adverse events and serious adverse events within protocol timelines, prepared site activation documents and monitoring visit responses, and produced enrolment, deviation and recruitment reports for the principal investigator and the sponsor.`,
    expected: '41404',
    trap: 'Without the clinical-research domain anchor this code is absent from the top 30 entirely — TF-IDF leads with petroleum and mining process operators, because none of "clinical trial", "IRB", "TMF", "informed consent" or "adverse event" appears anywhere in the NOC 2021 text. This case is the load-bearing test for that anchor.',
    why: '41404 lead statement: conduct research, produce reports and administer health care programs. Main duties include designing and implementing health projects or programs and maintaining health information databases.',
    provenance: 'reported-failure',
  },
  {
    id: 'data-science-engineer',
    jobTitle: 'Data Science Engineer',
    duties: `Built and deployed machine learning models to forecast customer churn and lifetime value for a subscription business. Ran large-scale experiments across several years of historical usage data to identify predictive signals, engineered features from unstructured support ticket text using natural language processing, and trained gradient boosting and neural network models in Python. Wrote automated pipelines to retrain and score models weekly and produced automated recommendation outputs consumed by the marketing platform. Presented model findings and their commercial implications to product and finance leadership.`,
    expected: '21211',
    trap: 'Civil engineers. Reported live on 2026-07-19: generic engineering vocabulary ("engineer", "monitor", "optimization") drags traditional engineering groups to the top of TF-IDF, and Civil engineers scored #1 on this exact input.',
    why: '21211 lead statement: use advanced analytics technologies, including machine learning and predictive modelling, to identify trends, scrape information from unstructured data sources and provide automated recommendations — all four elements appear in these duties.',
    provenance: 'reported-failure',
  },
  {
    id: 'bookkeeper-holding-a-degree',
    jobTitle: 'Senior Accountant',
    duties: `Maintained the complete set of books for three related operating companies. Posted journal entries, reconciled bank and credit card accounts monthly, maintained the general ledger and prepared trial balances. Ran semi-monthly payroll for forty staff including statutory deductions and remittances, prepared and filed indirect tax returns, and issued customer invoices and supplier payments. Prepared month-end working schedules and handed the file to the external chartered accountancy firm, which prepared the financial statements and carried out the audit. Holds a Bachelor of Commerce degree.`,
    expected: '12200',
    trap: '11100 Financial auditors and accountants (TEER 1). The job title says "Senior Accountant" and the applicant holds a degree, which is exactly the reasoning IRPR s.80(3) forbids — the test applies "regardless of whether they meet the employment requirements of the occupation". Picking 11100 here inflates the file by one TEER on a fact that is legally irrelevant.',
    why: '12200 lead statement: maintain complete sets of books, keep records of accounts and verify the procedures used for recording financial transactions. The applicant hands the statements and the audit to an external firm, so the 11100 duties (examine and analyze records to ensure compliance, prepare audit findings) were not performed.',
    provenance: 'authored',
  },
  {
    id: 'retail-supervisor-titled-manager',
    jobTitle: 'Store Manager',
    duties: `Supervised a team of twelve sales associates and cashiers on the floor of a big box electronics store. Prepared weekly shift schedules, assigned staff to departments and daily sales targets, and covered the customer service desk. Authorized refunds, exchanges and price overrides within limits set by head office. Trained new hires on the point of sale system and store procedures, resolved escalated customer complaints, and prepared daily sales and staffing reports for the store's general manager. Ordered stock replenishment against templates set centrally. Had no authority over pricing strategy, operating budgets, hiring decisions or the store's business plan.`,
    expected: '62010',
    trap: '60020 Retail and wholesale trade managers (TEER 0). The job title is "Store Manager" and TEER 0 is worth more in every programme, which is precisely why this is the most common voluntary inflation in retail files. The duties are supervision, not management.',
    why: "62010 lead statement: supervise and coordinate the activities of retail salespersons and cashiers. Main duties include supervising sales staff and cashiers, assigning workers to duties, preparing work schedules and authorizing payments and the return of merchandise. The 60020 duties (plan, direct and evaluate the operations of the establishment, study market research to determine consumer demand) are explicitly outside this applicant's authority.",
    provenance: 'authored',
  },
  {
    id: 'genuine-construction-manager',
    jobTitle: 'Project Manager',
    duties: `Directed residential and light commercial construction projects from tender through handover for a mid sized builder. Prepared construction budget estimates and project schedules, negotiated and awarded subcontracts, and controlled project cost against budget with monthly forecasting. Hired and supervised site superintendents and coordinated trades, consulting engineers and municipal inspectors. Established and enforced the site health and safety program, resolved design and scope disputes with the client, and reported project performance and profitability to the company's general manager.`,
    expected: '70010',
    trap: 'The mirror image of the retail case, and it is in the corpus for exactly that reason. A classifier that learns to correct for title inflation by always preferring the lower TEER would pass the retail case and fail this one. Under-classification is a refusal too.',
    why: '70010 lead statement: plan, organize, direct, control and evaluate the activities of a construction company or department under the direction of a general manager. Main duties include preparing construction project budget estimates, planning schedules and milestones, and hiring and supervising staff — all present here with real budget and hiring authority.',
    provenance: 'authored',
  },
  {
    id: 'nurse-aide-not-lpn',
    jobTitle: 'Patient Care Assistant',
    duties: `Assisted registered nurses on a thirty bed long term care unit. Answered call bells, bathed, dressed and groomed residents, assisted with toileting and transferred residents using mechanical lifts. Served meal trays, assisted residents with feeding and recorded fluid intake and output. Took and recorded blood pressure, temperature and pulse and reported any change in a resident's condition to the charge nurse. Made beds, maintained supply levels on the unit and accompanied residents to appointments. Did not administer medication, start intravenous lines or perform wound care.`,
    expected: '33102',
    trap: '32101 Licensed practical nurses (TEER 2 rather than TEER 3). The vocabulary overlaps almost completely — vital signs, patient care, nursing unit — and TEER 2 clears more programme thresholds than TEER 3, so the incentive points the wrong way.',
    why: '33102 lead statement: assist nurses, hospital staff and physicians in the basic care of patients. Its main duties are these duties almost line for line. The 32101 duties that distinguish an LPN (nursing interventions within a defined scope of practice, sterile dressings, medication administration) are explicitly excluded here.',
    provenance: 'authored',
  },
  {
    id: 'administrative-officer',
    jobTitle: 'Office Administrator',
    duties: `Oversaw office administrative procedures for a sixty person regional office. Established work priorities and deadlines, reviewed and rewrote administrative procedures, and coordinated the acquisition of office space, furniture, equipment and security services. Administered the office budget, prepared and reviewed purchase orders and service contracts, and negotiated terms with suppliers. Compiled operational data and prepared analyses and recommendation reports for the regional director. Coordinated records management across the office and administered the policy governing release of records under privacy legislation.`,
    expected: '13100',
    trap: '12010 Supervisors, general office and administrative support workers. Both sit in office administration and share most of their vocabulary; the difference is that 12010 supervises a named group of clerical workers while 13100 owns the administrative function itself.',
    why: '13100 lead statement: oversee and implement administrative procedures, establish work priorities, conduct analyses of administrative operations and coordinate acquisition of administrative services such as office space, supplies and security services — the duties track the lead statement clause by clause.',
    provenance: 'authored',
  },
  {
    id: 'software-developer-not-architect',
    jobTitle: 'Software Engineer',
    duties: `Designed, wrote and tested application code for a logistics platform in TypeScript and Go. Translated product requirements into module level technical designs, implemented REST APIs and background job workers, and wrote unit and integration tests. Debugged and corrected defects reported from production, reviewed teammates' pull requests, and refactored legacy modules to reduce failure rates. Prepared technical documentation for the modules I owned and supported deployments and diagnostics during release windows. Built to the system architecture set by the team's principal architect; did not define system architecture, evaluate technology stacks or set engineering standards.`,
    expected: '21230',
    alsoAcceptable: ['21232'],
    trap: 'The real trap is 21231 Software engineers and designers. The job title is literally "Software Engineer", 21231 ranked FIRST in the unaided public shortlist, and it is the architecture code — the one thing the final sentence of these duties rules out. Classifying an ordinary developer there is inflation an employment reference letter saying "wrote and tested code" cannot support.',
    why: '21230 lead statement: write, modify, integrate and test computer code for software applications and data processing applications — six of its eight main duties are present. 21232 is accepted alongside it because NOC 2021 does not cleanly separate the two: 21232 leads with "design, write, and test code for new systems and software", which also fits. Its duty list leans to game and multimedia work (duty 4 is animation software for interactive video games, duty 6 is gameplay features) while its example titles include "software developer" — the official text points both ways at once. Measured across two live eval runs on 2026-08-18 the classifier returned 21230 once and 21232 once on identical input, which is the honest signature of a distinction the source does not draw. Both are TEER 1, so the choice between them changes nothing for eligibility, CRS or category draws. What DOES matter is that neither run drifted to 21231, and that is what this case now asserts.',
    provenance: 'reported-failure',
  },
  {
    id: 'electrical-engineering-technologist',
    jobTitle: 'Controls Technician',
    duties: `Provided technical support for industrial control and power distribution systems at a manufacturing plant. Tested and commissioned PLC controlled motor control centres, calibrated instrumentation loops, and carried out insulation and continuity testing on switchgear. Built and tested prototype control panels to the engineer's drawings, recorded test data and prepared inspection reports. Diagnosed faults in variable frequency drives and sensor networks and supervised the electricians carrying out repairs. Maintained equipment records and updated schematics after modifications. Worked under a professional engineer who sealed the designs.`,
    expected: '22310',
    trap: 'This code sat at rank 29 of 30 in a measured shortlist on 2026-08-18 — inside the admin top 60 but only barely inside the public top 30. It is in the corpus as an early warning: if a retrieval change pushes it off the shortlist, the classifier silently loses the ability to return it at all.',
    why: '22310 lead statement: provide technical support and services in the design, development, testing, production and operation of electrical and electronic equipment and systems. Main duties include supervising the building and testing of prototypes to established standards.',
    provenance: 'authored',
  },
];
