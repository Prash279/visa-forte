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

// ─────────────────────────────────────────────────────────────────────────────
// Regression suite for the 2026-08-12 canada.ca re-verification.
// Each block locks one defect that made the engine disagree with the official
// IRCC calculator. Sources: crs-criteria.html, federal-skilled-workers.html,
// federal-skilled-trades.html, language-test.html — all date modified 2026-06-22.
// ─────────────────────────────────────────────────────────────────────────────

// IELTS GT scores that convert to CLB 9 in all four abilities.
const clb9: LanguageScores = {
  testType: 'IELTS_GT',
  listening: 8.0,
  reading: 7.0,
  writing: 7.0,
  speaking: 7.0,
};

describe('Section C — education transferability tiers', () => {
  // The reported bug: a single bachelor's was scored in the top 25/50 tier.
  // canada.ca puts it under "post-secondary credential of one year or longer" (13/25).
  it("single bachelor's at CLB 9 scores 25, not 50", () => {
    const r = calculate({
      ...kishoreProfile,
      education: 'bachelors',
      firstLanguageScores: clb9,
    });
    expect(r.breakdown.eduLanguageTransfer).toBe(25);
  });

  it("single bachelor's at CLB 7 scores 13, not 25", () => {
    const r = calculate({
      ...kishoreProfile,
      education: 'bachelors',
      firstLanguageScores: {
        testType: 'IELTS_GT',
        listening: 6.0,
        reading: 6.0,
        writing: 6.0,
        speaking: 6.0,
      },
    });
    expect(r.breakdown.eduLanguageTransfer).toBe(13);
  });

  it("master's at CLB 9 still reaches the top tier (50)", () => {
    const r = calculate({ ...kishoreProfile, firstLanguageScores: clb9 });
    expect(r.breakdown.eduLanguageTransfer).toBe(50);
  });

  it('two-year post-secondary sits in the same tier as a bachelor’s', () => {
    const r = calculate({
      ...kishoreProfile,
      education: 'two_year_post_secondary',
      firstLanguageScores: clb9,
    });
    expect(r.breakdown.eduLanguageTransfer).toBe(25);
  });

  it('secondary school or less scores 0', () => {
    const r = calculate({
      ...kishoreProfile,
      education: 'secondary',
      firstLanguageScores: clb9,
    });
    expect(r.breakdown.eduLanguageTransfer).toBe(0);
  });
});

describe('Section C — per-group 50 cap', () => {
  // Education language (50) + education Canadian experience (50) must not sum to
  // 100 for one applicant: canada.ca caps the education group at 50.
  it('education group is capped at 50 even when both rows max out', () => {
    const r = calculate({
      ...kishoreProfile,
      firstLanguageScores: clb9,
      canadianWorkExperienceYears: 3,
      foreignWorkExperienceYears: 0,
    });
    expect(r.breakdown.eduLanguageTransfer).toBe(50);
    expect(r.breakdown.eduCanadianExpTransfer).toBe(50);
    expect(r.breakdown.transferTotal).toBe(50);
  });

  it('foreign-work group is capped at 50 independently of the education group', () => {
    const r = calculate({
      ...kishoreProfile,
      firstLanguageScores: clb9,
      canadianWorkExperienceYears: 3,
      foreignWorkExperienceYears: 5,
    });
    // Education group 50 + foreign-work group 50 = 100 overall cap.
    expect(r.breakdown.transferTotal).toBe(100);
  });
});

describe('Section A — second official language combined cap', () => {
  // 6 points per ability × 4 = 24 raw. The cap is 24 single / 22 with a spouse,
  // so only the with-spouse case is actually clipped.
  const frenchClb9: LanguageScores = {
    testType: 'TEF',
    listening: 316,
    reading: 263,
    writing: 393,
    speaking: 393,
  };

  it('caps at 22 with a spouse', () => {
    const r = calculate({
      ...kishoreProfile,
      hasSpouse: true,
      spouseEducation: 'bachelors',
      hasSecondLanguage: true,
      secondLanguageScores: frenchClb9,
    });
    expect(r.breakdown.secondLanguagePoints).toBe(22);
  });

  it('caps at 24 without a spouse', () => {
    const r = calculate({
      ...kishoreProfile,
      hasSecondLanguage: true,
      secondLanguageScores: frenchClb9,
    });
    expect(r.breakdown.secondLanguagePoints).toBe(24);
  });
});

