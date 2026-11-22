import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Lot = {
  id: string;
  source: string;
  title: string | null;
  description: string | null;
  category: string | null;
  current_bid: number | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
  agency: string | null;
  photo_url: string | null;
  lot_url: string | null;
  first_seen: string;
  est_value: number | null;
  est_low: number | null;
  est_high: number | null;
  comps_count: number | null;
  spread: number | null;
  condition: string | null;
};

let client: SupabaseClient | null = null;

// Read-only client for the website (uses the public anon key + row level security).
export function getReadClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
