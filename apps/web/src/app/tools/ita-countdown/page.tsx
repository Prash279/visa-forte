import ItaCountdownTool from './ItaCountdownTool'
import { buildMetadata, SITE_URL } from '@/lib/seo';

export const metadata = buildMetadata({
  title: '60-Day Countdown Planner — Visa Forte',
  description:
    'Enter your Express Entry ITA date and get a personalised day-by-day document preparation timeline — printable and emailed to you.',
  path: '/tools/ita-countdown',
});
// Structured data: registers this free tool as a WebApplication with Google.
const TOOL_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: '60-Day Countdown Planner',
  description:
    'Personalised day-by-day document preparation timeline for your Express Entry ITA response window.',
  url: `${SITE_URL}/tools/ita-countdown`,
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
    { "@type": "ListItem", position: 2, name: '60-Day Countdown Planner', item: `${SITE_URL}/tools/ita-countdown` },
  ],
};

export default function ItaCountdownPage() {
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
      <ItaCountdownTool />
    </>
  )
}
