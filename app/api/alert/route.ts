import { getReadClient } from "@/lib/supabase";
import { EMAIL_RE, back, field } from "@/lib/forms";

const KEYS = ["q", "category", "state", "min", "max", "source", "deal", "ease"];

export async function POST(req: Request) {
  const fd = await req.formData();
  if (field(fd, "website")) return back(req, "/thanks?k=alert");
  const email = field(fd, "email", 200);
  if (!EMAIL_RE.test(email)) return back(req, "/thanks?k=error&m=email");
  const params: Record<string, string> = {};
  for (const k of KEYS) { const v = field(fd, k, 120); if (v) params[k] = v; }
  const db = getReadClient();
  const r1 = db ? await db.rpc("save_search", { p_email: email, p_params: params, p_label: field(fd, "label", 160) || null }) : { error: { message: "no db" } };
  if (!r1.error && fd.get("newsletter") && db) await db.rpc("subscribe", { p_email: email, p_source: "alert" });
  return back(req, r1.error ? "/thanks?k=error" : "/thanks?k=alert");
}
