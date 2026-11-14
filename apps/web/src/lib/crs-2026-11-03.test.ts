import { describe, it, expect } from 'vitest';
import {
  calculate,
  highWageLevel,
  isSkilledTrade,
  CRS_MAX_TOTAL,
  type ApplicantProfile,
} from './crs-calculator';

// Express Entry rules in force since 3 November 2026. Every expected value
// below comes from canada.ca, read on 2026-11-12:
//   - crs-criteria.html (modified 2026-11-03): LMI tables, 570/530 core,
//     Section C pair caps, second-language 22/24, first-language CLB 4 = 6
//   - express-entry/changes.html (2026-10-16): 12 months / 1,560 hours,
//     "higher of work or job offer, not both"
//   - check-score/high-wage.html (2026-10-16): the high-wage list and levels
//   - documents/job-offer.html (2026-11-03): no LMIA; funds exemption wording
//   - federal-skilled-workers.html (2026-11-03): FSW grid tables
//   - Ministerial Instructions s.8(2): CRS maximum 1,270

const celpip = (l: number, r: number, w: number, s: number) =>
  ({
    testType: 'CELPIP',
    listening: l,
    reading: r,
    writing: w,
    speaking: s,
  }) as const;

const base: ApplicantProfile = {
  name: 'Test',
  age: 29,
  nocCode: '21231',
  nocTeer: 1,
  occupationTitle: 'Software engineer',
  countryOfCitizenship: 'India',
  countryOfResidence: 'India',
  reportDate: '2026-11-12',
  education: 'bachelors',
  hasEca: true,
  firstLanguageScores: celpip(9, 9, 9, 9),
  hasSecondLanguage: false,
  foreignWorkExperienceYears: 0,
  canadianWorkExperienceYears: 0,
  hasSpouse: false,
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 0,
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
};

const make = (p: Partial<ApplicantProfile>): ApplicantProfile => ({
  ...base,
  ...p,
});
const lmiOf = (p: Partial<ApplicantProfile>) =>
  calculate(make(p)).breakdown.lmi;

describe('high-wage list (check-score/high-wage.html, list dated 2026-10-16)', () => {
  it('reads levels by NOC code, 0 when not listed', () => {
    expect(highWageLevel('20012')).toBe(1);
    expect(highWageLevel('21231')).toBe(2);
    expect(highWageLevel('21211')).toBe(2);
    expect(highWageLevel('11100')).toBe(3);
    expect(highWageLevel('62020')).toBe(0);
    expect(highWageLevel('12011')).toBe(0);
    expect(highWageLevel(undefined)).toBe(0);
  });
  it('CRS maximum is 1,270', () => {
    expect(CRS_MAX_TOTAL).toBe(1270);
    expect(calculate(base).maxTotal).toBe(1270);
  });
  it('skilled trades follow the FST groups', () => {
    expect(isSkilledTrade('72201')).toBe(true);
    expect(isSkilledTrade('62200')).toBe(true);
    expect(isSkilledTrade('63200')).toBe(true);
    expect(isSkilledTrade('72600')).toBe(false); // sub-major group 726 excluded
    expect(isSkilledTrade('93200')).toBe(false); // sub-major group 932 excluded
    expect(isSkilledTrade('21231')).toBe(false);
  });
});

