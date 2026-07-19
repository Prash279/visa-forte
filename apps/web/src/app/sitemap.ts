import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// sitemap.xml — the list of public pages Google should crawl.
// Only public marketing/tool pages are listed. Admin, portal, auth,
// intake/activation and API routes are deliberately excluded (and are
// also blocked in robots.ts).
// Priority = relative importance within this site (1.0 highest).
// changeFrequency = a hint, not a command — Google treats it loosely.

type PublicRoute = {
  path: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
};

const PUBLIC_ROUTES: PublicRoute[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/visas', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/assessment', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/resources', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/tools/crs-modeller', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/tools/ita-countdown', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/tools/noc-verifier', priority: 0.8, changeFrequency: 'monthly' },
  {
    path: '/tools/refusal-analyser',
    priority: 0.8,
    changeFrequency: 'monthly',
  },
  { path: '/processing-times', priority: 0.7, changeFrequency: 'daily' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/booking', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
];

// lastModified is deliberately omitted: stamping every page with the build
// date would tell Google "everything changed" on every deploy, which dilutes
// the signal for pages that genuinely did change.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    changeFrequency,
    priority,
  }));
}
