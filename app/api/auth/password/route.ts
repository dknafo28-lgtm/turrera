import { getUser } from "@/lib/auth";
import { back } from "@/lib/forms";

export async function POST(req: Request) {
  const fd = await req.formData();
  const password = typeof fd.get("password") === "string" ? String(fd.get("password")) : "";
  const me = await getUser();
  if (!me) return back(req, "/signin?next=/account/password");
  if (password.length < 8) return back(req, "/account/password?e=short");
  const { error } = await me.db.auth.updateUser({ password });
  return back(req, error ? "/account/password?e=failed" : "/account?saved=password");
}
