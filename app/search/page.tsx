import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import LotCard from "@/components/LotCard";
import AlertForm from "@/components/AlertForm";
import {
  CATEGORIES, EASE, ENDING, PAGE_SIZE, SORTS, SOURCE_SHORT, STATES,
  categoryCounts, loadLots, type Params,
} from "@/lib/lots";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search government surplus | Turrera" };

const KEEP = ["q", "category", "state", "max", "min", "sort", "ending", "source", "ease", "deal", "view"] as const;

function href(p: Params, changes: Partial<Params>, path = "/search") {
  const next: Record<string, string> = {};
  for (const k of KEEP) {
    const v = k in changes ? changes[k] : p[k];
    if (v !== undefined && v !== "") next[k] = String(v);
  }
  if (changes.page) next.page = changes.page;
  const qs = new URLSearchParams(next).toString();
  return qs ? `${path}?${qs}` : path;
}

function chips(p: Params) {
  const out: { label: string; value: string; remove: Partial<Params> }[] = [];
  if (p.q) out.push({ label: "Search", value: `“${p.q}”`, remove: { q: undefined } });
  const cat = CATEGORIES.find((c) => c.key === p.category);
  if (cat) out.push({ label: "Category", value: cat.label, remove: { category: undefined } });
  if (p.ending && ENDING[p.ending]) out.push({ label: "Ending", value: ENDING[p.ending].label.toLowerCase(), remove: { ending: undefined } });
  if (p.state) out.push({ label: "State", value: p.state, remove: { state: undefined } });
  if (p.min || p.max) out.push({ label: "Bid", value: `${p.min ? `$${Number(p.min).toLocaleString()}` : "$0"} to ${p.max ? `$${Number(p.max).toLocaleString()}` : "any"}`, remove: { min: undefined, max: undefined } });
  if (p.ease && EASE[p.ease]) out.push({ label: "Resale", value: EASE[p.ease].toLowerCase(), remove: { ease: undefined } });
  if (p.deal === "1") out.push({ label: "Price", value: "under market value", remove: { deal: undefined } });
  if (p.source && SOURCE_SHORT[p.source]) out.push({ label: "Site", value: SOURCE_SHORT[p.source], remove: { source: undefined } });
  return out;
}

