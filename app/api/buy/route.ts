import { NextResponse } from "next/server";
import { getReadClient } from "@/lib/supabase";
import { EMAIL_RE, back, field, originOf } from "@/lib/forms";
import { depositFor } from "@/lib/deposit";
import { createDepositCheckout, stripeEnabled } from "@/lib/stripe";

export async function POST(req: Request) {
  const fd = await req.formData();
  if (field(fd, "website")) return back(req, "/thanks?k=buy");
  const lotId = field(fd, "lot_id", 200);
  const email = field(fd, "email", 200);
  const name = field(fd, "name", 120);
  const maxBid = Number(field(fd, "max_bid", 20).replace(/[$,\s]/g, ""));
  const agreed = fd.get("terms") === "yes";
  if (!lotId || !name || !EMAIL_RE.test(email) || !Number.isFinite(maxBid) || maxBid <= 0 || !agreed) {
    return back(req, `/lot/${encodeURIComponent(lotId)}?buy=missing#buy-for-me`);
  }
  const deposit = depositFor(maxBid);
  const db = getReadClient();
  if (!db) return back(req, "/thanks?k=error");
  const { data: id, error } = await db.rpc("request_buy", {
    p_lot_id: lotId, p_name: name, p_email: email, p_phone: field(fd, "phone", 40) || null, p_max_bid: maxBid,
    p_destination: field(fd, "destination", 160) || null, p_notes: field(fd, "notes", 2000) || null, p_deposit: deposit,
  });
  if (error || !id) return back(req, "/thanks?k=error");
  if (fd.get("newsletter")) await db.rpc("subscribe", { p_email: email, p_name: name, p_source: "buy-request" });

  if (stripeEnabled()) {
    try {
      const url = await createDepositCheckout({ amount: deposit, email, requestId: String(id), origin: originOf(req), description: `Deposit to bid up to $${maxBid.toLocaleString()} on lot ${lotId}` });
      return NextResponse.redirect(url, 303);
    } catch { /* fall through: David invoices the deposit by hand */ }
  }
  return back(req, `/thanks?k=buy&r=${id}&unpaid=1`);
}
