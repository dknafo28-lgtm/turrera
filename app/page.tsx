import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import LotCard from "@/components/LotCard";
import NewsletterForm from "@/components/NewsletterForm";
import ShowcaseCard from "@/components/ShowcaseCard";
import { CATEGORIES, STATES, TYPES, loadHome, type Params } from "@/lib/lots";
import ReviewList from "@/components/ReviewList";
import Stars from "@/components/Stars";
import { loadReviews } from "@/lib/reviews";
import { loadShowcase } from "@/lib/showcase";

export const dynamic = "force-dynamic";


// The eight categories most buyers come for; the rest are one tap away in "Shop by category".
const FEATURED = ["boats", "trucks", "cars", "equipment", "powersports", "buses", "trailers", "emergency"];

const POPULAR = [
  { label: "Boats", href: "/search?category=boats&sub=boats" },
  { label: "Outboards", href: "/search?category=boats&sub=outboards" },
  { label: "Pickups", href: "/search?category=trucks&sub=pickups" },
  { label: "Dump trucks", href: "/search?category=trucks&sub=dump-trucks" },
  { label: "Bucket trucks", href: "/search?category=trucks&sub=bucket-utility" },
  { label: "Golf carts", href: "/search?category=powersports&sub=golf-carts" },
  { label: "Excavators", href: "/search?category=equipment&sub=excavators" },
  { label: "Former police SUVs", href: "/search?category=cars&sub=police" },
];

