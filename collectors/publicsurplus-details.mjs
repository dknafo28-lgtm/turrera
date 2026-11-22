// Fetches the description from each Public Surplus item page (the list pages don't include it).
// Polite: one page every 4 seconds, soonest-ending lots first, a limited number per run.
//
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node collectors/publicsurplus-details.mjs

import { pathToFileURL } from "node:url";
import { getWriteClient } from "./db.mjs";

const HEADERS = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const DELAY_MS = 4000;
const MAX_PER_RUN = Number(process.env.PS_DETAILS_PER_RUN ?? 220);

// All photos for the auction, full size ("thumb-a"), in page order.
export function extractPhotos(html, auc) {
  const re = new RegExp(`https://[^"' )]*?/sms/docviewer/cdnaucdoc/thumb-[a-z]/${auc}/\\d+`, "g");
  const seen = new Set();
  for (const m of html.matchAll(re)) seen.add(m[0].replace(/\/thumb-[a-z]\//, "/thumb-a/"));
  return [...seen].slice(0, 30);
}

export function extractDescription(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;?/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n");
  const start = text.search(/\nDescription\s*\n/);
  if (start < 0) return null;
  let body = text.slice(start).replace(/^\nDescription\s*\n/, "");
  const end = body.search(/\n(Pictures|Computer Translation:|Disclaimer)\s*(\n|$)/);
  if (end >= 0) body = body.slice(0, end);
  // Join "Label:\nValue" pairs onto one line.
  body = body.replace(/:\n/g, ": ").replace(/\n+/g, "\n").trim();
  return body ? body.slice(0, 4000) : null;
}

export async function run() {
  const supabase = getWriteClient();
  // Vehicles, boats and equipment first; everything else fills any remaining room.
  const lots = [];
  for (const wantOther of [false, true]) {
    if (lots.length >= MAX_PER_RUN) break;
    let q = supabase
      .from("lots")
      .select("id")
      .eq("source", "publicsurplus")
      .is("photos", null)
      .gte("end_time", new Date().toISOString());
    q = wantOther ? q.eq("category", "other") : q.neq("category", "other");
    const { data, error } = await q.order("end_time", { ascending: true }).limit(MAX_PER_RUN - lots.length);
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    lots.push(...(data ?? []));
  }

  let found = 0;
  for (const [i, lot] of lots.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    const auc = lot.id.split(":")[1];
    let description = null;
    let photos = [];
    try {
      const res = await fetch(`https://www.publicsurplus.com/sms/auction/view?auc=${auc}`, { headers: HEADERS });
      if (!res.ok) { console.warn(`Auction ${auc}: HTTP ${res.status}`); continue; }
      const html = await res.text();
      description = extractDescription(html);
      photos = extractPhotos(html, auc);
    } catch (err) {
      console.warn(`Auction ${auc}: ${err}`);
      continue;
    }
    if (description) found++;
    const { error: upErr } = await supabase
      .from("lots")
      .update({ description, photos, details_fetched: new Date().toISOString() })
      .eq("id", lot.id);
    if (upErr) throw new Error(`Supabase update failed: ${upErr.message}`);
  }
  console.log(`Public Surplus details: checked ${lots.length} item pages, ${found} with a description.`);
  return found;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