describe('Labour Market Integration factor — golden vectors T1 to T10', () => {
  it('T1 single, 36 months in 21231 (level 2): 64 + 40 = 104', () => {
    const l = lmiOf({
      canadianWorkExperienceYears: 3,
      canadianJobs: [{ nocCode: '21231', months: 36 }],
    });
    expect(l.awarded).toBe(104);
    expect(l.option).toBe('work');
  });
  it('T2 with spouse, 5+ years in 31102 (level 1): 70 + 70 = 140', () => {
    const l = lmiOf({
      hasSpouse: true,
      canadianWorkExperienceYears: 5,
      canadianJobs: [{ nocCode: '31102', months: 60 }],
    });
    expect(l.awarded).toBe(140);
  });
  it('T3 single, 12 months in 21232 (80) vs offer in 20012 (100): offer wins', () => {
    const l = lmiOf({
      canadianWorkExperienceYears: 1,
      canadianJobs: [{ nocCode: '21232', months: 12 }],
      hasJobOffer: 'valid',
      jobOfferNocCode: '20012',
    });
    expect(l.workLengthPoints + l.highWagePoints).toBe(80);
    expect(l.awarded).toBe(100);
    expect(l.option).toBe('offer');
  });
  it('T4 single, no Canadian work, offer in 11100 (level 3): 50', () => {
    expect(
      lmiOf({ hasJobOffer: 'valid', jobOfferNocCode: '11100' }).awarded,
    ).toBe(50);
  });
  it('T5 with spouse, 24 months in 62020 (not listed): 46', () => {
    expect(
      lmiOf({
        hasSpouse: true,
        canadianWorkExperienceYears: 2,
        canadianJobs: [{ nocCode: '62020', months: 24 }],
      }).awarded,
    ).toBe(46);
  });
  it('T6 single, 6 months level 1 + 6 months level 2: 40 + 40 = 80', () => {
    const l = lmiOf({
      canadianWorkExperienceYears: 1,
      canadianJobs: [
        { nocCode: '20012', months: 6 },
        { nocCode: '21231', months: 6 },
      ],
    });
    expect(l.highWageLevel).toBe(2);
    expect(l.awarded).toBe(80);
  });
  it('T7 single, 11 months in 20012: 0', () => {
    expect(
      lmiOf({
        canadianWorkExperienceYears: 11 / 12,
        canadianJobs: [{ nocCode: '20012', months: 11 }],
      }).awarded,
    ).toBe(0);
  });
  it('T8 single, 24 months in 11100 (53 + 20 = 73) vs offer level 3 (50): 73', () => {
    expect(
      lmiOf({
        canadianWorkExperienceYears: 2,
        canadianJobs: [{ nocCode: '11100', months: 24 }],
        hasJobOffer: 'valid',
        jobOfferNocCode: '11100',
      }).awarded,
    ).toBe(73);
  });
  it('T9 with spouse, 5+ years in 21231 (70 + 40 = 110) vs offer level 1 (100): 110', () => {
    expect(
      lmiOf({
        hasSpouse: true,
        canadianWorkExperienceYears: 5,
        canadianJobs: [{ nocCode: '21231', months: 60 }],
        hasJobOffer: 'valid',
        jobOfferNocCode: '20012',
      }).awarded,
    ).toBe(110);
  });
  it('T10 valid offer in 12011 (TEER 2, not listed): 0 CRS, but FSW arranged employment 10', () => {
    const r = calculate(
      make({ hasJobOffer: 'valid', jobOfferNocCode: '12011' }),
    );
    expect(r.breakdown.lmi.awarded).toBe(0);
    expect(r.fswGrid.arrangedEmployment).toBe(10);
  });
  it('single maximum: 5+ years at level 1 = 80 + 70 = 150', () => {
    expect(
      lmiOf({
        canadianWorkExperienceYears: 6,
        canadianJobs: [{ nocCode: '20012', months: 72 }],
      }).awarded,
    ).toBe(150);
  });
  it('high-wage months never exceed the Canadian work entered', () => {
    expect(
      lmiOf({
        canadianWorkExperienceYears: 0.5,
        canadianJobs: [{ nocCode: '20012', months: 24 }],
      }).highWagePoints,
    ).toBe(0);
  });
  it('ruling D1: overlapping high-wage jobs hold the tier for review', () => {
    const l = lmiOf({
      canadianWorkExperienceYears: 1,
      canadianJobs: [
        { nocCode: '20012', months: 12 },
        { nocCode: '21231', months: 12 },
      ],
      canadianJobsOverlap: true,
    });
    expect(l.highWageHeldForReview).toBe(true);
    expect(l.highWagePoints).toBe(0);
    expect(l.awarded).toBe(40);
  });
  it('a job offer never adds to Section C (transferability uses work-length years)', () => {
    const without = calculate(make({ foreignWorkExperienceYears: 3 }));
    const withOffer = calculate(
      make({
        foreignWorkExperienceYears: 3,
        hasJobOffer: 'valid',
        jobOfferNocCode: '20012',
      }),
    );
    expect(withOffer.breakdown.transferTotal).toBe(
      without.breakdown.transferTotal,
    );
    expect(withOffer.breakdown.total - without.breakdown.total).toBe(100);
  });
});

