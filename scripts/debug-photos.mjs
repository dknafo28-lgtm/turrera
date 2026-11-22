import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const { data: g } = await sb.from("lots").select("photo_url").eq("source", "gsa").not("photo_url", "is", null).limit(4);
console.log("GSA PHOTOS", JSON.stringify(g));
const { data: p } = await sb.from("lots").select("id,photo_url").eq("source", "publicsurplus").not("photo_url", "is", null).limit(2);
console.log("PS PHOTOS", JSON.stringify(p));
async function size(url) {
  try { const r = await fetch(url, { headers: UA }); const b = Buffer.from(await r.arrayBuffer());
    let w = null, h = null; // read JPEG/PNG dimensions
    if (b[0] === 0x89) { w = b.readUInt32BE(16); h = b.readUInt32BE(20); }
    else { for (let i = 2; i < b.length - 9; ) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; const len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) { h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break; } i += 2 + len; } }
    return `${r.status} ${b.length}B ${w}x${h} ${r.headers.get("content-type")}`; } catch (e) { return String(e); }
}
for (const row of g ?? []) console.log("GSA SIZE", row.photo_url, await size(row.photo_url));
const ps = p?.[0];
if (ps) {
  console.log("PS THUMB", await size(ps.photo_url));
  for (const v of ["thumb-a", "thumb-c", "thumb-l", "large", "full"]) {
    const u = ps.photo_url.replace("thumb-b", v); console.log("PS VARIANT", v, await size(u));
  }
  const u2 = ps.photo_url.replace("/thumb-b", ""); console.log("PS NO-THUMB", u2, await size(u2));
  const auc = ps.id.split(":")[1];
  await new Promise((r) => setTimeout(r, 3000));
  const html = await (await fetch(`https://www.publicsurplus.com/sms/auction/view?auc=${auc}`, { headers: UA })).text();
  const imgs = [...new Set([...html.matchAll(/(https?:\/\/[^"' ]*cloudfront[^"' ]*|\/sms\/docviewer\/[^"' ]*)/g)].map((m) => m[1]))];
  console.log("PS VIEW IMAGES", imgs.slice(0, 15).join("\n"));
}
