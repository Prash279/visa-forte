import { describe, it, expect } from 'vitest';
import { buildPnpMarpMarkdown } from './pnp-marp';
import { assessPnp, type NocClassification } from './pnp-eligibility';
import { type ApplicantProfile } from './crs-calculator';

const profile: ApplicantProfile = {
  name: 'Test Applicant',
  age: 30,
  nocCode: '21211',
  nocTeer: 1,
  occupationTitle: 'Data Scientist',
  jobDuties:
    'Designs and builds machine-learning models; analyses large datasets; writes production Python.',
  countryOfCitizenship: 'India',
  countryOfResidence: 'India',
  reportDate: '2026-06-22',
  education: 'masters',
  hasEca: true,
  firstLanguageScores: {
    testType: 'IELTS_GT',
    listening: 8.0,
    reading: 7.0,
    writing: 7.0,
    speaking: 7.0,
  },
  hasSecondLanguage: false,
  foreignWorkExperienceYears: 5,
  canadianWorkExperienceYears: 0,
  hasSpouse: false,
  hasJobOffer: 'none',
  hasProvincialNomination: false,
  hasCanadianEducation: false,
  hasFamilyInCanada: false,
  settlementFunds: 30000,
  familySize: 1,
  hasCriminalRecord: false,
  hasMedicalCondition: false,
  hasPriorRefusal: false,
};

const noc: NocClassification = {
  nocCode: '21211',
  teer: 1,
  title: 'Data scientists',
  citationUrl: 'https://www.canada.ca/noc',
  confidence: 'high',
  verified: true,
  candidates: [
    {
      nocCode: '21211',
      teer: 1,
      title: 'Data scientists',
      rationale: 'Builds ML models.',
      matchScore: 100,
      fitScore: 92,
    },
  ],
  ambiguity: { flag: false, alternatives: [] },
};

describe('buildPnpMarpMarkdown', () => {
  const pnp = assessPnp(profile, noc);
  const md = buildPnpMarpMarkdown(profile, pnp);

  it('produces a MARP deck with the required McKinsey sections', () => {
    expect(md).toContain('marp: true');
    expect(md).toContain('Executive Summary');
    expect(md).toContain('Job Duties & NOC Classification');
    expect(md).toContain('Jurisdiction Eligibility Matrix');
    expect(md).toContain('Ranked Recommendations — Express Entry-linked');
    expect(md).toContain('Ranked Recommendations — Base / Non-Express Entry');
    expect(md).toContain('Source & Verification Log');
  });

  it('includes the verbatim legal disclaimer', () => {
    expect(md).toContain('does not constitute legal advice');
    expect(md).toContain('www.canada.ca/immigration');
  });

  it('surfaces the classified NOC and verified data sources', () => {
    expect(md).toContain('NOC 21211');
    expect(md).toContain('saskatchewan.ca');
  });

  it('renders an ambiguity callout only when flagged', () => {
    const flagged = buildPnpMarpMarkdown(
      profile,
      assessPnp(profile, {
        ...noc,
        ambiguity: {
          flag: true,
          alternatives: [{ nocCode: '22220', teer: 2, title: 'X' }],
        },
      }),
    );
    expect(flagged).toContain('[NOC AMBIGUITY]');
    expect(md).not.toContain('[NOC AMBIGUITY]');
  });
});
