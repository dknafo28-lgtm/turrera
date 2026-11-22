const H = { "X-Algolia-Application-Id": "ICB6K32PD0", "X-Algolia-API-Key": "9d3241f7a3ee8947997deaa33cb0b249", "Content-Type": "application/json" };
async function q(body) { const r = await fetch("https://ICB6K32PD0-dsn.algolia.net/1/indexes/api_items/query", { method: "POST", headers: H, body: JSON.stringify(body) }); return r.json(); }
const base = "NOT saleSubType:Internal AND NOT isSplitLot:1";
let j = await q({ query: "", hitsPerPage: 0, filters: base, facets: ["industry", "industries.title", "saleType", "itemStatus", "accountName", "saleId", "ring"], maxValuesPerFacet: 40 });
console.log("FACETS", JSON.stringify(j.facets).slice(0, 5000));
j = await q({ query: "", hitsPerPage: 3, filters: base + ' AND itemStatus:Active AND saleId:1282' });
for (const h of j.hits ?? []) console.log("ACTIVE HIT", JSON.stringify({ id: h.id, t: h.webDescription, acct: h.accountName, ind: h.industry, st: h.itemStatus, saleDate: h.saleDate, close: h.ringCloseOutDate, city: h.offSitePhysicalCity || h.saleCity, state: h.offSitePhysicalState || h.saleState, img: h.imageCount, keys: Object.keys(h).filter((k) => /image|photo|bid|price|url|close|end/i.test(k)) }));
console.log("ACTIVE RAW", JSON.stringify(j.hits?.[0] ?? {}).slice(0, 2500));
