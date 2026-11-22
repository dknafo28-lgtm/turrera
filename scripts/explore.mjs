const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const html = await (await fetch("https://www.jjkane.com/", { headers: UA })).text();
const hits = new Set();
for (const m of html.matchAll(/["'`](https?:\/\/[^"'`\s]*(?:api|algolia|search|json|graphql|items|auctions)[^"'`\s]*)["'`]/gi)) hits.add(m[1]);
for (const m of html.matchAll(/["'`](\/[^"'`\s]*(?:api|wp-json|ajax|items|search)[^"'`\s]*)["'`]/gi)) hits.add(m[1]);
console.log("JJ ENDPOINTS", [...hits].slice(0, 60).join("\n"));
for (const k of ["algolia", "appId", "applicationId", "apiKey", "indexName", "wp-json", "admin-ajax"]) { const i = html.indexOf(k); if (i >= 0) console.log("JJ CTX", k, html.slice(Math.max(0, i - 200), i + 300).replace(/\s+/g, " ")); }
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
console.log("JJ SCRIPTS", scripts.join("\n"));