function pages(current: number, total: number) {
  const set = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => { if (i && n - sorted[i - 1] > 1) out.push("gap"); out.push(n); });
  return out;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const [{ lots, total, error }, counts] = await Promise.all([loadLots(p), categoryCounts(p)]);
  const page = Math.max(1, Number(p.page) || 1);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const view = p.view === "list" ? "list" : "grid";
  const sortKey = SORTS[p.sort ?? ""] ? (p.sort as string) : "ending";
  const active = chips(p);
  const cat = CATEGORIES.find((c) => c.key === p.category);
  const heading = p.q ? `Results for “${p.q}”` : cat ? cat.label : p.ending === "24h" ? "Ending in the next 24 hours" : p.deal === "1" ? "Under estimated market value" : "All open lots";
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);
  const filterCount = active.filter((c) => c.label !== "Search").length;

  return (
    <>
      <SiteHeader q={p.q ?? ""} category={p.category ?? ""} />
      <main className="results">
        <div className="results-head">
          <nav className="crumbs" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span aria-hidden="true">/</span>
            {cat ? <><a href="/search">All lots</a><span aria-hidden="true">/</span><span>{cat.label}</span></> : <span>Search</span>}
          </nav>
          <h1>{heading}</h1>
          <p className="results-count" aria-live="polite">
            {error ? error : total ? `${total.toLocaleString()} open lots` : "No open lots match"}
          </p>
        </div>

        <div className="results-layout">
          <input type="checkbox" id="filters-open" className="filters-open" aria-hidden="true" tabIndex={-1} />
          <aside className="sidebar" aria-label="Filters">
            <form method="get" action="/search" className="sidebar-form">
              {p.q ? <input type="hidden" name="q" value={p.q} /> : null}
              {p.sort ? <input type="hidden" name="sort" value={p.sort} /> : null}
              {p.view ? <input type="hidden" name="view" value={p.view} /> : null}
              <div className="sidebar-head">
                <h2>Filters</h2>
                <label htmlFor="filters-open" className="sidebar-close">Close</label>
              </div>

              <fieldset>
                <legend>Category</legend>
                <label className="opt"><input type="radio" name="category" value="" defaultChecked={!p.category} /> <span>All categories</span><em>{allCount.toLocaleString()}</em></label>
                {CATEGORIES.map((c) => (
                  <label className="opt" key={c.key}>
                    <input type="radio" name="category" value={c.key} defaultChecked={p.category === c.key} /> <span>{c.label}</span><em>{(counts[c.key] ?? 0).toLocaleString()}</em>
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Closing</legend>
                <label className="opt"><input type="radio" name="ending" value="" defaultChecked={!p.ending} /> <span>Any time</span></label>
                {Object.entries(ENDING).map(([k, e]) => (
                  <label className="opt" key={k}><input type="radio" name="ending" value={k} defaultChecked={p.ending === k} /> <span>{e.label}</span></label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Current bid</legend>
                <div className="range">
                  <label><span className="visually-hidden">Minimum bid</span><input type="number" inputMode="numeric" name="min" min="0" step="100" placeholder="Min $" defaultValue={p.min ?? ""} /></label>
                  <span aria-hidden="true">to</span>
                  <label><span className="visually-hidden">Maximum bid</span><input type="number" inputMode="numeric" name="max" min="0" step="100" placeholder="Max $" defaultValue={p.max ?? ""} /></label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Location</legend>
                <label className="visually-hidden" htmlFor="state">State</label>
                <select id="state" name="state" defaultValue={p.state ?? ""}>
                  <option value="">All states</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </fieldset>

              <fieldset>
                <legend>Value</legend>
                <label className="opt"><input type="checkbox" name="deal" value="1" defaultChecked={p.deal === "1"} /> <span>Bid is under estimated value</span></label>
                <label className="opt"><input type="radio" name="ease" value="" defaultChecked={!p.ease} /> <span>Any resale</span></label>
                {Object.entries(EASE).map(([k, label]) => (
                  <label className="opt" key={k}><input type="radio" name="ease" value={k} defaultChecked={p.ease === k} /> <span>{label}</span></label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Auction site</legend>
                <label className="opt"><input type="radio" name="source" value="" defaultChecked={!p.source} /> <span>All sites</span></label>
                {Object.entries(SOURCE_SHORT).map(([k, label]) => (
                  <label className="opt" key={k}><input type="radio" name="source" value={k} defaultChecked={p.source === k} /> <span>{label}</span></label>
                ))}
              </fieldset>

              <div className="sidebar-actions">
                <button type="submit" className="btn btn-primary">Show results</button>
                <a href={p.q ? `/search?q=${encodeURIComponent(p.q)}` : "/search"} className="btn btn-quiet">Clear filters</a>
              </div>
            </form>
          </aside>

          <section className="results-main" aria-label="Lots">
            <div className="toolbar">
              <label htmlFor="filters-open" className="btn btn-outline filters-trigger">
                <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16"><path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                Filters{filterCount ? ` (${filterCount})` : ""}
              </label>
              <form method="get" action="/search" className="sort-form">
                {KEEP.filter((k) => k !== "sort").map((k) => (p[k] ? <input key={k} type="hidden" name={k} value={String(p[k])} /> : null))}
                <label htmlFor="sort">Sort by</label>
                <select id="sort" name="sort" defaultValue={sortKey} data-autosubmit>
                  {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
                <noscript><button type="submit" className="btn btn-outline">Sort</button></noscript>
              </form>
              <div className="view-toggle" role="group" aria-label="Layout">
                <a href={href(p, { view: undefined })} aria-current={view === "grid" ? "true" : undefined} aria-label="Grid view">
                  <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" fill="currentColor" /></svg>
                </a>
                <a href={href(p, { view: "list" })} aria-current={view === "list" ? "true" : undefined} aria-label="List view">
                  <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="M3 4h4v4H3zM9 5h8v2H9zM3 12h4v4H3zM9 13h8v2H9z" fill="currentColor" /></svg>
                </a>
              </div>
            </div>

            {active.length ? (
              <div className="chips" aria-label="Applied filters">
                {active.map((c) => (
                  <a key={c.label} href={href(p, c.remove)} className="chip" aria-label={`Remove ${c.label} filter`}>
                    <span className="chip-label">{c.label}:</span> {c.value}
                    <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </a>
                ))}
                <a href="/search" className="chips-clear">Clear all</a>
              </div>
            ) : null}

            {lots.length ? (
              <div className={view === "list" ? "lot-list" : "lot-grid"}>
                {lots.map((lot) => <LotCard key={lot.id} lot={lot} layout={view} />)}
              </div>
            ) : (
              <div className="empty">
                <h2>No open lots match these filters</h2>
                <p>Try a broader search, a different state, or remove a filter above.</p>
                <a className="btn btn-outline" href="/search">See all open lots</a>
              </div>
            )}

            <AlertForm p={p} label={p.q ? `${p.q}${cat ? ` in ${cat.label.toLowerCase()}` : ""}` : heading} />

            {totalPages > 1 ? (
              <nav className="pager" aria-label="Pages">
                <p>Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</p>
                <div>
                  {page > 1 ? <a href={href(p, { page: String(page - 1) })} rel="prev">Previous</a> : null}
                  {pages(page, totalPages).map((n, i) => n === "gap"
                    ? <span key={`gap-${i}`} className="pager-gap">…</span>
                    : <a key={n} href={href(p, { page: String(n) })} aria-current={n === page ? "page" : undefined}>{n}</a>)}
                  {page < totalPages ? <a href={href(p, { page: String(page + 1) })} rel="next">Next</a> : null}
                </div>
              </nav>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}
