import { NextResponse } from "next/server";
import { getReadClient } from "@/lib/supabase";
import { EMAIL_RE, back, field, originOf } from "@/lib/forms";
import { INSPECTION_FEE } from "@/lib/inspection";
import { createDepositCheckout, stripeEnabled } from "@/lib/stripe";

export async function POST(req: Request) {
  const fd = await req.formData();
  if (field(fd, "website")) return back(req, "/thanks?k=inspect");
  const lotId = field(fd, "lot_id", 200);
  const email = field(fd, "email", 200);
  const name = field(fd, "name", 120);
  if (!lotId || !name || !EMAIL_RE.test(email) || fd.get("terms") !== "yes") {
    return back(req, `/lot/${encodeURIComponent(lotId)}?inspect=missing#inspect`);
  }
  const db = getReadClient();
  if (!db) return back(req, "/thanks?k=error");
  const { data: id, error } = await db.rpc("request_inspection", {
    p_lot_id: lotId, p_name: name, p_email: email, p_phone: field(fd, "phone", 40) || null,
    p_questions: field(fd, "questions", 2000) || null, p_fee: INSPECTION_FEE,
  });
  if (error || !id) return back(req, "/thanks?k=error");
  if (stripeEnabled()) {
    try {
      const url = await createDepositCheckout({
        amount: INSPECTION_FEE, email, requestId: String(id), origin: originOf(req), kind: "inspect",
        product: "Local inspection", description: `In-person inspection of lot ${lotId} before the auction closes`,
      });
      return NextResponse.redirect(url, 303);
    } catch { /* fall through: David invoices by hand */ }
  }
  return back(req, `/thanks?k=inspect&r=${id}&unpaid=1`);
}
