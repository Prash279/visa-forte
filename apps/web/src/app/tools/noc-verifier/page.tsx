import type { JSX } from 'react';
import NocVerifierTool from './NocVerifierTool';
import { buildMetadata, SITE_URL } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'NOC Code Verifier — Visa Forte',
  description:
    'Confirm your 5-digit NOC 2021 code and TEER level against the official Statistics Canada dataset. Enter your duties, get the strongest candidate codes with official ESDC profile links. Free, no login required.',
  path: '/tools/noc-verifier',
});

const TOOL_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'NOC Code Verifier',
  description:
    'Match your job duties against all 516 NOC 2021 unit groups and confirm your code and TEER level for Express Entry.',
  url: `${SITE_URL}/tools/noc-verifier`,
  applicationCategory: 'UtilityApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' },
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
      name: 'NOC Code Verifier',
      item: `${SITE_URL}/tools/noc-verifier`,
    },
  ],
};

export default function NocVerifierPage(): JSX.Element {
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
      <NocVerifierTool />
    </>
  );
}
