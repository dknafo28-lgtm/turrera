import { getReadClient, type Lot } from "@/lib/supabase";

export const PAGE_SIZE = 48;

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

export const SOURCES: Record<string, string> = { gsa: "GSA Auctions", publicsurplus: "Public Surplus", municibid: "Municibid", jjkane: "JJ Kane (government sellers)",
  govdeals: "GovDeals (your alerts)", govplanet: "GovPlanet (your alerts)", cws: "CWS Marketing (your alerts)",
};

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
  ending?: string; source?: string; ease?: string; deal?: string; page?: string; view?: string;
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

export const SOURCE_SHORT: Record<string, string> = {
  gsa: "GSA Auctions", publicsurplus: "Public Surplus", municibid: "Municibid", jjkane: "JJ Kane",
  govdeals: "GovDeals", govplanet: "GovPlanet", cws: "CWS Marketing",
};

async function list(build: (q: any) => any, columns = FULL, limit = 12): Promise<Lot[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = getReadClient();
  if (!supabase) return [];
  for (const cols of [columns, BASE]) {
    const { data, error } = await build(supabase.from("lots").select(cols)).limit(limit);
    if (!error) return (data ?? []) as unknown as Lot[];
    if (!/does not exist|spread|sell_ease/i.test(error.message)) return [];
  }
  return [];
}

export async function loadHome() {
  const now = new Date().toISOString();
  const day = new Date(Date.now() + 24 * 3_600_000).toISOString();
  const photoFor = (cat: string) => list((q) => q.eq("category", cat).gte("end_time", now).not("photo_url", "is", null)
    .in("source", ["publicsurplus", "municibid", "jjkane"]).order("current_bid", { ascending: false, nullsFirst: false }), BASE, 1);
  const tilesP = Promise.all(CATEGORIES.filter((c) => c.key !== "other").map(async (c) => [c.key, (await photoFor(c.key))[0]?.photo_url ?? null] as const));
  const [endingSoon, deals, newest, counts, sourceCounts, tiles] = await Promise.all([
    list((q) => q.gte("end_time", now).lte("end_time", day).neq("category", "other").order("end_time", { ascending: true }), FULL, 10),
    list((q) => q.gte("end_time", now).gt("spread", 0).in("sell_ease", ["easy", "moderate"]).order("spread", { ascending: false }), FULL, 10),
    list((q) => q.gte("end_time", now).neq("category", "other").order("first_seen", { ascending: false }), FULL, 10),
    categoryCounts({}),
    sourceCountsOpen(),
    tilesP,
  ]);
  const endingToday = await countOpen((q) => q.lte("end_time", day));
  return { endingSoon, deals, newest, counts, sourceCounts, tilePhotos: Object.fromEntries(tiles) as Record<string, string | null>, endingToday };
}

async function sourceCountsOpen(): Promise<Record<string, number>> {
  const supabase = getReadClient();
  if (!supabase) return {};
  const now = new Date().toISOString();
  const entries = await Promise.all(Object.keys(SOURCE_SHORT).map(async (s) => {
    const { count } = await supabase.from("lots").select("id", { count: "exact", head: true }).eq("source", s).or(`end_time.gte.${now},end_time.is.null`);
    return [s, count ?? 0] as const;
  }));
  return Object.fromEntries(entries.filter(([, c]) => c > 0));
}

export async function lotsByIds(ids: string[]): Promise<Lot[]> {
  const clean = ids.filter((i) => typeof i === "string" && i.length < 120).slice(0, 100);
  if (!clean.length) return [];
  return list((q) => q.in("id", clean), FULL, 100);
}

export async function similarLots(lot: Pick<Lot, "id" | "category" | "state">): Promise<Lot[]> {
  if (!lot.category) return [];
  const now = new Date().toISOString();
  const sameState = lot.state
    ? await list((q) => q.eq("category", lot.category).eq("state", lot.state).neq("id", lot.id).gte("end_time", now).order("end_time", { ascending: true }), FULL, 4)
    : [];
  if (sameState.length >= 4) return sameState;
  const more = await list((q) => q.eq("category", lot.category).neq("id", lot.id).gte("end_time", now).order("end_time", { ascending: true }), FULL, 8);
  const seen = new Set(sameState.map((l) => l.id));
  return [...sameState, ...more.filter((l) => !seen.has(l.id))].slice(0, 4);
}

async function countOpen(build: (q: any) => any): Promise<number> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = getReadClient();
  if (!supabase) return 0;
  const { count } = await build(supabase.from("lots").select("id", { count: "exact", head: true }).gte("end_time", new Date().toISOString()));
  return count ?? 0;
}
