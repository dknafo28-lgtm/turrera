import { getReadClient } from "@/lib/supabase";
import { EMAIL_RE, back, field } from "@/lib/forms";

export async function POST(req: Request) {
  const fd = await req.formData();
  if (field(fd, "website")) return back(req, "/thanks?k=sub"); // honeypot
  const email = field(fd, "email", 200);
  if (!EMAIL_RE.test(email)) return back(req, "/thanks?k=error&m=email");
  const db = getReadClient();
  const { error } = db ? await db.rpc("subscribe", { p_email: email, p_name: field(fd, "name", 120) || null, p_source: field(fd, "source", 40) || null }) : { error: { message: "no db" } };
  return back(req, error ? "/thanks?k=error" : "/thanks?k=sub");
}
