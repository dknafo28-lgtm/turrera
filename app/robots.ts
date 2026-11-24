import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // While the site is password-protected, ask search engines to stay out entirely.
  if (process.env.SITE_PASSWORD) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/thanks", "/unsubscribe", "/watchlist"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
