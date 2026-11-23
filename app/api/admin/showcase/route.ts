import { getAdminClient } from "@/lib/admin";
import { back, field } from "@/lib/forms";

export const maxDuration = 60;

// Adds, hides or deletes a sale on /our-sales. Middleware already checked the admin password.
export async function POST(req: Request) {
  const db = getAdminClient();
  if (!db) return back(req, "/admin?err=key#showcase");
  const fd = await req.formData();
  const action = field(fd, "action", 20) || "add";
  const id = field(fd, "id", 60);
  if (action === "hide" || action === "show") {
    await db.from("showcase").update({ published: action === "show" }).eq("id", id);
    return back(req, "/admin#showcase");
  }
  if (action === "delete") {
    await db.from("showcase").delete().eq("id", id);
    return back(req, "/admin#showcase");
  }
  const title = field(fd, "title", 160);
  if (!title) return back(req, "/admin?err=title#showcase");
  const photos: string[] = [];
  const files = fd.getAll("photos").filter((f): f is File => typeof f === "object" && "arrayBuffer" in f && f.size > 0).slice(0, 12);
  for (const [i, f] of files.entries()) {
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${i}.${ext}`;
    const { error } = await db.storage.from("showcase").upload(path, Buffer.from(await f.arrayBuffer()), { contentType: f.type || "image/jpeg", upsert: false });
    if (!error) photos.push(db.storage.from("showcase").getPublicUrl(path).data.publicUrl);
  }
  const num = (k: string) => { const n = Number(field(fd, k, 20).replace(/[$,\s]/g, "")); return Number.isFinite(n) && n > 0 ? n : null; };
  const rating = Number(field(fd, "rating", 2));
  const { error } = await db.from("showcase").insert({
    title, category: field(fd, "category", 30) || null, photos,
    bought_price: num("bought_price"), sold_price: num("sold_price"),
    bought_from: field(fd, "bought_from", 160) || null, sold_to: field(fd, "sold_to", 160) || null,
    sold_on: /^\d{4}-\d{2}-\d{2}$/.test(field(fd, "sold_on", 10)) ? field(fd, "sold_on", 10) : null,
    story: field(fd, "story", 2000) || null, customer_name: field(fd, "customer_name", 80) || null,
    review: field(fd, "review", 1500) || null, rating: rating >= 1 && rating <= 5 ? rating : null,
    kind: field(fd, "kind", 20) === "customer" ? "customer" : "flip",
  });
  return back(req, error ? `/admin?err=${encodeURIComponent(error.message.slice(0, 80))}#showcase` : "/admin?done=showcase#showcase");
}
