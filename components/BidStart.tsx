import { money } from "@/lib/format";

// Step 1 on the lot page: one box for the most someone wants to pay. Submitting goes to /bid/<lot>,
// which signs them in if needed and then takes the deposit.
export default function BidStart({ lotId, currentBid }: { lotId: string; currentBid: number | null }) {
  const above = currentBid && currentBid > 0 ? currentBid : null;
  return (
    <form action={`/bid/${encodeURIComponent(lotId)}`} method="get" className="bid-start" id="bid">
      <label htmlFor="bid-max">Your max bid</label>
      <div className="money-input">
        <span aria-hidden="true">$</span>
        <input id="bid-max" name="max" inputMode="numeric" autoComplete="off" required placeholder={above ? `More than ${(money(above) ?? "").replace("$", "")}` : "e.g. 5,000"} />
      </div>
      <button type="submit" className="btn btn-primary btn-block">Place my bid</button>
      <p className="fine">We bid for you, up to your max. 10% deposit, fully refunded if we don&apos;t win. <a href="/buy-for-me">How it works</a></p>
    </form>
  );
}
