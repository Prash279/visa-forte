import { buildMetadata } from '@/lib/seo';

// The contact page itself is a client component ("use client"), which cannot
// export metadata — so the title/description/canonical live in this layout.
export const metadata = buildMetadata({
  title: 'Contact — Visa Forte | Get in Touch',
  description:
    'Contact Visa Forte for Canadian PR documentation support — eligibility assessments, document review, refusal analysis, and full file management.',
  path: '/contact',
});

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
