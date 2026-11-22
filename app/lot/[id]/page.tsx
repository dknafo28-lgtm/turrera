import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReadClient, type Lot } from "@/lib/supabase";
import { SOURCES } from "@/lib/lots";

export const dynamic = "force-dynamic";

type FullLot = Lot & { photos: string[] | null; zip: string | null };

const BASE = "id,source,title,description,category,current_bid,start_time,end_time,status,city,state,zip,agency,photo_url,lot_url,first_seen,est_value,est_low,est_high,comps_count,spread,condition,sell_ease,sell_note,value_source";
const EASE_LABEL: Record<string, string> = { easy: "Easy to sell", moderate: "Moderate to sell", hard: "Hard to sell" };

async function getLot(rawId: string): Promise<FullLot | null> {
  const supabase = getReadClient();
  if (!supabase) return null;
  let id = rawId;
  try { id = decodeURIComponent(rawId); } catch { /* keep as is */ }
  for (const columns of [`${BASE},photos`, BASE]) {
    const { data, error } = await supabase.from("lots").select(columns).eq("id", id).maybeSingle();
    if (!error) return (data as unknown as FullLot) ?? null;
    if (!/does not exist/i.test(error.message)) return null;
  }
  return null;
}

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function endsText(end: string | null) {
  if (!end) return { left: "No end date listed", when: null as string | null, soon: false };
  const ms = new Date(end).getTime() - Date.now();
  const when = new Date(end).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short",
  });
  if (ms <= 0) return { left: "Ended", when, soon: false };
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const left = hours < 1 ? `${mins}m left` : hours < 24 ? `${hours}h ${mins % 60}m left` : `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  return { left, when, soon: hours < 24 };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const lot = await getLot((await params).id);
  return { title: lot ? `${lot.title} | Turrera` : "Lot not found | Turrera" };
}

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const lot = await getLot((await params).id);
  if (!lot) notFound();

  const photos = (Array.isArray(lot.photos) && lot.photos.length ? lot.photos : [lot.photo_url]).filter(Boolean) as string[];
  const ends = endsText(lot.end_time);
  const source = SOURCES[lot.source] ?? lot.source;
  const hasValue = lot.est_value !== null && lot.est_value !== undefined;
  const place = [lot.city, lot.state, lot.zip].filter(Boolean).join(", ");

  return (
    <main className="detail">
      <a href="/" className="back" data-back>Back to results</a>

      <div className="detail-grid">
        <section className="gallery" aria-label="Photos">
          {photos.length ? (
            <>
              <div className="gallery-strip">
                {photos.map((src, i) => (
                  <figure key={src} id={`photo-${i + 1}`} className="gallery-item">
                    <img src={src} alt={`${lot.title}, photo ${i + 1} of ${photos.length}`} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
                  </figure>
                ))}
              </div>
              {photos.length > 1 ? (
                <nav className="gallery-thumbs" aria-label="Choose a photo">
                  {photos.map((src, i) => (
                    <a key={src} href={`#photo-${i + 1}`} aria-label={`Photo ${i + 1}`}>
                      <img src={src} alt="" loading="lazy" decoding="async" />
                    </a>
                  ))}
                </nav>
              ) : null}
              <p className="gallery-count">{photos.length === 1 ? "1 photo" : `${photos.length} photos. Swipe or pick one below.`}</p>
            </>
          ) : (
            <div className="gallery-empty">No photos here. The auction listing may have more.</div>
          )}
        </section>

        <section className="facts">
          <h1>{lot.title}</h1>
          <p className={ends.soon ? "detail-ends detail-ends-soon" : "detail-ends"}>
            <strong>{ends.left}</strong>
            {ends.when ? <span>Closes {ends.when}</span> : null}
          </p>

          <div className="detail-numbers">
            <div>
              <span className="lot-label">Current bid</span>
              <span className="lot-figure">{money(lot.current_bid) ?? "No bids yet"}</span>
            </div>
            {hasValue ? (
              <div>
                <span className="lot-label">Estimated market value</span>
                <span className="lot-figure">{money(lot.est_low)}–{money(lot.est_high)}</span>
              </div>
            ) : null}
          </div>
          {hasValue && lot.spread !== null ? (
            <p className={lot.spread > 0 ? "lot-deal lot-deal-up" : "lot-deal lot-deal-down"}>
              {lot.spread > 0 ? `${money(lot.spread)} under market value at the current bid` : `${money(-lot.spread)} over market value at the current bid`}
            </p>
          ) : null}

          <a className="bid-button" href={lot.lot_url ?? "#"} target="_blank" rel="noopener noreferrer">
            View and bid on {source}
          </a>

          {lot.sell_ease || lot.sell_note ? (
            <div className="detail-block">
              <h2>Resale</h2>
              {lot.sell_ease ? <span className={`ease ease-${lot.sell_ease}`}>{EASE_LABEL[lot.sell_ease] ?? lot.sell_ease}</span> : null}
              {lot.sell_note ? <p>{lot.sell_note}</p> : null}
              {hasValue ? (
                <p className="muted small">
                  {lot.value_source === "ebay" ? `Value from ${lot.comps_count} similar eBay listings.` : "Value is an AI estimate based on the listing. Check real sales before you bid."}
                </p>
              ) : null}
            </div>
          ) : null}

          {lot.condition ? (
            <div className="detail-block">
              <h2>Condition</h2>
              <p>{lot.condition}</p>
            </div>
          ) : null}

          <dl className="detail-meta">
            <div><dt>Location</dt><dd>{place || "Not listed"}</dd></div>
            {lot.agency ? <div><dt>Seller</dt><dd>{lot.agency}</dd></div> : null}
            <div><dt>Auction site</dt><dd>{source}</dd></div>
            {lot.category ? <div><dt>Category</dt><dd>{lot.category[0].toUpperCase() + lot.category.slice(1)}</dd></div> : null}
          </dl>
        </section>
      </div>

      {lot.description ? (
        <section className="detail-description">
          <h2>Full listing</h2>
          <p>{lot.description}</p>
          <a className="bid-button bid-button-quiet" href={lot.lot_url ?? "#"} target="_blank" rel="noopener noreferrer">
            Open this lot on {source}
          </a>
        </section>
      ) : null}
    </main>
  );
}
