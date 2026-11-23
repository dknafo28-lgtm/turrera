import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { getAdminClient } from "@/lib/admin";
import { money } from "@/lib/format";
import ShowcaseForm from "@/components/ShowcaseForm";
import type { Sale } from "@/lib/showcase";

export const metadata: Metadata = { title: "Admin | Turrera", robots: { index: false } };
export const dynamic = "force-dynamic";

const BUY = ["new", "deposit_paid", "bidding", "won", "lost", "paid", "shipped", "done", "cancelled"];
const SELL = ["new", "contacted", "booked", "listed", "sold", "lost"];
const label = (s: string) => s.replace("_", " ").replace(/^./, (c) => c.toUpperCase());
const when = (s: string) => new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

type Buy = { id: string; lot_id: string; lot_title: string | null; lot_url: string | null; name: string; email: string; phone: string | null; max_bid: number; destination: string | null; notes: string | null; deposit: number | null; status: string; created_at: string };
type Sell = { id: string; kind: string | null; company: string; name: string; email: string; phone: string | null; call_consent: boolean; location: string | null; fleet_size: string | null; items: string | null; timeline: string | null; status: string; created_at: string };
type Fin = { id: string; lot_id: string | null; lot_title: string | null; buyer_type: string | null; name: string; company: string | null; email: string; phone: string | null; state: string | null; amount: number | null; credit: string | null; years_in_business: string | null; what: string | null; contact_consent: boolean; status: string; created_at: string };
const FIN = ["new", "sent_to_lender", "approved", "declined", "funded", "closed"];
type News = { id: string; subject: string; html: string; social: { text: string }[] | null; status: string; created_at: string; sent_count: number | null; sent_at: string | null };

