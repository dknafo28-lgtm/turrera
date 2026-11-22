// Municibid collector — uses Municibid's official AI connector (https://ai.municibid.com/mcp).
// Only government agencies, schools, authorities and utilities sell on Municibid.
//
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node collectors/municibid.mjs

import { pathToFileURL } from "node:url";
import { categorize } from "./categorize.mjs";
import { getWriteClient, upsertLots } from "./db.mjs";
import { connect } from "./mcp.mjs";

const MCP_URL = "https://ai.municibid.com/mcp";
const PAGE = 50;
const MAX_PAGES = 60;
const DETAILS_PER_RUN = Number(process.env.MUNICIBID_DETAILS_PER_RUN ?? 150);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// The connector serves images through a proxy; use the original full-size file when we can.
export function fullImage(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const inner = u.searchParams.get("url");
    const src = inner ?? url;
    return src.replace(/_thumbcrop(\.[a-z]+)$/i, "$1");
  } catch {
    return url;
  }
}

export function isTestListing(r) {
  return /demo seller/i.test(r.seller_name ?? "") || /test item|not for sale/i.test(r.title ?? "");
}

export function toLot(r, now = Date.now()) {
  const title = (r.title ?? "").trim() || `Municibid auction ${r.auction_id}`;
  const fromTitle = categorize(title);
  return {
    id: `municibid:${r.auction_id}`,
    source: "municibid",
    title,
    description: null,
    category: fromTitle !== "other" ? fromTitle : categorize(r.category ?? ""),
    current_bid: typeof r.current_price === "number" ? r.current_price : null,
    start_time: null,
    end_time: toDate(r.closing_at),
    status: "active",
    city: r.city?.trim() || null,
    state: r.state?.trim().toUpperCase() || null,
    zip: null,
    agency: r.seller_name?.trim() || null,
    photo_url: fullImage(r.image_url),
    lot_url: r.listing_url ?? `https://municibid.com/Listing/Details/${r.auction_id}`,
    raw: { category: r.category, bid_count: r.bid_count, county: r.county },
    last_updated: new Date(now).toISOString(),
  };
}

// Walks through every active auction, soonest-closing first, 50 at a time.
async function fetchAll(client) {
  const seen = new Map();
  let after = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const args = { sort: "closing_soon", limit: PAGE };
    if (after) args.closing_after = after;
    const res = await client.call("search_auctions", args);
    const results = res.results ?? [];
    let added = 0;
    for (const r of results) {
      if (!r.auction_id || seen.has(r.auction_id) || isTestListing(r)) continue;
      seen.set(r.auction_id, r);
      added++;
    }
    if (results.length < PAGE) break;
    const last = results[results.length - 1]?.closing_at;
    if (!last || last === after || added === 0) {
      // Many auctions closing at the same minute: step one second past it so we keep moving.
      const next = last ? new Date(new Date(last).getTime() + 1000).toISOString() : null;
      if (!next || next === after) break;
      after = next;
    } else {
      after = last;
    }
    await sleep(400);
  }
  return [...seen.values()];
}

export function detailsToUpdate(d) {
  const a = d?.auction ?? d ?? {};
  const description = [a.description, a.condition ? `Condition: ${a.condition}` : null, a.terms ? null : null]
    .filter(Boolean)
    .join("\n\n")
    .trim();
  const images = (a.images ?? a.photos ?? a.image_urls ?? [])
    .map((i) => (typeof i === "string" ? i : i?.url ?? i?.image_url))
    .filter(Boolean)
    .map(fullImage);
  return { description: description || null, photos: [...new Set(images)].slice(0, 30) };
}

export async function run() {
  const supabase = getWriteClient();
  const client = await connect(MCP_URL);
  const rows = await fetchAll(client);
  const lots = rows.map((r) => toLot(r));
  const saved = await upsertLots(supabase, lots);
  console.log(`Municibid: saved ${saved} lots.`);

  // Descriptions and full photo sets for lots we haven't detailed yet.
  const { data: pending } = await supabase
    .from("lots")
    .select("id")
    .eq("source", "municibid")
    .is("photos", null)
    .gte("end_time", new Date().toISOString())
    .order("end_time", { ascending: true })
    .limit(DETAILS_PER_RUN);
  let detailed = 0;
  for (const [i, lot] of (pending ?? []).entries()) {
    const auctionId = lot.id.split(":")[1];
    try {
      const d = await client.call("get_auction_details", { auction_id: auctionId });
      if (i === 0) console.log("Municibid details sample:", JSON.stringify(d).slice(0, 1500));
      const update = detailsToUpdate(d);
      const { error } = await supabase
        .from("lots")
        .update({ ...update, photos: update.photos.length ? update.photos : [], details_fetched: new Date().toISOString() })
        .eq("id", lot.id);
      if (error) throw new Error(error.message);
      detailed++;
    } catch (err) {
      console.warn(`Municibid details ${auctionId}: ${err}`);
    }
    await sleep(400);
  }
  console.log(`Municibid: added details for ${detailed} lots.`);
  if (saved === 0) throw new Error("Municibid: no lots found.");
  return saved;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
