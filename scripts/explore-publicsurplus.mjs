// Temporary: inspects Public Surplus page structure so we can write the collector.
const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: "follow" });
  const text = await res.text();
  console.log(`\n===== ${url} -> ${res.status} (${text.length} chars)`);
  return text;
}
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
const home = await get("https://www.publicsurplus.com/sms/browse/home");
const cats = [...home.matchAll(/cataucs\?catid=(\d+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => `${m[1]}=${m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}`);
console.log("CATEGORIES:", cats.join(" | "));
await sleep(4000);
const page = await get("https://www.publicsurplus.com/sms/browse/cataucs?catid=4");
const hrefs = [...new Set([...page.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))];
console.log("HREFS:", hrefs.filter((h) => !h.includes("cataucs?catid=") && !h.includes("/browse/home")).slice(0, 60).join("\n"));
const endpoints = [...new Set([...page.matchAll(/["'](\/sms\/[^"']*(?:ajax|json|list|grid|data|api)[^"']*)["']/gi)].map((m) => m[1]))];
console.log("ENDPOINTS:", endpoints.join("\n"));
const s = strip(page);
const k = s.search(/Time Left|Current Price|auction\/view|aucId|auctionId/i);
console.log("SNIPPET at", k);
console.log(s.slice(Math.max(0, k - 1500), k + 5000));
const scripts = [...page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).filter((t) => /auc|grid|fetch|ajax|url/i.test(t));
console.log("SCRIPTS:", scripts.map((t) => t.slice(0, 1200)).join("\n-----\n").slice(0, 6000));
