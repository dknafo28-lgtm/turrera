// Sends email over SMTP (a Gmail address with an app password works).
// Uses SMTP_USER / SMTP_PASSWORD, or falls back to the alert-inbox login.
import nodemailer from "nodemailer";

export function mailConfig() {
  const user = process.env.SMTP_USER || process.env.ALERTS_IMAP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.ALERTS_IMAP_PASSWORD;
  if (!user || !pass) return null;
  return {
    user, pass,
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    from: process.env.MAIL_FROM || `Turrera <${user}>`,
    admin: process.env.ADMIN_EMAIL || user,
    address: process.env.MAIL_ADDRESS || "",
    site: (process.env.SITE_URL || "https://turrera.com").replace(/\/$/, ""),
    publicSite: process.env.SITE_PUBLIC === "1",
  };
}

export function makeTransport(cfg) {
  return nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.port === 465, auth: { user: cfg.user, pass: cfg.pass }, pool: true, maxConnections: 2 });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function money(n) {
  return n === null || n === undefined ? null : `$${Math.round(n).toLocaleString("en-US")}`;
}

export function titleCase(raw) {
  if (!raw) return "";
  const s = raw.replace(/^lot(?:\s*#\s*|\s+)(?=[\w-]{0,7}\d)[\w-]{1,8}[\s:.-]+(?=\S)/i, "").replace(/^(\d{4})-\s*/, "$1 ") || raw;
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Ii|Iii|Iv|Usa|Us|Ac|Atv|Utv|Suv|Vin|Awd|4wd|2wd|4x4|4x2|Hd|Sd|Gmc|Bmw|Cng|Lpg|Dot|Led|Hp|Cat|Jcb)\b/g, (m) => m.toUpperCase());
}

export const SOURCE_NAME = { gsa: "GSA Auctions", publicsurplus: "Public Surplus", municibid: "Municibid", jjkane: "JJ Kane", govdeals: "GovDeals", govplanet: "GovPlanet", cws: "CWS Marketing" };

export function closes(end) {
  if (!end) return "No end date listed";
  return new Date(end).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" });
}

// Where a lot link should go: Turrera's lot page once the site is public, otherwise the auction itself.
export function lotLink(cfg, lot) {
  return cfg.publicSite ? `${cfg.site}/lot/${encodeURIComponent(lot.id)}` : (lot.lot_url || cfg.site);
}

// One lot as an email-safe table row.
export function lotRowHtml(cfg, lot, blurb = "") {
  const place = [lot.city ? titleCase(lot.city) : null, lot.state].filter(Boolean).join(", ");
  const bid = money(lot.current_bid) && lot.current_bid > 0 ? money(lot.current_bid) : lot.source === "jjkane" ? "Bid shown on JJ Kane" : "No bids yet";
  const link = lotLink(cfg, lot);
  return `<tr><td style="padding:14px 0;border-top:1px solid #dfe1e2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="150" valign="top" style="padding-right:14px">${lot.photo_url ? `<a href="${esc(link)}"><img src="${esc(lot.photo_url)}" width="150" alt="" style="display:block;width:150px;height:auto;border-radius:3px;border:0"></a>` : ""}</td>
<td valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#1b1b1b">
<a href="${esc(link)}" style="font-size:16px;font-weight:bold;color:#162e51;text-decoration:none">${esc(titleCase(lot.title) || "Untitled lot")}</a><br>
<span style="color:#565c65">${esc(place || "Location not listed")}</span><br>
<strong>${esc(bid)}</strong>${lot.current_bid > 0 ? ` <span style="color:#565c65">current bid</span>` : ""}<br>
<span style="color:#565c65">Closes ${esc(closes(lot.end_time))}</span>
${blurb ? `<br><span>${esc(blurb)}</span>` : ""}
</td></tr></table></td></tr>`;
}

export function shell(cfg, { preheader = "", heading = "", intro = "", body = "", footer = "" }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(heading)}</title></head>
<body style="margin:0;background:#f4f6f8">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #dfe1e2">
<tr><td style="background:#162e51;padding:16px 22px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;letter-spacing:1px;color:#ffffff"><span style="color:#9fd0dc">&#9650;</span> TURRERA</td></tr>
<tr><td style="padding:22px 22px 8px;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b">
<h1 style="margin:0 0 8px;font-size:22px;line-height:1.25;color:#162e51">${esc(heading)}</h1>
${intro ? `<p style="margin:0 0 6px;font-size:15px;line-height:1.5">${esc(intro)}</p>` : ""}
</td></tr>
<tr><td style="padding:0 22px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr>
<tr><td style="padding:16px 22px 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#565c65;border-top:1px solid #dfe1e2">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function footerHtml(cfg, unsubUrl, why) {
  return `${esc(why)} Values are estimates; check the listing before you bid. Want us to bid, pay and ship for you? Reply to this email.<br><br>
<a href="${esc(unsubUrl)}" style="color:#565c65">Unsubscribe</a>${cfg.address ? `<br>Turrera, ${esc(cfg.address)}` : ""}`;
}