function StatusForm({ action, id, status, options, anchor }: { action: string; id: string; status: string; options: string[]; anchor: string }) {
  return (
    <form action="/api/admin" method="post" className="status-form">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="anchor" value={anchor} />
      <select name="status" defaultValue={status} aria-label="Status" data-autosubmit>
        {options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
      </select>
      <noscript><button type="submit">Save</button></noscript>
    </form>
  );
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const db = getAdminClient();
  const { err } = await searchParams;
  if (!db) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Admin</h1>
          <div className="notice">
            <p><strong>One setting needed.</strong> In Vercel, open the turrera project, go to Settings, Environment Variables, and add <code>SUPABASE_SERVICE_ROLE_KEY</code> with the same value as the GitHub secret. Then redeploy. This key stays on the server and is never sent to the browser.</p>
          </div>
        </main>
      </>
    );
  }
  const [buys, sells, news, subs, alerts, fins] = await Promise.all([
    db.from("buy_requests").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("sell_leads").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("newsletters").select("id,subject,html,social,status,created_at,sent_count,sent_at").order("created_at", { ascending: false }).limit(6),
    db.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("saved_searches").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("finance_requests").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  const showcase = await db.from("showcase").select("*").order("created_at", { ascending: false }).limit(100);
  const saleRows = (showcase.data ?? []) as Sale[];
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const clicks = await db.from("finance_clicks").select("lender").gte("created_at", since).limit(10000);
  const clickCounts: Record<string, number> = {};
  for (const c of (clicks.data ?? []) as { lender: string }[]) clickCounts[c.lender] = (clickCounts[c.lender] ?? 0) + 1;
  const finRows = (fins.data ?? []) as Fin[];
  const buyRows = (buys.data ?? []) as Buy[];
  const sellRows = (sells.data ?? []) as Sell[];
  const newsRows = (news.data ?? []) as News[];
  const draft = newsRows.find((n) => n.status === "draft");
  const missingTables = [buys, sells, news].some((r) => r.error);

  return (
    <>
      <SiteHeader />
      <main className="page page-wide" id="top">
        <h1>Admin</h1>
        {err === "key" ? <div className="notice"><p>Add SUPABASE_SERVICE_ROLE_KEY in Vercel to save changes.</p></div> : null}
        {missingTables ? <div className="notice"><p>Some tables aren&apos;t set up yet. The database update runs automatically on the next deploy.</p></div> : null}

        <dl className="admin-stats">
          <div><dt>Open buy requests</dt><dd>{buyRows.filter((b) => !["done", "cancelled", "lost"].includes(b.status)).length}</dd></div>
          <div><dt>New financing requests</dt><dd>{finRows.filter((f) => f.status === "new").length}</dd></div>
          <div><dt>New sell leads</dt><dd>{sellRows.filter((s) => s.status === "new").length}</dd></div>
          <div><dt>Newsletter subscribers</dt><dd>{(subs.count ?? 0).toLocaleString()}</dd></div>
          <div><dt>Active search alerts</dt><dd>{(alerts.count ?? 0).toLocaleString()}</dd></div>
        </dl>

        <section className="page-section" id="buy">
          <h2>Buy requests</h2>
          {buyRows.length ? (
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Received</th><th>Lot</th><th>Buyer</th><th>Top bid</th><th>Deposit</th><th>Ship to</th><th>Status</th></tr></thead>
                <tbody>
                  {buyRows.map((b) => (
                    <tr key={b.id}>
                      <td>{when(b.created_at)}</td>
                      <td><a href={`/lot/${encodeURIComponent(b.lot_id)}`}>{b.lot_title ?? b.lot_id}</a>{b.lot_url ? <> (<a href={b.lot_url} target="_blank" rel="noopener noreferrer">auction</a>)</> : null}{b.notes ? <p className="fine">{b.notes}</p> : null}</td>
                      <td>{b.name}<br /><a href={`mailto:${b.email}`}>{b.email}</a>{b.phone ? <><br /><a href={`tel:${b.phone}`}>{b.phone}</a></> : null}</td>
                      <td className="num">{money(b.max_bid)}</td>
                      <td className="num">{money(b.deposit)}</td>
                      <td>{b.destination ?? "Not given"}</td>
                      <td><StatusForm action="buy_status" id={b.id} status={b.status} options={BUY} anchor="buy" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="fine">No requests yet. They come from the “Have us buy it for you” form on each lot.</p>}
        </section>

        <section className="page-section" id="sell">
          <h2>Sell leads</h2>
          {sellRows.length ? (
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Received</th><th>Company</th><th>Contact</th><th>Fleet</th><th>What they&apos;re selling</th><th>Status</th></tr></thead>
                <tbody>
                  {sellRows.map((s) => (
                    <tr key={s.id}>
                      <td>{when(s.created_at)}</td>
                      <td>{s.company}<br /><span className="fine">{label(s.kind ?? "business")}{s.location ? `, ${s.location}` : ""}</span></td>
                      <td>{s.name}<br /><a href={`mailto:${s.email}`}>{s.email}</a>{s.phone ? <><br /><a href={`tel:${s.phone}`}>{s.phone}</a> {s.call_consent ? <span className="tag tag-ease-easy">OK to call</span> : <span className="tag tag-ease-hard">Email only</span>}</> : null}</td>
                      <td>{s.fleet_size ?? ""}{s.timeline ? <><br /><span className="fine">{s.timeline}</span></> : null}</td>
                      <td className="wrap">{s.items ?? ""}</td>
                      <td><StatusForm action="sell_status" id={s.id} status={s.status} options={SELL} anchor="sell" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="fine">No leads yet. They come from the Sell your fleet page.</p>}
        </section>

        <section className="page-section" id="finance">
          <h2>Financing</h2>
          <p className="fine">Clicks to lenders in the last 30 days: {Object.keys(clickCounts).length ? Object.entries(clickCounts).map(([k, n]) => `${k} ${n}`).join(", ") : "none yet"}. Share these numbers when you ask lenders for a referral deal.</p>
          {finRows.length ? (
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Received</th><th>Buyer</th><th>Amount</th><th>Credit and business</th><th>Buying</th><th>Status</th></tr></thead>
                <tbody>
                  {finRows.map((f) => (
                    <tr key={f.id}>
                      <td>{when(f.created_at)}</td>
                      <td>{f.name}{f.company ? <>, {f.company}</> : null}<br /><a href={`mailto:${f.email}`}>{f.email}</a>{f.phone ? <><br /><a href={`tel:${f.phone}`}>{f.phone}</a></> : null}<br /><span className="fine">{label(f.buyer_type ?? "business")}{f.state ? `, ${f.state}` : ""}</span></td>
                      <td className="num">{money(f.amount) ?? "Not given"}</td>
                      <td>{f.credit ?? "Credit not given"}<br /><span className="fine">{f.years_in_business ?? ""}</span></td>
                      <td className="wrap">{f.lot_id ? <a href={`/lot/${encodeURIComponent(f.lot_id)}`}>{f.lot_title ?? f.lot_id}</a> : null}{f.what ? <p className="fine">{f.what}</p> : null}</td>
                      <td><StatusForm action="fin_status" id={f.id} status={f.status} options={FIN} anchor="finance" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="fine">No financing requests yet. They come from the Financing page and the button on each lot.</p>}
        </section>

        <section className="page-section" id="showcase">
          <h2>Our sales (photos and reviews)</h2>
          <p className="fine">These show on the public <a href="/our-sales">Our sales</a> page and the home page.</p>
          <ShowcaseForm />
          {saleRows.length ? (
            <ul className="admin-sales">
              {saleRows.map((r) => (
                <li key={r.id}>
                  {r.photos[0] ? <img src={r.photos[0]} alt="" /> : <span className="admin-sales-nophoto" />}
                  <div><strong>{r.title}</strong><span className="fine">{[r.bought_price != null ? `won ${money(r.bought_price)}` : "", r.sold_price != null ? `sold ${money(r.sold_price)}` : "", r.sold_to ?? "", r.published ? "" : "hidden"].filter(Boolean).join(", ")}</span></div>
                  <form action="/api/admin/showcase" method="post"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value={r.published ? "hide" : "show"} /><button className="btn btn-outline" type="submit">{r.published ? "Hide" : "Show"}</button></form>
                  <form action="/api/admin/showcase" method="post"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="delete" /><button className="btn btn-quiet" type="submit">Delete</button></form>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="page-section" id="newsletter">
          <h2>Weekly newsletter</h2>
          {draft ? (
            <>
              <p>Draft from {when(draft.created_at)}: <strong>{draft.subject}</strong>. Approve it and it goes to {(subs.count ?? 0).toLocaleString()} subscribers within the hour.</p>
              <div className="admin-actions">
                <form action="/api/admin" method="post"><input type="hidden" name="action" value="approve" /><input type="hidden" name="id" value={draft.id} /><input type="hidden" name="anchor" value="newsletter" /><button className="btn btn-primary" type="submit">Approve and send</button></form>
                <form action="/api/admin" method="post"><input type="hidden" name="action" value="discard" /><input type="hidden" name="id" value={draft.id} /><input type="hidden" name="anchor" value="newsletter" /><button className="btn btn-outline" type="submit">Discard</button></form>
              </div>
              <iframe className="email-preview" title="Newsletter preview" sandbox="" srcDoc={draft.html} />
              {draft.social?.length ? (
                <>
                  <h3>Social posts for this week</h3>
                  <ol className="social-posts">{draft.social.map((s, i) => <li key={i}><pre>{s.text}</pre></li>)}</ol>
                </>
              ) : null}
            </>
          ) : <p className="fine">No draft waiting. A new one is written every Monday morning.</p>}
          {newsRows.filter((n) => n.status !== "draft").length ? (
            <ul className="fine">
              {newsRows.filter((n) => n.status !== "draft").map((n) => <li key={n.id}>{n.subject}: {label(n.status)}{n.sent_count ? `, sent to ${n.sent_count}` : ""}{n.sent_at ? ` on ${when(n.sent_at)}` : ""}</li>)}
            </ul>
          ) : null}
        </section>
      </main>
    </>
  );
}
