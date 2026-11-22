const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: "follow" });
  const text = await res.text();
  console.log(`\n===== ${url} -> ${res.status} (${text.length} chars)`);
  return text;
}
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n").replace(/&#8211;/g, "–").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");
for (const path of ["/auctions/vehicles/", "/auctions/boats-vessels/", "/auctions/upcoming-auctions/"]) {
  const html = await get("https://cwsmarketing.com" + path);
  const t = strip(html);
  const i = t.search(/Auction|Bid|Lot/);
  const main = html.indexOf("fusion-row") ;
  console.log("TEXT", path, t.slice(t.indexOf("Contact") > 0 ? 0 : 0, 200));
  const k = t.indexOf("Vehicles") >= 0 ? t.indexOf("Vehicles") : 0;
  console.log(t.slice(1800, 6000));
  const bidLinks = [...new Set([...html.matchAll(/href="(https:\/\/bid\.cwsmarketing\.com\/[^"]+)"/g)].map((m) => m[1]))];
  console.log("BIDLINKS", bidLinks.join(" "));
  const j = html.indexOf("bid.cwsmarketing.com/auctions/catalog");
  console.log("HTML AROUND CATALOG LINK:", html.slice(Math.max(0, j - 2500), j + 800).replace(/\s+/g, " "));
  await sleep(5000);
}
