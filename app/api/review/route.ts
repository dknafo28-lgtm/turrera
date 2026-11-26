import { getUser, getUserClient } from "@/lib/auth";
import { back, field } from "@/lib/forms";

export async function POST(req: Request) {
  const fd = await req.formData();
  const lotId = field(fd, "lot_id", 200) || null;
  const where = lotId ? `/lot/${encodeURIComponent(lotId)}` : "/reviews";
  const done = (s: string) => back(req, `${where}?review=${s}#write-review`);
  if (field(fd, "website")) return done("thanks");
  const rating = Number(field(fd, "rating", 2));
  const body = field(fd, "body", 2000);
  const name = field(fd, "name", 60);
  const me = await getUser();
  const email = me?.user.email ?? field(fd, "email", 200);
  if (!(rating >= 1 && rating <= 5) || body.length < 10 || name.length < 2 || !email) return done("missing");
  const db = await getUserClient(); // signed in: the review is tied to the account
  if (!db) return done("failed");
  const { error } = await db.rpc("submit_review", { p_name: name, p_email: email, p_rating: rating, p_body: body, p_lot_id: lotId });
  if (error) return done(/already/.test(error.message) ? "again" : /short|rating|name|email/.test(error.message) ? "missing" : "failed");
  return done("thanks");
}
