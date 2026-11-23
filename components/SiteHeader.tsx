import TAXONOMY from "@/lib/taxonomy.json";
import { CATEGORIES } from "@/lib/lots";
import { WatchCount } from "./WatchButton";
import Logo from "./Logo";

// Categories shown in the slim row under the header on desktop (no scrolling; the rest are in "Shop by category").
const NAV = ["boats", "trucks", "cars", "equipment", "powersports"];

export default function SiteHeader({ q = "", category = "" }: { q?: string; category?: string }) {
  return (
    <header className="site-header">
      <div className="header-bar">
        <a href="/" className="brand" aria-label="Turrera home">
          <Logo tone="dark" />
        </a>

        <details className="catmenu">
          <summary aria-label="Shop by category">
            <svg className="catmenu-burger" aria-hidden="true" viewBox="0 0 20 20" width="22" height="22"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <span className="catmenu-label">Shop by category</span>
            <svg className="catmenu-chev" aria-hidden="true" viewBox="0 0 20 20" width="14" height="14"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </summary>
          <div className="catmenu-panel">
            <div className="catmenu-top">
              <strong>Shop by category</strong>
              <button type="button" className="catmenu-close" data-close-menu aria-label="Close menu">
                <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <ul className="catmenu-quick">
              <li><a href="/search?ending=24h">Ending today</a></li>
              <li><a href="/search?sort=spread&amp;deal=1">Best deals</a></li>
              <li><a href="/buy-for-me">Buy for me</a></li>
              <li><a href="/financing">Financing</a></li>
              <li><a href="/sell">Sell your fleet</a></li>
              <li><a href="/watchlist">Watchlist</a></li>
            </ul>
            <div className="catmenu-grid">
              {TAXONOMY.filter((c) => c.key !== "other").map((c) => (
                <div className="catmenu-group" key={c.key}>
                  <a className="catmenu-cat" href={`/search?category=${encodeURIComponent(c.key)}`}>{c.label}</a>
                  <ul className="catmenu-types">
                    {c.subs.slice(0, 6).map((t) => (
                      <li key={t.key}><a href={`/search?category=${encodeURIComponent(c.key)}&sub=${t.key}`}>{t.label}</a></li>
                    ))}
                    {c.subs.length > 6 ? <li><a className="catmenu-more" href={`/search?category=${encodeURIComponent(c.key)}`}>All {c.label.toLowerCase()}</a></li> : null}
                  </ul>
                </div>
              ))}
              <div className="catmenu-group">
                <a className="catmenu-cat" href="/search?category=other">Everything else</a>
              </div>
            </div>
          </div>
        </details>

        <form className="header-search" action="/search" method="get" role="search">
          <label htmlFor="hq" className="visually-hidden">Search auctions</label>
          <input id="hq" type="search" name="q" defaultValue={q} placeholder="Search for boats, trucks, equipment and more" autoComplete="off" />
          <select name="category" defaultValue={category} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button type="submit">
            <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <span>Search</span>
          </button>
        </form>

        <nav className="header-links" aria-label="Account">
          <a href="/watchlist" className="header-watch" aria-label="Watchlist">
            <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M10 2.8l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.1l5-.7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            <span className="header-watch-label">Watchlist</span>
            <WatchCount />
          </a>
        </nav>
      </div>

      <nav className="header-nav" aria-label="Popular">
        <div className="header-nav-inner">
          <a href="/search?ending=24h">Ending today</a>
          <a href="/search?sort=spread&amp;deal=1">Best deals</a>
          {NAV.map((k) => {
            const c = CATEGORIES.find((x) => x.key === k);
            return c ? <a key={k} href={`/search?category=${encodeURIComponent(k)}`} aria-current={category === k ? "page" : undefined}>{c.label}</a> : null;
          })}
          <span className="header-nav-spacer" />
          <a href="/buy-for-me">Buy for me</a>
          <a href="/financing">Financing</a>
          <a href="/sell">Sell your fleet</a>
        </div>
      </nav>
    </header>
  );
}
