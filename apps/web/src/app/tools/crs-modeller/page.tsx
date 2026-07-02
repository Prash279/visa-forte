import type { Metadata } from 'next'
import CrsModeller from './CrsModeller'

export const metadata: Metadata = {
  title: 'CRS What-If Modeller — Visa Forte',
  description:
    'Move one lever — language, education, or Canadian experience — and see exactly how many CRS points you gain. Find the fastest path to the Express Entry cutoff. Free, no login required.',
}

export default function CrsModellerPage() {
  return <CrsModeller />
}
