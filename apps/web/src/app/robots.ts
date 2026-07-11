import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// robots.txt — tells search engine crawlers what they may index.
// All public pages are open; everything private (admin, client portal,
// auth pages, API routes, email-linked intake/activation pages) is blocked.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/portal",
        "/api/",
        "/login",
        "/signup",
        "/logout",
        "/activate",
        "/intake",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
