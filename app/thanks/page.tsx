import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { getAdminClient } from "@/lib/admin";
import { checkoutPaid, stripeEnabled } from "@/lib/stripe";

export const metadata: Metadata = { title: "Thanks | Turrera" };
export const dynamic = "force-dynamic";

type Q = { k?: string; r?: string; s?: string; unpaid?: string; m?: string };

export default async function Thanks({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  let paid = false;
  if (q.k === "buy" && q.s && stripeEnabled()) {
    try {
      const result = await checkoutPaid(q.s);
      if (result && result.requestId === q.r) {
        paid = true;
        await getAdminClient()?.from("buy_requests").update({ status: "deposit_paid", stripe_session: q.s, updated_at: new Date().toISOString() }).eq("id", q.r).eq("status", "new");
      }
    } catch { /* show the unpaid message */ }
  }
  const msg: Record<string, { h: string; p: string }> = {
    sub: { h: "You're on the list", p: "Every Monday you'll get the standout government auctions closing that week, day by day. Every email has a one-click unsubscribe link." },
    alert: { h: "Alert created", p: "We check for new matching lots every 4 hours and email you when there are new ones." },
    sell: { h: "Thanks, we'll be in touch", p: "David will look over what you sent and get back to you within one business day with next steps." },
    buy: paid
      ? { h: "Deposit received", p: "We have your request and your deposit. We'll confirm by email before the auction closes, and tell you right away whether we won." }
      : { h: "Request received", p: "We have your request. David will email you within one business day to confirm the lot and collect the deposit before we bid." },
    finance: { h: "Pre-approval request received", p: "We'll pass your request to a lending partner, and they'll contact you, usually within one business day. Turrera isn't a lender; the lender sets rates and terms." },
    error: { h: "That didn't go through", p: q.m === "email" ? "Please check the email address and try again." : "Something went wrong saving your request. Please go back and try again." },
  };
  const m = msg[q.k ?? ""] ?? msg.sub;
  return (
    <>
      <SiteHeader />
      <main className="results">
        <div className="empty empty-page">
          <h1>{m.h}</h1>
          <p>{m.p}</p>
          <a className="btn btn-primary" href="/search">Keep browsing</a>
        </div>
      </main>
    </>
  );
}
