import type { Sale } from "@/lib/showcase";
import { money } from "@/lib/format";

export default function ShowcaseCard({ sale, compact = false }: { sale: Sale; compact?: boolean }) {
  const date = sale.sold_on ? new Date(`${sale.sold_on}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;
  return (
    <article className={compact ? "sale-card sale-card-compact" : "sale-card"}>
      {sale.photos[0] ? (
        <div className="sale-photos">
          <img src={sale.photos[0]} alt={sale.title} loading="lazy" decoding="async" />
          {sale.photos.length > 1 ? <span className="sale-photo-count">{sale.photos.length} photos</span> : null}
        </div>
      ) : null}
      <div className="sale-body">
        <p className="sale-kind">{sale.kind === "customer" ? "Bought for a customer" : "Bought and resold by us"}{date ? `, ${date}` : ""}</p>
        <h3>{sale.title}</h3>
        <dl className="sale-prices">
          {sale.bought_price != null ? <div><dt>Won at auction</dt><dd>{money(sale.bought_price)}</dd></div> : null}
          {sale.sold_price != null ? <div><dt>{sale.kind === "customer" ? "Market value" : "Sold for"}</dt><dd className="sale-sold">{money(sale.sold_price)}</dd></div> : null}
        </dl>
        {sale.bought_from || sale.sold_to ? (
          <p className="sale-route">{sale.bought_from ? <>From {sale.bought_from}</> : null}{sale.bought_from && sale.sold_to ? <> to </> : null}{sale.sold_to ? (sale.bought_from ? sale.sold_to : <>Shipped to {sale.sold_to}</>) : null}</p>
        ) : null}
        {!compact && sale.story ? <p className="sale-story">{sale.story}</p> : null}
        {sale.review ? (
          <blockquote className="sale-review">
            {sale.rating ? <span className="stars" aria-label={`${sale.rating} out of 5 stars`}>{"★".repeat(sale.rating)}{"☆".repeat(5 - sale.rating)}</span> : null}
            <p>{sale.review}</p>
            {sale.customer_name ? <footer>{sale.customer_name}</footer> : null}
          </blockquote>
        ) : null}
        {!compact && sale.photos.length > 1 ? (
          <div className="sale-thumbs">{sale.photos.slice(1, 7).map((src) => <img key={src} src={src} alt="" loading="lazy" decoding="async" />)}</div>
        ) : null}
      </div>
    </article>
  );
}
