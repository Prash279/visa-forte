import type { JSX } from 'react';
import RefusalAnalyserTool from './RefusalAnalyserTool';
import { buildMetadata, SITE_URL } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Refusal Pattern Analyser — Visa Forte',
  description:
    'Paste your Canadian visa or Express Entry refusal letter and identify the refusal grounds behind it — with root causes and a documentation strategy for reapplying. Private by design: your letter is never stored.',
  path: '/tools/refusal-analyser',
});

const TOOL_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Refusal Pattern Analyser',
  description:
    'Classifies Canadian immigration refusal letters against a pattern library of refusal grounds and recommends a reapplication strategy.',
  url: `${SITE_URL}/tools/refusal-analyser`,
  applicationCategory: 'UtilityApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '2497', priceCurrency: 'INR' },
  provider: { '@type': 'ProfessionalService', name: 'Visa Forte' },
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Refusal Pattern Analyser',
      item: `${SITE_URL}/tools/refusal-analyser`,
    },
  ],
};

export default function RefusalAnalyserPage(): JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TOOL_JSONLD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }}
      />
      <RefusalAnalyserTool />
    </>
  );
}
