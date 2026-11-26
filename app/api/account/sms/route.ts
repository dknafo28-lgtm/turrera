import { getUser } from "@/lib/auth";
import { back, field } from "@/lib/forms";

function toE164(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// Save text-alert settings for the signed-in person.
export async function POST(req: Request) {
  const me = await getUser();
  if (!me) return back(req, "/signin?next=/account%23texts");
  const fd = await req.formData();
  const on = fd.get("sms_on") === "yes";
  const phoneRaw = field(fd, "phone", 30);
  const phone = phoneRaw ? toE164(phoneRaw) : null;
  if (on && !phone) return back(req, "/account?sms=phone#texts");
  const hours = [1, 3, 6, 12, 24].includes(Number(field(fd, "sms_hours", 3))) ? Number(field(fd, "sms_hours", 3)) : 3;
  const now = new Date().toISOString();
  const { error } = await me.db.from("profiles").upsert({
    user_id: me.user.id, phone, sms_on: on, sms_hours: hours, updated_at: now, ...(on ? { sms_consent_at: now } : {}),
  }, { onConflict: "user_id" });
  return back(req, error ? "/account?sms=failed#texts" : `/account?sms=${on ? "on" : "off"}#texts`);
}
