// Temporary: inspects Public Surplus pagination so we can write the collector.
const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: "follow" });
  const text = await res.text();
  const ids = [...new Set([...text.matchAll(/id="(\d+)catGrid"/g)].map((m) => m[1]))];
  console.log(`\n===== ${url} -> ${res.status} (${text.length} chars) items=${ids.length} first=${ids.slice(0, 3)}`);
  return text;
}
const page = await get("https://www.publicsurplus.com/sms/browse/cataucs?catid=4");
const i = page.indexOf("function srchPage");
console.log("srchPage def at", i, page.slice(Math.max(0, i - 200), i + 1500));
const forms = [...page.matchAll(/<form[\s\S]*?<\/form>/gi)].map((m) => m[0].replace(/\s+/g, " ").slice(0, 1500));
console.log("FORMS:", forms.join("\n-----\n").slice(0, 5000));
const jsFiles = [...new Set([...page.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]))];
console.log("JS FILES:", jsFiles.join("\n"));
for (const url of [
  "https://www.publicsurplus.com/sms/browse/cataucs?catid=4&page=1",
  "https://www.publicsurplus.com/sms/browse/cataucs?catid=4&pg=1",
]) { await sleep(4000); await get(url); }
