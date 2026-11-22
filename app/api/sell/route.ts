import { getReadClient } from "@/lib/supabase";
import { EMAIL_RE, back, field } from "@/lib/forms";

export async function POST(req: Request) {
  const fd = await req.formData();
  if (field(fd, "website")) return back(req, "/thanks?k=sell");
  const email = field(fd, "email", 200);
  const company = field(fd, "company", 160);
  const name = field(fd, "name", 120);
  if (!EMAIL_RE.test(email) || !company || !name) return back(req, "/thanks?k=error&m=fields");
  const db = getReadClient();
  const { error } = db ? await db.rpc("submit_sell_lead", {
    p_kind: field(fd, "kind", 20) || "business", p_company: company, p_name: name, p_email: email,
    p_phone: field(fd, "phone", 40) || null, p_call_consent: fd.get("call_consent") === "yes",
    p_location: field(fd, "location", 160) || null, p_fleet_size: field(fd, "fleet_size", 40) || null,
    p_items: field(fd, "items", 3000) || null, p_timeline: field(fd, "timeline", 60) || null,
  }) : { error: { message: "no db" } };
  return back(req, error ? "/thanks?k=error" : "/thanks?k=sell");
}
