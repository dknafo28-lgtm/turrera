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

const STATUS = { A: "active", P: "preview" };

export function toLot(r) {
  const title = clean(r.ItemName) ?? clean(r.LotDescript) ?? "Untitled lot";
  const description = clean(r.LotDescript);
  const id = `gsa:${clean(r.SaleNo) ?? "unknown"}:${clean(r.LotNo) ?? clean(r.LotSequence) ?? "0"}`;
  return {
    id,
    source: "gsa",
    title,
    description,
    category: categorize(title, description ?? ""),
    current_bid: toNumber(r.HighBidAmount),
    start_time: toDate(r.AucStartDt),
    end_time: toDate(r.AucEndDt),
    status: STATUS[clean(r.AuctionStatus) ?? ""] ?? "scheduled",
    city: clean(r.PropertyCity) ?? clean(r.LocationCity),
    state: (clean(r.PropertyState) ?? clean(r.LocationST))?.toUpperCase() ?? null,
    zip: clean(r.PropertyZip) ?? clean(r.LocationZip),
    agency: clean(r.AgencyName) ?? clean(r.PropertyAddr1),
    photo_url: clean(r.ImageURL),
    lot_url: clean(r.ItemDescURL) ?? "https://www.gsaauctions.gov",
    raw: r,
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
