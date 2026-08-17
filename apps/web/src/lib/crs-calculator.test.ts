import { describe, it, expect } from 'vitest';
import {
  calculate,
  scoresToClb,
  type ApplicantProfile,
  type LanguageScores,
} from './crs-calculator';
import fundsData from './proof-of-funds.json';

// Ground-truth test profile derived from the verified HTML report for Kishore Sai.
// All expected values are confirmed outputs from the CanVisa Pro HTML tool.
const kishoreProfile: ApplicantProfile = {
  name: 'Kishore Sai',
  age: 26,
  nocCode: '21211',
  nocTeer: 1,
  occupationTitle: 'Data Scientist',
  countryOfCitizenship: 'India',
  countryOfResidence: 'USA',
  reportDate: '2026-02-27',
  education: 'masters',
  hasEca: true,
  firstLanguageScores: {
    testType: 'IELTS_GT',
    listening: 8.0,
    reading: 8.5,
    writing: 7.0,
    speaking: 7.0,
  },
  hasSecondLanguage: false,
  foreignWorkExperienceYears: 2.25,
  canadianWorkExperienceYears: 0,
  hasSpouse: false,
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 16000,
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
};

describe('scoresToClb — IELTS GT conversion', () => {
  it('converts IELTS GT L:8.0, R:8.5, W:7.0, S:7.0 to CLB 9/10/9/9', () => {
    const scores: LanguageScores = {
      testType: 'IELTS_GT',
      listening: 8.0,
      reading: 8.5,
      writing: 7.0,
      speaking: 7.0,
    };
    const bands = scoresToClb(scores);
    expect(bands.listening).toBe(9);
    expect(bands.reading).toBe(10);
    expect(bands.writing).toBe(9);
    expect(bands.speaking).toBe(9);
  });

  it('converts CLB 7 boundary correctly — minimum scores for CLB 7 in all abilities', () => {
    // Per IRCC IELTS GT table: CLB 7 = L≥6.0, R≥6.0, W≥6.0, S≥6.0.
    // W/S=5.5 maps to CLB 6, not 7. 6.0 is the true CLB 7 floor.
    const scores: LanguageScores = {
      testType: 'IELTS_GT',
      listening: 6.0,
      reading: 6.0,
      writing: 6.0,
      speaking: 6.0,
    };
    const bands = scoresToClb(scores);
    expect(bands.listening).toBe(7);
    expect(bands.reading).toBe(7);
    expect(bands.writing).toBe(7);
    expect(bands.speaking).toBe(7);
  });

  it('converts CLB 10 for IELTS GT L:8.5, R:8.0, W:7.5, S:7.5', () => {
    const scores: LanguageScores = {
      testType: 'IELTS_GT',
      listening: 8.5,
      reading: 8.0,
      writing: 7.5,
      speaking: 7.5,
    };
    const bands = scoresToClb(scores);
    expect(bands.listening).toBe(10);
    expect(bands.reading).toBe(10);
    expect(bands.writing).toBe(10);
    expect(bands.speaking).toBe(10);
  });
});

describe('scoresToClb — CELPIP conversion', () => {
  it('converts CELPIP 9 in all abilities to CLB 9', () => {
    const scores: LanguageScores = {
      testType: 'CELPIP',
      listening: 9,
      reading: 9,
      writing: 9,
      speaking: 9,
    };
    const bands = scoresToClb(scores);
    expect(bands.listening).toBe(9);
    expect(bands.reading).toBe(9);
  });
});

