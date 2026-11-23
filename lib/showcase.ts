import { getReadClient } from "@/lib/supabase";

export type Sale = {
  id: string; title: string; category: string | null; photos: string[]; bought_price: number | null; sold_price: number | null;
  bought_from: string | null; sold_to: string | null; sold_on: string | null; story: string | null;
  customer_name: string | null; review: string | null; rating: number | null; kind: string; published?: boolean;
};

export async function loadShowcase(limit = 60): Promise<Sale[]> {
  const db = getReadClient();
  if (!db) return [];
  const { data, error } = await db.from("showcase").select("*").eq("published", true)
    .order("sold_on", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(limit);
  return error ? [] : ((data ?? []) as Sale[]);
}
