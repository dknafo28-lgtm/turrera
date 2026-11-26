// Temporary: find where GSA's site gets each lot's closing time.
import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await db.from("lots").select("id,lot_url,end_time,raw").eq("source", "gsa").gt("end_time", new Date().toISOString()).limit(2);
for (const l of data ?? []) {
  console.log("\n=== ", l.id, l.lot_url, l.end_time);
  console.log("raw keys:", l.raw ? Object.keys(l.raw).join(",") : "(no raw)");
  if (l.raw) for (const [k, v] of Object.entries(l.raw)) if (/dt|date|time|tm|close|end/i.test(k)) console.log("  raw", k, "=", v);
  const res = await fetch(l.lot_url, { headers: { "user-agent": "Mozilla/5.0 TurreraBot (+https://turrera.com)" } });
  const html = await res.text();
  console.log("status", res.status, "len", html.length, "final", res.url);
  for (const m of html.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4}[^<]{0,40}|\d{1,2}:\d{2}\s*(?:AM|PM)[^<]{0,20})/gi)) console.log("  time-ish:", m[0].trim());
  for (const m of html.matchAll(/(?:src|href)="([^"]+\.js)"/g)) console.log("  js:", m[1]);
  for (const m of html.matchAll(/["'](\/?[a-z0-9_\-/]*api[a-z0-9_\-/.]*)["']/gi)) console.log("  api-ish:", m[1]);
  console.log(html.slice(0, 800).replace(/\s+/g, " "));
}