describe('scoresToClb — TCF Canada conversion', () => {
  it('converts CLB 10 boundary scores correctly (L/R: 549, W/S: 16)', () => {
    const scores: LanguageScores = {
      testType: 'TCF',
      listening: 549,
      reading: 549,
      writing: 16,
      speaking: 16,
    };
    const bands = scoresToClb(scores);
    expect(bands.listening).toBe(10);
    expect(bands.reading).toBe(10);
    expect(bands.writing).toBe(10);
    expect(bands.speaking).toBe(10);
  });

  it('converts CLB 7 boundary scores correctly (L: 458, R: 453, W/S: 10)', () => {
    const scores: LanguageScores = {
      testType: 'TCF',
      listening: 458,
      reading: 453,
      writing: 10,
      speaking: 10,
    };
    const bands = scoresToClb(scores);
    expect(bands.listening).toBe(7);
    expect(bands.reading).toBe(7);
    expect(bands.writing).toBe(7);
    expect(bands.speaking).toBe(7);
  });

  it('returns CLB 0 for scores below CLB 4 threshold', () => {
    const scores: LanguageScores = {
      testType: 'TCF',
      listening: 100,
      reading: 100,
      writing: 1,
      speaking: 1,
    };
    const bands = scoresToClb(scores);
    expect(bands.listening).toBe(0);
    expect(bands.reading).toBe(0);
    expect(bands.writing).toBe(0);
    expect(bands.speaking).toBe(0);
  });
});

describe('calculate — Kishore Sai ground-truth verification', () => {
  const result = calculate(kishoreProfile);

  it('produces correct CLB bands for first language', () => {
    expect(result.firstLanguageBands.listening).toBe(9);
    expect(result.firstLanguageBands.reading).toBe(10);
    expect(result.firstLanguageBands.writing).toBe(9);
    expect(result.firstLanguageBands.speaking).toBe(9);
  });

  it('Section A: age 26 = 110 points', () => {
    expect(result.breakdown.agePoints).toBe(110);
  });

  it("Section A: Master's = 135 points", () => {
    expect(result.breakdown.educationPoints).toBe(135);
  });

  it('Section A: CLB 9/10/9/9 first language = 127 points', () => {
    // 3 abilities at CLB 9 (31 pts each) + 1 at CLB 10 (34 pts) = 127
    expect(result.breakdown.firstLanguagePoints).toBe(127);
  });

  it('Section A: no Canadian experience = 0 points', () => {
    expect(result.breakdown.canadianExpPoints).toBe(0);
  });

  it('Section A: core total = 372', () => {
    expect(result.breakdown.coreTotal).toBe(372);
  });

  it("Section C: Master's + CLB 9+ language transferability = 50", () => {
    expect(result.breakdown.eduLanguageTransfer).toBe(50);
  });

  it('Section C: 2.25yr FWE + CLB 9+ language transferability = 25', () => {
    expect(result.breakdown.foreignExpLanguageTransfer).toBe(25);
  });

  it('Section C: transferability total = 75', () => {
    expect(result.breakdown.transferTotal).toBe(75);
  });

  it('CRS grand total = 447', () => {
    expect(result.breakdown.total).toBe(447);
  });

  it('full CrsResult snapshot — locks all sections, eligibility, scenarios, and improvements', () => {
    expect(result).toMatchSnapshot();
  });
});

describe('calculate — FSW 67-point grid', () => {
  const result = calculate(kishoreProfile);

  it('FSW language (CLB 9/10/9/9, no second language) = 24', () => {
    expect(result.fswGrid.language).toBe(24);
  });

  it("FSW education (Master's) = 23", () => {
    expect(result.fswGrid.education).toBe(23);
  });

  it('FSW work experience (2.25yr → 2yr tier) = 11', () => {
    expect(result.fswGrid.workExperience).toBe(11);
  });

  it('FSW age (26) = 12', () => {
    expect(result.fswGrid.age).toBe(12);
  });

  it('FSW adaptability (no Canadian ties) = 0', () => {
    expect(result.fswGrid.adaptability).toBe(0);
  });

  it('FSW total = 70, eligible = true', () => {
    expect(result.fswGrid.total).toBe(70);
    expect(result.fswGrid.eligible).toBe(true);
  });
});

