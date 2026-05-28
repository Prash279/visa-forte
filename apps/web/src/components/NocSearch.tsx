'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import './NocSearch.css'

interface NocEntry {
  code: string
  teer: 0 | 1 | 2 | 3 | 4 | 5
  title: string
  aliases: string[]
}

interface NocSearchProps {
  onSelect: (code: string, teer: 0 | 1 | 2 | 3 | 4 | 5, title: string) => void
  theme: 'light' | 'dark'
}

interface FuseInstance {
  search: (q: string) => { item: NocEntry }[]
}

export default function NocSearch({ onSelect, theme }: NocSearchProps): React.JSX.Element {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<NocEntry[]>([])
  const [isOpen, setIsOpen]     = useState(false)
  const [selected, setSelected] = useState<NocEntry | null>(null)
  const fuseRef  = useRef<FuseInstance | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function init(): Promise<void> {
      const [{ default: Fuse }, nocMod] = await Promise.all([
        import('fuse.js'),
        import('@/lib/noc-2021.json'),
      ])
      const data = (nocMod as unknown as { occupations: NocEntry[] }).occupations
      fuseRef.current = new Fuse(data, {
        keys: [
          { name: 'title', weight: 0.6 },
          { name: 'aliases', weight: 0.4 },
        ],
        threshold: 0.35,
        minMatchCharLength: 3,
        distance: 100,
      }) as FuseInstance
    }
    init().catch(() => undefined)
  }, [])

  const search = useCallback((q: string): void => {
    if (!fuseRef.current || q.length < 3) {
      setResults([])
      setIsOpen(false)
      return
    }
    const hits = fuseRef.current.search(q).slice(0, 5).map(r => r.item)
    setResults(hits)
    setIsOpen(hits.length > 0 || q.length >= 3)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 250)
  }

  function handleSelect(entry: NocEntry): void {
    setSelected(entry)
    setQuery('')
    setResults([])
    setIsOpen(false)
    onSelect(entry.code, entry.teer, entry.title)
  }

  function handleClear(): void {
    setSelected(null)
    setQuery('')
    setResults([])
    setIsOpen(false)
    onSelect('', 1, '')
  }

  return (
    <div className={`noc-search noc-${theme}`}>
      <label className="noc-label">Search Occupation (NOC 2021)</label>
      {selected ? (
        <div className="noc-selected-wrap">
          <span className="noc-selected-text">
            {selected.title} — {selected.code} · TEER {selected.teer}
          </span>
          <button type="button" className="noc-clear-btn" onClick={handleClear}>
            Clear
          </button>
          <a
            className="noc-verify-link"
            href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/find-national-occupation-code.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Verify on canada.ca/noc ↗
          </a>
        </div>
      ) : (
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
                results.map(entry => (
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
                  No match found — enter NOC code manually below
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
