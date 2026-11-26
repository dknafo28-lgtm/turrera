import { getAdminClient } from "@/lib/admin";
import { back, field } from "@/lib/forms";

const BUY = ["new", "deposit_paid", "bidding", "won", "lost", "paid", "shipped", "done", "cancelled"];
const FIN = ["new", "sent_to_lender", "approved", "declined", "funded", "closed"];
const SELL = ["new", "contacted", "booked", "listed", "sold", "lost"];
const INSP = ["new", "paid", "scheduled", "done", "cancelled", "refunded"];

// Admin actions. Middleware already checked the admin password.
export async function POST(req: Request) {
  const db = getAdminClient();
  if (!db) return back(req, "/admin?err=key");
  const fd = await req.formData();
  const action = field(fd, "action", 40);
  const id = field(fd, "id", 60);
  const now = new Date().toISOString();
  if (action === "buy_status" && BUY.includes(field(fd, "status", 20))) {
    await db.from("buy_requests").update({ status: field(fd, "status", 20), updated_at: now }).eq("id", id);
  } else if (action === "sell_status" && SELL.includes(field(fd, "status", 20))) {
    await db.from("sell_leads").update({ status: field(fd, "status", 20) }).eq("id", id);
  } else if (action === "fin_status" && FIN.includes(field(fd, "status", 20))) {
    await db.from("finance_requests").update({ status: field(fd, "status", 20) }).eq("id", id);
  } else if (action === "insp_status" && INSP.includes(field(fd, "status", 20))) {
    await db.from("inspection_requests").update({ status: field(fd, "status", 20), updated_at: now }).eq("id", id);
  } else if (action === "review_status" && ["pending", "approved", "rejected"].includes(field(fd, "status", 20))) {
    const status = field(fd, "status", 20);
    await db.from("reviews").update({ status, approved_at: status === "approved" ? now : null }).eq("id", id);
  } else if (action === "approve") {
    await db.from("newsletters").update({ status: "approved", approved_at: now }).eq("id", id).eq("status", "draft");
  } else if (action === "discard") {
    await db.from("newsletters").update({ status: "discarded" }).eq("id", id).eq("status", "draft");
  }
  return back(req, `/admin?done=${encodeURIComponent(action)}#${field(fd, "anchor", 20) || "top"}`);
}
