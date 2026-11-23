import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import LotCard from "@/components/LotCard";
import NewsletterForm from "@/components/NewsletterForm";
import { CATEGORIES, SOURCE_SHORT, STATES, TYPES, loadHome, type Params } from "@/lib/lots";

export const dynamic = "force-dynamic";

const SOURCE_NOTES: Record<string, string> = {
  gsa: "Federal agencies, through the GSA",
  publicsurplus: "State and local governments, schools",
  municibid: "Towns, counties, schools and authorities",
  jjkane: "City, county and state fleets only",
  govdeals: "From your saved-search alerts",
  govplanet: "From your saved-search alerts",
  cws: "From your auction emails",
};

export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  // Old links used /?q=... — send them to the search page.
  const qs = new URLSearchParams(Object.entries(p).filter(([, v]) => typeof v === "string" && v) as [string, string][]).toString();
  if (qs) redirect(`/search?${qs}`);

  const { marine, endingSoon, deals, newest, counts, sourceCounts, tilePhotos, endingToday } = await loadHome();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <SiteHeader />
      <main className="home">
        <section className="home-intro">
          <div className="home-intro-inner">
            <h1>Government surplus from {Object.keys(sourceCounts).length || 4} auction sites, in one search</h1>
            <form className="home-search" action="/search" method="get" role="search">
              <label htmlFor="home-q" className="visually-hidden">Search all lots</label>
              <input id="home-q" type="search" name="q" placeholder="Try “F-250 4x4”, “pontoon”, “bucket truck”" autoComplete="off" />
              <label htmlFor="home-state" className="visually-hidden">State</label>
              <select id="home-state" name="state" defaultValue="">
                <option value="">All states</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="submit" className="btn btn-primary">Search</button>
            </form>
            <dl className="home-stats">
              <div><dt>Open lots</dt><dd>{total.toLocaleString()}</dd></div>
              <div><dt>Closing in 24 hours</dt><dd><a href="/search?ending=24h">{endingToday.toLocaleString()}</a></dd></div>
              <div><dt>Refreshed</dt><dd>Every 4 hours</dd></div>
            </dl>
          </div>
        </section>

        <section className="home-section" aria-labelledby="cats-h">
          <div className="section-head">
            <h2 id="cats-h">Browse by category</h2>
            <a href="/search">See all {total.toLocaleString()} lots</a>
          </div>
          <ul className="cat-tiles">
            {CATEGORIES.filter((c) => c.key !== "other").map((c) => (
              <li key={c.key}>
                <a href={`/search?category=${encodeURIComponent(c.key)}`} className="cat-tile">
                  <span className="cat-tile-photo">{tilePhotos[c.key] ? <img src={tilePhotos[c.key] as string} alt="" loading="lazy" /> : null}</span>
                  <span className="cat-tile-text"><strong>{c.label}</strong><span>{(counts[c.key] ?? 0).toLocaleString()} open</span></span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {marine.length ? (
          <section className="home-section" aria-labelledby="marine-h">
            <div className="section-head">
              <h2 id="marine-h">Boats &amp; marine</h2>
              <a href="/search?category=boats">All boats, outboards, jet skis and gear</a>
            </div>
            <ul className="type-pills home-types">
              {TYPES.boats.map((t) => <li key={t.key}><a href={`/search?category=boats&sub=${t.key}`}>{t.label}</a></li>)}
            </ul>
            <div className="rail">{marine.map((lot) => <LotCard key={lot.id} lot={lot} layout="rail" />)}</div>
          </section>
        ) : null}

        {endingSoon.length ? (
          <section className="home-section" aria-labelledby="ending-h">
            <div className="section-head">
              <h2 id="ending-h">Closing soon</h2>
              <a href="/search?ending=24h">All lots closing today</a>
            </div>
            <div className="rail">{endingSoon.map((lot) => <LotCard key={lot.id} lot={lot} layout="rail" />)}</div>
          </section>
        ) : null}

        {deals.length ? (
          <section className="home-section" aria-labelledby="deals-h">
            <div className="section-head">
              <h2 id="deals-h">Furthest under estimated value</h2>
              <a href="/search?sort=spread&amp;deal=1">See every deal</a>
            </div>
            <p className="section-note">Estimates come from the listing and comparable sales. Check the auction before you bid.</p>
            <div className="rail">{deals.map((lot) => <LotCard key={lot.id} lot={lot} layout="rail" />)}</div>
          </section>
        ) : null}

        <section className="home-section home-band">
          <div>
            <h2>The best government surplus deals, every week</h2>
            <p>One email with the lots furthest under market value, what&apos;s closing soon, and boats and trucks worth flipping. Free.</p>
          </div>
          <NewsletterForm source="home" />
        </section>

        <section className="home-section home-services">
          <a href="/buy-for-me" className="service-card">
            <strong>We buy it for you</strong>
            <span>Can&apos;t bid or pick up yourself? We bid to your limit, pay, pick up and ship it to you anywhere in the world.</span>
            <em>How it works</em>
          </a>
          <a href="/sell" className="service-card">
            <strong>Sell your fleet</strong>
            <span>Trucks, vans, buses and equipment from businesses, agencies and nonprofits, sold to buyers already looking for them.</span>
            <em>Get a free estimate</em>
          </a>
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

        <section className="home-section home-split">
          <div>
            <h2>Where the lots come from</h2>
            <ul className="source-list">
              {Object.entries(sourceCounts).map(([k, n]) => (
                <li key={k}>
                  <a href={`/search?source=${k}`}><strong>{SOURCE_SHORT[k] ?? k}</strong><span>{SOURCE_NOTES[k]}</span></a>
                  <em>{n.toLocaleString()}</em>
                </li>
              ))}
            </ul>
          </div>
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
