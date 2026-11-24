"use client";

import { useEffect, useState } from "react";
import type { Lot } from "@/lib/supabase";
import LotCard from "./LotCard";
import { readWatchlist } from "./WatchButton";

export default function WatchlistView() {
  const [lots, setLots] = useState<Lot[] | null>(null);
  useEffect(() => {
    const load = () => {
    const ids = readWatchlist();
    if (!ids.length) { setLots([]); return; }
    fetch(`/api/lots?ids=${encodeURIComponent(ids.join(","))}`)
      .then((r) => r.json())
      .then((d: { lots: Lot[] }) => {
        const order = new Map(ids.map((id, i) => [id, i]));
        const now = Date.now();
        const open = (l: Lot) => !l.end_time || new Date(l.end_time).getTime() > now;
        setLots([...d.lots].sort((a, b) => Number(open(b)) - Number(open(a)) || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
      })
      .catch(() => setLots([]));
    };
    load();
    window.addEventListener("turrera-account", load);
    return () => window.removeEventListener("turrera-account", load);
  }, []);
  if (lots === null) return <p className="results-count">Loading your lots…</p>;
  if (!lots.length) {
    return (
      <div className="empty">
        <h2>Nothing on your watchlist yet</h2>
        <p>Tap the star on any lot to keep it here. <a href="/signin?mode=signup&amp;next=/watchlist">Create a free account</a> to keep your watchlist on every device.</p>
        <a className="btn btn-outline" href="/search?ending=24h">Browse lots closing today</a>
      </div>
    );
  }
  return <div className="lot-grid lot-grid-wide">{lots.map((lot) => <LotCard key={lot.id} lot={lot} />)}</div>;
}
