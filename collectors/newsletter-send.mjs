// Sends an approved newsletter to every active subscriber, then emails David about new requests and leads.
import { getWriteClient } from "./db.mjs";
import { closes, esc, mailConfig, makeTransport, money, sleep } from "./mailer.mjs";

async function sendNewsletter(db, cfg, transport) {
  const { data: rows } = await db.from("newsletters").select("*").eq("status", "approved").order("approved_at").limit(1);
  const n = rows?.[0];
  if (!n) { console.log("Newsletter: nothing approved to send."); return; }
  if (!cfg.address) { console.log("Newsletter: set MAIL_ADDRESS (your mailing address) before sending; the law requires it in bulk email."); return; }
  const { data: claimed } = await db.from("newsletters").update({ status: "sending" }).eq("id", n.id).eq("status", "approved").select("id");
  if (!claimed?.length) return;
  const subs = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from("subscribers").select("email,token").eq("status", "active").range(from, from + 999);
    subs.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  let sent = 0;
  for (const s of subs) {
    const unsub = `${cfg.site}/unsubscribe?t=${s.token}`;
    const html = n.html.replace("{{UNSUBSCRIBE}}", esc(unsub)).replace("{{ADDRESS}}", `<br>Turrera, ${esc(cfg.address)}`);
    try {
      await transport.sendMail({ from: cfg.from, to: s.email, subject: n.subject, html, headers: { "List-Unsubscribe": `<${unsub}>` } });
      sent++;
    } catch (e) { console.log(`  ${s.email}: ${e.message}`); }
    await sleep(1200);
  }
  await db.from("newsletters").update({ status: "sent", sent_at: new Date().toISOString(), sent_count: sent }).eq("id", n.id);
  console.log(`Newsletter: "${n.subject}" sent to ${sent} of ${subs.length} subscribers.`);
}

async function notifyAdmin(db, cfg, transport) {
  const [buys, sells, fins, insp, revs] = await Promise.all([
    db.from("buy_requests").select("*").is("notified_at", null).order("created_at").limit(50),
    db.from("sell_leads").select("*").is("notified_at", null).order("created_at").limit(50),
    db.from("finance_requests").select("*").is("notified_at", null).order("created_at").limit(50),
    db.from("inspection_requests").select("*").is("notified_at", null).order("created_at").limit(50),
    db.from("reviews").select("id,name,rating,body,lot_title").is("notified_at", null).order("created_at").limit(50),
  ]);
  const rv = revs.error ? [] : (revs.data ?? []);
  const ins = insp.error ? [] : (insp.data ?? []);
  const f = fins.error ? [] : (fins.data ?? []);
  const b = buys.data ?? [];
  const s = sells.data ?? [];
  if (!b.length && !s.length && !f.length && !ins.length && !rv.length) return;
  const lines = [
    ...rv.map((r) => `<li><strong>New review to approve:</strong> ${"\u2605".repeat(r.rating)} from ${esc(r.name)}${r.lot_title ? ` about ${esc(r.lot_title)}` : ""}: &ldquo;${esc(String(r.body).slice(0, 200))}&rdquo; <a href="${esc(cfg.site)}/admin#reviews">Approve or reject</a></li>`),
    ...ins.map((r) => `<li><strong>Inspection request:</strong> ${esc(r.name)} (${esc(r.email)}${r.phone ? `, ${esc(r.phone)}` : ""}) wants <a href="${esc(r.lot_url ?? cfg.site)}">${esc(r.lot_title ?? r.lot_id)}</a> inspected in ${esc(r.lot_place || "unknown location")} before it closes ${esc(closes(r.lot_end))}. Fee ${money(r.fee)}, status ${esc(r.status)}. Questions: ${esc(r.questions ?? "none given")}</li>`),
    ...b.map((r) => `<li><strong>Buy request:</strong> ${esc(r.name)} (${esc(r.email)}${r.phone ? `, ${esc(r.phone)}` : ""}) wants <a href="${esc(r.lot_url ?? cfg.site)}">${esc(r.lot_title ?? r.lot_id)}</a>, top bid ${money(r.max_bid)}, deposit ${money(r.deposit)}, ship to ${esc(r.destination ?? "not given")}. Status: ${esc(r.status)}.</li>`),
    ...f.map((r) => `<li><strong>Financing request:</strong> ${esc(r.name)}${r.company ? `, ${esc(r.company)}` : ""} (${esc(r.email)}${r.phone ? `, ${esc(r.phone)}` : ""}), ${esc(r.buyer_type ?? "business")} in ${esc(r.state ?? "?")}, wants ${money(r.amount) ?? "an unstated amount"} for ${esc(r.lot_title ?? r.what ?? "not given")}. Credit ${esc(r.credit ?? "?")}, ${esc(r.years_in_business ?? "")}.</li>`),
    ...s.map((r) => `<li><strong>Sell lead:</strong> ${esc(r.company)}, ${esc(r.name)} (${esc(r.email)}${r.phone ? `, ${esc(r.phone)}${r.call_consent ? ", OK to call" : ", email only"}` : ""}). Fleet ${esc(r.fleet_size ?? "?")}, timeline ${esc(r.timeline ?? "?")}. Selling: ${esc(r.items ?? "not given")}</li>`),
  ];
  await transport.sendMail({
    from: cfg.from, to: cfg.admin,
    subject: `Turrera: ${[rv.length ? `${rv.length} review${rv.length > 1 ? "s" : ""} to approve` : "", ins.length ? `${ins.length} inspection request${ins.length > 1 ? "s" : ""}` : "", b.length ? `${b.length} buy request${b.length > 1 ? "s" : ""}` : "", f.length ? `${f.length} financing request${f.length > 1 ? "s" : ""}` : "", s.length ? `${s.length} sell lead${s.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ")}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5"><ul>${lines.join("")}</ul><p><a href="${cfg.site}/admin">Open admin</a></p></div>`,
  });
  const now = new Date().toISOString();
  if (b.length) await db.from("buy_requests").update({ notified_at: now }).in("id", b.map((r) => r.id));
  if (s.length) await db.from("sell_leads").update({ notified_at: now }).in("id", s.map((r) => r.id));
  if (f.length) await db.from("finance_requests").update({ notified_at: now }).in("id", f.map((r) => r.id));
  if (ins.length) await db.from("inspection_requests").update({ notified_at: now }).in("id", ins.map((r) => r.id));
  if (rv.length) await db.from("reviews").update({ notified_at: now }).in("id", rv.map((r) => r.id));
  console.log(`Notified David: ${ins.length} inspection request(s), ${b.length} buy request(s), ${f.length} financing request(s), ${s.length} sell lead(s).`);
}

async function main() {
  const cfg = mailConfig();
  if (!cfg) { console.log("Mail: no SMTP login set (SMTP_USER/SMTP_PASSWORD or the alert inbox), skipping."); return; }
  const db = getWriteClient();
  const transport = makeTransport(cfg);
  try {
    await notifyAdmin(db, cfg, transport);
    await sendNewsletter(db, cfg, transport);
  } finally { transport.close(); }
}

main().catch((e) => { console.error(e); process.exit(1); });
