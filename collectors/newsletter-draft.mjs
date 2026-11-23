// Writes the weekly newsletter draft from the best open lots. David approves it on /admin before it goes out.
import { getWriteClient } from "./db.mjs";
import { esc, lotLink, lotRowHtml, mailConfig, money, shell, titleCase, closes, SOURCE_NAME } from "./mailer.mjs";

const MODEL = "claude-haiku-5-5";
const COLS = "id,source,title,description,category,current_bid,end_time,city,state,photo_url,lot_url,est_value,est_low,est_high,spread,sell_ease,condition";
const MAIN = ["boats", "trucks", "cars", "equipment", "buses", "powersports", "trailers", "emergency"];

async function pick(db) {
  const now = new Date();
  const iso = (d) => new Date(now.getTime() + d * 86_400_000).toISOString();
  const base = () => db.from("lots").select(COLS).gt("end_time", iso(0.5)).not("photo_url", "is", null).in("category", MAIN);
  const [deals, boats, big] = await Promise.all([
    base().lte("end_time", iso(8)).gt("current_bid", 0).gt("spread", 0).in("sell_ease", ["easy", "moderate"]).order("spread", { ascending: false }).limit(12),
    base().eq("category", "boats").lte("end_time", iso(10)).order("est_value", { ascending: false, nullsFirst: false }).limit(8),
    base().lte("end_time", iso(7)).in("category", ["trucks", "equipment", "buses"]).not("est_value", "is", null).order("est_value", { ascending: false }).limit(12),
  ]);
  const seen = new Set();
  const take = (rows, n) => (rows ?? []).filter((l) => !seen.has(l.id) && seen.add(l.id)).slice(0, n);
  return [
    { key: "deals", title: "Furthest under estimated value", lots: take(deals.data, 6) },
    { key: "boats", title: "Boats closing soon", lots: take(boats.data, 3) },
    { key: "big", title: "Work trucks and equipment worth a look", lots: take(big.data, 4) },
  ].filter((s) => s.lots.length);
}

function lotFacts(l) {
  return {
    id: l.id, title: titleCase(l.title), place: [l.city, l.state].filter(Boolean).join(", "), site: SOURCE_NAME[l.source] || l.source,
    current_bid: l.current_bid, est_low: l.est_low, est_high: l.est_high, closes: closes(l.end_time), condition: (l.condition || "").slice(0, 300),
  };
}

async function write(sections) {
  const key = process.env.ANTHROPIC_API_KEY;
  const fallback = {
    subject: `This week's surplus deals: ${titleCase(sections[0].lots[0].title)} and more`,
    intro: "Here are this week's best government surplus lots, picked for value and resale. Prices and values were current when this was sent.",
    blurbs: {},
    social: sections.flatMap((s) => s.lots).slice(0, 5).map((l) => ({ lot_id: l.id, text: `${titleCase(l.title)}, ${[l.city, l.state].filter(Boolean).join(", ")}. ${l.current_bid > 0 ? `Current bid ${money(l.current_bid)}` : "Open for bids"}${l.est_low ? `, estimated value ${money(l.est_low)}–${money(l.est_high)}` : ""}. Closes ${closes(l.end_time)}.` })),
  };
  if (!key) return fallback;
  const lots = sections.flatMap((s) => s.lots.map(lotFacts));
  const prompt = `You write a weekly email for people who buy government surplus vehicles, boats and equipment to use or resell. Plain, specific, friendly, no hype, no emoji, no exclamation marks.

Lots this week (JSON):
${JSON.stringify(lots)}

Return JSON only:
{"subject": "under 60 characters, names one standout lot",
 "intro": "2 sentences on what's notable this week",
 "blurbs": {"<lot id>": "one sentence, max 22 words, on why it's worth a look or what to check; use only facts given"},
 "social": [{"lot_id": "<id>", "text": "a 2-3 sentence social media post about one lot: what it is, where, current bid and estimated value if given, when it closes; end with: We can bid, pay and ship it for you. Link in bio."}]}
Write 5 social posts about different lots. Never invent mileage, condition or prices that aren't in the data.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
    });
    const body = await res.json();
    const text = (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    const json = m ? JSON.parse(m[0]) : null;
    if (!json?.subject) return fallback;
    return { ...fallback, ...json, blurbs: json.blurbs ?? {}, social: Array.isArray(json.social) ? json.social : fallback.social };
  } catch (e) {
    console.log(`Newsletter: Claude failed (${e.message}), using plain text.`);
    return fallback;
  }
}

async function main() {
  const db = getWriteClient();
  const { data: pending } = await db.from("newsletters").select("id").eq("status", "draft").limit(1);
  if (pending?.length) {
    // Replace an old unapproved draft with this week's.
    await db.from("newsletters").update({ status: "discarded" }).eq("status", "draft");
  }
  const sections = await pick(db);
  if (!sections.length) { console.log("Newsletter: no lots to feature."); return; }
  const copy = await write(sections);
  const cfg = mailConfig() ?? { site: (process.env.SITE_URL || "https://turrera.com"), publicSite: process.env.SITE_PUBLIC === "1", address: process.env.MAIL_ADDRESS || "" };
  const body = sections.map((s) => `<tr><td style="padding:18px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#162e51">${esc(s.title)}</td></tr>${s.lots.map((l) => lotRowHtml(cfg, l, copy.blurbs?.[l.id] ?? "")).join("")}`).join("");
  const html = shell(cfg, {
    preheader: copy.intro,
    heading: copy.subject,
    intro: copy.intro,
    body,
    footer: `You're getting this because you signed up for Turrera's weekly deals list. Values are estimates; check the listing before you bid. Want us to bid, pay and ship it for you, anywhere in the world? Reply to this email.<br><br><a href="{{UNSUBSCRIBE}}" style="color:#565c65">Unsubscribe</a>{{ADDRESS}}`,
  });
  const social = (copy.social ?? []).slice(0, 5).map((s) => {
    const lot = sections.flatMap((x) => x.lots).find((l) => l.id === s.lot_id);
    return { lot_id: s.lot_id, text: s.text, link: lot ? lotLink(cfg, lot) : null, photo: lot?.photo_url ?? null };
  });
  const { error } = await db.from("newsletters").insert({ subject: copy.subject.slice(0, 120), intro: copy.intro, html, social, lot_ids: sections.flatMap((s) => s.lots.map((l) => l.id)) });
  if (error) throw new Error(error.message);
  console.log(`Newsletter: draft saved, "${copy.subject}", ${sections.reduce((n, s) => n + s.lots.length, 0)} lots.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
