"use client";

import { useEffect, useState } from "react";

const KEY = "turrera.watchlist";
const ACCOUNT = "turrera.account";

type Account = { signedIn: boolean; userId?: string; email?: string; ids?: string[] };
declare global { interface Window { __turreraAccount?: Account } }

export function readWatchlist(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function writeWatchlist(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); window.dispatchEvent(new Event("turrera-watchlist")); } catch { /* storage unavailable */ }
}

// Last known sign-in state, so the header doesn't flicker between "Sign in" and "My account".
function cachedAccount(): Account | null {
  try { return JSON.parse(sessionStorage.getItem(ACCOUNT) ?? "null"); } catch { return null; }
}

let syncing: Promise<Account> | null = null;
// Runs once per page: when signed in, the account's watchlist replaces this device's list.
// The first time someone signs in on a device, that device's stars are added to the account.
export function syncAccount(): Promise<Account> {
  if (syncing) return syncing;
  syncing = fetch("/api/watch", { cache: "no-store" })
    .then((r) => r.json() as Promise<Account>)
    .then(async (a) => {
      if (a.signedIn && a.userId) {
        const mergedKey = `turrera.merged.${a.userId}`;
        let ids = a.ids ?? [];
        if (!localStorage.getItem(mergedKey)) {
          const local = readWatchlist().filter((id) => !ids.includes(id));
          if (local.length) {
            await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ merge: local }) });
            ids = [...local, ...ids];
          }
          localStorage.setItem(mergedKey, "1");
        }
        writeWatchlist(ids);
      } else if (cachedAccount()?.signedIn) {
        // Just signed out: don't leave the account's watchlist showing on this device.
        writeWatchlist([]);
      }
      window.__turreraAccount = a;
      try { sessionStorage.setItem(ACCOUNT, JSON.stringify({ signedIn: a.signedIn, email: a.email })); } catch { /* ignore */ }
      window.dispatchEvent(new Event("turrera-account"));
      return a;
    })
    .catch(() => ({ signedIn: false }));
  return syncing;
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
    const next = !list.includes(id);
    writeWatchlist(next ? [id, ...list].slice(0, 300) : list.filter((x) => x !== id));
    if (window.__turreraAccount?.signedIn) {
      fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, on: next }) }).catch(() => {});
    }
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

// Header link: "Sign in" or "My account". Also kicks off the once-per-page account sync.
export function AccountLink({ className }: { className?: string }) {
  const [a, setA] = useState<Account | null>(null);
  useEffect(() => {
    setA(cachedAccount());
    const on = () => setA(window.__turreraAccount ?? null);
    window.addEventListener("turrera-account", on);
    syncAccount();
    return () => window.removeEventListener("turrera-account", on);
  }, []);
  const signedIn = !!a?.signedIn;
  return (
    <a href={signedIn ? "/account" : "/signin"} className={className} aria-label={signedIn ? "My account" : "Sign in"}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      <span className="header-watch-label">{signedIn ? "My account" : "Sign in"}</span>
    </a>
  );
}
