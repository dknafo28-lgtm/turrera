import { getUserClient } from "@/lib/auth";
import { EMAIL_RE, back, field, originOf } from "@/lib/forms";

export async function POST(req: Request) {
  const fd = await req.formData();
  const email = field(fd, "email", 200).toLowerCase();
  const db = await getUserClient();
  if (db && EMAIL_RE.test(email)) {
    await db.auth.resetPasswordForEmail(email, { redirectTo: `${originOf(req)}/auth/callback?next=/account/password` });
  }
  return back(req, "/signin?reset=1");
}
