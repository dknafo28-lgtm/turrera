// One-off probe: what do ended lots look like on Public Surplus and Municibid?
import { getWriteClient } from "../collectors/db.mjs";
import { connect } from "../collectors/mcp.mjs";
const db = getWriteClient();
const now = Date.now();
const since = new Date(now - 3 * 86_400_000).toISOString(), until = new Date(now - 2 * 3_600_000).toISOString();
for (const source of ["publicsurplus", "municibid", "gsa"]) {
  const { data } = await db.from("lots").select("id,title,current_bid,end_time,lot_url,status").eq("source", source).gte("end_time", since).lte("end_time", until).limit(3);
  console.log("ENDED", source, JSON.stringify(data));
}
const { data: ps } = await db.from("lots").select("id,lot_url,current_bid").eq("source", "publicsurplus").gte("end_time", since).lte("end_time", until).limit(1);
if (ps?.[0]) {
  const html = await (await fetch(ps[0].lot_url, { headers: { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" } })).text();
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const k of ["Current Price", "Closed", "Ended", "Winning", "Sold", "Final", "High Bid", "Bids"]) {
    const i = text.indexOf(k); if (i >= 0) console.log("PS", k, "=>", text.slice(Math.max(0, i - 80), i + 160));
  }
}
const { data: mb } = await db.from("lots").select("id").eq("source", "municibid").gte("end_time", since).lte("end_time", until).limit(1);
if (mb?.[0]) {
  const c = await connect("https://ai.municibid.com/mcp");
  try { console.log("MB tools", JSON.stringify(await c.listTools?.()).slice(0, 800)); } catch (e) { console.log("no listTools", e.message); }
  const d = await c.call("get_auction_details", { auction_id: mb[0].id.split(":")[1] });
  const s = JSON.stringify(d);
  console.log("MB keys", Object.keys(d ?? {}).join(","));
  for (const k of ["status", "current_bid", "winning", "sold", "final", "closed", "high_bid", "bid_count", "ended"]) { const i = s.toLowerCase().indexOf(k); if (i >= 0) console.log("MB", k, "=>", s.slice(Math.max(0, i - 60), i + 140)); }
}
