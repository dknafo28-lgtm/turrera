import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import LotCard from "@/components/LotCard";
import AlertForm from "@/components/AlertForm";
import {
  CATEGORIES, EASE, ENDING, PAGE_SIZE, SOLD_SORTS, SORTS, STATES, THIS_YEAR, TYPES, VEHICLE_CATEGORIES,
  categoryCounts, loadLots, normalizeParams, typeCounts, typeLabel, type Params,
} from "@/lib/lots";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const p = normalizeParams(await searchParams);
  const cat = CATEGORIES.find((c) => c.key === p.category);
  const thing = (typeLabel(p.category, p.sub) ?? cat?.label ?? "Surplus").toLowerCase();
  const where = p.state ? ` in ${p.state}` : "";
  const sold = p.status === "sold";
  const title = p.q
    ? `${p.q}: government surplus${where}`
    : sold ? `Government ${thing} sold prices${where}` : `Government ${thing} for sale${where}`;
  const description = sold
    ? `What government ${thing} actually sold for at public auction${where}. Final prices and bid counts from the last 12 months.`
    : `Government ${thing} at public auction${where}, direct from the agencies. Clear listings, recent sold prices, local inspections and worldwide shipping.`;
  const canonical = `/search${p.category ? `?category=${p.category}${p.sub ? `&sub=${p.sub}` : ""}${sold ? "&status=sold" : ""}` : sold ? "?status=sold" : ""}`;
  return { title: `${title} | Turrera`, description, alternates: { canonical }, robots: p.q || p.page ? { index: false, follow: true } : undefined };
}

const KEEP = ["status", "q", "category", "sub", "ymin", "ymax", "lmin", "lmax", "state", "max", "min", "sort", "ending", "source", "ease", "deal", "view"] as const;

const YEARS = Array.from({ length: THIS_YEAR + 2 - 1960 }, (_, i) => THIS_YEAR + 1 - i);
const LENGTHS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 35, 40, 50, 60];

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
  if (p.status === "sold") out.push({ label: "Showing", value: "sold items", remove: { status: undefined, sort: undefined } });
  if (p.q) out.push({ label: "Search", value: `“${p.q}”`, remove: { q: undefined } });
  const cat = CATEGORIES.find((c) => c.key === p.category);
  if (cat) out.push({ label: "Category", value: cat.label, remove: { category: undefined, sub: undefined, lmin: undefined, lmax: undefined } });
  const type = typeLabel(p.category, p.sub);
  if (type) out.push({ label: "Type", value: type, remove: { sub: undefined } });
  if (p.ymin || p.ymax) out.push({ label: "Year", value: `${p.ymin ?? "any"} to ${p.ymax ?? "any"}`, remove: { ymin: undefined, ymax: undefined } });
  if (p.lmin || p.lmax) out.push({ label: "Length", value: `${p.lmin ? `${p.lmin} ft` : "any"} to ${p.lmax ? `${p.lmax} ft` : "any"}`, remove: { lmin: undefined, lmax: undefined } });
  if (p.ending && ENDING[p.ending]) out.push({ label: "Ending", value: ENDING[p.ending].label.toLowerCase(), remove: { ending: undefined } });
  if (p.state) out.push({ label: "State", value: p.state, remove: { state: undefined } });
  if (p.min || p.max) out.push({ label: "Bid", value: `${p.min ? `$${Number(p.min).toLocaleString()}` : "$0"} to ${p.max ? `$${Number(p.max).toLocaleString()}` : "any"}`, remove: { min: undefined, max: undefined } });
  if (p.ease && EASE[p.ease]) out.push({ label: "Resale", value: EASE[p.ease].toLowerCase(), remove: { ease: undefined } });
  return out;
}

