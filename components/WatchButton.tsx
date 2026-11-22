"use client";

import { useEffect, useState } from "react";

const KEY = "turrera.watchlist";

export function readWatchlist(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function writeWatchlist(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); window.dispatchEvent(new Event("turrera-watchlist")); } catch { /* storage unavailable */ }
}

export default function WatchButton({ id, compact = false }: { id: string; compact?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(readWatchlist().includes(id));
    sync();
    window.addEventListener("turrera-watchlist", sync);
    return () => window.removeEventListener("turrera-watchlist", sync);
  }, [id]);
  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const list = readWatchlist();
    writeWatchlist(list.includes(id) ? list.filter((x) => x !== id) : [id, ...list].slice(0, 300));
  }
  const label = on ? "Watching" : "Watch";
  return (
    <button type="button" onClick={toggle} aria-pressed={on} className={`watch ${on ? "watch-on" : ""} ${compact ? "watch-compact" : ""}`} aria-label={compact ? (on ? "Remove from watchlist" : "Add to watchlist") : undefined}>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
        <path d="M10 2.8l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.1l5-.7z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {compact ? null : <span>{label}</span>}
    </button>
  );
}

export function WatchCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const sync = () => setN(readWatchlist().length);
    sync();
    window.addEventListener("turrera-watchlist", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("turrera-watchlist", sync); window.removeEventListener("storage", sync); };
  }, []);
  return n ? <span className="watch-count">{n}</span> : null;
}