describe('calculate — stream eligibility', () => {
  const result = calculate(kishoreProfile);

  it('FSW eligible (TEER 1, 67-point grid passed, CLB 7+)', () => {
    expect(result.eligibility.fsw.eligible).toBe(true);
  });

  it('CEC not eligible (no Canadian work experience)', () => {
    expect(result.eligibility.cec.eligible).toBe(false);
  });

  it('FST not eligible (NOC 21211 is not a trade)', () => {
    expect(result.eligibility.fst.eligible).toBe(false);
  });

  it('Express Entry pool eligible', () => {
    expect(result.eligibility.expressEntryPool.eligible).toBe(true);
  });
});

describe('calculate — ECA pending on foreign education (regression: /assessment 2026-08-17)', () => {
  // Reproduces the exact profile from a live production report ("Deep Sagar")
  // — Bachelor's degree from India, ECA checkbox left unchecked. hasEca was
  // captured by the form but never read by the calculator: a dead field, so
  // the report showed a full, unflagged score identical to an ECA-confirmed
  // applicant's. Per canada.ca (educational-credential-assessment page,
  // verified 2026-08-17), a completed ECA is required to actually earn
  // foreign-education CRS points or apply under FSW. Prash's call (2026-08-17):
  // this self-serve tool is not a submission, so it scores the declared
  // education AS IF the ECA will confirm it, rather than zeroing it — but
  // every consumer must surface CrsResult.ecaPending as a visible caveat
  // wherever the affected numbers are shown.
  const noEcaProfile: ApplicantProfile = {
    name: 'Deep Sagar',
    age: 27,
    nocCode: '21231',
    nocTeer: 1,
    occupationTitle: 'Software Engineer',
    countryOfCitizenship: 'India',
    countryOfResidence: 'India',
    reportDate: '2026-08-17',
    education: 'bachelors',
    hasEca: false,
    firstLanguageScores: {
      testType: 'IELTS_GT',
      listening: 8.0,
      reading: 7.0,
      writing: 7.0,
      speaking: 7.0,
    },
    hasSecondLanguage: false,
    foreignWorkExperienceYears: 4,
    canadianWorkExperienceYears: 0,
    hasSpouse: false,
    hasProvincialNomination: false,
    hasCanadianEducation: false,
    hasFamilyInCanada: false,
    hasJobOffer: 'none',
    settlementFunds: 15263,
    familySize: 1,
    hasCriminalRecord: false,
    hasMedicalCondition: false,
    hasPriorRefusal: false,
  };

  it('ecaPending is true, and scores are unaffected by the missing ECA', () => {
    const result = calculate(noEcaProfile);
    expect(result.ecaPending).toBe(true);
    expect(result.breakdown.educationPoints).toBe(120);
    expect(result.fswGrid.education).toBe(21);
    expect(result.fswGrid.total).toBe(70);
  });

  it('FSW and Express Entry Pool are still eligible (provisional, not blocked)', () => {
    const result = calculate(noEcaProfile);
    expect(result.eligibility.fsw.eligible).toBe(true);
    expect(result.eligibility.expressEntryPool.eligible).toBe(true);
  });

  it('FSW and pool reasons carry an explicit provisional/ECA caveat', () => {
    const result = calculate(noEcaProfile);
    expect(result.eligibility.fsw.reason).toMatch(/[Pp]rovisional.*ECA/);
    expect(result.eligibility.expressEntryPool.reason).toMatch(
      /[Pp]rovisional.*ECA/,
    );
  });

  it('same profile WITH an ECA confirmed carries no caveat', () => {
    const result = calculate({ ...noEcaProfile, hasEca: true });
    expect(result.ecaPending).toBe(false);
    expect(result.eligibility.fsw.reason).not.toMatch(/ECA/);
    expect(result.eligibility.expressEntryPool.reason).not.toMatch(/ECA/);
  });

  it('less-than-secondary education never flags ecaPending (nothing to assess)', () => {
    const result = calculate({
      ...noEcaProfile,
      education: 'less_than_secondary',
    });
    expect(result.ecaPending).toBe(false);
  });

  // A single bachelor's degree was wrongly classified with the "2+ credentials /
  // master's / doctoral" transferability tier (25/50 pts), doubling the real
  // canada.ca tier for "one credential, 1yr+" (13/25 pts) that a lone bachelor's
  // degree actually falls into. Cross-checked against the applicant's live IRCC
  // CRS calculator screenshot: Skill Transferability = 75, not 100; total CRS =
  // 429, not 454. Verified against canada.ca check-score/crs-criteria.html
  // (2026-08-17): only "two or more post-secondary credentials (one 3yr+)",
  // master's, and doctoral get the 25/50 tier — a single credential of any
  // length, bachelor's included, gets 13/25.
  it('single bachelors degree gets the 25pt (not 50pt) education+language tier', () => {
    const result = calculate(noEcaProfile);
    expect(result.breakdown.eduLanguageTransfer).toBe(25);
    expect(result.breakdown.eduCanadianExpTransfer).toBe(0); // 0 Canadian experience
    expect(result.breakdown.foreignExpLanguageTransfer).toBe(50); // 4yr foreign, CLB9+
    expect(result.breakdown.transferTotal).toBe(75);
  });

  it('two_or_more_degrees still gets the higher 50pt tier', () => {
    const result = calculate({
      ...noEcaProfile,
      education: 'two_or_more_degrees',
    });
    expect(result.breakdown.eduLanguageTransfer).toBe(50);
  });

  it('masters and doctoral also stay in the higher 50pt tier', () => {
    const masters = calculate({ ...noEcaProfile, education: 'masters' });
    const doctoral = calculate({ ...noEcaProfile, education: 'doctoral' });
    expect(masters.breakdown.eduLanguageTransfer).toBe(50);
    expect(doctoral.breakdown.eduLanguageTransfer).toBe(50);
  });

  it('one/two-year post-secondary is unaffected, still 25pt tier', () => {
    const result = calculate({
      ...noEcaProfile,
      education: 'one_year_post_secondary',
    });
    expect(result.breakdown.eduLanguageTransfer).toBe(25);
  });
});

