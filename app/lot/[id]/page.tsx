import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReadClient, type Lot } from "@/lib/supabase";
import { CATEGORIES, SOURCE_SHORT, similarLots, soldComps, typeLabel } from "@/lib/lots";
import { closesAt, money, titleCase } from "@/lib/format";
import SiteHeader from "@/components/SiteHeader";
import LotCard from "@/components/LotCard";
import Countdown from "@/components/Countdown";
import WatchButton from "@/components/WatchButton";
import InspectForm from "@/components/InspectForm";
import BidStart from "@/components/BidStart";
import FinanceOptions from "@/components/FinanceOptions";
import { canInspect } from "@/lib/inspection";
import ShareButtons from "@/components/ShareButtons";
import { SITE_URL, WHATSAPP } from "@/lib/site";

export const dynamic = "force-dynamic";

type FullLot = Lot & { photos: string[] | null; zip: string | null };

const BASE = "id,source,title,description,category,subcategory,length_ft,final_price,bid_count,sold,current_bid,start_time,end_time,status,city,state,zip,agency,photo_url,lot_url,first_seen,year,make,model,condition,sell_ease,sell_note,value_source";
const EASE_LABEL: Record<string, string> = { easy: "Easy to resell", moderate: "Moderate to resell", hard: "Hard to resell" };

