// GSA Auctions collector — uses the official public API.
// Docs: https://gsa.github.io/auctions_api/
// Limits: 5,000 calls/day and 5 calls per 5 seconds. We make 1 call per run.
//
// Run: GSA_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node collectors/gsa.mjs

import { pathToFileURL } from "node:url";
import { categorize } from "./categorize.mjs";
import { getWriteClient, upsertLots } from "./db.mjs";

const API_URL = "https://api.gsa.gov/assets/gsaauctions/v2/auctions";

// The API docs don't name the top-level key, so accept a bare array
// or the first array found in the response object.
export function extractRecords(json) {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    for (const value of Object.values(json)) {
      if (Array.isArray(value)) return value;
    }
    for (const value of Object.values(json)) {
      const nested = extractRecords(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function stripHtml(value) {
  const s = clean(value);
  if (!s) return null;
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function status(value) {
  const s = (clean(value) ?? "").toLowerCase();
  if (s === "a" || s.startsWith("active")) return "active";
  if (s === "p" || s.startsWith("preview")) return "preview";
  return s || "scheduled";
}

// The API's field casing varies (saleNo vs SaleNo), so look fields up case-insensitively.
function reader(record) {
  const map = new Map(Object.entries(record ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return (...names) => {
    for (const n of names) {
      const v = map.get(n.toLowerCase());
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return null;
  };
}

export function toLot(record) {
  const f = reader(record);
  const title = clean(f("itemName")) ?? stripHtml(f("lotDescript", "lotInfo"))?.slice(0, 120) ?? "Untitled lot";
  const description = stripHtml(f("lotInfo", "lotDescript"));
  const id = `gsa:${clean(f("saleNo")) ?? "unknown"}:${clean(f("lotNo", "lotSequence")) ?? "0"}`;
  return {
    id,
    source: "gsa",
    title,
    description,
    category: categorize(title, description ?? ""),
    current_bid: toNumber(f("highBidAmount", "currentBid", "highBid")),
    start_time: toDate(f("aucStartDt")),
    end_time: toDate(f("aucEndDt")),
    status: status(f("auctionStatus")),
    city: clean(f("propertyCity", "locationCity")),
    state: clean(f("propertyState", "locationST"))?.toUpperCase() ?? null,
    zip: clean(f("propertyZip", "locationZip"))?.replace(/null$/i, "") ?? null,
    agency: clean(f("agencyName", "locationOrg", "saleLocation")),
    photo_url: clean(f("imageURL", "imageUrl", "image")),
    lot_url: clean(f("itemDescURL", "itemDescUrl", "lotUrl")) ?? "https://www.gsaauctions.gov",
    raw: record,
    last_updated: new Date().toISOString(),
  };
}

async function fetchWithRetry(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" } });
    if (res.ok) return res.json();
    if (attempt === tries) throw new Error(`GSA API returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 5000 * attempt)); // stay well under 5 calls / 5 s
  }
}

export async function run() {
  const key = process.env.GSA_API_KEY;
  if (!key) throw new Error("Missing GSA_API_KEY (get a free key at https://api.data.gov/signup/)");

  const json = await fetchWithRetry(`${API_URL}?api_key=${encodeURIComponent(key)}&format=JSON`);
  const records = extractRecords(json);
  if (!records.length) {
    console.warn("GSA API returned no lots. Response keys:", Object.keys(json ?? {}));
    return 0;
  }

  // De-duplicate by id (keep the last occurrence).
  const lots = [...new Map(records.map(toLot).map((l) => [l.id, l])).values()];
  const saved = await upsertLots(getWriteClient(), lots);
  console.log(`GSA: fetched ${records.length} records, saved ${saved} lots.`);
  return saved;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
