import type { Metadata } from "next";

// Single source of truth for the site's public URL.
// Used by robots.ts, sitemap.ts, layout.tsx (metadataBase) and buildMetadata.
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://visaforte.com";

export const SITE_NAME = "Visa Forte";

// Builds the metadata object for one public page.
// Why: every public page needs the same four things for Google — a title,
// a description, a canonical URL (tells Google which URL is the "real" one),
// and Open Graph tags (controls how the page looks when shared on
// LinkedIn/WhatsApp/X). This helper keeps all ~13 pages identical in shape.
// Relative `path` values ("/about") are resolved against metadataBase,
// which layout.tsx sets from SITE_URL.
export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const { title, description, path } = opts;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}
