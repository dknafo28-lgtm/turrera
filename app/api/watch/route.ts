import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
const ID_RE = /^[\w:.\-]{1,200}$/;

// GET: who is signed in and their saved watchlist. POST: add/remove one lot, or merge a device's list in.
export async function GET() {
  const me = await getUser();
  if (!me) return NextResponse.json({ signedIn: false });
  const { data } = await me.db.from("watchlist_items").select("lot_id").order("created_at", { ascending: false }).limit(500);
  return NextResponse.json({ signedIn: true, userId: me.user.id, email: me.user.email, ids: (data ?? []).map((r) => r.lot_id) });
}

export async function POST(req: Request) {
  const me = await getUser();
  if (!me) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const uid = me.user.id;
  if (Array.isArray(body.merge)) {
    const ids = (body.merge as unknown[]).filter((x): x is string => typeof x === "string" && ID_RE.test(x)).slice(0, 300);
    if (ids.length) await me.db.from("watchlist_items").upsert(ids.map((lot_id) => ({ user_id: uid, lot_id })), { onConflict: "user_id,lot_id", ignoreDuplicates: true });
    return NextResponse.json({ ok: true });
  }
  const id = typeof body.id === "string" && ID_RE.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const { error } = body.on
    ? await me.db.from("watchlist_items").upsert({ user_id: uid, lot_id: id }, { onConflict: "user_id,lot_id", ignoreDuplicates: true })
    : await me.db.from("watchlist_items").delete().eq("user_id", uid).eq("lot_id", id);
  return NextResponse.json({ ok: !error });
}
