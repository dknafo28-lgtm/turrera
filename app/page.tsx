import type { Lot } from "@/lib/supabase";
import {
  CATEGORIES, EASE, ENDING, PAGE_SIZE, SORTS, SOURCES, STATES,
  categoryCounts, loadLots, type Params,
} from "@/lib/lots";

export const dynamic = "force-dynamic";

const EASE_LABEL: Record<string, string> = { easy: "Easy to sell", moderate: "Moderate to sell", hard: "Hard to sell" };

const GROUPS = [
  { label: "Ending in the next 6 hours", until: 6 },
  { label: "Ending today", until: 24 },
  { label: "Ending in the next 3 days", until: 72 },
  { label: "Ending this week", until: 168 },
  { label: "Ending later", until: Infinity },
];

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function short(n: number | null | undefined) {
  if (n === null || n === undefined) return "";
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `$${Math.round(n)}`;
}

function timeLeft(end: string | null) {
  if (!end) return { text: "No end date", soon: false };
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return { text: "Ended", soon: false };
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (hours < 1) return { text: `${mins}m left`, soon: true };
  if (hours < 24) return { text: `${hours}h ${mins % 60}m left`, soon: true };
  return { text: `${days}d ${hours % 24}h left`, soon: false };
}

function groupByEnding(lots: Lot[]) {
  const groups = GROUPS.map((g) => ({ label: g.label, until: g.until, lots: [] as Lot[] }));
  const noDate: Lot[] = [];
  for (const lot of lots) {
    if (!lot.end_time) { noDate.push(lot); continue; }
    const hours = (new Date(lot.end_time).getTime() - Date.now()) / 3_600_000;
    groups.find((g) => hours <= g.until)!.lots.push(lot);
  }
  return [...groups, { label: "No end date listed", until: Infinity, lots: noDate }].filter((g) => g.lots.length);
}

// Builds a link to this page with some parameters changed (undefined removes one). Resets to page 1 unless a page is given.
function href(p: Params, changes: Partial<Params>) {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...p, page: undefined, ...changes })) {
    if (v !== undefined && v !== "") next[k] = String(v);
  }
  const qs = new URLSearchParams(next).toString();
  return qs ? `/?${qs}` : "/";
}

function activeFilters(p: Params) {
  const pills: { label: string; remove: Partial<Params> }[] = [];
  if (p.q) pills.push({ label: `“${p.q}”`, remove: { q: undefined } });
  const cat = CATEGORIES.find((c) => c.key === p.category);
  if (cat) pills.push({ label: cat.label, remove: { category: undefined } });
  if (p.state) pills.push({ label: p.state, remove: { state: undefined } });
  if (p.source && SOURCES[p.source]) pills.push({ label: SOURCES[p.source], remove: { source: undefined } });
  if (p.ending && ENDING[p.ending]) pills.push({ label: `Ending in the ${ENDING[p.ending].label.toLowerCase()}`, remove: { ending: undefined } });
  if (p.ease && EASE[p.ease]) pills.push({ label: EASE[p.ease], remove: { ease: undefined } });
  if (p.deal === "1") pills.push({ label: "Under market value", remove: { deal: undefined } });
  if (p.min) pills.push({ label: `From $${Number(p.min).toLocaleString()}`, remove: { min: undefined } });
  if (p.max) pills.push({ label: `Up to $${Number(p.max).toLocaleString()}`, remove: { max: undefined } });
  return pills;
}

