// Shared database helpers for all collectors.
import { createClient } from "@supabase/supabase-js";

export function getWriteClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Inserts new lots and updates existing ones. first_seen is only set on insert.
export async function upsertLots(supabase, lots, batchSize = 500) {
  let saved = 0;
  for (let i = 0; i < lots.length; i += batchSize) {
    const batch = lots.slice(i, i + batchSize);
    const { error } = await supabase.from("lots").upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    saved += batch.length;
  }
  return saved;
}
