import { getUser } from "@/lib/auth";
import { back, field } from "@/lib/forms";

// Pause or resume one of the signed-in person's alerts (row rules limit this to their own).
export async function POST(req: Request) {
  const me = await getUser();
  if (!me) return back(req, "/signin?next=/account");
  const fd = await req.formData();
  const id = field(fd, "id", 60);
  if (/^[0-9a-f-]{36}$/.test(id)) await me.db.from("saved_searches").update({ active: field(fd, "active") === "1" }).eq("id", id);
  return back(req, "/account#alerts");
}
