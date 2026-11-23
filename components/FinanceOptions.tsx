import { LENDERS, lenderHref, lendersFor } from "@/lib/lenders";
import { money } from "@/lib/format";

export default function FinanceOptions({ lotId, category, amount, compact = false }: { lotId?: string; category?: string | null; amount: number | null; compact?: boolean }) {
  const keys = lendersFor(category, amount);
  return (
    <section className={compact ? "lot-section finance-options" : "finance-options"} id="financing" aria-labelledby="fin-h">
      {compact ? <h2 id="fin-h">Finance this lot</h2> : <h2 id="fin-h" className="visually-hidden">Lenders</h2>}
      {compact ? (
        <p className="fine">Auctions want payment within about 2 days of closing, so get pre-approved before you bid{amount ? `. Estimated amount: ${money(amount)}` : ""}.</p>
      ) : null}
      <ul className="lender-list">
        {keys.map((k, i) => {
          const l = LENDERS[k];
          return (
            <li key={k} className={i === 0 ? "lender lender-top" : "lender"}>
              <div className="lender-head">
                <strong>{l.name}</strong>
                {i === 0 && compact ? <span className="tag tag-deal">Best fit for this lot</span> : null}
              </div>
              <dl className="lender-facts">
                <div><dt>For</dt><dd>{l.forWho}</dd></div>
                <div><dt>Amounts</dt><dd>{l.range}</dd></div>
                <div><dt>Speed</dt><dd>{l.speed}</dd></div>
              </dl>
              <p className="lender-note">{l.note}</p>
              <a className={i === 0 ? "btn btn-primary" : "btn btn-outline"} href={lenderHref(k, lotId, amount)} target={l.url() ? "_blank" : undefined} rel="noopener">
                {l.url() ? `Apply with ${l.name}` : `Request ${l.name} through us`}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="fine">
        Not sure which fits? <a href={`/financing${lotId ? `?lot=${encodeURIComponent(lotId)}` : ""}#apply`}>Send us your details</a> and we&apos;ll match you with a lender.
        Turrera isn&apos;t a lender and may be paid a referral fee by lenders. Rates and terms are set by the lender.
      </p>
    </section>
  );
}
