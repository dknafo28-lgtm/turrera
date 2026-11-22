import { getReadClient, type Lot } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const CATEGORIES = ["boats", "trucks", "buses", "cars", "equipment", "golf carts", "other"];
const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR",
  "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];
const SORTS: Record<string, { label: string; column: string; ascending: boolean }> = {
  ending: { label: "Ending soonest", column: "end_time", ascending: true },
  newest: { label: "Newest listed", column: "first_seen", ascending: false },
  price_low: { label: "Price: low to high", column: "current_bid", ascending: true },
  price_high: { label: "Price: high to low", column: "current_bid", ascending: false },
};

const SOURCES: Record<string, string> = { gsa: "GSA Auctions", publicsurplus: "Public Surplus" };

type Params = { q?: string; category?: string; state?: string; max?: string; sort?: string; ending?: string; source?: string };

function money(n: number | null) {
  if (n === null || n === undefined) return "No bids yet";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function timeLeft(end: string | null) {
  if (!end) return "End date not listed";
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
}

async function loadLots(p: Params): Promise<{ lots: Lot[]; error?: string }> {
  const supabase = getReadClient();
  if (!supabase) return { lots: [], error: "Database not connected yet — add the Supabase keys in Vercel." };

  const sort = SORTS[p.sort ?? "ending"] ?? SORTS.ending;
  let query = supabase
    .from("lots")
    .select("id,source,title,description,category,current_bid,start_time,end_time,status,city,state,agency,photo_url,lot_url,first_seen")
    .or(`end_time.gte.${new Date().toISOString()},end_time.is.null`);

  const q = (p.q ?? "").replace(/[^\p{L}\p{N}\s\-]/gu, " ").trim();
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (p.category && CATEGORIES.includes(p.category)) query = query.eq("category", p.category);
  if (p.state && STATES.includes(p.state)) query = query.eq("state", p.state);
  if (p.source && p.source in SOURCES) query = query.eq("source", p.source);
  const max = Number(p.max);
  if (p.max && Number.isFinite(max) && max > 0) query = query.lte("current_bid", max);
  if (p.ending === "48h") query = query.lte("end_time", new Date(Date.now() + 48 * 3_600_000).toISOString());

  const { data, error } = await query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .limit(120);
  if (error) return { lots: [], error: error.message };
  return { lots: (data ?? []) as Lot[] };
}

export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const { lots, error } = await loadLots(p);

  return (
    <>
      <form className="filters" method="get">
        <input type="search" name="q" placeholder="Search: Ford F-250, pontoon boat, excavator…" defaultValue={p.q ?? ""} />
        <select name="category" defaultValue={p.category ?? ""}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select name="state" defaultValue={p.state ?? ""}>
          <option value="">All states</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="source" defaultValue={p.source ?? ""}>
          <option value="">All sites</option>
          {Object.entries(SOURCES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <input type="number" name="max" min="0" step="100" placeholder="Max price $" defaultValue={p.max ?? ""} />
        <select name="ending" defaultValue={p.ending ?? ""}>
          <option value="">Any end date</option>
          <option value="48h">Ending in 48 hours</option>
        </select>
        <select name="sort" defaultValue={p.sort ?? "ending"}>
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <button type="submit">Search</button>
      </form>

      {error ? <p className="notice">{error}</p> : <p className="count">{lots.length === 120 ? "Showing first 120 lots" : `${lots.length} lots`}</p>}

      <ul className="grid">
        {lots.map((lot) => (
          <li key={lot.id} className="card">
            <a href={lot.lot_url ?? "#"} target="_blank" rel="noopener noreferrer">
              <div className="thumb">
                {lot.photo_url ? <img src={lot.photo_url} alt="" loading="lazy" /> : <span>No photo</span>}
              </div>
              <div className="body">
                <h2>{lot.title}</h2>
                <p className="price">{money(lot.current_bid)}</p>
                <p className="meta">{[lot.city, lot.state].filter(Boolean).join(", ") || "Location not listed"}</p>
                <p className="meta">{timeLeft(lot.end_time)} · {SOURCES[lot.source] ?? lot.source}</p>
                {lot.category ? <span className="tag">{lot.category}</span> : null}
              </div>
            </a>
          </li>
        ))}
      </ul>

      {!error && lots.length === 0 ? <p className="notice">No lots match those filters yet.</p> : null}
    </>
  );
}
