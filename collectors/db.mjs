// Shared database helpers for all collectors.
import { createClient } from "@supabase/supabase-js";
import { enrich } from "./categorize.mjs";

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
    // Full listings (with a title and category) get their type, boat length and year filled in.
    const batch = lots.slice(i, i + batchSize).map((l) => (l.title !== undefined && l.category !== undefined ? enrich(l) : l));
    // Rows with different columns go separately, so a missing column (like year) never blanks a saved value.
    const groups = new Map();
    for (const row of batch) {
      const sig = Object.keys(row).sort().join(",");
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig).push(row);
    }
    for (const rows of groups.values()) {
      const { error } = await supabase.from("lots").upsert(rows, { onConflict: "id" });
      if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    }
    saved += batch.length;
  }
  return saved;
}
