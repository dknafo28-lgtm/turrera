const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: "follow" });
  const text = await res.text();
  console.log(`\n===== ${url} -> ${res.status} (${text.length} chars) final=${res.url} type=${res.headers.get("content-type")}`);
  return text;
}
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");
console.log((await get("https://bid.cwsmarketing.com/robots.txt")).slice(0, 1500));
await sleep(3000);
const list = await get("https://bid.cwsmarketing.com/auctions/?page=1&status=2");
console.log("LIST LINKS:", [...new Set([...list.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]))].filter((h) => /auction|lot|catalog/i.test(h)).slice(0, 60).join("\n"));
console.log("LIST TEXT:", strip(list).slice(0, 2500));
console.log("LIST SCRIPTS:", [...list.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]).join("\n"));
const apis = [...new Set([...list.matchAll(/["'`]((?:https?:\/\/[^"'`]*)?\/(?:api|ajax|graphql|json)[^"'`\s]*)["'`]/gi)].map((m) => m[1]))];
console.log("APIS:", apis.join("\n"));
await sleep(3000);
const cat = await get("https://bid.cwsmarketing.com/auctions/catalog/id/492");
console.log("CAT LINKS:", [...new Set([...cat.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]))].filter((h) => /lot|item|catalog|page/i.test(h)).slice(0, 40).join("\n"));
const i = cat.search(/lot-?title|lot_title|class="[^"]*lot[^"]*"/i);
console.log("CAT HTML at", i, cat.slice(Math.max(0, i - 500), i + 4000));
const capis = [...new Set([...cat.matchAll(/["'`]((?:https?:\/\/[^"'`]*)?\/(?:api|ajax|graphql|json)[^"'`\s]*)["'`]/gi)].map((m) => m[1]))];
console.log("CAT APIS:", capis.join("\n"));
