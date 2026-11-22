// Temporary: reproduce the website's queries against the real database.
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const now = new Date().toISOString();
const { count: total } = await sb.from("lots").select("*", { count: "exact", head: true });
console.log("TOTAL", total);
for (const c of ["boats", "trucks", "buses", "cars", "equipment", "golf carts", "other"]) {
  const { count } = await sb.from("lots").select("*", { count: "exact", head: true }).eq("category", c);
  const { count: active } = await sb.from("lots").select("*", { count: "exact", head: true }).eq("category", c).gte("end_time", now);
  console.log("CATEGORY", c, count, "active", active);
}
const { data: boats } = await sb.from("lots").select("title,source,end_time,status").eq("category", "boats").limit(10);
console.log("BOATS", JSON.stringify(boats));
const { data: nulls, count: nullCount } = await sb.from("lots").select("title,source,status", { count: "exact" }).is("end_time", null).limit(3);
console.log("NULL END", nullCount, JSON.stringify(nulls));
// Same chain as the site
let q = sb.from("lots").select("id,title").or(`end_time.gte.${now},end_time.is.null`).or(`title.ilike.%truck%,description.ilike.%truck%`).order("end_time").limit(5);
let r = await q;
console.log("SITE QUERY q=truck", r.error?.message, r.data?.length, JSON.stringify(r.data?.slice(0, 3)));
r = await sb.from("lots").select("id,title").or(`end_time.gte.${now},end_time.is.null`).eq("category", "boats").limit(5);
console.log("SITE QUERY boats", r.error?.message, r.data?.length);
r = await sb.from("lots").select("id,title").or(`end_time.gte.${now},end_time.is.null`).or(`title.ilike.%ford f%,description.ilike.%ford f%`).limit(5);
console.log("SITE QUERY ford f", r.error?.message, r.data?.length);
