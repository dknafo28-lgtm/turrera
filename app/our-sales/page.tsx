import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import ShowcaseCard from "@/components/ShowcaseCard";
import { loadShowcase } from "@/lib/showcase";

export const metadata: Metadata = { title: "Our sales and reviews | Turrera" };
export const dynamic = "force-dynamic";

export default async function OurSales() {
  const sales = await loadShowcase(100);
  return (
    <>
      <SiteHeader />
      <main className="page page-wide">
        <nav className="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Our sales</span></nav>
        <h1>Boats, trucks and equipment we&apos;ve bought and sold</h1>
        <p className="page-lead">Real government auction wins: what we paid, what they sold for, and where they went. We&apos;ve shipped across the Caribbean, Europe, Alaska, Hawaii, Asia and the Middle East.</p>
        {sales.length ? (
          <div className="sale-grid">{sales.map((s) => <ShowcaseCard key={s.id} sale={s} />)}</div>
        ) : (
          <div className="empty"><h2>Sales are being added</h2><p>Check back soon, or browse what&apos;s closing now.</p><a className="btn btn-primary" href="/search">Browse lots</a></div>
        )}
        <section className="page-section cta-band">
          <h2>Want us to buy one for you?</h2>
          <p>Pick a lot, tell us your top price, and we bid, pay, pick up and ship it to you anywhere in the world.</p>
          <a className="btn btn-primary" href="/buy-for-me">How buying for you works</a>
        </section>
      </main>
    </>
  );
}
