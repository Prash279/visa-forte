import { describe, it, expect } from 'vitest';
import { generateChecklist, type ItaInput } from '../ita-countdown-logic';

const baseInput: ItaInput = {
  itaDate: '2026-07-04',
  citizenshipCountry: 'India',
  residenceCountries: ['India'],
  hasSpouse: false,
  numDependentChildren: 0,
  tier: 'standard',
};

describe('generateChecklist', () => {
  it('flags the 6–8 week note and immediate start for India', () => {
    const items = generateChecklist(baseInput);
    const policeCert = items.find((i) => i.id === 'police_certificate')!;
    expect(policeCert.notes).toContain('6–8 weeks');
    expect(policeCert.startByDate).toBe('2026-07-04');
  });

  it('uses the standard note for countries without a long lead time', () => {
    const items = generateChecklist({
      ...baseInput,
      citizenshipCountry: 'UK',
      residenceCountries: ['UK'],
    });
    const policeCert = items.find((i) => i.id === 'police_certificate')!;
    expect(policeCert.notes).toContain('4–6 weeks');
  });

  it('adds the sponsor letter of support when a spouse is present', () => {
    const items = generateChecklist({ ...baseInput, hasSpouse: true });
    expect(items.some((i) => i.id === 'spouse_letter_of_support')).toBe(true);
  });

  it('adds no birth certificate items when there are no children', () => {
    const items = generateChecklist(baseInput);
    expect(items.some((i) => i.id.includes('birth_certificate'))).toBe(false);
  });

  it('adds one birth certificate item per dependent child', () => {
    const items = generateChecklist({ ...baseInput, numDependentChildren: 2 });
    const birthCerts = items.filter((i) => i.id.includes('birth_certificate'));
    expect(birthCerts).toHaveLength(2);
  });

  it('every item has startByDate on or before deadlineDate', () => {
    const items = generateChecklist({
      ...baseInput,
      hasSpouse: true,
      numDependentChildren: 1,
    });
    for (const item of items) {
      expect(
        item.startByDate.localeCompare(item.deadlineDate),
      ).toBeLessThanOrEqual(0);
    }
  });

  it('final submission deadline is ITA date + 58 days', () => {
    const items = generateChecklist(baseInput);
    const final = items.find((i) => i.id === 'final_submission')!;
    expect(final.deadlineDate).toBe('2026-08-31');
  });
});