async function getLot(rawId: string): Promise<FullLot | null> {
  const supabase = getReadClient();
  if (!supabase) return null;
  let id = rawId;
  try { id = decodeURIComponent(rawId); } catch { /* keep as is */ }
  for (const columns of [`${BASE},photos`, BASE, BASE.replace("subcategory,length_ft,final_price,bid_count,sold,", ""), BASE.replace("subcategory,length_ft,final_price,bid_count,sold,", "").replace(",year,make,model", "")]) {
    const { data, error } = await supabase.from("lots").select(columns).eq("id", id).maybeSingle();
    if (!error) return (data as unknown as FullLot) ?? null;
    if (!/does not exist/i.test(error.message)) return null;
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const lot = await getLot((await params).id);
  if (!lot) return { title: "Lot not found | Turrera", robots: { index: false } };
  const title = titleCase(lot.title) || "Government surplus lot";
  const place = [lot.city ? titleCase(lot.city) : null, lot.state].filter(Boolean).join(", ");
  const sold = lot.sold && lot.final_price;
  const open = lot.end_time && new Date(lot.end_time).getTime() > Date.now();
  const status = sold ? `Sold for ${money(lot.final_price)}.` : open ? `${money(lot.current_bid) ? `Current bid ${money(lot.current_bid)}.` : "No bids yet."} Closes ${closesAt(lot.end_time, lot.source === "jjkane")}.` : "Auction closed.";
  const description = `${title}${place ? ` in ${place}` : ""}. ${status} Government surplus, direct from the agency. We can inspect, buy and ship it for you.`;
  const photos = [...new Set((Array.isArray(lot.photos) && lot.photos.length ? lot.photos : [lot.photo_url]).filter(Boolean) as string[])].slice(0, 4);
  const url = `/lot/${encodeURIComponent(lot.id)}`;
  return {
    title: `${title}${place ? `, ${place}` : ""} | Turrera`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", ...(photos.length ? { images: photos.map((p) => ({ url: p, alt: title })) } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(photos.length ? { images: photos } : {}) },
  };
}

function fmtDate(s: string | null | undefined) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

export default async function LotPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ buy?: string; inspect?: string }> }) {
  const lot = await getLot((await params).id);
  const sp = await searchParams;
  if (!lot) notFound();
  const [similar, comps] = await Promise.all([similarLots(lot), soldComps(lot as Parameters<typeof soldComps>[0])]);

  const photos = [...new Set((Array.isArray(lot.photos) && lot.photos.length ? lot.photos : [lot.photo_url]).filter(Boolean) as string[])];
  const dateOnly = lot.source === "jjkane";
  const site = SOURCE_SHORT[lot.source] ?? lot.source;
  const title = titleCase(lot.title) || "Untitled lot";
  const cat = CATEGORIES.find((c) => c.key === lot.category);
  const place = [lot.city ? titleCase(lot.city) : null, lot.state, lot.zip].filter(Boolean).join(", ");
  const closes = closesAt(lot.end_time, dateOnly);
  const soldFor = lot.sold && lot.final_price ? lot.final_price : null;
  const bid = soldFor !== null ? money(soldFor) as string : money(lot.current_bid) ?? (dateOnly ? "See the auction" : "No bids yet");
  const bidLabel = soldFor !== null ? `Sold for${lot.bid_count ? ` after ${lot.bid_count} bid${lot.bid_count === 1 ? "" : "s"}` : ""}` : lot.end_time && new Date(lot.end_time).getTime() < Date.now() ? "Last bid we saw" : "Current bid";
  const l = lot as FullLot & { year?: number | null; make?: string | null; model?: string | null };
  const vehicle = [l.year, l.make ? titleCase(l.make) : null, l.model ? titleCase(l.model) : null].filter(Boolean).join(" ");

  const facts: [string, string][] = [
    ["Location", place || "Not listed"],
    ["Seller", lot.agency ? titleCase(lot.agency) : "Not listed"],
    ["Category", [cat?.label, typeLabel(lot.category, lot.subcategory)].filter(Boolean).join(": ") || "Not listed"],
  ];
  if (lot.length_ft) facts.splice(1, 0, ["Length", `${lot.length_ft} ft`]);
  if (vehicle) facts.splice(2, 0, ["Year, make, model", vehicle]);
  const listed = fmtDate(lot.start_time) ?? fmtDate(lot.first_seen);
  if (listed) facts.push([lot.start_time ? "Auction opened" : "First seen", listed]);
  facts.push(["Lot ID", lot.id.replace(/^[a-z]+[-:]/, "")]);

  const bidLink = lot.lot_url ?? undefined;
  const isOpen = !!lot.end_time && new Date(lot.end_time).getTime() > Date.now();
  const pageUrl = `${SITE_URL}/lot/${encodeURIComponent(lot.id)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    url: pageUrl,
    ...(photos.length ? { image: photos.slice(0, 8) } : {}),
    ...(lot.description ? { description: lot.description.slice(0, 500) } : {}),
    ...(cat ? { category: cat.label } : {}),
    ...(l.make ? { brand: { "@type": "Brand", name: titleCase(l.make) } } : {}),
    ...(isOpen && lot.current_bid && lot.current_bid > 0 ? {
      offers: {
        "@type": "Offer", url: pageUrl, priceCurrency: "USD", price: lot.current_bid, availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/UsedCondition", ...(lot.end_time ? { priceValidUntil: lot.end_time.slice(0, 10) } : {}),
        ...(lot.agency ? { seller: { "@type": "GovernmentOrganization", name: titleCase(lot.agency) } } : {}),
      },
    } : {}),
  };

  return (
    <>
      <SiteHeader category={lot.category ?? ""} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main className="lot">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a><span aria-hidden="true">/</span>
          {cat ? <><a href={`/search?category=${encodeURIComponent(cat.key)}`}>{cat.label}</a><span aria-hidden="true">/</span></> : null}
          {cat && typeLabel(lot.category, lot.subcategory) ? <><a href={`/search?category=${encodeURIComponent(cat.key)}&sub=${lot.subcategory}`}>{typeLabel(lot.category, lot.subcategory)}</a><span aria-hidden="true">/</span></> : null}
          <span className="crumbs-current">{title}</span>
        </nav>

        <div className="lot-layout">
          <div className="lot-main">
            <h1 className="lot-title">{title}</h1>
            <p className="lot-sub">{place || "Location not listed"}{lot.agency ? <>, sold by {titleCase(lot.agency)}</> : null}</p>

            <section className="gallery" id="gallery" aria-label="Photos">
              {photos.length ? (
                <div className={photos.length > 1 ? "gallery-layout" : "gallery-layout gallery-single"}>
                  {photos.length > 1 ? (
                    <nav className="gallery-thumbs" aria-label="Choose a photo">
                      {photos.map((src, i) => (
                        <a key={src} href={`#photo-${i + 1}`} aria-label={`Photo ${i + 1}`} className="gallery-thumb" aria-current={i === 0 ? "true" : undefined}>
                          <img src={src} alt="" loading={i < 8 ? "eager" : "lazy"} decoding="async" />
                        </a>
                      ))}
                    </nav>
                  ) : null}
                  <div className="gallery-main">
                    <div className="gallery-strip" data-gallery>
                      {photos.map((src, i) => (
                        <figure key={src} id={`photo-${i + 1}`} className="gallery-item">
                          <a href="#all-photos" aria-label="See all photos"><img src={src} alt={`${title}, photo ${i + 1} of ${photos.length}`} loading={i === 0 ? "eager" : "lazy"} decoding="async" /></a>
                        </figure>
                      ))}
                    </div>
                    {photos.length > 1 ? (
                      <>
                        <button type="button" className="gallery-arrow gallery-prev" data-gallery-step="-1" aria-label="Previous photo">
                          <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <button type="button" className="gallery-arrow gallery-next" data-gallery-step="1" aria-label="Next photo">
                          <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M7.5 4.5L13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <span className="gallery-counter" data-gallery-counter aria-live="polite">1 / {photos.length}</span>
                        <a className="gallery-all" href="#all-photos">
                          <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16"><path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                          See all {photos.length} photos
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="gallery-empty">No photos were included in the feed. The original listing may have more.</div>
              )}
            </section>

            {photos.length > 1 ? (
              <div className="photo-grid" id="all-photos" role="dialog" aria-label={`All ${photos.length} photos`}>
                <div className="photo-grid-top">
                  <strong>{photos.length} photos</strong>
                  <a href="#gallery" className="photo-grid-close" aria-label="Close photos">
                    <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    Close
                  </a>
                </div>
                <div className="photo-grid-list">
                  {photos.map((src, i) => (
                    <figure key={src} className="photo-grid-item">
                      <img src={src} alt={`${title}, photo ${i + 1} of ${photos.length}`} loading="lazy" decoding="async" />
                    </figure>
                  ))}
                </div>
              </div>
            ) : null}

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

            {isOpen && canInspect(lot.end_time) ? <InspectForm lotId={lot.id} category={lot.category} place={[lot.city ? titleCase(lot.city) : null, lot.state].filter(Boolean).join(", ")} missing={sp.inspect === "missing"} /> : null}

            {isOpen ? <FinanceOptions compact lotId={lot.id} category={lot.category} amount={lot.current_bid && lot.current_bid > 0 ? lot.current_bid : null} /> : null}
          </div>

          <aside className="bidbox" aria-label="Bidding">
            <div className="bidbox-time">
              <Countdown end={lot.end_time} dateOnly={dateOnly} className="countdown-lg" />
              {closes ? <p>Closes {closes}{dateOnly ? ". Check the auction for the exact time." : ""}</p> : null}
            </div>
            <dl className="bidbox-money">
              <div><dt>{bidLabel}</dt><dd className={soldFor !== null || money(lot.current_bid) ? "bidbox-bid" : "bidbox-bid-text"}>{bid}</dd></div>
            </dl>
            {comps && soldFor === null ? (
              <a className="bidbox-comps" href="#sold-comps">
                <span>Similar {comps.basis} recently sold for</span>
                <strong>{money(comps.low)} to {money(comps.high)}</strong>
                <span>Median {money(comps.median)}, from {comps.lots.length < 8 ? comps.lots.length : "8+"} sales</span>
              </a>
            ) : null}
            {lot.sell_ease ? (
              <div className="bidbox-ease">
                <span className={`tag tag-ease-${lot.sell_ease}`}>{EASE_LABEL[lot.sell_ease] ?? lot.sell_ease}</span>
                {lot.sell_note && !/\$|\d{3}/.test(lot.sell_note) ? <p>{lot.sell_note}</p> : null}
              </div>
            ) : null}
            {isOpen ? <BidStart lotId={lot.id} currentBid={lot.current_bid} /> : null}
            <div className="bidbox-actions">
              <a className={`btn ${isOpen ? "btn-outline" : "btn-primary"} btn-block`} href={bidLink} target="_blank" rel="noopener noreferrer">{isOpen ? "View and bid yourself" : "View the auction"}</a>
              {isOpen ? <a className="btn btn-outline btn-block" href="#financing">Finance this lot</a> : null}
              <WatchButton id={lot.id} />
            </div>
            {isOpen && canInspect(lot.end_time) ? (
              <a className="bidbox-inspect" href="#inspect">
                <strong>Want more info on this lot?</strong>
                <span>Hire a Turrera local inspector</span>
              </a>
            ) : null}
            {WHATSAPP ? (
              <a className="bidbox-whatsapp" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi, I have a question about ${title}: ${pageUrl}`)}`} target="_blank" rel="noopener noreferrer">
                Questions? Message us on WhatsApp
              </a>
            ) : null}
            <p className="fine">
              A buyer&apos;s premium, taxes and pickup rules may apply.
            </p>
            <ShareButtons url={pageUrl} title={title} />
          </aside>
        </div>

        {comps ? (
          <section className="home-section lot-similar" id="sold-comps" aria-labelledby="comps-h">
            <div className="section-head">
              <h2 id="comps-h">What similar {comps.basis} sold for</h2>
              <a href={`/search?status=sold&category=${encodeURIComponent(lot.category ?? "")}${lot.subcategory ? `&sub=${lot.subcategory}` : ""}`}>See all sold prices</a>
            </div>
            <p className="section-note">Final prices from government auctions in the last 12 months. Middle half sold for {money(comps.low)} to {money(comps.high)}; median {money(comps.median)}. Condition and location vary, so use these as a guide.</p>
            <div className="rail">{comps.lots.map((s) => <LotCard key={s.id} lot={s} layout="rail" />)}</div>
          </section>
        ) : null}

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
          <div><span>{bidLabel}</span><strong>{bid}</strong></div>
          <div className="mobile-bidbar-actions">{isOpen ? <a className="btn btn-primary" href="#bid">Place bid</a> : <a className="btn btn-primary" href={bidLink} target="_blank" rel="noopener noreferrer">View auction</a>}</div>
        </div>
      </main>
    </>
  );
}
