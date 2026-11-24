import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LotCard from "@/components/LotCard";
import SiteHeader from "@/components/SiteHeader";
import { getUser } from "@/lib/auth";
import { closesAt, money } from "@/lib/format";
import { CATEGORIES, typeLabel } from "@/lib/lots";
import { type Lot, getReadClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "My account | Turrera", robots: { index: false } };
export const dynamic = "force-dynamic";

type Alert = { id: string; label: string | null; params: Record<string, string>; active: boolean; created_at: string };
type Req = { kind: string; id: string; lot_id: string | null; title: string; detail: string; status: string; created_at: string };

const STATUS: Record<string, string> = {
  new: "Received", deposit_paid: "Deposit paid", bidding: "Bidding", won: "Won", lost: "Not won", refunded: "Refunded", closed: "Closed",
  paid: "Paid", scheduled: "Visit scheduled", done: "Report sent", cancelled: "Cancelled",
  sent_to_lender: "Sent to lender", approved: "Approved", declined: "Declined", funded: "Funded",
};

function day(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

function alertText(a: Alert) {
  if (a.label) return a.label;
  const p = a.params ?? {};
  const bits = [p.q ? `“${p.q}”` : null, typeLabel(p.category, p.sub) ?? CATEGORIES.find((c) => c.key === p.category)?.label ?? null, p.state ? `in ${p.state}` : null];
  return bits.filter(Boolean).join(" ") || "All new lots";
}

export default async function Account({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const q = await searchParams;
  const me = await getUser();
  if (!me) redirect("/signin?next=/account");
  const { db, user } = me;

  const [watch, alerts, buys, insp, fins] = await Promise.all([
    db.from("watchlist_items").select("lot_id").order("created_at", { ascending: false }).limit(300),
    db.from("saved_searches").select("id,label,params,active,created_at").order("created_at", { ascending: false }),
    db.from("buy_requests").select("id,lot_id,lot_title,max_bid,status,created_at").order("created_at", { ascending: false }).limit(50),
    db.from("inspection_requests").select("id,lot_id,lot_title,lot_place,status,created_at").order("created_at", { ascending: false }).limit(50),
    db.from("finance_requests").select("id,lot_id,lot_title,amount,status,created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const ids = (watch.data ?? []).map((r) => r.lot_id as string);
  let lots: Lot[] = [];
  const read = getReadClient();
  if (ids.length && read) {
    const { data } = await read.from("lots").select("*").in("id", ids);
    const order = new Map(ids.map((id, i) => [id, i]));
    lots = ((data ?? []) as Lot[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  const now = Date.now();
  const open = lots.filter((l) => !l.end_time || new Date(l.end_time).getTime() > now).sort((a, b) => (a.end_time ?? "").localeCompare(b.end_time ?? ""));
  const ended = lots.filter((l) => l.end_time && new Date(l.end_time).getTime() <= now);
  const today = open.filter((l) => l.end_time && new Date(l.end_time).getTime() - now < 86_400_000).length;

  const requests: Req[] = [
    ...(buys.data ?? []).map((r) => ({ kind: "Buy for me", id: r.id, lot_id: r.lot_id, title: r.lot_title ?? r.lot_id, detail: `Top bid ${money(r.max_bid)}`, status: r.status, created_at: r.created_at })),
    ...(insp.data ?? []).map((r) => ({ kind: "Inspection", id: r.id, lot_id: r.lot_id, title: r.lot_title ?? r.lot_id, detail: r.lot_place ?? "", status: r.status, created_at: r.created_at })),
    ...(fins.data ?? []).map((r) => ({ kind: "Financing", id: r.id, lot_id: r.lot_id, title: r.lot_title ?? "General financing", detail: r.amount ? `${money(r.amount)} requested` : "", status: r.status, created_at: r.created_at })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const alertRows = (alerts.data ?? []) as Alert[];
  const activeAlerts = alertRows.filter((a) => a.active).length;

  return (
    <>
      <SiteHeader />
      <main className="page account">
        <div className="account-head">
          <div>
            <h1>My account</h1>
            <p className="page-lead">{user.email}</p>
          </div>
          <form action="/api/auth/signout" method="post"><button type="submit" className="btn btn-outline">Sign out</button></form>
        </div>
        {q.saved === "password" ? <p className="form-note" role="status">Your new password is saved.</p> : null}

        <ul className="account-stats">
          <li><a href="#watchlist"><strong>{open.length}</strong><span>watching</span></a></li>
          <li><a href="#watchlist"><strong>{today}</strong><span>closing in 24 hours</span></a></li>
          <li><a href="#alerts"><strong>{activeAlerts}</strong><span>active alerts</span></a></li>
          <li><a href="#requests"><strong>{requests.length}</strong><span>requests</span></a></li>
        </ul>

        <section className="page-section" id="watchlist" aria-labelledby="watch-h">
          <h2 id="watch-h">Watchlist</h2>
          {open.length ? (
            <div className="lot-grid lot-grid-wide">{open.map((l) => <LotCard key={l.id} lot={l} />)}</div>
          ) : (
            <p className="fine">Nothing open on your watchlist. Tap the star on any lot to save it here, on every device you sign in on. <a href="/search?ending=24h">Browse lots closing today</a></p>
          )}
          {ended.length ? (
            <details className="account-ended">
              <summary>{ended.length} ended lot{ended.length === 1 ? "" : "s"} you watched</summary>
              <div className="lot-grid lot-grid-wide">{ended.map((l) => <LotCard key={l.id} lot={l} />)}</div>
            </details>
          ) : null}
        </section>

        <section className="page-section" id="requests" aria-labelledby="req-h">
          <h2 id="req-h">Requests</h2>
          {requests.length ? (
            <ul className="account-list">
              {requests.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <div>
                    <span className="account-kind">{r.kind}</span>
                    {r.lot_id ? <a href={`/lot/${encodeURIComponent(r.lot_id)}`}>{r.title}</a> : <span>{r.title}</span>}
                    <span className="fine">{[r.detail, `sent ${day(r.created_at)}`].filter(Boolean).join(", ")}</span>
                  </div>
                  <span className={`tag account-status account-status-${r.status}`}>{STATUS[r.status] ?? r.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fine">Buy-for-me, inspection and financing requests you send while signed in show up here with their status.</p>
          )}
        </section>

        <section className="page-section" id="alerts" aria-labelledby="alerts-h">
          <h2 id="alerts-h">Auction alerts</h2>
          {alertRows.length ? (
            <ul className="account-list">
              {alertRows.map((a) => (
                <li key={a.id}>
                  <div>
                    <a href={`/search?${new URLSearchParams(Object.entries(a.params ?? {}).filter(([, v]) => typeof v === "string" && v) as [string, string][])}`}>{alertText(a)}</a>
                    <span className="fine">{a.active ? "Emails you when new lots match, checked every 4 hours" : "Paused"}</span>
                  </div>
                  <form action="/api/account/alert" method="post">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="active" value={a.active ? "0" : "1"} />
                    <button type="submit" className="btn btn-outline btn-small">{a.active ? "Pause" : "Turn back on"}</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fine">Run a search and use &ldquo;Email me new matches&rdquo; while signed in. Your alerts will be listed here. <a href="/search">Start a search</a></p>
          )}
        </section>

        <section className="page-section" aria-labelledby="settings-h">
          <h2 id="settings-h">Settings</h2>
          <ul className="account-settings">
            <li><a href="/account/password">Change password</a></li>
            <li>Upcoming auctions email: <a href="/#signup">sign up</a> or use the unsubscribe link in any email</li>
          </ul>
        </section>
      </main>
    </>
  );
}