describe('calculate — proof of funds', () => {
  const f = fundsData.byFamilySize as Record<string, number>;

  it('single applicant funds required matches proof-of-funds.json', () => {
    const result = calculate(kishoreProfile);
    expect(result.proofOfFundsRequired).toBe(f['1']);
  });

  it('funds sufficient when settlement funds >= required', () => {
    const result = calculate({
      ...kishoreProfile,
      settlementFunds: f['1'] + 1000,
    });
    expect(result.proofOfFundsSufficient).toBe(true);
  });

  it('funds insufficient when below threshold', () => {
    const result = calculate({
      ...kishoreProfile,
      settlementFunds: f['1'] - 1000,
    });
    expect(result.proofOfFundsSufficient).toBe(false);
  });

  it('family of 8 uses extraPerMember increment', () => {
    const result = calculate({ ...kishoreProfile, familySize: 8 });
    expect(result.proofOfFundsRequired).toBe(f['7'] + fundsData.extraPerMember);
  });
});

describe('calculate — provincial nomination', () => {
  it('adds +600 points for provincial nomination', () => {
    const result = calculate({
      ...kishoreProfile,
      hasProvincialNomination: true,
    });
    expect(result.breakdown.total).toBe(447 + 600);
  });

  it('full CrsResult snapshot — locks complete nominated-applicant output including Section D', () => {
    expect(
      calculate({ ...kishoreProfile, hasProvincialNomination: true }),
    ).toMatchSnapshot();
  });
});

describe('calculate — age boundary cases', () => {
  it('age 45+ returns 0 age points', () => {
    const result = calculate({ ...kishoreProfile, age: 45 });
    expect(result.breakdown.agePoints).toBe(0);
  });

  it('age 30 returns 105 age points', () => {
    const result = calculate({ ...kishoreProfile, age: 30 });
    expect(result.breakdown.agePoints).toBe(105);
  });
});

