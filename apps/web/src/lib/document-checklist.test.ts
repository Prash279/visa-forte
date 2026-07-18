import { describe, it, expect } from 'vitest';
import { DOCUMENT_CHECKLIST, getChecklist } from './document-checklist';

const SERVICE_TIERS = [
  'Pre-Application Eligibility Assessment',
  'PNP Stream Matching',
  'Document Review & Compliance Audit',
  'Refusal Analysis & Reapplication Strategy',
  'ITA Response Preparation',
  'Full Application File Management',
  'Post-Submission Monitoring',
];

describe('DOCUMENT_CHECKLIST', () => {
  it('covers all 7 active service tiers', () => {
    for (const tier of SERVICE_TIERS) {
      expect(DOCUMENT_CHECKLIST[tier]).toBeDefined();
    }
  });

  it('each tier returns a non-empty array', () => {
    for (const tier of SERVICE_TIERS) {
      expect(DOCUMENT_CHECKLIST[tier].length).toBeGreaterThan(0);
    }
  });

  it('every checklist item has a non-empty id and label', () => {
    for (const tier of SERVICE_TIERS) {
      for (const item of DOCUMENT_CHECKLIST[tier]) {
        expect(typeof item.id).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
        expect(typeof item.label).toBe('string');
        expect(item.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('ids within a tier are unique', () => {
    for (const tier of SERVICE_TIERS) {
      const ids = DOCUMENT_CHECKLIST[tier].map((i) => i.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    }
  });
});

describe('getChecklist', () => {
  it('returns the correct checklist for a known tier', () => {
    const items = getChecklist('Post-Submission Monitoring');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('id');
    expect(items[0]).toHaveProperty('label');
  });

  it('returns an empty array for an unknown tier', () => {
    expect(getChecklist('Unknown Tier')).toEqual([]);
  });
});
