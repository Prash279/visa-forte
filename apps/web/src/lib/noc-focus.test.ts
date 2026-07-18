import { describe, it, expect } from 'vitest';
import { nocFocusCategories, streamRelevance } from './noc-focus';

describe('nocFocusCategories', () => {
  it('maps health occupations and 41404 to health', () => {
    expect(nocFocusCategories('41404')).toEqual(['health']);
    expect(nocFocusCategories('31301')).toEqual(['health']);
  });
  it('maps applied science and IT to tech', () => {
    expect(nocFocusCategories('21232')).toEqual(['tech']);
  });
  it('returns [] when the field is not clearly determinable', () => {
    expect(nocFocusCategories('00012')).toEqual([]);
  });
});

describe('streamRelevance', () => {
  it('is targeted when the stream field matches the NOC field', () => {
    expect(streamRelevance(['health'], '41404')).toBe('targeted');
  });
  it('is mismatch only when both fields are known and disjoint', () => {
    expect(streamRelevance(['tech'], '41404')).toBe('mismatch');
  });
  it('is general when the stream has no field focus', () => {
    expect(streamRelevance(undefined, '41404')).toBe('general');
    expect(streamRelevance([], '41404')).toBe('general');
  });
  it('never excludes a stream when the NOC field is unknown', () => {
    expect(streamRelevance(['tech'], '00012')).toBe('general');
  });
});
