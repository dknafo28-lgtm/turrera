// Email-alert feed: reads saved-search alert emails (GovDeals, GovPlanet, CWS Marketing) that arrive in a
// dedicated inbox, pulls the listings out of each email with Claude, and saves them as lots.
// It only uses what's in the emails — it never visits those sites.
//
// Secrets: ALERTS_IMAP_USER, ALERTS_IMAP_PASSWORD (Gmail app password), optional ALERTS_IMAP_HOST,
//          ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Run: node collectors/email-alerts.mjs

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { categorize } from "./categorize.mjs";
import { getWriteClient } from "./db.mjs";

const MODEL = process.env.ALERTS_MODEL ?? "claude-haiku-5-5";
const MAX_EMAILS = Number(process.env.ALERTS_MAX_EMAILS ?? 60);

export const SITES = [
  { source: "govdeals", label: "GovDeals", domains: ["govdeals.com", "allsurplus.com"], senders: /govdeals|allsurplus|liquidityservices/i },
  { source: "govplanet", label: "GovPlanet", domains: ["govplanet.com", "ironplanet.com"], senders: /govplanet|ironplanet|ritchiebros|rbauction/i },
  { source: "cws", label: "CWS Marketing", domains: ["cwsmarketing.com", "cwsams.com"], senders: /cwsmarketing|cwsams/i },
];

export function siteFor({ from = "", html = "", text = "" }) {
  const body = `${html} ${text}`.toLowerCase();
  return (
    SITES.find((s) => s.senders.test(from)) ??
    SITES.find((s) => s.domains.some((d) => body.includes(d))) ??
    null
  );
}

// A stable id for a listing: the site's own id from the link when we can find one, otherwise a hash of the link.
export function listingId(source, url) {
  let u;
  try { u = new URL(url); } catch { return `${source}:${createHash("sha1").update(String(url)).digest("hex").slice(0, 16)}`; }
  const params = ["itemid", "itemId", "id", "auc", "lot", "lotId", "equipId", "listingId", "fa"];
  for (const p of params) {
    const v = u.searchParams.get(p);
    if (v && /^[\w-]{3,}$/.test(v)) return `${source}:${p.toLowerCase()}-${v}`;
  }
  const pathId = u.pathname.match(/(\d{4,}(?:\/\d+)?)\/?$/)?.[1];
  if (pathId) return `${source}:${pathId.replace("/", "-")}`;
  return `${source}:${createHash("sha1").update(u.origin + u.pathname + u.search).digest("hex").slice(0, 16)}`;
}

export const SYSTEM_PROMPT = `You extract auction listings from saved-search alert emails sent by government surplus auction sites.
Return JSON only: {"listings": [ { "title": string, "url": string, "current_bid": number|null, "end_time": string|null, "city": string|null, "state": string|null, "image_url": string|null, "details": string|null } ]}
Rules:
- One entry per auctioned item or lot in the email. Skip ads, account links, unsubscribe links, help links and newsletter articles.
- "url" must be the link to that specific listing, copied exactly from the email.
- "current_bid" is the current or starting bid in US dollars as a number, if shown.
- "end_time" is the closing date/time if shown, as ISO 8601 (assume US Eastern time if no zone is given), else null.
- "state" is the 2-letter US state code if shown.
- "image_url" is the item's photo URL from the email, if present.
- "details" is any other text the email gives about that item (condition, mileage, seller), else null.
- If the email has no listings, return {"listings": []}.`;

export function emailToPrompt({ subject, from, date, text, links }) {
  const linkList = links.slice(0, 200).map((l) => `- ${l.text || "(no text)"} -> ${l.href}`).join("\n");
  return `From: ${from}\nDate: ${date}\nSubject: ${subject}\n\nEmail text:\n${(text ?? "").slice(0, 12000)}\n\nLinks in the email:\n${linkList}`;
}