describe('older scoring defects fixed in the same pass', () => {
  it('first language CLB 4 earns 6 per ability (CLB 4 or 5 = 6)', () => {
    const r = calculate(make({ firstLanguageScores: celpip(4, 4, 4, 4) }));
    expect(r.breakdown.firstLanguagePoints).toBe(24);
  });
  it('FSW work experience: 3 years = 11, 4 years = 13, 6 years = 15', () => {
    expect(
      calculate(make({ foreignWorkExperienceYears: 3 })).fswGrid.workExperience,
    ).toBe(11);
    expect(
      calculate(make({ foreignWorkExperienceYears: 4 })).fswGrid.workExperience,
    ).toBe(13);
    expect(
      calculate(make({ foreignWorkExperienceYears: 6 })).fswGrid.workExperience,
    ).toBe(15);
  });
  it('FSW work experience counts Canadian years too', () => {
    expect(
      calculate(
        make({ foreignWorkExperienceYears: 1, canadianWorkExperienceYears: 1 }),
      ).fswGrid.workExperience,
    ).toBe(11);
  });
  it('FSW age: 43 = 4, 46 = 1, 47 = 0', () => {
    expect(calculate(make({ age: 43 })).fswGrid.age).toBe(4);
    expect(calculate(make({ age: 46 })).fswGrid.age).toBe(1);
    expect(calculate(make({ age: 47 })).fswGrid.age).toBe(0);
  });
  it('FSW second language: 4 only with CLB 5+ in all four abilities', () => {
    const tef = (s: number) => ({
      testType: 'TEF' as const,
      listening: s,
      reading: 200,
      writing: 300,
      speaking: 300,
    });
    // TEF listening 181 = CLB 5; reading 200 = CLB 6; writing/speaking 300 = CLB 6
    const allFive = calculate(
      make({ hasSecondLanguage: true, secondLanguageScores: tef(181) }),
    );
    expect(allFive.fswGrid.language).toBe(24 + 4);
    // listening 150 = CLB 4: not all four at CLB 5
    const notAll = calculate(
      make({ hasSecondLanguage: true, secondLanguageScores: tef(150) }),
    );
    expect(notAll.fswGrid.language).toBe(24);
  });
  it("Section C education pair capped at 50 (master's, CLB 9, 2 years Canadian)", () => {
    const r = calculate(
      make({ education: 'masters', canadianWorkExperienceYears: 2 }),
    );
    expect(r.breakdown.eduLanguageTransfer).toBe(50);
    expect(r.breakdown.eduCanadianExpTransfer).toBe(50);
    expect(r.breakdown.transferTotal).toBe(50);
  });
  it('Section C: both pairs at 50 reach the 100 cap', () => {
    const r = calculate(
      make({
        education: 'masters',
        canadianWorkExperienceYears: 2,
        foreignWorkExperienceYears: 3,
      }),
    );
    expect(r.breakdown.transferTotal).toBe(100);
  });
  it('second official language capped at 22 with a spouse, 24 single', () => {
    const french = {
      testType: 'TEF' as const,
      listening: 316,
      reading: 263,
      writing: 393,
      speaking: 393,
    };
    expect(
      calculate(make({ hasSecondLanguage: true, secondLanguageScores: french }))
        .breakdown.secondLanguagePoints,
    ).toBe(24);
    expect(
      calculate(
        make({
          hasSpouse: true,
          hasSecondLanguage: true,
          secondLanguageScores: french,
        }),
      ).breakdown.secondLanguagePoints,
    ).toBe(22);
  });
  it('certificate of qualification: CLB 7+ all four = 50, CLB 5-6 = 25', () => {
    const cert = (l: number) =>
      calculate(
        make({
          nocCode: '72201',
          nocTeer: 2,
          hasCertificateOfQualification: true,
          firstLanguageScores: celpip(l, l, l, l),
        }),
      ).breakdown.certificateTransfer;
    expect(cert(7)).toBe(50);
    expect(cert(5)).toBe(25);
    expect(cert(4)).toBe(0);
  });
  it('CEC language minimum: CLB 5 for TEER 2-3, CLB 7 for TEER 0-1', () => {
    const teer2 = calculate(
      make({
        nocCode: '62020',
        nocTeer: 2,
        canadianWorkExperienceYears: 1,
        firstLanguageScores: celpip(5, 5, 5, 5),
      }),
    );
    expect(teer2.eligibility.cec.eligible).toBe(true);
    const teer1 = calculate(
      make({
        canadianWorkExperienceYears: 1,
        firstLanguageScores: celpip(5, 5, 5, 5),
      }),
    );
    expect(teer1.eligibility.cec.eligible).toBe(false);
  });
  it('FST: trade + 2 years + CLB 5 S/L and 4 R/W + certificate or valid offer', () => {
    const trade = {
      nocCode: '72201',
      nocTeer: 2 as const,
      foreignWorkExperienceYears: 2,
      firstLanguageScores: celpip(5, 4, 4, 5),
    };
    expect(
      calculate(make({ ...trade, hasCertificateOfQualification: true }))
        .eligibility.fst.eligible,
    ).toBe(true);
    expect(
      calculate(
        make({ ...trade, hasJobOffer: 'valid', jobOfferNocCode: '72201' }),
      ).eligibility.fst.eligible,
    ).toBe(true);
    expect(calculate(make(trade)).eligibility.fst.eligible).toBe(false);
    expect(calculate(base).eligibility.fst.eligible).toBe(false);
  });
});

