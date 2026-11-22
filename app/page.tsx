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
  spread: { label: "Biggest potential profit", column: "spread", ascending: false },
};

const GROUPS = [
  { label: "Ending in the next 6 hours", until: 6 },
  { label: "Ending today", until: 24 },
  { label: "Ending in the next 3 days", until: 72 },
  { label: "Ending this week", until: 168 },
  { label: "Ending later", until: Infinity },
];

function groupByEnding(lots: Lot[]) {
  const groups = GROUPS.map((g) => ({ ...g, lots: [] as Lot[] }));
  const noDate: Lot[] = [];
  for (const lot of lots) {
    if (!lot.end_time) { noDate.push(lot); continue; }
    const hours = (new Date(lot.end_time).getTime() - Date.now()) / 3_600_000;
    groups.find((g) => hours <= g.until)!.lots.push(lot);
  }
  return [...groups, { label: "End date not listed", until: Infinity, lots: noDate }].filter((g) => g.lots.length);
}

const SOURCES: Record<string, string> = { gsa: "GSA Auctions", publicsurplus: "Public Surplus" };

type Params = { q?: string; category?: string; state?: string; max?: string; sort?: string; ending?: string; source?: string; ease?: string };

const EASE_LABEL: Record<string, string> = { easy: "Easy to sell", moderate: "Moderate to sell", hard: "Hard to sell" };

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

  const base = "id,source,title,description,category,current_bid,start_time,end_time,status,city,state,agency,photo_url,lot_url,first_seen";
  const values = "est_value,est_low,est_high,comps_count,spread,condition";
  // Newest columns first; if the database hasn't been updated yet, fall back to older column sets.
  const attempts = [`${base},${values},sell_ease,sell_note,value_source`, `${base},${values}`, base];
  let last: { lots: Lot[]; error?: string } = { lots: [] };
  for (const [i, columns] of attempts.entries()) {
    const params = i === attempts.length - 1 && p.sort === "spread" ? { ...p, sort: "ending" } : p;
    last = await runQuery(supabase, i === 0 ? params : { ...params, ease: undefined }, columns);
    if (!last.error || !/does not exist|spread|sell_ease/i.test(last.error)) return last;
  }
  return last;
}

async function runQuery(supabase: NonNullable<ReturnType<typeof getReadClient>>, p: Params, columns: string): Promise<{ lots: Lot[]; error?: string }> {
  const sort = SORTS[p.sort ?? "ending"] ?? SORTS.ending;
  let query = supabase
    .from("lots")
    .select(columns)
    .or(`end_time.gte.${new Date().toISOString()},end_time.is.null`);

  // Every word must appear in the title or description, in any order ("ford truck" finds "Ford F-250 pickup truck").
  const words = (p.q ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s\-.]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 6);
  for (const w of words) query = query.or(`title.ilike."%${w}%",description.ilike."%${w}%"`);
  if (p.category && CATEGORIES.includes(p.category)) query = query.eq("category", p.category);
  if (p.state && STATES.includes(p.state)) query = query.eq("state", p.state);
  if (p.source && p.source in SOURCES) query = query.eq("source", p.source);
  if (p.ease === "easy") query = query.eq("sell_ease", "easy");
  if (p.ease === "moderate") query = query.in("sell_ease", ["easy", "moderate"]);
  const max = Number(p.max);
  if (p.max && Number.isFinite(max) && max > 0) query = query.lte("current_bid", max);
  if (p.ending === "48h") query = query.lte("end_time", new Date(Date.now() + 48 * 3_600_000).toISOString());

  const { data, error } = await query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .limit(sort.column === "end_time" ? 300 : 120);
  if (error) return { lots: [], error: error.message };
  return { lots: (data ?? []) as unknown as Lot[] };
}

export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const { lots, error } = await loadLots(p);
  const sortKey = p.sort ?? "ending";
  const sections = sortKey === "ending" ? groupByEnding(lots) : [{ label: "", until: Infinity, lots }];

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
        <select name="ease" defaultValue={p.ease ?? ""}>
          <option value="">Any resale ease</option>
          <option value="easy">Easy to sell</option>
          <option value="moderate">Easy or moderate</option>
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

      {error ? <p className="notice">{error}</p> : <p className="count">{lots.length >= 120 ? `Showing first ${lots.length} lots` : `${lots.length} lots`}</p>}

      {sections.map((section) => (
      <section key={section.label || "all"}>
        {section.label ? <h3 className="group-title">{section.label} <span>({section.lots.length})</span></h3> : null}
      <ul className="grid">
        {section.lots.map((lot) => (
          <li key={lot.id} className="card">
            <a className="thumb" href={lot.lot_url ?? "#"} target="_blank" rel="noopener noreferrer">
              {lot.photo_url ? <img src={lot.photo_url} alt="" loading="lazy" decoding="async" /> : <span>No photo</span>}
            </a>
            <div className="body">
              <h2><a href={lot.lot_url ?? "#"} target="_blank" rel="noopener noreferrer">{lot.title}</a></h2>
              <p className="price">{money(lot.current_bid)}</p>
              {lot.est_value ? (
                <p className="value">
                  Market value {money(lot.est_low)}–{money(lot.est_high)}
                  {lot.spread !== null ? <span className={lot.spread > 0 ? "spread up" : "spread down"}>{lot.spread > 0 ? "+" : ""}{money(lot.spread)} vs. current bid</span> : null}
                </p>
              ) : null}
              {lot.sell_ease ? <span className={`ease ease-${lot.sell_ease}`}>{EASE_LABEL[lot.sell_ease] ?? lot.sell_ease}</span> : null}
              {lot.condition || lot.sell_note ? (
                <details className="more">
                  <summary>
                    <span className="condition">{lot.condition ?? lot.sell_note}</span>
                    <span className="more-label" aria-hidden="true"></span>
                  </summary>
                  <div className="more-body">
                    {lot.condition && lot.sell_note ? <p><strong>Resale:</strong> {lot.sell_note}</p> : null}
                    {lot.est_value ? <p className="muted">Value source: {lot.value_source === "ebay" ? `${lot.comps_count} similar eBay listings` : "AI estimate from the listing"}</p> : null}
                    <a href={lot.lot_url ?? "#"} target="_blank" rel="noopener noreferrer">View full auction →</a>
                  </div>
                </details>
              ) : null}
              <p className="meta">{[lot.city, lot.state].filter(Boolean).join(", ") || "Location not listed"} · {timeLeft(lot.end_time)} · {SOURCES[lot.source] ?? lot.source}</p>
            </div>
          </li>
        ))}
      </ul>
      </section>
      ))}

      {!error && lots.length === 0 ? <p className="notice">No lots match those filters yet.</p> : null}
    </>
  );
}
