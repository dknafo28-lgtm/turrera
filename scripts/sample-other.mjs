import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const now = new Date().toISOString();
const counts = {};
for (const c of ["trucks","cars","boats","equipment","buses","golf carts","other"]) {
  const { count } = await db.from("lots").select("id", { count: "exact", head: true }).eq("category", c).gt("end_time", now);
  counts[c] = count;
}
console.log("OPEN COUNTS", JSON.stringify(counts));
const { data } = await db.from("lots").select("source,title,raw").eq("category", "other").gt("end_time", now).limit(1000);
const rawCats = {};
for (const r of data ?? []) {
  const rc = r.raw?.category ?? r.raw?.parentCategory ?? r.raw?.categoryName ?? null;
  if (rc) rawCats[`${r.source}:${rc}`] = (rawCats[`${r.source}:${rc}`] ?? 0) + 1;
}
console.log("RAW CATS", JSON.stringify(Object.entries(rawCats).sort((a,b)=>b[1]-a[1]).slice(0,60)));
const shuffled = (data ?? []).sort(() => Math.random() - 0.5).slice(0, 300);
for (const r of shuffled) console.log("OTHER|" + r.source + "|" + r.title);
const { data: boats } = await db.from("lots").select("title").eq("category", "boats").gt("end_time", now).limit(200);
for (const r of boats ?? []) console.log("BOAT|" + r.title);
const { data: eq } = await db.from("lots").select("title").eq("category", "equipment").gt("end_time", now).limit(150);
for (const r of (eq ?? []).sort(() => Math.random() - 0.5).slice(0,120)) console.log("EQ|" + r.title);
const { data: tr } = await db.from("lots").select("title").eq("category", "trucks").gt("end_time", now).limit(400);
for (const r of (tr ?? []).sort(() => Math.random() - 0.5).slice(0,120)) console.log("TRUCK|" + r.title);
