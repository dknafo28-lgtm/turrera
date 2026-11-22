// Estimates resale value for vehicle lots using eBay Motors listings (official eBay Browse API).
// For each year/make/model we pull current fixed-price eBay listings in Cars & Trucks
// and use the middle (median) price. These are ASKING prices, so treat them as a ceiling.
//
// Facebook Marketplace has no public API and prohibits scraping, so it isn't used.
//
// Run: EBAY_CLIENT_ID=... EBAY_CLIENT_SECRET=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node collectors/value-vehicles.mjs

import { pathToFileURL } from "node:url";
import { getWriteClient } from "./db.mjs";
import { parseVehicle, vehicleKey } from "./vehicle.mjs";

const EBAY_CARS_AND_TRUCKS = "6001";
const MIN_COMPS = 3;
const REFRESH_DAYS = 3;
const MAX_LOTS_PER_RUN = 1500;
const VEHICLE_CATEGORIES = ["cars", "trucks"];

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

// Keep only listings that are really the same year/make/model and a plausible price.
export function summarizeComps(vehicle, items) {
  const model = vehicle.model.toLowerCase().replace(/-/g, "");
  const prices = items
    .filter((it) => {
      const title = (it.title ?? "").toLowerCase().replace(/-/g, "");
      return title.includes(String(vehicle.year)) && title.includes(model);
    })
    .map((it) => Number(it.price?.value))
    .filter((n) => Number.isFinite(n) && n >= 500 && n <= 250_000)
    .sort((a, b) => a - b);
  if (prices.length < MIN_COMPS) return { count: prices.length, median: null, low: null, high: null };
  return {
    count: prices.length,
    median: percentile(prices, 0.5),
    low: percentile(prices, 0.25),
    high: percentile(prices, 0.75),
  };
}

async function getEbayToken() {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });
  if (!res.ok) throw new Error(`eBay login failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).access_token;
}

async function searchEbay(token, vehicle) {
  const params = new URLSearchParams({
    q: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    category_ids: EBAY_CARS_AND_TRUCKS,
    filter: "buyingOptions:{FIXED_PRICE},priceCurrency:USD",
    limit: "50",
  });
  const res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
  });
  if (res.status === 429) throw new Error("eBay daily limit reached");
  if (!res.ok) throw new Error(`eBay search failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).itemSummaries ?? [];
}

export async function run() {
  const token = await getEbayToken();
  if (!token) {
    console.log("Vehicle values: skipped (EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not set yet).");
    return 0;
  }
  const supabase = getWriteClient();
  const staleBefore = new Date(Date.now() - REFRESH_DAYS * 86_400_000).toISOString();
  const { data: lots, error } = await supabase
    .from("lots")
    .select("id,source,title")
    .in("category", VEHICLE_CATEGORIES)
    .gte("end_time", new Date().toISOString())
    .or(`value_updated.is.null,value_updated.lt.${staleBefore}`)
    .limit(MAX_LOTS_PER_RUN);
  if (error) throw new Error(`Supabase read failed: ${error.message}`);

  const cache = new Map();
  const updates = [];
  let skipped = 0;
  for (const lot of lots ?? []) {
    const v = parseVehicle(lot.title);
    if (!v) { skipped++; continue; }
    const key = vehicleKey(v);
    if (!cache.has(key)) {
      try {
        cache.set(key, summarizeComps(v, await searchEbay(token, v)));
      } catch (err) {
        console.warn(String(err));
        if (String(err).includes("limit")) break;
        continue;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    const c = cache.get(key);
    const row = { id: lot.id, source: lot.source, year: v.year, make: v.make, model: v.model, value_updated: new Date().toISOString() };
    // Only replace the value when eBay has enough matching listings; otherwise keep any AI estimate.
    if (c.median !== null) Object.assign(row, { est_value: c.median, est_low: c.low, est_high: c.high, comps_count: c.count, value_source: "ebay" });
    updates.push(row);
  }

  // PostgREST needs every row in one request to have the same columns, so save the two shapes separately.
  for (const group of [updates.filter((u) => u.value_source === "ebay"), updates.filter((u) => u.value_source !== "ebay")]) {
    for (let i = 0; i < group.length; i += 500) {
      const { error: upErr } = await supabase.from("lots").upsert(group.slice(i, i + 500), { onConflict: "id" });
      if (upErr) throw new Error(`Supabase update failed: ${upErr.message}`);
    }
  }
  const valued = updates.filter((u) => u.value_source === "ebay").length;
  console.log(`Vehicle values: ${updates.length} vehicles checked (${cache.size} eBay searches), ${valued} with an estimate, ${skipped} titles not recognized.`);
  return valued;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
