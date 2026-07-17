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
