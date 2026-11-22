import type { Lot } from "@/lib/supabase";
import { SOURCE_SHORT } from "@/lib/lots";
import { money, shortMoney, titleCase } from "@/lib/format";
import Countdown from "./Countdown";
import WatchButton from "./WatchButton";

const EASE_LABEL: Record<string, string> = { easy: "Easy resale", moderate: "Moderate resale", hard: "Hard resale" };

export function lotHref(id: string) {
  return `/lot/${encodeURIComponent(id)}`;
}

export default function LotCard({ lot, layout = "grid" }: { lot: Lot; layout?: "grid" | "list" | "rail" }) {
  const href = lotHref(lot.id);
  const hasValue = lot.est_value !== null && lot.est_value !== undefined;
  const under = hasValue && (lot.current_bid ?? 0) > 0 && lot.spread !== null && lot.spread > 0 ? lot.spread : null;
  const place = [lot.city ? titleCase(lot.city) : null, lot.state].filter(Boolean).join(", ");
  const bid = money(lot.current_bid) ?? (lot.source === "jjkane" ? "See auction" : "No bids yet");
  return (
    <article className={`card card-${layout}`}>
      <a href={href} className="card-media" tabIndex={-1} aria-hidden="true">
        {lot.photo_url ? <img src={lot.photo_url} alt="" loading="lazy" decoding="async" /> : <span className="card-nophoto">No photo</span>}
      </a>
      <div className="card-body">
        <div className="card-top">
          <Countdown end={lot.end_time} dateOnly={lot.source === "jjkane"} />
          <WatchButton id={lot.id} compact />
        </div>
        <h3 className="card-title"><a href={href}>{titleCase(lot.title) || "Untitled lot"}</a></h3>
        <p className="card-place">{place || "Location not listed"}</p>
        <div className="card-money">
          <div>
            <span className="label">Current bid</span>
            <span className="figure">{bid}</span>
          </div>
          {hasValue ? (
            <div>
              <span className="label">Est. value</span>
              <span className="figure figure-muted">{shortMoney(lot.est_low)}–{shortMoney(lot.est_high)}</span>
            </div>
          ) : null}
        </div>
        {under !== null || lot.sell_ease ? (
          <div className="card-tags">
            {under !== null ? <span className="tag tag-deal">{shortMoney(under)} under value</span> : null}
            {lot.sell_ease ? <span className={`tag tag-ease-${lot.sell_ease}`}>{EASE_LABEL[lot.sell_ease] ?? lot.sell_ease}</span> : null}
          </div>
        ) : null}
        {layout === "list" && lot.condition ? <p className="card-condition">{lot.condition}</p> : null}
        <p className="card-source"><span>{SOURCE_SHORT[lot.source] ?? lot.source}</span>{lot.agency && layout !== "rail" ? <span className="card-agency">{titleCase(lot.agency)}</span> : null}</p>
      </div>
    </article>
  );
}
