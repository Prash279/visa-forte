// apps/web/src/app/resources/FreeResourcesGrid.tsx
// Client component — manages filter pill state and renders the filtered card grid.
// Receives all free resources as a prop from the server component (no client-side fetch).

'use client';

import { useState } from 'react';
import type { JSX } from 'react';
import ResourceCard from '@/components/ResourceCard';
import type { FreeResource, ResourceType } from '@/lib/resources';

type FilterValue = ResourceType | 'all';

const FILTER_PILLS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Application Guides', value: 'guide' },
  { label: 'Checklists', value: 'checklist' },
  { label: 'Cheat Sheets', value: 'cheatsheet' },
  { label: 'Sample Formats', value: 'sample' },
  { label: 'Letter Templates', value: 'letter' },
  { label: 'Timelines & Roadmaps', value: 'timeline' },
  { label: 'Comparison Tables', value: 'comparison' },
];

interface Props {
  resources: FreeResource[];
}

export default function FreeResourcesGrid({ resources }: Props): JSX.Element {
  const [active, setActive] = useState<FilterValue>('all');

  const filtered =
    active === 'all' ? resources : resources.filter((r) => r.type === active);

  return (
    <div>
      {/* Filter pill bar */}
      <div
        className="filter-pills"
        role="group"
        aria-label="Filter by resource type"
      >
        {FILTER_PILLS.map(({ label, value }) => (
          <button
            key={value}
            className={`filter-pill${active === value ? ' active' : ''}`}
            onClick={() => setActive(value)}
            aria-pressed={active === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Card grid or empty state */}
      {filtered.length === 0 ? (
        <p className="filter-empty">
          No resources in this category yet — check back soon.
        </p>
      ) : (
        <div className="resources-grid">
          {filtered.map((resource) => (
            <ResourceCard
              key={resource.id}
              kind="free"
              id={resource.id}
              title={resource.title}
              type={resource.type}
              category={resource.category}
              description={resource.description}
            />
          ))}
        </div>
      )}
    </div>
  );
}