export function parseListings(reply) {
  const match = (reply ?? "").match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const json = JSON.parse(match[0]);
    return Array.isArray(json.listings) ? json.listings.filter((l) => l && typeof l.url === "string" && /^https?:\/\//.test(l.url) && l.title) : [];
  } catch {
    return [];
  }
}

export function toLot(site, l, now = Date.now()) {
  const end = l.end_time ? new Date(l.end_time) : null;
  const title = String(l.title).trim().slice(0, 300);
  return {
    id: listingId(site.source, l.url),
    source: site.source,
    title,
    description: l.details ? String(l.details).slice(0, 4000) : null,
    category: categorize(title, l.details ?? ""),
    current_bid: typeof l.current_bid === "number" && Number.isFinite(l.current_bid) ? l.current_bid : null,
    start_time: null,
    end_time: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
    status: "active",
    city: l.city ?? null,
    state: l.state ? String(l.state).toUpperCase().slice(0, 2) : null,
    zip: null,
    agency: null,
    photo_url: l.image_url ?? null,
    photos: l.image_url ? [l.image_url] : [],
    lot_url: l.url,
    raw: { from_email: true },
    details_fetched: new Date(now).toISOString(),
    last_updated: new Date(now).toISOString(),
  };
}

// Pull every <a href> out of the email HTML (tracking redirects included; Claude picks the listing links).
export function extractLinks(html) {
  const links = [];
  for (const m of (html ?? "").matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    const href = m[1].replace(/&amp;/g, "&");
    if (/^https?:\/\//.test(href)) links.push({ href, text: text.slice(0, 120) });
  }
  return links;
}

async function askClaude(apiKey, prompt) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: SYSTEM_PROMPT, messages: [{ role: "user", content: prompt }] }),
    });
    if (res.ok) {
      const json = await res.json();
      return json.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n") ?? "";
    }
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 6000 * attempt)); continue; }
    throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return "";
}

export async function run() {
  const user = process.env.ALERTS_IMAP_USER;
  const pass = process.env.ALERTS_IMAP_PASSWORD;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!user || !pass) { console.log("Email alerts: skipped (ALERTS_IMAP_USER / ALERTS_IMAP_PASSWORD not set yet)."); return 0; }
  if (!apiKey) { console.log("Email alerts: skipped (ANTHROPIC_API_KEY not set)."); return 0; }

  const { ImapFlow } = await import("imapflow");
  const { simpleParser } = await import("mailparser");
  const client = new ImapFlow({ host: process.env.ALERTS_IMAP_HOST ?? "imap.gmail.com", port: 993, secure: true, auth: { user, pass }, logger: false });
  await client.connect();
  const supabase = getWriteClient();
  let emails = 0;
  let saved = 0;
  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = (await client.search({ seen: false }, { uid: true })) || [];
    for (const uid of uids.slice(-MAX_EMAILS)) {
      const msg = await client.fetchOne(uid, { source: true }, { uid: true });
      const mail = await simpleParser(msg.source);
      const from = mail.from?.text ?? "";
      const html = typeof mail.html === "string" ? mail.html : "";
      const site = siteFor({ from, html, text: mail.text ?? "" });
      if (!site) continue; // not an alert we know; leave it unread for you
      const reply = await askClaude(apiKey, emailToPrompt({
        subject: mail.subject ?? "", from, date: mail.date?.toISOString() ?? "", text: mail.text ?? "", links: extractLinks(html),
      }));
      const lots = [...new Map(parseListings(reply).map((l) => toLot(site, l)).map((l) => [l.id, l])).values()];
      if (lots.length) {
        const { error } = await supabase.from("lots").upsert(lots, { onConflict: "id" });
        if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
      }
      await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
      emails++;
      saved += lots.length;
      console.log(`Email alerts: "${(mail.subject ?? "").slice(0, 80)}" (${site.label}) -> ${lots.length} listings`);
    }
  } finally {
    lock.release();
    await client.logout();
  }
  console.log(`Email alerts: read ${emails} alert emails, saved ${saved} listings.`);
  return saved;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
