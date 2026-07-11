import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import SiteNav     from "@/components/SiteNav";
import SiteFooter  from "@/components/SiteFooter";
import PageEffects from "@/components/PageEffects";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  // "swap" ensures the web font always renders once loaded.
  // "optional" caused first-time visitors to permanently see the system fallback
  // (Georgia, which renders thicker) because the font wasn't cached yet.
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase lets every page declare a relative canonical/OG url ("/about")
  // and have it resolve to the full https://visaforte.com address.
  metadataBase: new URL(SITE_URL),
  title: "Visa Forte — Forensic Immigration Documentation | Engineered for Passage.",
  description:
    "20 years of forensic immigration documentation expertise. Express Entry, FSW, PNP. Every file personally reviewed. Zero margin for error.",
  // Site-wide default for link sharing (pages override title/description/url).
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
  },
  // Explicitly tell search engines the site may be indexed and followed.
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/brand/favicon-mark.svg", type: "image/svg+xml" }],
    shortcut: "/brand/favicon-mark.svg",
    apple: "/brand/favicon-mark.svg",
  },
};

// Structured data (JSON-LD) — tells Google who the organisation is and what
// the website is called, which powers the branded search result / knowledge
// panel. Static content, safe to serialize inline.
const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/favicon-mark.svg`,
  slogan: "Engineered for Passage.",
  description:
    "Forensic immigration documentation consultancy for Canadian PR — Express Entry, FSW, and Provincial Nominee Programs.",
  founder: { "@type": "Person", name: "Prashant Thirthingoth" },
  email: "prashant@visaforte.com",
  areaServed: "CA",
} as const;

const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
} as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Structured data for Google: organisation identity + site name */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSONLD) }}
        />
        {/* SiteNav: hidden on /admin, /login, /signup, /logout */}
        <SiteNav />
        {/* PageEffects: runs scroll-reveal observer on every page */}
        <PageEffects />
        {children}
        {/* SiteFooter: rendered on all public pages via layout */}
        <SiteFooter />
      </body>
    </html>
  );
}