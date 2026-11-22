import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import WatchlistView from "@/components/WatchlistView";

export const metadata: Metadata = { title: "Watchlist | Turrera" };

export default function WatchlistPage() {
  return (
    <>
      <SiteHeader />
      <main className="results">
        <div className="results-head">
          <nav className="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Watchlist</span></nav>
          <h1>Watchlist</h1>
          <p className="results-count">Lots you starred on this device.</p>
        </div>
        <WatchlistView />
      </main>
    </>
  );
}
