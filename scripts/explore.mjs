const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
for (const u of ["https://www.jjkane.com/government-auctions/", "https://www.jjkane.com/items/1654472"]) {
  const html = await (await fetch(u, { headers: UA })).text();
  console.log("\n=====", u, html.length);
  for (const k of ["indexName", "index_name", "algoliaIndex", "initIndex", "searchClient", "facetFilters", "filters:", "government", "Government"]) {
    let i = -1, n = 0; while ((i = html.indexOf(k, i + 1)) >= 0 && n++ < 3) console.log("CTX", k, "|", html.slice(Math.max(0, i - 200), i + 260).replace(/\s+/g, " "));
  }
  const t = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n").replace(/\n\s*\n+/g, "\n");
  console.log("TEXT", t.slice(0, 1500));
  const js = [...html.matchAll(/<script[^>]*src="([^"]*kronos[^"]*|[^"]*items?[^"]*\.js[^"]*)"/g)].map((m) => m[1]);
  console.log("THEME JS", js.join("\n"));
}
