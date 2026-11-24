import type { MetadataRoute } from "next";
import { CATEGORIES, TYPES } from "@/lib/lots";
import { SITE_URL } from "@/lib/site";
import { getReadClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = ["", "/search", "/search?status=sold", "/buy-for-me", "/sell", "/financing", "/our-sales"].map((p) => ({
    url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "daily", priority: p === "" ? 1 : 0.8,
  }));
  for (const c of CATEGORIES) {
    pages.push({ url: `${SITE_URL}/search?category=${c.key}`, lastModified: now, changeFrequency: "daily", priority: 0.7 });
    for (const t of TYPES[c.key] ?? []) {
      if (t.key !== c.key) pages.push({ url: `${SITE_URL}/search?category=${c.key}&amp;sub=${t.key}`, lastModified: now, changeFrequency: "daily", priority: 0.6 });
    }
  }
  const db = getReadClient();
  if (db) {
    for (let i = 0; i < 20_000; i += 1000) {
      const { data, error } = await db.from("lots").select("id,first_seen").gt("end_time", now.toISOString()).order("end_time").range(i, i + 999);
      if (error || !data?.length) break;
      for (const l of data) pages.push({ url: `${SITE_URL}/lot/${encodeURIComponent(l.id)}`, lastModified: l.first_seen ? new Date(l.first_seen) : now, changeFrequency: "daily", priority: 0.5 });
      if (data.length < 1000) break;
    }
  }
  return pages;
}
