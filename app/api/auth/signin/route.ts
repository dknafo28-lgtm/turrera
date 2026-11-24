import { getUserClient, safeNext } from "@/lib/auth";
import { EMAIL_RE, back, field, originOf } from "@/lib/forms";

export async function POST(req: Request) {
  const fd = await req.formData();
  const signup = field(fd, "mode") === "signup";
  const next = safeNext(field(fd, "next", 300));
  const email = field(fd, "email", 200).toLowerCase();
  const password = typeof fd.get("password") === "string" ? String(fd.get("password")) : "";
  const retry = (e: string) => back(req, `/signin?${new URLSearchParams({ ...(signup ? { mode: "signup" } : {}), next, e })}`);
  if (!EMAIL_RE.test(email) || !password) return retry("missing");
  const db = await getUserClient();
  if (!db) return retry("failed");

  if (signup) {
    if (password.length < 8) return retry("short");
    const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: `${originOf(req)}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (error) return retry(/registered|exists/i.test(error.message) ? "exists" : "failed");
    // Supabase hides existing accounts on sign-up by returning a user with no identities.
    if (data.user && !data.user.identities?.length) return retry("exists");
    if (fd.get("weekly") === "yes") await db.rpc("subscribe", { p_email: email, p_source: "signup" }).then(() => {}, () => {});
    return data.session ? back(req, next) : back(req, `/signin?check=1&next=${encodeURIComponent(next)}`);
  }

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return retry(/confirm/i.test(error.message) ? "confirm" : "wrong");
  return back(req, next);
}
