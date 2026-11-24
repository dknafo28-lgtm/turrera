import { getUserClient, safeNext } from "@/lib/auth";
import { back } from "@/lib/forms";

// Where Google sign-in, email confirmation and password-reset links land.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const db = await getUserClient();
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return back(req, next);
  }
  return back(req, `/signin?e=link&next=${encodeURIComponent(next)}`);
}
