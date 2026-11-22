import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReadClient, type Lot } from "@/lib/supabase";
import { CATEGORIES, SOURCE_SHORT, similarLots } from "@/lib/lots";
import { closesAt, money, titleCase } from "@/lib/format";
import SiteHeader from "@/components/SiteHeader";
import LotCard from "@/components/LotCard";
import Countdown from "@/components/Countdown";
import WatchButton from "@/components/WatchButton";

export const dynamic = "force-dynamic";

type FullLot = Lot & { photos: string[] | null; zip: string | null };

const BASE = "id,source,title,description,category,current_bid,start_time,end_time,status,city,state,zip,agency,photo_url,lot_url,first_seen,year,make,model,est_value,est_low,est_high,comps_count,spread,condition,sell_ease,sell_note,value_source";
const EASE_LABEL: Record<string, string> = { easy: "Easy to resell", moderate: "Moderate to resell", hard: "Hard to resell" };

async function getLot(rawId: string): Promise<FullLot | null> {
  const supabase = getReadClient();
  if (!supabase) return null;
  let id = rawId;
  try { id = decodeURIComponent(rawId); } catch { /* keep as is */ }
  for (const columns of [`${BASE},photos`, BASE, BASE.replace(",year,make,model", "")]) {
    const { data, error } = await supabase.from("lots").select(columns).eq("id", id).maybeSingle();
    if (!error) return (data as unknown as FullLot) ?? null;
    if (!/does not exist/i.test(error.message)) return null;
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const lot = await getLot((await params).id);
  return { title: lot ? `${titleCase(lot.title)} | Turrera` : "Lot not found | Turrera" };
}

function fmtDate(s: string | null | undefined) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const lot = await getLot((await params).id);
  if (!lot) notFound();
  const similar = await similarLots(lot);

  const photos = [...new Set((Array.isArray(lot.photos) && lot.photos.length ? lot.photos : [lot.photo_url]).filter(Boolean) as string[])];
  const dateOnly = lot.source === "jjkane";
  const site = SOURCE_SHORT[lot.source] ?? lot.source;
  const title = titleCase(lot.title) || "Untitled lot";
  const cat = CATEGORIES.find((c) => c.key === lot.category);
  const hasValue = lot.est_value !== null && lot.est_value !== undefined;
  const place = [lot.city ? titleCase(lot.city) : null, lot.state, lot.zip].filter(Boolean).join(", ");
  const closes = closesAt(lot.end_time, dateOnly);
  const bid = money(lot.current_bid) ?? (dateOnly ? "Shown on JJ Kane" : "No bids yet");
  const deal = hasValue && lot.spread !== null && lot.spread !== undefined ? lot.spread : null;
  const l = lot as FullLot & { year?: number | null; make?: string | null; model?: string | null };
  const vehicle = [l.year, l.make ? titleCase(l.make) : null, l.model ? titleCase(l.model) : null].filter(Boolean).join(" ");

  const facts: [string, string][] = [
    ["Location", place || "Not listed"],
    ["Seller", lot.agency ? titleCase(lot.agency) : "Not listed"],
    ["Auction site", site],
    ["Category", cat?.label ?? "Not listed"],
  ];
  if (vehicle) facts.splice(2, 0, ["Year, make, model", vehicle]);
  const listed = fmtDate(lot.start_time) ?? fmtDate(lot.first_seen);
  if (listed) facts.push([lot.start_time ? "Auction opened" : "First seen", listed]);
  facts.push(["Lot ID", lot.id.replace(/^[a-z]+[-:]/, "")]);

  const bidLink = lot.lot_url ?? undefined;

  return (
    <>
      <SiteHeader category={lot.category ?? ""} />
      <main className="lot">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a><span aria-hidden="true">/</span>
          {cat ? <><a href={`/search?category=${encodeURIComponent(cat.key)}`}>{cat.label}</a><span aria-hidden="true">/</span></> : null}
          <span className="crumbs-current">{title}</span>
        </nav>

        <div className="lot-layout">
          <div className="lot-main">
            <h1 className="lot-title">{title}</h1>
            <p className="lot-sub">{place || "Location not listed"}{lot.agency ? <>, sold by {titleCase(lot.agency)}</> : null}</p>

            <section className="gallery" aria-label="Photos">
              {photos.length ? (
                <>
                  <div className="gallery-strip">
                    {photos.map((src, i) => (
                      <figure key={src} id={`photo-${i + 1}`} className="gallery-item">
                        <img src={src} alt={`${title}, photo ${i + 1} of ${photos.length}`} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
                      </figure>
                    ))}
                  </div>
                  {photos.length > 1 ? (
                    <>
                      <p className="gallery-count">{photos.length} photos<span className="gallery-swipe">, swipe to see more</span></p>
                      <nav className="gallery-thumbs" aria-label="Choose a photo">
                        {photos.map((src, i) => (
                          <a key={src} href={`#photo-${i + 1}`} aria-label={`Photo ${i + 1}`} className="gallery-thumb">
                            <img src={src} alt="" loading="lazy" decoding="async" />
                          </a>
                        ))}
                      </nav>
                    </>
                  ) : null}
                </>
              ) : (
                <div className="gallery-empty">No photos were included in the feed. The listing on {site} may have more.</div>
              )}
            </section>

            {lot.condition ? (
              <section className="lot-section">
                <h2>Condition summary</h2>
                <p>{lot.condition}</p>
                <p className="fine">Written from the seller&apos;s description and photos. Inspect or ask the seller before you bid.</p>
              </section>
            ) : null}

            <section className="lot-section">
              <h2>Lot details</h2>
              <dl className="facts">
                {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            </section>

            {lot.description ? (
              <section className="lot-section">
                <h2>Seller&apos;s description</h2>
                <div className="lot-description">{lot.description}</div>
              </section>
            ) : null}
          </div>

          <aside className="bidbox" aria-label="Bidding">
            <div className="bidbox-time">
              <Countdown end={lot.end_time} dateOnly={dateOnly} className="countdown-lg" />
              {closes ? <p>Closes {closes}{dateOnly ? ". Check JJ Kane for the exact time." : ""}</p> : null}
            </div>
            <dl className="bidbox-money">
              <div><dt>Current bid</dt><dd className="bidbox-bid">{bid}</dd></div>
              {hasValue ? <div><dt>Estimated value</dt><dd>{money(lot.est_low)} to {money(lot.est_high)}</dd></div> : null}
            </dl>
            {deal !== null ? (
              <p className={deal > 0 ? "bidbox-deal bidbox-deal-up" : "bidbox-deal bidbox-deal-down"}>
                {deal > 0 ? `${money(deal)} under estimated value at the current bid` : `${money(-deal)} over estimated value at the current bid`}
              </p>
            ) : null}
            {lot.sell_ease ? (
              <div className="bidbox-ease">
                <span className={`tag tag-ease-${lot.sell_ease}`}>{EASE_LABEL[lot.sell_ease] ?? lot.sell_ease}</span>
                {lot.sell_note ? <p>{lot.sell_note}</p> : null}
              </div>
            ) : null}
            <div className="bidbox-actions">
              <a className="btn btn-primary btn-block" href={bidLink} target="_blank" rel="noopener noreferrer">View and bid on {site}</a>
              <WatchButton id={lot.id} />
            </div>
            <p className="fine">
              Bidding happens on {site}. A buyer&apos;s premium, taxes and pickup rules may apply.
              {hasValue ? (lot.value_source === "ebay" ? ` Value from ${lot.comps_count} similar eBay listings.` : " The value is an estimate from the listing, so check recent sales.") : ""}
            </p>
          </aside>
        </div>

        {similar.length ? (
          <section className="home-section lot-similar" aria-labelledby="similar-h">
            <div className="section-head">
              <h2 id="similar-h">Similar lots closing soon</h2>
              {cat ? <a href={`/search?category=${encodeURIComponent(cat.key)}`}>All {cat.label.toLowerCase()}</a> : null}
            </div>
            <div className="rail">{similar.map((s) => <LotCard key={s.id} lot={s} layout="rail" />)}</div>
          </section>
        ) : null}

        <div className="mobile-bidbar">
          <div><span>Current bid</span><strong>{bid}</strong></div>
          <a className="btn btn-primary" href={bidLink} target="_blank" rel="noopener noreferrer">Bid on {site}</a>
        </div>
      </main>
    </>
  );
}
