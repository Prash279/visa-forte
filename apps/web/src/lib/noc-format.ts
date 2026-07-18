// Render an official NOC occupation title in professional Title Case for client-facing
// output (on-screen report, MARP deck, PPTX export), keeping short joining words (and, in,
// of, the…) lowercase unless they lead. Display-only: callers retain the verbatim StatCan
// title for the Statistics Canada citation.

const TITLE_MINOR_WORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'by',
  'or',
  'nor',
  'but',
  'with',
  'as',
  'from',
  'into',
  'per',
]);

export function titleCaseOccupation(title: string): string {
  let wordIndex = 0;
  return title
    .split(/(\s+)/)
    .map((tok) => {
      if (/^\s*$/.test(tok)) return tok;
      const isFirst = wordIndex === 0;
      wordIndex += 1;
      const lower = tok.toLowerCase();
      if (!isFirst && TITLE_MINOR_WORDS.has(lower)) return lower;
      return lower.replace(
        /(^[^a-z]*|[-/(][^a-z]*)([a-z])/g,
        (_m, pre, c) => pre + c.toUpperCase(),
      );
    })
    .join('');
}
