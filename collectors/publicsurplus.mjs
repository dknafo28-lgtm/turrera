// Public Surplus collector — reads the public category listing pages.
// robots.txt allows this (only /images/ is disallowed for general bots).
// We go slowly: one page every 4 seconds, a few categories, every 4 hours.
//
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node collectors/publicsurplus.mjs

import { pathToFileURL } from "node:url";
import { categorize } from "./categorize.mjs";
import { getWriteClient, upsertLots } from "./db.mjs";

const BASE = "https://www.publicsurplus.com";
const HEADERS = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const DELAY_MS = 4000;
const MAX_PAGES_PER_CATEGORY = 60;

// Public Surplus category id -> our fallback category when the title doesn't tell us.
export const PS_CATEGORIES = [
  { id: 4, name: "Motor Pool", fallback: "cars" },
  { id: 20, name: "Marine", fallback: "boats" },
  { id: 17, name: "Heavy Equipment", fallback: "equipment" },
  { id: 6, name: "Industrial Equipment", fallback: "industrial" },
  { id: 12, name: "Outdoor Equipment", fallback: "equipment" },
  { id: 19, name: "Aviation", fallback: "aircraft" },
];

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const text = (s) => decode(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

// "2 days 5 hours", "19 hours 13 mins", "45 mins 10 secs" -> milliseconds (null if not a duration)
export function parseTimeLeft(value) {
  const s = (value ?? "").toLowerCase();
  const units = { day: 86_400_000, hour: 3_600_000, hr: 3_600_000, min: 60_000, sec: 1000 };
  let ms = 0;
  let found = false;
  for (const m of s.matchAll(/(\d+)\s*(day|hour|hr|min|sec)/g)) {
    ms += Number(m[1]) * units[m[2]];
    found = true;
  }
  return found ? ms : null;
}

export function parseListingPage(html, { fallback = "other", catName = null, now = Date.now() } = {}) {
  const blocks = html.split(/<div class="auction-item" id="/).slice(1);
  const lots = [];
  for (const block of blocks) {
    const id = block.match(/^(\d+)/)?.[1];
    if (!id) continue;
    const titleRaw = block.match(/<h6[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "";
    const title = text(titleRaw).replace(new RegExp(`^#${id}\\s*-\\s*`), "") || `Auction #${id}`;
    const priceText = text(block.match(/id="val_[^"]*"[^>]*>([\s\S]*?)<\/b>/)?.[1] ?? "");
    const price = Number(priceText.replace(/[^0-9.]/g, ""));
    const state = text(block.match(/class="auction-item-state"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "") || null;
    // The listing page uses a tiny 68x90 thumbnail ("thumb-b"); "thumb-a" serves the full-size photo.
    const photo = block.match(/<img[^>]*src="([^"]+)"/)?.[1]?.replace("/thumb-b/", "/thumb-a/") ?? null;
    const timeLeftText = text(block.match(/id="timeLeftValue[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "");
    const left = parseTimeLeft(timeLeftText);
    const guessed = categorize(title);
    lots.push({
      id: `publicsurplus:${id}`,
      source: "publicsurplus",
      title,
      description: null,
      category: guessed === "other" ? fallback : guessed,
      current_bid: priceText && Number.isFinite(price) ? price : null,
      start_time: null,
      end_time: left === null ? null : new Date(now + left).toISOString(),
      status: left === null ? (timeLeftText.toLowerCase() || "unknown") : "active",
      city: null,
      state: state ? state.toUpperCase() : null,
      zip: null,
      agency: null,
      photo_url: photo && photo.startsWith("http") ? photo : photo ? BASE + photo : null,
      lot_url: `${BASE}/sms/auction/view?auc=${id}`,
      raw: { timeLeft: timeLeftText, price: priceText, ...(catName ? { category: catName } : {}) },
      last_updated: new Date(now).toISOString(),
    });
  }
  return lots;
}

export function lastPageIndex(html) {
  const pages = [...html.matchAll(/srchPage\('(\d+)'\)/g)].map((m) => Number(m[1]));
  return pages.length ? Math.max(...pages) : 0;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(catId, page) {
  const url = `${BASE}/sms/browse/cataucs?catid=${catId}${page ? `&page=${page}` : ""}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Public Surplus ${url} returned ${res.status}`);
  return res.text();
}

export async function run() {
  const supabase = getWriteClient();
  let total = 0;
  for (const cat of PS_CATEGORIES) {
    let last = 0;
    let saved = 0;
    for (let page = 0; page <= Math.min(last, MAX_PAGES_PER_CATEGORY - 1); page++) {
      if (page > 0 || total > 0) await sleep(DELAY_MS);
      let html;
      try {
        html = await fetchPage(cat.id, page);
      } catch (err) {
        console.warn(String(err));
        break;
      }
      if (page === 0) last = lastPageIndex(html);
      const lots = parseListingPage(html, { fallback: cat.fallback, catName: cat.name });
      if (!lots.length) break;
      saved += await upsertLots(supabase, lots);
    }
    console.log(`Public Surplus ${cat.name}: saved ${saved} lots (${last + 1} pages).`);
    total += saved;
  }
  if (total === 0) throw new Error("Public Surplus: no lots found — the page layout may have changed.");
  console.log(`Public Surplus: saved ${total} lots in total.`);
  return total;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
