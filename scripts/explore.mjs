const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const html = await (await fetch("https://www.jjkane.com/items/1503890", { headers: UA })).text();
const imgs = [...new Set([...html.matchAll(/https:\/\/prod\.cdn\.jjkane\.com\/[^"'\s)]+/g)].map((m) => m[0]))];
console.log("IMGS", imgs.slice(0, 20).join("\n"));
const H = { "X-Algolia-Application-Id": "ICB6K32PD0", "X-Algolia-API-Key": "9d3241f7a3ee8947997deaa33cb0b249", "Content-Type": "application/json" };
const names = new Map();
for (let page = 0; page < 60; page++) {
  const r = await fetch("https://ICB6K32PD0-dsn.algolia.net/1/indexes/api_items/query", { method: "POST", headers: H, body: JSON.stringify({ query: "", hitsPerPage: 100, page, filters: "NOT saleSubType:Internal AND NOT isSplitLot:1", attributesToRetrieve: ["accountName"] }) });
  const j = await r.json(); for (const h of j.hits ?? []) names.set(h.accountName, (names.get(h.accountName) ?? 0) + 1);
  if (!j.hits?.length || page >= j.nbPages - 1) { console.log("PAGES", page + 1, "nbPages", j.nbPages); break; }
}
const gov = /\b(city|county|town|township|village|borough|state|commonwealth|department|dept|authority|district|school|schools|police|sheriff|fire|university|college|transit|port|municipal|government|parish|federal|u\.?s\.?|public works|board of|water works)\b/i;
const sorted = [...names.entries()].sort((a, b) => b[1] - a[1]);
console.log("TOTAL SELLERS", sorted.length, "GOV MATCHES", sorted.filter(([n]) => gov.test(n ?? "")).length, "GOV ITEMS", sorted.filter(([n]) => gov.test(n ?? "")).reduce((a, [, c]) => a + c, 0));
console.log("GOV", sorted.filter(([n]) => gov.test(n ?? "")).slice(0, 60).map(([n, c]) => `${n} (${c})`).join(" | "));
console.log("TOP OTHER", sorted.filter(([n]) => !gov.test(n ?? "")).slice(0, 40).map(([n, c]) => `${n} (${c})`).join(" | "));
