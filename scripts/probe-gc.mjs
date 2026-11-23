const H = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const get = async (u) => { try { const r = await fetch(u, { headers: H, redirect: "follow" }); return [r.status, r.url, await r.text()]; } catch (e) { return [0, u, String(e)]; } };
let [s, u, t] = await get("https://www.gcsurplus.ca/robots.txt");
console.log("ROBOTS", s, u, "\n" + t.slice(0, 1500));
[s, u, t] = await get("https://www.gcsurplus.ca/");
console.log("HOME", s, u, t.length);
const links = [...new Set([...t.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))];
console.log("LINKS", links.filter((l) => /cfm|rss|xml|feed|term|condition|search|recherche|sale|vente|category|cat/i.test(l)).slice(0, 80).join("\n"));
for (const path of ["/mn-eng.cfm", "/mn-eng.cfm?snc=wfsav&sc=ach-shop&vndsld=0&lci=&lcn=&lct=L&srchtype=&lcntry=&lprov=&lregn=", "/rss-eng.cfm"]) {
  [s, u, t] = await get("https://www.gcsurplus.ca" + path);
  console.log("\nPAGE", path, s, u, t.length);
  const txt = t.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  console.log(txt.slice(0, 1200));
  const hrefs = [...new Set([...t.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))].filter((l) => /cfm/.test(l));
  console.log("CFM LINKS", hrefs.slice(0, 40).join("\n"));
}
