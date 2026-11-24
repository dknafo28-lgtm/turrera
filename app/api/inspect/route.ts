import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/auth";
import { EMAIL_RE, back, field, originOf } from "@/lib/forms";
import { canInspect, inspectionFee } from "@/lib/inspection";
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
  const db = await getUserClient(); // signed in: the request is linked to their account
  if (!db) return back(req, "/thanks?k=error");
  const { data: lot } = await db.from("lots").select("category,end_time").eq("id", lotId).maybeSingle();
  if (!lot || !canInspect(lot.end_time)) return back(req, `/lot/${encodeURIComponent(lotId)}`);
  const fee = inspectionFee(lot.category);
  const { data: id, error } = await db.rpc("request_inspection", {
    p_lot_id: lotId, p_name: name, p_email: email, p_phone: field(fd, "phone", 40) || null,
    p_questions: field(fd, "questions", 2000) || null, p_fee: fee,
  });
  if (error || !id) return back(req, "/thanks?k=error");
  if (stripeEnabled()) {
    try {
      const url = await createDepositCheckout({
        amount: fee, email, requestId: String(id), origin: originOf(req), kind: "inspect",
        product: "Local inspection", description: `In-person inspection of lot ${lotId} before the auction closes`,
      });
      return NextResponse.redirect(url, 303);
    } catch { /* fall through: David invoices by hand */ }
  }
  return back(req, `/thanks?k=inspect&r=${id}&unpaid=1`);
}
