// apps/web/src/components/ResourceCard.tsx
// Shared card UI for both free and premium resources.
// Uses a discriminated union so TypeScript enforces the right props per kind.
// No client-side state — safe to use in server components.

import type { JSX } from 'react';
import type { ResourceType } from '@/lib/resources';

// Human-readable label for each resource type (shown as the badge text)
const TYPE_LABELS: Record<ResourceType, string> = {
  guide: 'Guide',
  checklist: 'Checklist',
  cheatsheet: 'Cheat Sheet',
  sample: 'Sample Format',
  letter: 'Letter Template',
  timeline: 'Timeline',
  comparison: 'Comparison Table',
};

interface FreeCardProps {
  kind: 'free';
  id: string;
  title: string;
  type: ResourceType;
  category: string;
  description: string;
}

interface PremiumCardProps {
  kind: 'premium';
  id: string;
  title: string;
  type: ResourceType;
  category: string;
  description: string;
  priceINR: number;
}

type ResourceCardProps = FreeCardProps | PremiumCardProps;

export default function ResourceCard(props: ResourceCardProps): JSX.Element {
  return (
    <article className={`resource-card resource-card--${props.kind}`}>
      {/* Header row: type badge + category */}
      <div className="resource-card-header">
        <span
          className={`resource-type-badge resource-type-badge--${props.type}`}
        >
          {TYPE_LABELS[props.type]}
        </span>
        <span className="resource-category">{props.category}</span>
      </div>

      {/* Content */}
      <h3 className="resource-card-title">{props.title}</h3>
      <p className="resource-card-description">{props.description}</p>

      {/* CTA footer */}
      <div className="resource-card-footer">
        {props.kind === 'free' ? (
          <a
            href={`/api/resources/download/${props.id}`}
            className="resource-cta resource-cta--free"
            download
          >
            Download Free →
          </a>
        ) : (
          <div className="resource-premium-cta">
            <div className="resource-price">
              <span className="resource-price-inr">
                ₹{props.priceINR.toLocaleString('en-IN')}
              </span>
            </div>
            <button
              className="resource-cta resource-cta--premium"
              disabled
              aria-disabled="true"
            >
              Buy Now →
            </button>
            <p className="resource-cta-note">
              Payment integration coming soon.{' '}
              <a href="mailto:prashant@visaforte.com?subject=Purchase%20Enquiry%20%E2%80%94%20Resource">
                Contact to purchase
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
