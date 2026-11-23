const H = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const B = "https://gcsurplus.ca/";
const get = async (u) => { const r = await fetch(u, { headers: H }); return await r.text(); };
const txt = (t) => t.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const tc = txt(await get(B + "mn-eng.cfm?snc=tc"));
for (const k of ["automat", "robot", "scrap", "crawl", "reproduc", "commercial", "non-resident", "outside Canada", "foreign", "international", "export", "eligib", "Who can", "resident", "copy"]) {
  let i = -1, n = 0; while ((i = tc.indexOf(k, i + 1)) >= 0 && n < 2) { console.log("TC", k, "=>", tc.slice(Math.max(0, i - 200), i + 300)); n++; }
}
const list = await get(B + "mn-eng.cfm?&snc=wfsav&vndsld=0&sc=ach-shop&lci=&sf=ferm-clos&so=ASC&srchtype=&hpcs=&hpsr=&kws=&jstp=&saleType=&str=1&sr=1&rpp=100");
const i = list.indexOf("sc=enc-bid");
console.log("\nLIST HTML around first item:\n", list.slice(Math.max(0, i - 2500), i + 2500));
const rows = [...list.matchAll(/sc=enc-bid&amp;scn=(\d+)&amp;lcn=(\d+)/g)];
console.log("ITEMS ON PAGE", new Set(rows.map((r) => r[2])).size);
const m = rows[0];
const item = await get(`${B}mn-eng.cfm?snc=wfsav&sc=enc-bid&scn=${m[1]}&lcn=${m[2]}&lct=L&srchtype=&lci=&str=1&lotnf=1&frmsr=1&sf=ferm-clos&saleType=`);
console.log("\nITEM TEXT:\n", txt(item).slice(0, 3500));
console.log("\nITEM IMGS:", [...new Set([...item.matchAll(/<img[^>]+src="([^"]+)"/g)].map((x) => x[1]))].slice(0, 20).join("\n"));
const sold = txt(await get(B + "mn-eng.cfm?snc=wfsav&vndsld=1"));
console.log("\nSOLD PAGE:\n", sold.slice(0, 2500));
