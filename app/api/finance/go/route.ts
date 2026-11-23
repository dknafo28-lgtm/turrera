import { NextResponse } from "next/server";
import { getReadClient } from "@/lib/supabase";
import { LENDERS, type LenderKey } from "@/lib/lenders";

// Logs the click, then sends the buyer to the lender (or to our form if there's no partner link yet).
export async function GET(req: Request) {
  const u = new URL(req.url);
  const key = u.searchParams.get("l") as LenderKey;
  const lender = LENDERS[key];
  const lot = u.searchParams.get("lot")?.slice(0, 200) ?? null;
  const amt = Number(u.searchParams.get("amt"));
  if (!lender) return NextResponse.redirect(new URL("/financing", req.url), 303);
  try {
    await getReadClient()?.rpc("log_finance_click", { p_lender: key, p_lot_id: lot, p_amount: Number.isFinite(amt) && amt > 0 ? amt : null });
  } catch { /* never block the buyer on logging */ }
  const target = lender.url();
  if (target) return NextResponse.redirect(target, 303);
  return NextResponse.redirect(new URL(`/financing?via=${key}${lot ? `&lot=${encodeURIComponent(lot)}` : ""}#apply`, req.url), 303);
}
