// Twilio text messages, sent over its REST API (no SDK needed).
export function smsConfig(env = process.env) {
  const sid = env.TWILIO_ACCOUNT_SID, token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_FROM, service = env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || (!from && !service)) return null;
  return { sid, token, from, service, site: (env.SITE_URL || "https://turrera.com").replace(/\/$/, "") };
}

// US numbers become +1XXXXXXXXXX; numbers typed with + keep their country code.
export function toE164(raw) {
  const s = String(raw ?? "").trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function sendSms(cfg, to, body) {
  const form = new URLSearchParams({ To: to, Body: body });
  if (cfg.service) form.set("MessagingServiceSid", cfg.service); else form.set("From", cfg.from);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
