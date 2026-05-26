import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import SiteNav     from "@/components/SiteNav";
import SiteFooter  from "@/components/SiteFooter";
import PageEffects from "@/components/PageEffects";

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
  title: "Visa Forte — Forensic Immigration Documentation | Engineered for Passage.",
  description:
    "20 years of forensic immigration documentation expertise. Express Entry, FSW, PNP. Every file personally reviewed. Zero margin for error.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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