describe('job offers and proof of funds since 3 November 2026', () => {
  it('ruling D6: a valid job offer removes the proof-of-funds requirement', () => {
    const r = calculate(
      make({
        hasJobOffer: 'valid',
        jobOfferNocCode: '21231',
        settlementFunds: 0,
      }),
    );
    expect(r.proofOfFundsExempt).toBe(true);
    expect(r.proofOfFundsSufficient).toBe(true);
  });
  it('CEC applicants do not need proof of funds', () => {
    const r = calculate(
      make({ canadianWorkExperienceYears: 1, settlementFunds: 0 }),
    );
    expect(r.proofOfFundsExempt).toBe(true);
  });
  it('without an offer or CEC, funds below the table are insufficient', () => {
    const r = calculate(
      make({ foreignWorkExperienceYears: 3, settlementFunds: 0 }),
    );
    expect(r.proofOfFundsExempt).toBe(false);
    expect(r.proofOfFundsSufficient).toBe(false);
  });
  it('FSW arranged employment: 10 points plus 5 adaptability for a valid TEER 0-3 offer', () => {
    const r = calculate(
      make({ hasJobOffer: 'valid', jobOfferNocCode: '21231' }),
    );
    expect(r.fswGrid.arrangedEmployment).toBe(10);
    expect(r.fswGrid.adaptability).toBe(5);
  });
  it('FSW arranged employment: an offer in a TEER 4-5 job earns nothing', () => {
    const r = calculate(
      make({ hasJobOffer: 'valid', jobOfferNocCode: '64100' }),
    );
    expect(r.fswGrid.arrangedEmployment).toBe(0);
  });
  it('FSW adaptability: your own 1+ year of Canadian work is worth 10 (six selection factors page)', () => {
    expect(
      calculate(make({ canadianWorkExperienceYears: 1 })).fswGrid.adaptability,
    ).toBe(10);
  });
  it('every scenario delta equals the real re-scored gain (Section C caps applied)', () => {
    // Probe from the independent review: master's, CLB 9, 3 years foreign work.
    const p = make({ education: 'masters', foreignWorkExperienceYears: 3 });
    const now = calculate(p);
    const cwe = now.scenarios.find(
      (x) => x.name === 'Obtain 1 Year of Canadian Work Experience',
    );
    const withWork = calculate({
      ...p,
      canadianWorkExperienceYears: 1,
      canadianJobs: [{ nocCode: p.nocCode, months: 12 }],
    });
    expect(cwe?.delta).toBe(withWork.breakdown.total - now.breakdown.total);
    expect(cwe?.delta).toBe(80); // 40 work-length + 40 high-wage; Section C already at its caps
  });
  it('FSW adaptability counts the spouse elements and caps at 10', () => {
    const r = calculate(
      make({
        hasSpouse: true,
        spouseLanguageScores: celpip(4, 4, 4, 4),
        spouseHasCanadianStudy: true,
        spouseCanadianExperience: 1,
      }),
    );
    expect(r.fswGrid.adaptability).toBe(10);
  });
  it('scenario: a high-wage offer in the primary occupation is shown with its real gain', () => {
    const r = calculate(base); // NOC 21231 = level 2, no Canadian work
    const s = r.scenarios.find(
      (x) => x.name === 'Qualifying High-Wage Job Offer',
    );
    expect(s?.delta).toBe(70);
  });
});