export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  // Old links used /?q=... — send them to the search page.
  const qs = new URLSearchParams(Object.entries(p).filter(([, v]) => typeof v === "string" && v) as [string, string][]).toString();
  if (qs) redirect(`/search?${qs}`);

  const [{ soldRecent, marine, endingSoon, newest, counts, tilePhotos, endingToday }, showcase, homeReviews] = await Promise.all([loadHome(), loadShowcase(6), loadReviews({ limit: 3 })]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <SiteHeader />
      <main className="home">
        <section className="hero">
          <div className="hero-inner">
            <h1>Direct from government agencies</h1>
            <ul className="popular" aria-label="Popular searches">
              {POPULAR.map((x) => <li key={x.href}><a href={x.href}>{x.label}</a></li>)}
            </ul>
            <ul className="hero-proof">
              <li><strong>{total.toLocaleString()}</strong><span>open lots</span></li>
              <li><a href="/search?ending=24h"><strong>{endingToday.toLocaleString()}</strong><span>ending in 24 hours</span></a></li>
              <li><strong>Worldwide</strong><span>shipping</span></li>
            </ul>
          </div>
        </section>

        {showcase.length || soldRecent.length ? (
          <section className="home-section" aria-labelledby="sold-h">
            <div className="section-head">
              <h2 id="sold-h">{showcase.length ? "Recent wins" : "What lots actually sold for"}</h2>
              <a href={showcase.length ? "/our-sales" : "/search?status=sold"}>{showcase.length ? "See all our sales" : "Browse sold prices"}</a>
            </div>
            {showcase.length ? <div className="rail rail-wide">{showcase.map((s) => <ShowcaseCard key={s.id} sale={s} compact />)}</div> : null}
            {soldRecent.length ? (
              <>
                {showcase.length ? <h3 className="subhead">Final prices from recent government auctions <a href="/search?status=sold">See all</a></h3> : <p className="section-note">Final prices from auctions that closed in the last few weeks. Use them to set your top bid.</p>}
                <div className="rail">{soldRecent.map((lot) => <LotCard key={lot.id} lot={lot} layout="rail" />)}</div>
              </>
            ) : null}
          </section>
        ) : null}

        <section className="home-section" aria-labelledby="cats-h">
          <div className="section-head">
            <h2 id="cats-h">Shop by category</h2>
            <a href="/search">All {total.toLocaleString()} lots</a>
          </div>
          <ul className="cat-tiles">
            {FEATURED.map((k) => CATEGORIES.find((c) => c.key === k)).filter(Boolean).map((c) => (
              <li key={c!.key}>
                <a href={`/search?category=${encodeURIComponent(c!.key)}`} className="cat-tile">
                  <span className="cat-tile-photo">{tilePhotos[c!.key] ? <img src={tilePhotos[c!.key] as string} alt="" loading="lazy" /> : null}</span>
                  <span className="cat-tile-text"><strong>{c!.label}</strong><span>{(counts[c!.key] ?? 0).toLocaleString()} open</span></span>
                </a>
              </li>
            ))}
          </ul>
          <p className="more-cats">
            Also: {CATEGORIES.filter((c) => !FEATURED.includes(c.key)).map((c, i, arr) => (
              <span key={c.key}><a href={`/search?category=${encodeURIComponent(c.key)}`}>{c.label}</a>{i < arr.length - 1 ? ", " : ""}</span>
            ))}
          </p>
        </section>

        <section className="home-section why" aria-labelledby="why-h">
          <h2 id="why-h">Why Turrera</h2>
          <ul className="why-list">
            <li><strong>Straight from government agencies</strong><span>Cities, counties, states and federal agencies selling their own surplus. No dealer markup.</span></li>
            <li><strong>Clear, accurate listings</strong><span>Cleaned-up titles, every photo, condition notes and what similar items actually sold for.</span></li>
            <li><strong>Fleet-maintained equipment</strong><span>Government trucks, boats and equipment are usually serviced on a schedule, and many come with records.</span></li>
          </ul>
        </section>

        {marine.length ? (
          <section className="home-section" aria-labelledby="marine-h">
            <div className="section-head">
              <h2 id="marine-h">Boats &amp; marine</h2>
              <a href="/search?category=boats">All boats and marine</a>
            </div>
            <ul className="type-pills home-types">
              {TYPES.boats.map((t) => <li key={t.key}><a href={`/search?category=boats&sub=${t.key}`}>{t.label}</a></li>)}
            </ul>
            <div className="rail">{marine.map((lot) => <LotCard key={lot.id} lot={lot} layout="rail" />)}</div>
          </section>
        ) : null}


        <section className="home-section services" aria-labelledby="svc-h">
          <div className="services-main">
            <h2 id="svc-h">Can&apos;t bid or pick up? We&apos;ll buy it for you.</h2>
            <ol className="services-steps">
              <li><strong>Pick a lot</strong> and tell us the most you&apos;ll pay.</li>
              <li><strong>We bid</strong> up to your limit, never above it.</li>
              <li><strong>We pay, pick up and ship</strong> it to your door or port, anywhere in the world.</li>
            </ol>
            <a className="btn btn-primary" href="/buy-for-me">How buying for you works</a>
          </div>
          <div className="services-side">
            <a href="/financing" className="service-card">
              <strong>Get pre-approved</strong>
              <span>Auctions want payment within about 2 days. Line up financing before you bid.</span>
              <em>See lenders</em>
            </a>
            <a href="/sell" className="service-card">
              <strong>Sell your fleet</strong>
              <span>Trucks, vans, buses and equipment sold to buyers already looking for them.</span>
              <em>Get a free estimate</em>
            </a>
          </div>
        </section>

        {endingSoon.length ? (
          <section className="home-section" aria-labelledby="ending-h">
            <div className="section-head">
              <h2 id="ending-h">Closing soon</h2>
              <a href="/search?ending=24h">All lots closing today</a>
            </div>
            <div className="rail">{endingSoon.map((lot) => <LotCard key={lot.id} lot={lot} layout="rail" />)}</div>
          </section>
        ) : null}

        <section className="home-section" aria-labelledby="reviews-h">
          <div className="section-head">
            <h2 id="reviews-h">What buyers say</h2>
            <a href="/reviews">{homeReviews.count ? `All ${homeReviews.count} reviews` : "Write a review"}</a>
          </div>
          {homeReviews.count && homeReviews.average ? (
            <>
              <p className="review-summary"><Stars rating={homeReviews.average} size={20} /> <strong>{homeReviews.average.toFixed(1)}</strong> out of 5, from {homeReviews.count} review{homeReviews.count === 1 ? "" : "s"}</p>
              <ReviewList reviews={homeReviews.reviews} showLot />
            </>
          ) : (
            <p className="section-note">Bought something through Turrera or found a deal here? <a href="/reviews#write-review">Leave the first review</a>.</p>
          )}
        </section>

        <section className="home-section home-band" id="signup">
          <div>
            <h2>Government auctions this week</h2>
            <p>One free email every Monday with the standout auctions closing each day of the week.</p>
          </div>
          <NewsletterForm source="home" />
        </section>

        {newest.length ? (
          <section className="home-section" aria-labelledby="new-h">
            <div className="section-head">
              <h2 id="new-h">Just listed</h2>
              <a href="/search?sort=newest">See newest lots</a>
            </div>
            <div className="rail">{newest.map((lot) => <LotCard key={lot.id} lot={lot} layout="rail" />)}</div>
          </section>
        ) : null}

        <section className="home-section home-split home-split-one">
          <div>
            <h2>Browse by state</h2>
            <ul className="state-grid">
              {STATES.map((s) => <li key={s}><a href={`/search?state=${s}`}>{s}</a></li>)}
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
