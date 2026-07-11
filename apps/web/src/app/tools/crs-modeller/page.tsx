import CrsModeller from './CrsModeller'
import { buildMetadata, SITE_URL } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'CRS What-If Modeller — Visa Forte',
  description:
    'Move one lever — language, education, or Canadian experience — and see exactly how many CRS points you gain. Find the fastest path to the Express Entry cutoff. Free, no login required.',
  path: '/tools/crs-modeller',
});
// Structured data: registers this free tool as a WebApplication with Google.
const TOOL_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: 'CRS What-If Modeller',
  description:
    'Interactive Express Entry CRS calculator — change one factor and see exactly how many points you gain.',
  url: `${SITE_URL}/tools/crs-modeller`,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
  provider: { "@type": "ProfessionalService", name: "Visa Forte" },
};

const BREADCRUMB_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: 'CRS What-If Modeller', item: `${SITE_URL}/tools/crs-modeller` },
  ],
};

export default function CrsModellerPage() {
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
      <CrsModeller />
    </>
  )
}