describe('FSW grid — canada.ca 67-point selection factors', () => {
  it('exactly 3 years of foreign work experience scores 11, not 13', () => {
    const r = calculate({
      ...kishoreProfile,
      foreignWorkExperienceYears: 3,
    });
    expect(r.fswGrid.workExperience).toBe(11);
  });

  it('4 years of foreign work experience scores 13', () => {
    const r = calculate({
      ...kishoreProfile,
      foreignWorkExperienceYears: 4,
    });
    expect(r.fswGrid.workExperience).toBe(13);
  });

  it('ages 43-46 still score (4/3/2/1), not 0', () => {
    const pts = [43, 44, 45, 46].map(
      (age) => calculate({ ...kishoreProfile, age }).fswGrid.age,
    );
    expect(pts).toEqual([4, 3, 2, 1]);
  });

  it('own Canadian work experience is worth 10 adaptability points', () => {
    const r = calculate({
      ...kishoreProfile,
      canadianWorkExperienceYears: 1,
    });
    expect(r.fswGrid.adaptability).toBe(10);
  });

  it('adaptability is capped at 10 when several elements apply', () => {
    const r = calculate({
      ...kishoreProfile,
      canadianWorkExperienceYears: 2,
      hasCanadianEducation: true,
      hasFamilyInCanada: true,
    });
    expect(r.fswGrid.adaptability).toBe(10);
  });

  it('second official language is all-or-nothing: CLB 5 in only some abilities scores 0', () => {
    const r = calculate({
      ...kishoreProfile,
      hasSecondLanguage: true,
      secondLanguageScores: {
        testType: 'TEF',
        listening: 249, // CLB 5
        reading: 206, // CLB 5
        writing: 100, // below CLB 5
        speaking: 100, // below CLB 5
      },
    });
    const withoutSecond = calculate(kishoreProfile).fswGrid.language;
    expect(r.fswGrid.language).toBe(withoutSecond);
  });
});

describe('Stream eligibility — CEC and FST', () => {
  it('CEC accepts CLB 5 for a TEER 2 occupation (not CLB 7)', () => {
    const r = calculate({
      ...kishoreProfile,
      nocTeer: 2,
      nocCode: '22310',
      canadianWorkExperienceYears: 1,
      firstLanguageScores: {
        testType: 'IELTS_GT',
        listening: 5.0, // CLB 5
        reading: 4.0, // CLB 5
        writing: 5.0, // CLB 5
        speaking: 5.0, // CLB 5
      },
    });
    expect(r.eligibility.cec.eligible).toBe(true);
  });

  it('CEC still requires CLB 7 for a TEER 1 occupation', () => {
    const r = calculate({
      ...kishoreProfile,
      nocTeer: 1,
      canadianWorkExperienceYears: 1,
      firstLanguageScores: {
        testType: 'IELTS_GT',
        listening: 5.0,
        reading: 4.0,
        writing: 5.0,
        speaking: 5.0,
      },
    });
    expect(r.eligibility.cec.eligible).toBe(false);
  });

  it('FST is actually assessed: a major-group-72 trade with 2 years qualifies', () => {
    const r = calculate({
      ...kishoreProfile,
      nocCode: '72200', // electricians — Major Group 72
      nocTeer: 2,
      foreignWorkExperienceYears: 3,
    });
    expect(r.eligibility.fst.eligible).toBe(true);
  });

  it('FST excludes Sub-Major Group 726', () => {
    const r = calculate({
      ...kishoreProfile,
      nocCode: '72600',
      nocTeer: 2,
      foreignWorkExperienceYears: 3,
    });
    expect(r.eligibility.fst.eligible).toBe(false);
  });

  it('FST reason names the applicant’s own NOC, not a hardcoded TEER 1', () => {
    const r = calculate({ ...kishoreProfile, nocTeer: 2, nocCode: '22310' });
    expect(r.eligibility.fst.reason).toContain('22310');
    expect(r.eligibility.fst.reason).not.toContain('TEER 1');
  });

  it('FST rejects a qualifying trade with under 2 years of experience', () => {
    const r = calculate({
      ...kishoreProfile,
      nocCode: '72200',
      nocTeer: 2,
      foreignWorkExperienceYears: 1,
      canadianWorkExperienceYears: 0,
    });
    expect(r.eligibility.fst.eligible).toBe(false);
  });
});
