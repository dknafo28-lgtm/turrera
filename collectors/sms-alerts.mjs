// Texts people when lots on their watchlist are about to close. Runs every 15 minutes.
import { createClient } from "@supabase/supabase-js";
import { sendSms, smsConfig, toE164 } from "./sms.mjs";

const DATE_ONLY = new Set(["jjkane", "gsa"]);
const TZ = "America/New_York";

const short = (t) => { const s = String(t ?? "").replace(/\s+/g, " ").trim(); return s.length > 42 ? `${s.slice(0, 40)}…` : s; };
const money = (n) => (n > 0 ? `$${Math.round(n).toLocaleString("en-US")}` : null);
const hourET = (ms) => Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(new Date(ms)));
const dayET = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });

export function left(ms) {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return h < 24 ? (m ? `${h}h ${m}m` : `${h}h`) : `${Math.floor(h / 24)}d ${h % 24}h`;
}

// Which of someone's watched lots need a text right now.
export function due(lots, hours, now = Date.now()) {
  const quiet = hourET(now) >= 22 || hourET(now) < 8; // no texts 10 pm to 8 am Eastern
  return lots.filter((l) => {
    if (!l.end_time) return false;
    const end = new Date(l.end_time).getTime();
    if (end <= now) return false;
    if (DATE_ONLY.has(l.source)) return dayET(end) === dayET(now) && !quiet; // closing date only: text that morning
    if (end - now > hours * 3_600_000) return false;
    // Overnight, hold the text until 8 am unless the lot closes before then.
    return !quiet || end - now < 10 * 3_600_000 && hourET(end) < 9;
  });
}

export function message(site, lots, now = Date.now()) {
  const line = (l) => `${short(l.title)}: ${DATE_ONLY.has(l.source) ? "closes today" : `closes in ${left(new Date(l.end_time).getTime() - now)}`}${money(l.current_bid) ? `, bid ${money(l.current_bid)}` : ""}`;
  if (lots.length === 1) return `Turrera: ${line(lots[0])}. ${site}/lot/${encodeURIComponent(lots[0].id)} Reply STOP to opt out.`;
  return `Turrera: ${lots.length} lots on your watchlist close soon. ${lots.slice(0, 3).map(line).join("; ")}. ${site}/account Reply STOP to opt out.`;
}

async function main() {
  const cfg = smsConfig();
  if (!cfg) { console.log("Twilio isn't set up (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM); skipping."); return; }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: people, error } = await db.from("profiles").select("user_id,phone,sms_hours").eq("sms_on", true).not("phone", "is", null);
  if (error) throw new Error(error.message);
  let sent = 0;
  for (const p of people ?? []) {
    const to = toE164(p.phone);
    if (!to) continue;
    const { data: watch } = await db.from("watchlist_items").select("lot_id").eq("user_id", p.user_id);
    const ids = (watch ?? []).map((w) => w.lot_id);
    if (!ids.length) continue;
    const { data: lots } = await db.from("lots").select("id,source,title,current_bid,end_time").in("id", ids).gt("end_time", new Date().toISOString());
    const { data: already } = await db.from("sms_sent").select("lot_id").eq("user_id", p.user_id).eq("kind", "closing").in("lot_id", ids);
    const done = new Set((already ?? []).map((r) => r.lot_id));
    const now = Date.now();
    const pick = due((lots ?? []).filter((l) => !done.has(l.id)), p.sms_hours ?? 3, now).sort((a, b) => a.end_time.localeCompare(b.end_time));
    if (!pick.length) continue;
    try {
      await sendSms(cfg, to, message(cfg.site, pick, now));
      await db.from("sms_sent").upsert(pick.map((l) => ({ user_id: p.user_id, lot_id: l.id, kind: "closing" })), { onConflict: "user_id,lot_id,kind", ignoreDuplicates: true });
      sent += 1;
    } catch (e) {
      console.error(`Text to ${to.slice(0, -4)}**** failed: ${e.message}`);
    }
  }
  console.log(`Sent ${sent} closing-soon text(s).`);
}

if (process.argv[1]?.endsWith("sms-alerts.mjs")) main().catch((e) => { console.error(e); process.exit(1); });
