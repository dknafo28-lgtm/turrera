import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { getUser } from "@/lib/auth";
import { BROKER_FEE_TEXT, depositFor } from "@/lib/deposit";
import { closesAt, money, titleCase, isDateOnly } from "@/lib/format";
import { stripeEnabled } from "@/lib/stripe";
import { getReadClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Place your bid | Turrera", robots: { index: false } };
export const dynamic = "force-dynamic";

type Q = { max?: string; e?: string };
type BidLot = { id: string; title: string | null; photo_url: string | null; city: string | null; state: string | null; current_bid: number | null; end_time: string | null; source: string };

function parseMax(raw?: string) {
  const n = Number(String(raw ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const ERRORS: Record<string, string> = {
  missing: "Please add your name and agree to the terms.",
  low: "Your max bid needs to be more than the current bid.",
  failed: "Something went wrong saving your bid. Please try again.",
};

function Steps({ at }: { at: 1 | 2 | 3 }) {
  const steps = ["Your bid", "Your account", "Deposit"];
  return (
    <ol className="bid-steps" aria-label="Steps">
      {steps.map((s, i) => (
        <li key={s} className={i + 1 < at ? "done" : i + 1 === at ? "current" : ""} aria-current={i + 1 === at ? "step" : undefined}>
          <span className="bid-step-num">{i + 1 < at ? "✓" : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  );
}

export default async function Bid({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  const id = decodeURIComponent((await params).id);
  const q = await searchParams;
  const max = parseMax(q.max);
  const here = `/bid/${encodeURIComponent(id)}${max ? `?max=${max}` : ""}`;

  const read = getReadClient();
  const { data } = read ? await read.from("lots").select("id,title,photo_url,city,state,current_bid,end_time,source").eq("id", id).maybeSingle() : { data: null };
  const lot = data as BidLot | null;
  if (!lot) redirect("/search");
  const open = !lot.end_time || new Date(lot.end_time).getTime() > Date.now();
  if (!open) redirect(`/lot/${encodeURIComponent(id)}`);

  const me = await getUser();
  if (!me) redirect(`/signin?mode=signup&next=${encodeURIComponent(here)}`);

  const title = titleCase(lot.title) || "This lot";
  const place = [lot.city ? titleCase(lot.city) : null, lot.state].filter(Boolean).join(", ");
  const current = lot.current_bid && lot.current_bid > 0 ? lot.current_bid : null;
  const low = max !== null && current !== null && max <= current;
  const deposit = max ? depositFor(max) : null;
  const name = (me.user.user_metadata?.full_name as string | undefined) ?? (me.user.user_metadata?.name as string | undefined) ?? "";
  const err = low ? "low" : q.e;

  return (
    <>
      <SiteHeader />
      <main className="page bid-page">
        <Steps at={3} />
        <h1>Confirm your bid</h1>

        <a className="bid-lot" href={`/lot/${encodeURIComponent(id)}`}>
          {lot.photo_url ? <img src={lot.photo_url} alt="" /> : null}
          <div>
            <strong>{title}</strong>
            <span>{[place, lot.end_time ? `closes ${closesAt(lot.end_time, isDateOnly(lot.source))}` : null].filter(Boolean).join(", ")}</span>
            <span>{current ? `Current bid ${money(current)}` : "No bids yet"}</span>
          </div>
        </a>

        {err && ERRORS[err] ? <p className="form-error" role="alert">{ERRORS[err]}{err === "low" && current ? ` It's ${money(current)} right now.` : ""}</p> : null}

        <form action="/api/buy" method="post" className="page-section form-grid bid-form">
          <input type="hidden" name="lot_id" value={lot.id} />
          <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <label className="span-2">Your max bid (USD)
            <span className="money-input"><span aria-hidden="true">$</span><input name="max_bid" inputMode="numeric" required defaultValue={max ? max.toLocaleString() : ""} data-deposit-input /></span>
          </label>
          <p className="span-2 bid-deposit">
            Deposit today: <strong data-deposit-out>{deposit ? money(deposit) : "10% of your max bid"}</strong>
            <span className="fine">10% of your max bid (min $250, max $2,500). Fully refunded within 5 business days if we don&apos;t win. If we win, it goes toward the price.</span>
          </p>
          <label>Your name<input name="name" required autoComplete="name" defaultValue={name} /></label>
          <label>Phone<input name="phone" type="tel" autoComplete="tel" /></label>
          <label className="span-2">Ship to (optional)<input name="destination" placeholder="Zip code, city and country, or port" /></label>
          <label className="span-2">Anything we should know (optional)<textarea name="notes" rows={2} /></label>
          <label className="check span-2"><input type="checkbox" name="terms" value="yes" required /> <span>I agree to the <a href="/buy-for-me#terms">terms</a>: we bid up to my max and never more; the item is sold as is; the deposit is non-refundable if we win and I don&apos;t complete the purchase; our fee is {BROKER_FEE_TEXT}, charged only if we win.</span></label>
          <div className="span-2 form-actions">
            <button type="submit" className="btn btn-primary">{stripeEnabled() ? "Continue to deposit" : "Confirm my bid"}</button>
            <span className="fine">{stripeEnabled() ? "Secure card payment on the next page." : "We'll email you a secure link to pay the deposit."} Signed in as {me.user.email}.</span>
          </div>
        </form>
      </main>
    </>
  );
}
