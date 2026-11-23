// Records the real final price of auctions that have ended, so the Sold filter shows what things actually went for.
// Public Surplus item pages show "Final Price" and "# of Bids" after closing; Municibid's details include them too.
// Polite: one Public Surplus page every 4 seconds, a limited number per run.
import { pathToFileURL } from "node:url";
import { getWriteClient } from "./db.mjs";
import { connect } from "./mcp.mjs";

const HEADERS = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const DELAY_MS = 4000;
const MAX_PER_RUN = Number(process.env.RESULTS_PER_RUN ?? 250);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function parsePublicSurplusResult(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  if (!/Auction Ended|\bClosed\b/i.test(text)) return null; // not over yet
  const price = text.match(/Final Price\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  const bids = text.match(/# of Bids\s*(\d+)/i);
  const bidCount = bids ? Number(bids[1]) : null;
  const final = price ? Number(price[1].replace(/,/g, "")) : null;
  return { final_price: final, bid_count: bidCount, sold: Boolean(final && final > 0 && (bidCount === null || bidCount > 0)) };
}

export function municibidResult(d) {
  const price = Number(d?.pricing?.current_price);
  const bids = Number(d?.pricing?.bid_count);
  if (!Number.isFinite(price)) return null;
  return { final_price: price, bid_count: Number.isFinite(bids) ? bids : null, sold: price > 0 && (!Number.isFinite(bids) || bids > 0) };
}

export async function run() {
  const db = getWriteClient();
  const now = Date.now();
  const { data: due, error } = await db.from("lots").select("id,source,lot_url")
    .in("source", ["publicsurplus", "municibid"]).is("result_checked", null)
    .lte("end_time", new Date(now - 60 * 60_000).toISOString())
    .gte("end_time", new Date(now - 30 * 86_400_000).toISOString())
    .order("end_time", { ascending: false }).limit(MAX_PER_RUN);
  if (error) { console.log(`Results: ${error.message}`); return; }
  let mb = null;
  let done = 0, sold = 0;
  for (const lot of due ?? []) {
    let r = null;
    try {
      if (lot.source === "publicsurplus" && lot.lot_url) {
        const res = await fetch(lot.lot_url, { headers: HEADERS });
        if (res.ok) r = parsePublicSurplusResult(await res.text());
        await sleep(DELAY_MS);
      } else if (lot.source === "municibid") {
        mb ??= await connect("https://ai.municibid.com/mcp");
        r = municibidResult(await mb.call("get_auction_details", { auction_id: lot.id.split(":")[1] }));
      }
    } catch (e) { console.warn(`Results ${lot.id}: ${e.message}`); continue; }
    if (!r) continue;
    const { error: e2 } = await db.from("lots").update({ ...r, result_checked: new Date().toISOString() }).eq("id", lot.id);
    if (!e2) { done++; if (r.sold) sold++; }
  }
  console.log(`Results: ${done} ended lots checked, ${sold} sold.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run().catch((e) => { console.error(e); process.exit(1); });
