import { CATEGORIES } from "@/lib/lots";
import { WatchCount } from "./WatchButton";
import Logo from "./Logo";

export default function SiteHeader({ q = "", category = "" }: { q?: string; category?: string }) {
  return (
    <header className="site-header">
      <div className="header-bar">
        <a href="/" className="brand" aria-label="Turrera home">
          <Logo tone="dark" />
        </a>
        <form className="header-search" action="/search" method="get" role="search">
          <label htmlFor="hq" className="visually-hidden">Search auctions</label>
          <select name="category" defaultValue={category} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <input id="hq" type="search" name="q" defaultValue={q} placeholder="Search trucks, boats, equipment…" autoComplete="off" />
          <button type="submit">
            <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <span>Search</span>
          </button>
        </form>
        <nav className="header-links" aria-label="Account">
          <a href="/buy-for-me" className="header-text-link">Buy for me</a>
          <a href="/sell" className="header-text-link">Sell your fleet</a>
          <a href="/watchlist" className="header-watch">
            <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="M10 2.8l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.1l5-.7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            <span>Watchlist</span>
            <WatchCount />
          </a>
        </nav>
      </div>
      <nav className="header-cats" aria-label="Browse">
        <div className="header-cats-inner">
          <a href="/search?ending=24h">Ending today</a>
          <a href="/search?sort=spread&amp;deal=1">Best deals</a>
          <span className="header-cats-sep" aria-hidden="true" />
          {CATEGORIES.filter((c) => c.key !== "other").map((c) => (
            <a key={c.key} href={`/search?category=${encodeURIComponent(c.key)}`} aria-current={category === c.key ? "page" : undefined}>{c.label}</a>
          ))}
          <a href="/search">All lots</a>
        </div>
      </nav>
    </header>
  );
}
