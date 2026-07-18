// Occupation-field matching between a classified NOC and an occupation-specific PNP
// stream. Used to keep the report's shortlist to streams the applicant can realistically
// win: streams locked to a DIFFERENT field (e.g. a tech-only or construction-only stream)
// are dropped for a health NOC, while a field-matched stream is boosted.
//
// Mapping is derived from the stable StatCan NOC 2021 structure (major-group prefixes),
// never from volatile provincial occupation lists. An empty result means "field not
// clearly determinable" — which we treat as "do not exclude", never as "no match".

export type StreamRelevance = 'targeted' | 'general' | 'mismatch';

export function nocFocusCategories(code: string): string[] {
  const p2 = code.slice(0, 2);
  const p3 = code.slice(0, 3);

  // Health: nursing, therapy, technical and assisting occupations + health policy (41404).
  if (p2 === '31' || p2 === '32' || p2 === '33' || code === '41404')
    return ['health'];
  // Applied sciences & IT, plus computer/network technicians.
  if (p2 === '21' || ['22220', '22221', '22222'].includes(code))
    return ['tech'];
  // Construction is a subset of the trades.
  if (p3 === '723' || code.startsWith('7231') || code.startsWith('7611'))
    return ['trades', 'construction'];
  if (p2 === '72' || p2 === '73') return ['trades'];
  // Food, accommodation and front-line service (tourism & hospitality).
  if (p2 === '63' || p2 === '65' || code.startsWith('6711')) return ['tourism'];
  // Agriculture and natural resources.
  if (p2 === '82' || p2 === '84' || p2 === '85')
    return ['agriculture', 'natural-resources'];
  // Finance: accountants and finance/insurance clerks.
  if (p3 === '111' || p2 === '13') return ['finance'];
  // Education: teachers and instructors.
  if (p3 === '412' || code.startsWith('4321')) return ['education'];
  // Processing, manufacturing and utilities.
  if (p2 === '94' || p2 === '95' || p2 === '96') return ['manufacturing'];

  return [];
}

// 'mismatch' only when BOTH the stream and the NOC have a known, disjoint field — so a
// coarse or unknown NOC mapping can never wrongly exclude a stream.
export function streamRelevance(
  streamFocus: string[] | undefined,
  nocCode: string,
): StreamRelevance {
  if (!streamFocus || streamFocus.length === 0) return 'general';
  const nocFocus = nocFocusCategories(nocCode);
  if (nocFocus.length === 0) return 'general';
  return streamFocus.some((f) => nocFocus.includes(f))
    ? 'targeted'
    : 'mismatch';
}
