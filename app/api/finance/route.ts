import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/auth";
import { EMAIL_RE, back, field } from "@/lib/forms";

export async function POST(req: Request) {
  const fd = await req.formData();
  if (field(fd, "website")) return back(req, "/thanks?k=finance");
  const email = field(fd, "email", 200);
  const name = field(fd, "name", 120);
  const lotId = field(fd, "lot_id", 200);
  if (!EMAIL_RE.test(email) || !name) return back(req, `/financing?missing=1${lotId ? `&lot=${encodeURIComponent(lotId)}` : ""}#apply`);
  const amount = Number(field(fd, "amount", 20).replace(/[$,\s]/g, ""));
  const db = await getUserClient(); // signed in: the request is linked to their account
  const { error } = db ? await db.rpc("request_financing", {
    p_lot_id: lotId || null, p_buyer_type: field(fd, "buyer_type", 20) || "business", p_name: name,
    p_company: field(fd, "company", 160) || null, p_email: email, p_phone: field(fd, "phone", 40) || null,
    p_state: field(fd, "state", 40) || null, p_amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    p_credit: field(fd, "credit", 40) || null, p_years: field(fd, "years", 40) || null,
    p_what: [field(fd, "via", 20) ? `Asked for: ${field(fd, "via", 20)}` : "", field(fd, "what", 2000)].filter(Boolean).join(". ") || null, p_consent: fd.get("consent") === "yes",
  }) : { error: { message: "no db" } };
  if (error) return back(req, "/thanks?k=error");
  // When a lending partner is signed up, send people straight to their application too.
  const partner = process.env.FINANCE_PARTNER_URL;
  if (partner && /^https:\/\//.test(partner)) return NextResponse.redirect(partner, 303);
  return back(req, "/thanks?k=finance");
}