// Harish Naik — with-spouse profile used to verify Factor B is scored on the correct
// IRCC Factor B tables (not the applicant's Factor A tables).
// Expected: A=290, B=24, C=50, total=364. Source: canada.ca CRS criteria grid.
const harishProfile: ApplicantProfile = {
  name: 'Harish Naik',
  age: 38,
  nocCode: '21211',
  nocTeer: 1,
  occupationTitle: 'Data Scientist',
  countryOfCitizenship: 'India',
  countryOfResidence: 'India',
  reportDate: '2026-05-07',
  education: 'masters',
  hasEca: true,
  firstLanguageScores: {
    testType: 'IELTS_GT',
    listening: 8.0,
    reading: 6.5,
    writing: 7.0,
    speaking: 7.0,
  },
  hasSecondLanguage: false,
  foreignWorkExperienceYears: 6,
  canadianWorkExperienceYears: 0,
  hasSpouse: true,
  spouseEducation: 'masters',
  spouseLanguageScores: {
    testType: 'IELTS_GT',
    listening: 7.0,
    reading: 7.0,
    writing: 6.0,
    speaking: 6.0,
  },
  spouseCanadianExperience: 0,
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 25000,
  familySize: 2,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
};

describe('calculate — Harish Naik with-spouse Factor B verification', () => {
  const result = calculate(harishProfile);

  it('age 38 with spouse = 55 points', () => {
    expect(result.breakdown.agePoints).toBe(55);
  });

  it("education Master's with spouse = 126 points (Factor A WITH SPOUSE table)", () => {
    expect(result.breakdown.educationPoints).toBe(126);
  });

  it('first language CLB 9/8/9/9 with spouse = 109 points', () => {
    expect(result.breakdown.firstLanguagePoints).toBe(109);
  });

  it('Factor B spouse total = 24 (edu=10, lang=14, cwe=0)', () => {
    expect(result.breakdown.spousePoints).toBe(24);
  });

  it('Factor B is capped at reasonable levels (not inflated via Factor A tables)', () => {
    expect(result.breakdown.spousePoints).toBeLessThanOrEqual(40);
  });

  it('core total (A+B) = 314', () => {
    expect(result.breakdown.coreTotal).toBe(314);
  });

  it('Section C: edu+language transferability (Master + minCLB 8) = 25', () => {
    expect(result.breakdown.eduLanguageTransfer).toBe(25);
  });

  it('Section C: foreign exp + language (6yr + minCLB 8) = 25', () => {
    expect(result.breakdown.foreignExpLanguageTransfer).toBe(25);
  });

  it('Section C: transferability total = 50', () => {
    expect(result.breakdown.transferTotal).toBe(50);
  });

  it('CRS grand total = 364', () => {
    expect(result.breakdown.total).toBe(364);
  });

  it('full CrsResult snapshot — locks Factor B tables, spouse transferability, and all sections', () => {
    expect(result).toMatchSnapshot();
  });
});

