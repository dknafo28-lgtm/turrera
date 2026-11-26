import Stars from "@/components/Stars";
import type { Review } from "@/lib/reviews";

function day(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

export default function ReviewList({ reviews, showLot = false, cards = false }: { reviews: Review[]; showLot?: boolean; cards?: boolean }) {
  return (
    <ul className={`review-list${cards ? " review-cards" : ""}`}>
      {reviews.map((r) => (
        <li key={r.id}>
          <div className="review-head">
            <Stars rating={r.rating} />
            <strong>{r.name}</strong>
            {r.verified ? <span className="tag review-verified">Verified buyer</span> : null}
            <span className="fine">{day(r.created_at)}</span>
          </div>
          <p>{r.body}</p>
          {showLot && r.lot_id ? <p className="fine">About <a href={`/lot/${encodeURIComponent(r.lot_id)}`}>{r.lot_title ?? "a lot"}</a></p> : null}
        </li>
      ))}
    </ul>
  );
}