function pages(current: number, total: number) {
  const set = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => { if (i && n - sorted[i - 1] > 1) out.push("gap"); out.push(n); });
  return out;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = normalizeParams(await searchParams);
  const [{ lots, total, error }, counts, subCounts] = await Promise.all([loadLots(p), categoryCounts(p), typeCounts(p)]);
  const types = TYPES[p.category ?? ""] ?? [];
  const showYears = !p.category || VEHICLE_CATEGORIES.includes(p.category);
  const page = Math.max(1, Number(p.page) || 1);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const view = p.view === "list" ? "list" : "grid";
  const sold = p.status === "sold";
  const sortOptions = sold ? SOLD_SORTS : SORTS;
  const sortKey = sortOptions[p.sort ?? ""] ? (p.sort as string) : sold ? "recent" : "ending";
  const active = chips(p);
  const cat = CATEGORIES.find((c) => c.key === p.category);
  const type = typeLabel(p.category, p.sub);
  const baseHeading = p.q ? `Results for “${p.q}”` : type ? type : cat ? cat.label : p.ending === "24h" ? "Ending in the next 24 hours" : "All open lots";
  const heading = sold ? (p.q || cat ? `Sold: ${baseHeading.replace(/^Results for /, "")}` : "Sold items and final prices") : baseHeading;
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
            {cat ? <><a href="/search">All lots</a><span aria-hidden="true">/</span>{type ? <><a href={`/search?category=${encodeURIComponent(cat.key)}`}>{cat.label}</a><span aria-hidden="true">/</span><span>{type}</span></> : <span>{cat.label}</span>}</> : <span>Search</span>}
          </nav>
          <h1>{heading}</h1>
          <p className="results-count" aria-live="polite">
            {error ? error : total ? `${total.toLocaleString()} ${sold ? "sold in the last 12 months" : "open lots"}` : sold ? "No sold items match yet" : "No open lots match"}
          </p>
          {types.length ? (
            <nav className="type-pills" aria-label={`${cat?.label} types`}>
              <a href={href(p, { sub: undefined, page: undefined })} aria-current={!p.sub ? "page" : undefined}>All<em>{(counts[p.category ?? ""] ?? 0).toLocaleString()}</em></a>
              {types.filter((t) => subCounts[t.key] || p.sub === t.key).map((t) => (
                <a key={t.key} href={href(p, { sub: t.key, page: undefined })} aria-current={p.sub === t.key ? "page" : undefined}>{t.label}<em>{(subCounts[t.key] ?? 0).toLocaleString()}</em></a>
              ))}
            </nav>
          ) : null}
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
                <legend>Show</legend>
                <label className="opt"><input type="radio" name="status" value="" defaultChecked={!sold} /> <span>Open auctions</span></label>
                <label className="opt"><input type="radio" name="status" value="sold" defaultChecked={sold} /> <span>Sold items (final prices)</span></label>
              </fieldset>

              <fieldset>
                <legend><label htmlFor="f-category">Category</label></legend>
                <select id="f-category" name="category" defaultValue={p.category ?? ""} data-autosubmit-clear="sub,lmin,lmax">
                  <option value="">All categories ({allCount.toLocaleString()})</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label} ({(counts[c.key] ?? 0).toLocaleString()})</option>
                  ))}
                </select>
                {types.length ? (
                  <>
                    <label htmlFor="f-sub" className="field-label">Type</label>
                    <select id="f-sub" name="sub" defaultValue={p.sub ?? ""} data-autosubmit>
                      <option value="">All {cat?.label.toLowerCase()} ({(counts[p.category ?? ""] ?? 0).toLocaleString()})</option>
                      {types.map((t) => (
                        <option key={t.key} value={t.key} disabled={!subCounts[t.key] && p.sub !== t.key}>{t.label} ({(subCounts[t.key] ?? 0).toLocaleString()})</option>
                      ))}
                    </select>
                  </>
                ) : null}
                {p.category === "boats" ? (
                  <>
                    <span className="field-label">Boat length</span>
                    <div className="range">
                      <label><span className="visually-hidden">Shortest</span>
                        <select name="lmin" defaultValue={p.lmin ?? ""} data-autosubmit><option value="">Min ft</option>{LENGTHS.map((n) => <option key={n} value={n}>{n} ft</option>)}</select>
                      </label>
                      <span aria-hidden="true">to</span>
                      <label><span className="visually-hidden">Longest</span>
                        <select name="lmax" defaultValue={p.lmax ?? ""} data-autosubmit><option value="">Max ft</option>{LENGTHS.map((n) => <option key={n} value={n}>{n} ft</option>)}</select>
                      </label>
                    </div>
                    <p className="fieldset-note">Length comes from the listing title, so boats without one listed won&apos;t show when this is set.</p>
                  </>
                ) : null}
                {showYears ? (
                  <>
                    <span className="field-label">Year</span>
                    <div className="range">
                      <label><span className="visually-hidden">From year</span>
                        <select name="ymin" defaultValue={p.ymin ?? ""} data-autosubmit><option value="">From</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                      </label>
                      <span aria-hidden="true">to</span>
                      <label><span className="visually-hidden">To year</span>
                        <select name="ymax" defaultValue={p.ymax ?? ""} data-autosubmit><option value="">To</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                      </label>
                    </div>
                  </>
                ) : null}
              </fieldset>

              {!sold ? (
              <fieldset>
                <legend>Closing</legend>
                <label className="opt"><input type="radio" name="ending" value="" defaultChecked={!p.ending} /> <span>Any time</span></label>
                {Object.entries(ENDING).map(([k, e]) => (
                  <label className="opt" key={k}><input type="radio" name="ending" value={k} defaultChecked={p.ending === k} /> <span>{e.label}</span></label>
                ))}
              </fieldset>
              ) : null}

              <fieldset>
                <legend>{sold ? "Sold price" : "Current bid"}</legend>
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

              {!sold ? (
              <fieldset>
                <legend>Resale</legend>
                <label className="opt"><input type="radio" name="ease" value="" defaultChecked={!p.ease} /> <span>Any resale</span></label>
                {Object.entries(EASE).map(([k, label]) => (
                  <label className="opt" key={k}><input type="radio" name="ease" value={k} defaultChecked={p.ease === k} /> <span>{label}</span></label>
                ))}
              </fieldset>
              ) : null}


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
                  {Object.entries(sortOptions).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
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
                <h2>{sold ? "No sold prices match these filters yet" : "Nothing open matches right now"}</h2>
                <p>{sold ? "Try a broader search or another category." : "New government lots come in every few hours. Set an alert below and we'll email you as soon as one is listed, or try a broader search."}</p>
                <div className="empty-actions">
                  {active.length ? <a className="btn btn-outline" href={p.q ? `/search?q=${encodeURIComponent(p.q)}` : "/search"}>Remove filters</a> : null}
                  {!sold ? <a className="btn btn-outline" href={href(p, { status: "sold", sort: undefined, page: undefined })}>See what these sold for</a> : null}
                </div>
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