describe('calculate — Section D bonuses (French + Canadian education)', () => {
  // French scores verified in the TCF conversion tests above:
  //   CLB 7 all four = L458/R453/W10/S10 ; below CLB 4 = L100/R100/W1/S1.
  // Expected point values from canada.ca crs-criteria.html (Additional points, max 600).
  const frenchClb7: LanguageScores = {
    testType: 'TCF',
    listening: 458,
    reading: 453,
    writing: 10,
    speaking: 10,
  };
  const frenchBelow7: LanguageScores = {
    testType: 'TCF',
    listening: 100,
    reading: 100,
    writing: 1,
    speaking: 1,
  };
  const englishClb5: LanguageScores = {
    testType: 'CELPIP',
    listening: 5,
    reading: 5,
    writing: 5,
    speaking: 5,
  };
  const englishClb4: LanguageScores = {
    testType: 'CELPIP',
    listening: 4,
    reading: 4,
    writing: 4,
    speaking: 4,
  };

  it('French bonus = 25 when NCLC 7+ all four and no English test', () => {
    const r = calculate({
      ...kishoreProfile,
      firstLanguageScores: frenchClb7,
      hasSecondLanguage: false,
    });
    expect(r.breakdown.frenchBonusPoints).toBe(25);
  });

  it('French bonus = 25 when NCLC 7+ all four but English below CLB 5', () => {
    const r = calculate({
      ...kishoreProfile,
      firstLanguageScores: frenchClb7,
      hasSecondLanguage: true,
      secondLanguageScores: englishClb4,
    });
    expect(r.breakdown.frenchBonusPoints).toBe(25);
  });

  it('French bonus = 50 when NCLC 7+ all four and English CLB 5+ all four', () => {
    const r = calculate({
      ...kishoreProfile,
      firstLanguageScores: frenchClb7,
      hasSecondLanguage: true,
      secondLanguageScores: englishClb5,
    });
    expect(r.breakdown.frenchBonusPoints).toBe(50);
  });

  it('French bonus = 0 when French below NCLC 7 in any ability', () => {
    const r = calculate({
      ...kishoreProfile,
      firstLanguageScores: frenchBelow7,
      hasSecondLanguage: false,
    });
    expect(r.breakdown.frenchBonusPoints).toBe(0);
  });

  it('French bonus = 0 for an English-only profile', () => {
    expect(calculate(kishoreProfile).breakdown.frenchBonusPoints).toBe(0);
  });

  it('Canadian education bonus = 15 for a one-or-two-year credential', () => {
    const r = calculate({
      ...kishoreProfile,
      canadianEducationLevel: 'one_or_two_year',
    });
    expect(r.breakdown.canadianEducationPoints).toBe(15);
  });

  it('Canadian education bonus = 30 for a three-year-or-longer credential', () => {
    const r = calculate({
      ...kishoreProfile,
      canadianEducationLevel: 'three_year_plus',
    });
    expect(r.breakdown.canadianEducationPoints).toBe(30);
  });

  it('Canadian education bonus = 0 when no Canadian credential', () => {
    expect(calculate(kishoreProfile).breakdown.canadianEducationPoints).toBe(0);
  });

  it('French + sibling add to Section D without PNP (50 + 15 = 65)', () => {
    const r = calculate({
      ...kishoreProfile,
      firstLanguageScores: frenchClb7,
      hasSecondLanguage: true,
      secondLanguageScores: englishClb5,
      hasSiblingInCanada: true,
    });
    expect(r.breakdown.additionalTotal).toBe(65);
  });

  it('Section D is capped at 600 (600 + 15 + 50 + 30 = 695 → 600)', () => {
    const r = calculate({
      ...kishoreProfile,
      firstLanguageScores: frenchClb7,
      hasSecondLanguage: true,
      secondLanguageScores: englishClb5,
      hasProvincialNomination: true,
      hasSiblingInCanada: true,
      canadianEducationLevel: 'three_year_plus',
    });
    expect(r.breakdown.frenchBonusPoints).toBe(50);
    expect(r.breakdown.canadianEducationPoints).toBe(30);
    expect(r.breakdown.additionalTotal).toBe(600);
  });

  it('PNP improvement scenario delta is cap-aware (600 minus existing Section D points)', () => {
    const r = calculate({
      ...kishoreProfile,
      firstLanguageScores: frenchClb7,
      hasSecondLanguage: true,
      secondLanguageScores: englishClb5,
      hasSiblingInCanada: true, // non-PNP Section D = 50 + 15 = 65
    });
    const pnp = r.scenarios.find(
      (s) => s.name === 'Provincial Nomination (PNP)',
    );
    expect(pnp).toBeDefined();
    expect(pnp!.delta).toBe(600 - 65);
  });
});
