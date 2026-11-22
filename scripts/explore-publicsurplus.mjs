// Temporary: inspects Public Surplus page structure so we can write the collector.
const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: "follow" });
  const text = await res.text();
  console.log(`\n===== ${url} -> ${res.status} (${text.length} chars), final: ${res.url}`);
  return text;
}
const robots = await get("https://www.publicsurplus.com/robots.txt");
console.log(robots.slice(0, 1500));
await sleep(3000);
const home = await get("https://www.publicsurplus.com/sms/browse/home");
const links = [...new Set([...home.matchAll(/href="([^"]*(?:browse|auction|search)[^"]*)"/gi)].map((m) => m[1]))];
console.log("LINKS:", links.slice(0, 80).join("\n"));
await sleep(3000);
const search = await get("https://www.publicsurplus.com/sms/browse/search?posting=y&slth=&page=0&sortBy=timeLeft&keyWord=truck&catId=-1&endHours=-1&startHours=-1&lowerPrice=0&higherPrice=0&milesFrom=0&zipCode=&region=all");
const i = search.indexOf("auc=");
console.log("FIRST auc= at", i);
console.log(search.slice(Math.max(0, i - 3000), i + 3000));
const aucIds = [...new Set([...search.matchAll(/auc=(\d+)/g)].map((m) => m[1]))];
console.log("AUC IDS:", aucIds.length, aucIds.slice(0, 10).join(","));
const pageLinks = [...new Set([...search.matchAll(/href="([^"]*page=\d+[^"]*)"/g)].map((m) => m[1]))];
console.log("PAGINATION:", pageLinks.slice(0, 5).join("\n"));
if (aucIds[0]) {
  await sleep(3000);
  const view = await get(`https://www.publicsurplus.com/sms/auction/view?auc=${aucIds[0]}`);
  const t = view.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  const j = t.search(/Current Price|Current Bid|Time Left|Location/i);
  console.log("VIEW snippet at", j);
  console.log(t.slice(Math.max(0, j - 2500), j + 4000));
}
