const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: "follow" });
  const text = await res.text();
  console.log(`\n===== ${url} -> ${res.status} (${text.length} chars) final=${res.url} type=${res.headers.get("content-type")}`);
  return text;
}
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
console.log((await get("https://www.cwsmarketing.com/robots.txt")).slice(0, 2000));
await sleep(3000);
const home = await get("https://www.cwsmarketing.com/");
const links = [...new Set([...home.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]))];
console.log("LINKS:\n" + links.slice(0, 120).join("\n"));
const apis = [...new Set([...home.matchAll(/["'`]((?:https?:\/\/[^"'`]*)?\/(?:wp-json|api|ajax|graphql)[^"'`]*)["'`]/gi)].map((m) => m[1]))];
console.log("APIS:", apis.join("\n"));
const s = strip(home).replace(/<[^>]+>/g, "\n").replace(/\n\s*\n+/g, "\n");
console.log("TEXT:", s.slice(0, 3000));
