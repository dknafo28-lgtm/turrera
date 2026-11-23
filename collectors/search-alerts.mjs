// Emails people new lots matching their saved searches. Runs after each collection.
import { getWriteClient } from "./db.mjs";
import { esc, footerHtml, lotRowHtml, mailConfig, makeTransport, shell, sleep } from "./mailer.mjs";

const COLS = "id,source,title,description,category,current_bid,end_time,city,state,photo_url,lot_url,est_value,est_low,est_high,spread,sell_ease";

export function words(q) {
  return (q ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s\-.]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 6);
}

export function applySearch(query, p) {
  let q = query;
  for (const w of words(p.q)) q = q.or(`title.ilike."%${w}%",description.ilike."%${w}%"`);
  if (p.category) q = q.eq("category", p.category);
  if (p.state) q = q.eq("state", p.state);
  const sources = String(p.source ?? "").split(",").filter(Boolean);
  if (sources.length === 1) q = q.eq("source", sources[0]);
  else if (sources.length > 1) q = q.in("source", sources);
  if (Number(p.min) > 0) q = q.gte("current_bid", Number(p.min));
  if (Number(p.max) > 0) q = q.lte("current_bid", Number(p.max));
  if (p.deal === "1") q = q.gt("spread", 0).gt("current_bid", 0);
  if (p.ease === "easy") q = q.eq("sell_ease", "easy");
  if (p.ease === "moderate") q = q.in("sell_ease", ["easy", "moderate"]);
  return q;
}

async function main() {
  const cfg = mailConfig();
  if (!cfg) { console.log("Search alerts: no SMTP login set, skipping."); return; }
  if (!cfg.address) console.log("Search alerts: MAIL_ADDRESS not set; add your mailing address for CAN-SPAM.");
  const db = getWriteClient();
  const { data: searches, error } = await db.from("saved_searches").select("*").eq("active", true).limit(2000);
  if (error) { console.log(`Search alerts: ${error.message}`); return; }
  if (!searches?.length) { console.log("Search alerts: none saved yet."); return; }

  const now = new Date().toISOString();
  const byEmail = new Map();
  for (const s of searches) {
    const { data: lots, error: e2 } = await applySearch(
      db.from("lots").select(COLS).gt("first_seen", s.last_sent).gt("end_time", now), s.params ?? {},
    ).order("end_time", { ascending: true }).limit(15);
    if (e2) { console.log(`  search ${s.id}: ${e2.message}`); continue; }
    if (!lots?.length) continue;
    if (!byEmail.has(s.email)) byEmail.set(s.email, []);
    byEmail.get(s.email).push({ search: s, lots });
  }

  const transport = makeTransport(cfg);
  let sent = 0;
  for (const [email, groups] of byEmail) {
    const total = groups.reduce((n, g) => n + g.lots.length, 0);
    const body = groups.map((g) => `<tr><td style="padding:16px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#162e51">${esc(g.search.label || "Your search")} (${g.lots.length} new)</td></tr>${g.lots.map((l) => lotRowHtml(cfg, l)).join("")}`).join("");
    const unsub = `${cfg.site}/unsubscribe?t=${groups[0].search.token}`;
    const html = shell(cfg, {
      preheader: `${total} new lot${total === 1 ? "" : "s"} matching your Turrera alerts`,
      heading: `${total} new lot${total === 1 ? "" : "s"} for your alert${groups.length > 1 ? "s" : ""}`,
      body,
      footer: footerHtml(cfg, unsub, "You're getting this because you created a search alert on Turrera."),
    });
    try {
      await transport.sendMail({ from: cfg.from, to: email, subject: `${total} new: ${groups[0].search.label || "your Turrera alert"}`, html, headers: { "List-Unsubscribe": `<${unsub}>` } });
      sent++;
      for (const g of groups) await db.from("saved_searches").update({ last_sent: now }).eq("id", g.search.id);
    } catch (e) { console.log(`  ${email}: ${e.message}`); }
    await sleep(1500);
  }
  transport.close();
  console.log(`Search alerts: ${sent} email(s) sent for ${searches.length} saved search(es).`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
