const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
for (const auc of ["4128203", "4126751"]) {
  const html = await (await fetch(`https://www.publicsurplus.com/sms/auction/view?auc=${auc}`, { headers: UA })).text();
  const t = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");
  for (const label of ["Description", "Location", "Auction Ends", "Closes", "Time Left", "Contact"]) console.log(`LABEL ${auc} ${label}: ${t.indexOf(label)}`);
  const i = t.indexOf("Description");
  console.log(`TEXT ${auc}:\n` + t.slice(Math.max(0, i - 1500), i + 2500));
  const ids = [...html.matchAll(/id="([^"]*(?:desc|Desc|location|Location|end|End)[^"]*)"/g)].map((m) => m[1]);
  console.log("IDS", [...new Set(ids)].join(", "));
  await new Promise((r) => setTimeout(r, 4000));
}
