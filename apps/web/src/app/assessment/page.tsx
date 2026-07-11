// Public Canada PR eligibility assessment — /assessment
// No authentication required. Runs entirely client-side (CRS engine is local).

import AssessmentTool from './AssessmentTool'
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Canada PR Eligibility Check — Visa Forte',
  description:
    'Check your Canada PR eligibility instantly. Get your CRS score, stream eligibility analysis, and top improvement scenarios — powered by the same engine Prash uses for paid assessments.',
  path: '/assessment',
});
export default function AssessmentPage() {
  return <AssessmentTool />
}
