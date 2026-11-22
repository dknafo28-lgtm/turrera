// JJ Kane collector — government sellers only.
// JJ Kane sells retired fleets for utilities, contractors AND government agencies. We keep only lots
// whose consignor is clearly a government body (city, county, state agency, sheriff, school, transit...).
// Data comes from the same public search index the jjkane.com website uses (robots.txt allows all).
//
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node collectors/jjkane.mjs

import { pathToFileURL } from "node:url";
import { categorize } from "./categorize.mjs";
import { getWriteClient, upsertLots } from "./db.mjs";

const SEARCH_URL = "https://ICB6K32PD0-dsn.algolia.net/1/indexes/api_items/query";
const HEADERS = {
  "X-Algolia-Application-Id": "ICB6K32PD0",
  "X-Algolia-API-Key": "9d3241f7a3ee8947997deaa33cb0b249", // public, search-only key published on jjkane.com
  "Content-Type": "application/json",
  "User-Agent": "TurreraBot/1.0 (+https://turrera.com)",
};
const BASE_FILTER = "NOT saleSubType:Internal AND NOT isSplitLot:1 AND itemStatus:Active";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GOV = [
  /^(city|county|town|township|village|borough|state|commonwealth|parish|port|school board|board of)\s+of\b/i,
  /\b(county|parish)\b/i,
  /\b(sheriff|police|highway patrol|fire (dept|department|district|rescue)|state attorney)/i,
  /\b(school district|schools|unified school|university|college|community college)\b/i,
  /\b(transit|transportation authority|rapid transit|metro transit|regional transportation)\b/i,
  /\b(department of|dept\.? of|board of county|bocc|b\.o\.c\.c|commission(ers)?)\b/i,
  /\b(municipal utility district|public power district|water (agency|district)|park district|utility district|public works)\b/i,
  /^(florida|california|texas|georgia|state) state\b/i,
  /\bcity of\b|\btown of\b/i,
];
const NOT_GOV = /\b(inc|llc|l\.l\.c|corp|corporation|company|co\.|cooperative|coop|edison|leasing|capital|rentals?|services?\s+(inc|llc)|lp|ltd)\b/i;

export function isGovernmentSeller(name) {
  const n = (name ?? "").trim();
  if (!n || NOT_GOV.test(n)) return false;
  return GOV.some((re) => re.test(n));
}

// "11/24/2026" -> noon Eastern that day (JJ Kane only publishes the closing date, not the time).
export function closeDate(value) {
  const m = String(value ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 17, 0, 0)).toISOString();
}

export function toLot(h, now = Date.now()) {
  const title = (h.webDescription ?? h.unitTitle ?? `JJ Kane item ${h.id}`).trim();
  const fromTitle = categorize(title);
  const photos = Array.from({ length: Math.min(Number(h.imageCount) || 0, 30) }, (_, i) => `https://prod.cdn.jjkane.com/${h.id}-${i + 1}`);
  return {
    id: `jjkane:${h.id}`,
    source: "jjkane",
    title,
    description: h.catalogDescription ?? h.shortDescription ?? null,
    category: fromTitle !== "other" ? fromTitle : categorize(`${h.category ?? ""} ${h.parentCategory ?? ""}`),
    current_bid: null, // bidding happens on Proxibid; JJ Kane's index has no live bid
    start_time: null,
    end_time: closeDate(h.ringCloseOutDate),
    status: "active",
    city: (h.offSite ? h.offSitePhysicalCity : h.saleCity) || h.saleCity || null,
    state: ((h.offSite ? h.offSitePhysicalState : h.saleState) || h.saleState || "").toUpperCase() || null,
    zip: null,
    agency: h.accountName?.trim() || null,
    photo_url: photos[0] ?? null,
    photos,
    lot_url: `https://www.jjkane.com/items/${h.id}`,
    raw: { saleName: h.saleName, category: h.category, odometer: h.odometer, hours: h.hours, conditions: h.conditions, proxibidId: h.proxibidId },
    details_fetched: new Date(now).toISOString(),
    last_updated: new Date(now).toISOString(),
  };
}

async function search(body) {
  const res = await fetch(SEARCH_URL, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`JJ Kane search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function fetchAll() {
  // Split by sale so each query stays under the search engine's page limit.
  const facets = await search({ query: "", hitsPerPage: 0, filters: BASE_FILTER, facets: ["saleId"], maxValuesPerFacet: 200 });
  const sales = Object.keys(facets.facets?.saleId ?? {});
  const hits = [];
  for (const saleId of sales) {
    for (let page = 0; page < 20; page++) {
      const j = await search({ query: "", hitsPerPage: 100, page, filters: `${BASE_FILTER} AND saleId:${saleId}` });
      hits.push(...(j.hits ?? []));
      await sleep(300);
      if (!j.hits?.length || page >= (j.nbPages ?? 1) - 1) break;
    }
  }
  return hits;
}

export async function run() {
  const hits = await fetchAll();
  const gov = hits.filter((h) => isGovernmentSeller(h.accountName));
  const lots = [...new Map(gov.map((h) => [h.id, toLot(h)])).values()];
  const saved = await upsertLots(getWriteClient(), lots);
  console.log(`JJ Kane: ${hits.length} active lots, ${gov.length} from government sellers, saved ${saved}.`);
  if (!hits.length) throw new Error("JJ Kane: no lots found.");
  return saved;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
