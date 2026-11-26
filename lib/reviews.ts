import { getReadClient } from "@/lib/supabase";

export type Review = { id: string; lot_id: string | null; lot_title: string | null; name: string; rating: number; body: string; verified: boolean; created_at: string };
const COLS = "id,lot_id,lot_title,name,rating,body,verified,created_at";

// Approved reviews only (the row rules hide everything else from the public client).
export async function loadReviews(opts: { lotId?: string | null; siteOnly?: boolean; limit?: number } = {}) {
  const db = getReadClient();
  if (!db) return { reviews: [] as Review[], count: 0, average: null as number | null };
  let q = db.from("reviews").select(COLS, { count: "exact" }).eq("status", "approved").order("created_at", { ascending: false }).limit(opts.limit ?? 50);
  if (opts.lotId) q = q.eq("lot_id", opts.lotId);
  else if (opts.siteOnly) q = q.is("lot_id", null);
  const { data, count, error } = await q;
  if (error) return { reviews: [] as Review[], count: 0, average: null };
  let average: number | null = null;
  const { data: all } = await (opts.lotId ? db.from("reviews").select("rating").eq("status", "approved").eq("lot_id", opts.lotId) : opts.siteOnly ? db.from("reviews").select("rating").eq("status", "approved").is("lot_id", null) : db.from("reviews").select("rating").eq("status", "approved")).limit(5000);
  if (all?.length) average = Math.round((all.reduce((s, r) => s + (r.rating as number), 0) / all.length) * 10) / 10;
  return { reviews: (data ?? []) as Review[], count: count ?? 0, average };
}