function LotCard({ lot }: { lot: Lot }) {
  const left = timeLeft(lot.end_time);
  const url = lot.lot_url ?? "#";
  const page = `/lot/${encodeURIComponent(lot.id)}`;
  const hasValue = lot.est_value !== null && lot.est_value !== undefined;
  return (
    <li className="lot">
      <a className="lot-photo" href={page} tabIndex={-1} aria-hidden="true">
        {lot.photo_url ? <img src={lot.photo_url} alt="" loading="lazy" decoding="async" /> : <span className="lot-nophoto">No photo</span>}
        <span className={left.soon ? "lot-tag lot-tag-soon" : "lot-tag"}>{left.text}</span>
      </a>
      <div className="lot-body">
        <h2 className="lot-title"><a href={page}>{lot.title}</a></h2>
        <div className="lot-numbers">
          <div>
            <span className="lot-label">Current bid</span>
            <span className="lot-figure">{money(lot.current_bid) ?? "No bids"}</span>
          </div>
          {hasValue ? (
            <div>
              <span className="lot-label">Worth</span>
              <span className="lot-figure">{short(lot.est_low)}–{short(lot.est_high)}</span>
            </div>
          ) : null}
        </div>
        {hasValue && lot.spread !== null ? (
          <p className={lot.spread > 0 ? "lot-deal lot-deal-up" : "lot-deal lot-deal-down"}>
            {lot.spread > 0 ? `${money(lot.spread)} under market value` : `${money(-lot.spread)} over market value`}
          </p>
        ) : null}
        {lot.sell_ease ? <span className={`ease ease-${lot.sell_ease}`}>{EASE_LABEL[lot.sell_ease] ?? lot.sell_ease}</span> : null}
        {lot.condition || lot.sell_note ? (
          <details className="lot-more">
            <summary>
              <span className="lot-condition">{lot.condition ?? lot.sell_note}</span>
              <span className="lot-more-toggle" />
            </summary>
            <div className="lot-more-body">
              {lot.condition && lot.sell_note ? <p><strong>Resale:</strong> {lot.sell_note}</p> : null}
              {hasValue ? (
                <p className="muted">
                  {lot.value_source === "ebay" ? `Value from ${lot.comps_count} similar eBay listings.` : "Value is an AI estimate from the listing. Check real sales before bidding."}
                </p>
              ) : null}
              <a href={page}>See photos and full details</a>
            </div>
          </details>
        ) : null}
        <p className="lot-foot">
          <span>{[lot.city, lot.state].filter(Boolean).join(", ") || "Location not listed"}</span>
          <span className="lot-source">{SOURCES[lot.source] ?? lot.source}</span>
        </p>
      </div>
    </li>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const [{ lots, total, error }, counts] = await Promise.all([loadLots(p), categoryCounts(p)]);
  const page = Math.max(1, Number(p.page) || 1);
  const sortKey = SORTS[p.sort ?? ""] ? (p.sort as string) : "ending";
  const sections = sortKey === "ending" ? groupByEnding(lots) : [{ label: "", until: Infinity, lots }];
  const pills = activeFilters(p);
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const extraFilters = pills.filter((x) => !("category" in x.remove) && !("q" in x.remove)).length;
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <a href="/" className="wordmark">Turrera</a>
          <p className="masthead-note">Government surplus from GSA Auctions and Public Surplus in one place, refreshed every 4 hours.</p>
          <form className="search" method="get" action="/" role="search">
            {Object.entries(p).filter(([k, v]) => k !== "q" && k !== "page" && v).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={String(v)} />
            ))}
            <label htmlFor="q" className="visually-hidden">Search lots</label>
            <input id="q" type="search" name="q" placeholder="Try F-250, pontoon, Bobcat, school bus" defaultValue={p.q ?? ""} autoComplete="off" />
            <button type="submit">Search</button>
          </form>
        </div>
      </header>

      <nav className="cats" aria-label="Categories">
        <a href={href(p, { category: undefined })} className={!p.category ? "cat cat-on" : "cat"} aria-current={!p.category ? "page" : undefined}>
          All <span>{allCount.toLocaleString()}</span>
        </a>
        {CATEGORIES.map((c) => (
          <a key={c.key} href={href(p, { category: c.key })} className={p.category === c.key ? "cat cat-on" : "cat"} aria-current={p.category === c.key ? "page" : undefined}>
            {c.label} <span>{(counts[c.key] ?? 0).toLocaleString()}</span>
          </a>
        ))}
      </nav>

      <main className="page">
        <form className="toolbar" method="get" action="/">
          {p.q ? <input type="hidden" name="q" value={p.q} /> : null}
          {p.category ? <input type="hidden" name="category" value={p.category} /> : null}
          <input type="checkbox" id="filters-toggle" className="filters-toggle" />
          <label htmlFor="filters-toggle" className="filters-button">
            Filters{extraFilters ? ` (${extraFilters})` : ""}
          </label>
          <div className="filters">
            <label className="field">
              <span>Ending</span>
              <select name="ending" defaultValue={p.ending ?? ""}>
                <option value="">Any time</option>
                {Object.entries(ENDING).map(([k, e]) => <option key={k} value={k}>{e.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>State</span>
              <select name="state" defaultValue={p.state ?? ""}>
                <option value="">All states</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Auction site</span>
              <select name="source" defaultValue={p.source ?? ""}>
                <option value="">All sites</option>
                {Object.entries(SOURCES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Resale</span>
              <select name="ease" defaultValue={p.ease ?? ""}>
                <option value="">Any</option>
                {Object.entries(EASE).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            <div className="field field-price">
              <span>Current bid</span>
              <div>
                <input type="number" name="min" min="0" step="100" placeholder="Min $" defaultValue={p.min ?? ""} aria-label="Minimum current bid" />
                <input type="number" name="max" min="0" step="100" placeholder="Max $" defaultValue={p.max ?? ""} aria-label="Maximum current bid" />
              </div>
            </div>
            <label className="field field-check">
              <input type="checkbox" name="deal" value="1" defaultChecked={p.deal === "1"} />
              <span>Under market value only</span>
            </label>
            <label className="field">
              <span>Sort</span>
              <select name="sort" defaultValue={sortKey}>
                {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </label>
            <button type="submit" className="apply">Apply</button>
          </div>
        </form>

        {pills.length ? (
          <div className="pills" aria-label="Active filters">
            {pills.map((pill) => (
              <a key={pill.label} href={href(p, pill.remove)} className="pill" aria-label={`Remove filter ${pill.label}`}>
                {pill.label}<span aria-hidden="true">×</span>
              </a>
            ))}
            <a href="/" className="pill-clear">Clear all</a>
          </div>
        ) : null}

        {error ? (
          <p className="notice">{error}</p>
        ) : (
          <p className="count">
            {total ? `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} open lots` : "No open lots match these filters. Remove a filter or try a broader search."}
          </p>
        )}

        {sections.map((section) => (
          <section key={section.label || "all"} className="group">
            {section.label ? <h3 className="group-title">{section.label} <span>{section.lots.length}</span></h3> : null}
            <ul className="lots">
              {section.lots.map((lot) => <LotCard key={lot.id} lot={lot} />)}
            </ul>
          </section>
        ))}

        {total > PAGE_SIZE ? (
          <nav className="pager" aria-label="Pages">
            {page > 1 ? <a href={href(p, { page: String(page - 1) })}>Previous page</a> : <span />}
            <span>Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
            {to < total ? <a href={href(p, { page: String(page + 1) })}>Next page</a> : <span />}
          </nav>
        ) : null}
      </main>
    </>
  );
}
