import { BROKER_FEE_TEXT } from "@/lib/deposit";

export default function BuyForm({ lotId, site, missing = false, suggested }: { lotId: string; site: string; missing?: boolean; suggested?: number | null }) {
  return (
    <section className="lot-section buy-form" id="buy-for-me" aria-labelledby="buy-h">
      <h2 id="buy-h">Have us buy it for you</h2>
      <p>Tell us your top price. We bid on {site} for you, pay the seller, and arrange pickup and shipping to you, including export to the Bahamas and the Caribbean. <a href="/buy-for-me">How it works</a></p>
      {missing ? <p className="form-error" role="alert">Please fill in your name, email, a top bid, and agree to the terms.</p> : null}
      <form action="/api/buy" method="post" className="form-grid">
        <input type="hidden" name="lot_id" value={lotId} />
        <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label>Your name<input name="name" required autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Phone<input name="phone" type="tel" autoComplete="tel" /></label>
        <label>Highest bid you&apos;ll pay (USD)<input name="max_bid" inputMode="numeric" required placeholder={suggested ? `e.g. ${Math.round(suggested).toLocaleString()}` : "e.g. 8,000"} /></label>
        <label className="span-2">Ship to<input name="destination" placeholder="Zip code, city, or port (e.g. Nassau, Bahamas)" /></label>
        <label className="span-2">Anything we should know<textarea name="notes" rows={3} /></label>
        <label className="check span-2"><input type="checkbox" name="terms" value="yes" required /> <span>I agree to the <a href="/buy-for-me#terms">terms</a>: the item is sold as is, the deposit is non-refundable if we win, and the fee is {BROKER_FEE_TEXT}.</span></label>
        <label className="check span-2"><input type="checkbox" name="newsletter" value="yes" /> <span>Email me the weekly list of deals</span></label>
        <div className="span-2 form-actions">
          <button type="submit" className="btn btn-primary">Request this lot</button>
          <span className="fine">Deposit is 10% of your top bid (min $250, max $2,500).</span>
        </div>
      </form>
    </section>
  );
}
