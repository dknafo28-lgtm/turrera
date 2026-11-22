const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const html = await (await fetch("https://www.publicsurplus.com/sms/auction/view?auc=4128203", { headers: UA })).text();
const urls = [...new Set([...html.matchAll(/(?:https?:)?\/\/[^"' )]*cloudfront[^"' )]*/g)].map((m) => m[0]))];
console.log("CLOUDFRONT", urls.length); for (const u of urls.slice(0, 30)) console.log("U", u);
const docs = [...new Set([...html.matchAll(/docviewer[^"' )]*/g)].map((m) => m[0]))];
console.log("DOCVIEWER", docs.slice(0, 20).join("\n"));
