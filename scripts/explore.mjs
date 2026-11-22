const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  try { const res = await fetch(url, { headers: UA, redirect: "follow" }); const text = await res.text();
    console.log(`\n===== ${url} -> ${res.status} (${text.length}) ${res.headers.get("content-type")}`); return text; }
  catch (e) { console.log(`\n===== ${url} ERROR ${e}`); return ""; }
}
const sm = await get("https://www.govplanet.com/sitemap.xml");
console.log("GP SITEMAP", sm.slice(0, 1500));
const sub = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log("GP SUB", sub.slice(0, 30).join("\n"));
await sleep(2000);
const itemMap = sub.find((u) => /item|equip|listing/i.test(u)) ?? sub[0];
if (itemMap) { const x = await get(itemMap); const locs = [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]); console.log("GP LOCS", locs.length, locs.slice(0, 8).join("\n"));
  const item = locs.find((u) => /\/for-sale\/|\/jsp\/s\/item|\/item\//i.test(u)) ?? locs[0];
  await sleep(2000);
  if (item) { const h = await get(item); const t = h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n").replace(/\n\s*\n+/g, "\n");
    console.log("GP ITEM TEXT", t.slice(0, 3000)); const ld = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/); console.log("GP LDJSON", ld ? ld[1].slice(0, 2000) : "none"); } }
await sleep(2000);
const jj = await get("https://www.jjkane.com/");
console.log("JJ LINKS", [...new Set([...jj.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]))].filter((h) => /auction|search|equip|inventory|item|lot/i.test(h)).slice(0, 40).join("\n"));
await sleep(2000);
const pw = await get("https://www.purplewave.com/");
console.log("PW LINKS", [...new Set([...pw.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]))].filter((h) => /auction|search|item|government/i.test(h)).slice(0, 40).join("\n"));
