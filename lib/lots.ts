import { getReadClient, type Lot } from "@/lib/supabase";

export const PAGE_SIZE = 60;

export const CATEGORIES = [
  { key: "trucks", label: "Trucks & vans" },
  { key: "cars", label: "Cars" },
  { key: "boats", label: "Boats" },
  { key: "equipment", label: "Equipment" },
  { key: "buses", label: "Buses" },
  { key: "golf carts", label: "Golf carts" },
  { key: "other", label: "Everything else" },
];

export const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR",
  "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export const SOURCES: Record<string, string> = { gsa: "GSA Auctions", publicsurplus: "Public Surplus", municibid: "Municibid", jjkane: "JJ Kane (government sellers)" };

export const SORTS: Record<string, { label: string; column: string; ascending: boolean }> = {
  ending: { label: "Ending soonest", column: "end_time", ascending: true },
  spread: { label: "Biggest potential profit", column: "spread", ascending: false },
  price_low: { label: "Lowest price", column: "current_bid", ascending: true },
  price_high: { label: "Highest price", column: "current_bid", ascending: false },
  newest: { label: "Newly listed", column: "first_seen", ascending: false },
};

export const ENDING: Record<string, { label: string; hours: number }> = {
  "6h": { label: "Next 6 hours", hours: 6 },
  "24h": { label: "Next 24 hours", hours: 24 },
  "72h": { label: "Next 3 days", hours: 72 },
  "7d": { label: "Next 7 days", hours: 168 },
};

export const EASE: Record<string, string> = { easy: "Easy to sell", moderate: "Easy or moderate" };

export type Params = {
  q?: string; category?: string; state?: string; max?: string; min?: string; sort?: string;
  ending?: string; source?: string; ease?: string; deal?: string; page?: string;
};

export type Result = { lots: Lot[]; total: number; error?: string };

type Client = NonNullable<ReturnType<typeof getReadClient>>;

const BASE = "id,source,title,description,category,current_bid,start_time,end_time,status,city,state,agency,photo_url,lot_url,first_seen";
const FULL = `${BASE},est_value,est_low,est_high,comps_count,spread,condition,sell_ease,sell_note,value_source`;

function words(q?: string) {
  return (q ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s\-.]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 6);
}

// Applies every filter except category, so category counts can reuse it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<T extends { or: any; eq: any; in: any; lte: any; gte: any; gt: any }>(query: T, p: Params, full: boolean): T {
  let q = query.or(`end_time.gte.${new Date().toISOString()},end_time.is.null`);
  for (const w of words(p.q)) q = q.or(`title.ilike."%${w}%",description.ilike."%${w}%"`);
  if (p.state && STATES.includes(p.state)) q = q.eq("state", p.state);
  if (p.source && p.source in SOURCES) q = q.eq("source", p.source);
  const max = Number(p.max);
  if (p.max && Number.isFinite(max) && max > 0) q = q.lte("current_bid", max);
  const min = Number(p.min);
  if (p.min && Number.isFinite(min) && min > 0) q = q.gte("current_bid", min);
  if (p.ending && ENDING[p.ending]) q = q.lte("end_time", new Date(Date.now() + ENDING[p.ending].hours * 3_600_000).toISOString());
  if (full) {
    if (p.ease === "easy") q = q.eq("sell_ease", "easy");
    if (p.ease === "moderate") q = q.in("sell_ease", ["easy", "moderate"]);
    if (p.deal === "1") q = q.gt("spread", 0);
  }
  return q;
}

export async function loadLots(p: Params): Promise<Result> {
  const supabase = getReadClient();
  if (!supabase) return { lots: [], total: 0, error: "The database isn't connected yet. Add the Supabase keys in Vercel." };
  const first = await query(supabase, p, true);
  if (first.error && /does not exist|spread|sell_ease/i.test(first.error)) {
    return query(supabase, { ...p, sort: p.sort === "spread" ? "ending" : p.sort }, false);
  }
  return first;
}

async function query(supabase: Client, p: Params, full: boolean): Promise<Result> {
  const sort = SORTS[p.sort ?? "ending"] ?? SORTS.ending;
  const page = Math.max(1, Math.min(200, Number(p.page) || 1));
  let q = supabase.from("lots").select(full ? FULL : BASE, { count: "exact" });
  q = applyFilters(q, p, full);
  if (p.category && CATEGORIES.some((c) => c.key === p.category)) q = q.eq("category", p.category);
  const { data, error, count } = await q
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order("id", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) return { lots: [], total: 0, error: error.message };
  return { lots: (data ?? []) as unknown as Lot[], total: count ?? 0 };
}

// How many open lots each category has under the current filters (category itself excluded).
export async function categoryCounts(p: Params): Promise<Record<string, number>> {
  const supabase = getReadClient();
  if (!supabase) return {};
  const entries = await Promise.all(
    CATEGORIES.map(async (c) => {
      let q = supabase.from("lots").select("id", { count: "exact", head: true });
      q = applyFilters(q, p, true).eq("category", c.key);
      const { count, error } = await q;
      if (error) {
        let q2 = supabase.from("lots").select("id", { count: "exact", head: true });
        q2 = applyFilters(q2, p, false).eq("category", c.key);
        const r = await q2;
        return [c.key, r.count ?? 0] as const;
      }
      return [c.key, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}
