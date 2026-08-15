'use client';

// Job-title route to a NOC code: fuzzy search over the bundled NOC 2021 titles
// and example job titles.
//
// This component no longer owns "which NOC is selected". NocPicker does, because
// the applicant can arrive at a code by two different routes (title or duties) and
// only one answer can win. A search box that privately remembered its own pick
// would leave two chips disagreeing about the applicant's NOC.

import { useState, useEffect, useRef, useCallback } from 'react';
import './NocSearch.css';

export interface NocEntry {
  code: string;
  teer: 0 | 1 | 2 | 3 | 4 | 5;
  title: string;
  examples: string[];
}

interface NocSearchProps {
  onSelect: (entry: NocEntry) => void;
  theme: 'light' | 'dark';
}

interface FuseInstance {
  search: (q: string) => { item: NocEntry }[];
}

export default function NocSearch({
  onSelect,
  theme,
}: NocSearchProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NocEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const fuseRef = useRef<FuseInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function init(): Promise<void> {
      const [{ default: Fuse }, nocMod] = await Promise.all([
        import('fuse.js'),
        import('@/lib/noc-2021.json'),
      ]);
      const data = (nocMod as unknown as { groups: NocEntry[] }).groups;
      fuseRef.current = new Fuse(data, {
        keys: [
          { name: 'title', weight: 0.6 },
          { name: 'examples', weight: 0.4 },
        ],
        threshold: 0.35,
        minMatchCharLength: 3,
        distance: 100,
      }) as FuseInstance;
    }
    init().catch(() => undefined);
  }, []);

  const search = useCallback((q: string): void => {
    if (!fuseRef.current || q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const hits = fuseRef.current
      .search(q)
      .slice(0, 5)
      .map((r) => r.item);
    setResults(hits);
    setIsOpen(hits.length > 0 || q.length >= 3);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 250);
  }

  function handleSelect(entry: NocEntry): void {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(entry);
  }

  return (
    <div className={`noc-search noc-${theme}`}>
      <label className="noc-label">
        Search by Job Title / Designation (optional)
      </label>
      <div className="noc-input-wrap">
        <input
          className="noc-input"
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="e.g. Software Engineer, Registered Nurse…"
          autoComplete="off"
        />
        {isOpen && (
          <div className="noc-dropdown">
            {results.length > 0 ? (
              results.map((entry) => (
                <button
                  key={entry.code}
                  type="button"
                  className="noc-result-item"
                  onClick={() => handleSelect(entry)}
                >
                  {entry.title} — {entry.code} · TEER {entry.teer}
                </button>
              ))
            ) : (
              <div className="noc-no-match">
                No match found — try the duties search below
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
