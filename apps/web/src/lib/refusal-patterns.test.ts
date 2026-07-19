import { describe, it, expect } from 'vitest';
import { analyseRefusalLetter } from './refusal-patterns';

const VISITOR_REFUSAL =
  'I am not satisfied that you would leave Canada at the end of your stay. ' +
  'In reaching this decision I considered the purpose of your visit, your ' +
  'personal assets and financial status, and your family ties in Canada and ' +
  'in your country of residence. Your travel history was also considered.';

const EE_WORK_EXPERIENCE_REFUSAL =
  'You have not satisfied me that you performed the duties described in the ' +
  'lead statement of your primary occupation under the National Occupational ' +
  'Classification. The reference letter provided does not demonstrate the ' +
  'work experience claimed, including the duties and responsibilities ' +
  'performed during the period of employment.';

const MISREP_LETTER =
  'A procedural fairness letter was sent to you because you may have ' +
  'misrepresented material facts. Providing false information or documents, ' +
  'or having withheld material information, may make you inadmissible.';

describe('analyseRefusalLetter', () => {
  it('ranks would-not-leave as the top ground for a standard visitor refusal', () => {
    const { matches } = analyseRefusalLetter(VISITOR_REFUSAL);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.id).toBe('would-not-leave');
    expect(matches[0]?.confidence).toBe('strong');
  });

  it('detects financial, ties, and travel-history grounds in the same letter', () => {
    const ids = analyseRefusalLetter(VISITOR_REFUSAL).matches.map((m) => m.id);
    expect(ids).toContain('financial-insufficiency');
    expect(ids).toContain('ties-to-home');
    expect(ids).toContain('travel-history');
  });

  it('ranks work-experience mismatch top for an EE duties refusal', () => {
    const { matches } = analyseRefusalLetter(EE_WORK_EXPERIENCE_REFUSAL);
    expect(matches[0]?.id).toBe('work-experience-not-demonstrated');
    expect(matches[0]?.confidence).toBe('strong');
  });

  it('detects misrepresentation with strong confidence', () => {
    const { matches } = analyseRefusalLetter(MISREP_LETTER);
    const misrep = matches.find((m) => m.id === 'misrepresentation');
    expect(misrep).toBeDefined();
    expect(misrep?.confidence).toBe('strong');
  });

  it('returns no matches for text with no refusal phrasing', () => {
    const { matches } = analyseRefusalLetter(
      'The quick brown fox jumps over the lazy dog near the riverbank at dawn.',
    );
    expect(matches).toEqual([]);
  });

  it('always returns general guidance and complete ground content', () => {
    const result = analyseRefusalLetter(VISITOR_REFUSAL);
    expect(result.generalGuidance.length).toBeGreaterThan(0);
    for (const m of result.matches) {
      expect(m.rootCauses.length).toBeGreaterThan(0);
      expect(m.strategy.length).toBeGreaterThan(0);
      expect(m.label).toBeTruthy();
      expect(m.appliesTo).toBeTruthy();
    }
  });

  it('is deterministic', () => {
    expect(analyseRefusalLetter(VISITOR_REFUSAL)).toEqual(
      analyseRefusalLetter(VISITOR_REFUSAL),
    );
  });
});
