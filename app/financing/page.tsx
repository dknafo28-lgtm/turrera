import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { STATES } from "@/lib/lots";
import { getReadClient } from "@/lib/supabase";
import { titleCase } from "@/lib/format";
import FinanceOptions from "@/components/FinanceOptions";
import { LENDERS, type LenderKey } from "@/lib/lenders";

export const metadata: Metadata = { title: "Financing | Turrera" };
export const dynamic = "force-dynamic";

export default async function Financing({ searchParams }: { searchParams: Promise<{ lot?: string; missing?: string; via?: string }> }) {
  const { lot, missing, via } = await searchParams;
  const viaLender = via && via in LENDERS ? LENDERS[via as LenderKey].name : null;
  let category: string | null = null;
  let lotTitle: string | null = null;
  let suggested: number | null = null;
  if (lot) {
    const { data } = (await getReadClient()?.from("lots").select("title,current_bid,category").eq("id", lot).maybeSingle()) ?? { data: null };
    if (data) { lotTitle = titleCase(data.title); suggested = data.current_bid > 0 ? data.current_bid : null; category = data.category ?? null; }
  }
  return (
    <>
      <SiteHeader />
      <main className="page">
        <nav className="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Financing</span></nav>
        <h1>Get pre-approved before you bid</h1>
        <p className="page-lead">Government auctions want payment within a few days of closing, so line up financing first. Tell us what you&apos;re buying and we&apos;ll connect you with a lender that finances used trucks, equipment and boats.</p>

        <section className="page-section">
          <h2>Choose a lender</h2>
          <FinanceOptions lotId={lot} category={category} amount={suggested} />
        </section>

        <div className="page-split">
          <section className="page-section">
            <h2>How it works</h2>
            <ol className="steps">
              <li><strong>Request a pre-approval.</strong> A few questions, no credit check on this form.</li>
              <li><strong>A lender contacts you.</strong> They review your credit and business details and give you an approval amount.</li>
              <li><strong>Bid up to your approval.</strong> Bid yourself, or have us bid and buy it for you.</li>
              <li><strong>The lender pays at closing.</strong> Funds go to the auction or to us, and you make payments to the lender.</li>
            </ol>
            <h2>Good to know</h2>
            <ul>
              <li>Turrera isn&apos;t a lender and doesn&apos;t make credit decisions. Rates and terms come from the lender and depend on your credit, the item and its age.</li>
              <li>Older vehicles, salvage titles and items needing major repair can be hard to finance. Ask before you bid.</li>
              <li>Approvals usually last 60–90 days, so you can use one for several auctions.</li>
            </ul>
          </section>

          <section className="page-section form-card" id="apply" aria-labelledby="apply-h">
            <h2 id="apply-h">{viaLender ? `Request ${viaLender} through us` : "Or let us match you"}</h2>
            {lotTitle ? <p className="fine">For: {lotTitle}</p> : null}
            {missing ? <p className="form-error" role="alert">Please add your name and a valid email.</p> : null}
            <form action="/api/finance" method="post" className="form-grid">
              <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {via ? <input type="hidden" name="via" value={via} /> : null}
              {lot ? <input type="hidden" name="lot_id" value={lot} /> : null}
              <label className="span-2">Buying as
                <select name="buyer_type" defaultValue="business">
                  <option value="business">A business</option>
                  <option value="personal">An individual</option>
                </select>
              </label>
              <label>Your name<input name="name" required autoComplete="name" /></label>
              <label>Business name<input name="company" autoComplete="organization" /></label>
              <label>Email<input name="email" type="email" required autoComplete="email" /></label>
              <label>Phone<input name="phone" type="tel" autoComplete="tel" /></label>
              <label>State
                <select name="state" defaultValue="FL">{STATES.map((s) => <option key={s}>{s}</option>)}<option value="Outside US">Outside the US</option></select>
              </label>
              <label>Amount to finance (USD)<input name="amount" inputMode="numeric" placeholder={suggested ? Math.round(suggested).toLocaleString() : "25,000"} /></label>
              <label>Credit score, roughly
                <select name="credit" defaultValue="">
                  <option value="">Choose</option><option>750+</option><option>700–749</option><option>650–699</option><option>600–649</option><option>Under 600</option><option>Not sure</option>
                </select>
              </label>
              <label>Time in business
                <select name="years" defaultValue="">
                  <option value="">Choose</option><option>Not a business</option><option>Under 2 years</option><option>2–5 years</option><option>5+ years</option>
                </select>
              </label>
              <label className="span-2">What are you looking to buy?<textarea name="what" rows={3} defaultValue={lotTitle ?? ""} placeholder="2018 F-550 bucket truck, or a 25–30 ft center console" /></label>
              <label className="check span-2"><input type="checkbox" name="consent" value="yes" required /> <span>I agree that Turrera can share these details with a lending partner, and that the lender can contact me by phone, text or email about financing.</span></label>
              <div className="span-2 form-actions"><button type="submit" className="btn btn-primary">Request pre-approval</button><span className="fine">Never enter your Social Security number here.</span></div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
