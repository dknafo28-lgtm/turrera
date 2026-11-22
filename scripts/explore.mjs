const H = { "X-Algolia-Application-Id": "ICB6K32PD0", "X-Algolia-API-Key": "9d3241f7a3ee8947997deaa33cb0b249", "Content-Type": "application/json" };
async function q(body) {
  const r = await fetch("https://ICB6K32PD0-dsn.algolia.net/1/indexes/api_items/query", { method: "POST", headers: H, body: JSON.stringify(body) });
  const j = await r.json(); return { status: r.status, j };
}
let { status, j } = await q({ query: "", hitsPerPage: 2, filters: "NOT saleSubType:Internal AND NOT isSplitLot:1", facets: ["*"] });
console.log("STATUS", status, "nbHits", j.nbHits, "nbPages", j.nbPages);
console.log("FACETS", JSON.stringify(j.facets ?? {}).slice(0, 4000));
console.log("HIT", JSON.stringify(j.hits?.[0] ?? j).slice(0, 4000));
