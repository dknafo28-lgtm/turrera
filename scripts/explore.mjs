import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const names = new Map();
for (let from = 0; from < 2000; from += 1000) {
  const { data } = await sb.from("lots").select("agency").eq("source", "jjkane").range(from, from + 999);
  for (const r of data ?? []) names.set(r.agency, (names.get(r.agency) ?? 0) + 1);
}
console.log("NAMES", [...names.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} (${c})`).join(" | "));
