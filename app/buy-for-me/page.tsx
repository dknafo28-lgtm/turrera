import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { BROKER_FEE_TEXT } from "@/lib/deposit";

export const metadata: Metadata = { title: "We buy it for you | Turrera" };

export default function BuyForMe() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <nav className="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Buy for me</span></nav>
        <h1>We bid, pay, pick up and ship it for you</h1>
        <p className="page-lead">Government auctions need a US account, quick payment and pickup within days. We handle all of it, so you can buy from anywhere, including the Bahamas and the Caribbean.</p>

        <section className="page-section">
          <h2>How it works</h2>
          <ol className="steps">
            <li><strong>Pick a lot.</strong> Find it on Turrera and tap “Have us buy it for you.” Tell us the most you&apos;ll pay.</li>
            <li><strong>Pay the deposit.</strong> 10% of your top bid, at least $250 and at most $2,500. It holds your spot and is credited to your total.</li>
            <li><strong>We bid.</strong> We bid up to your limit and never above it. If we lose, your deposit comes back in full or rolls to your next lot.</li>
            <li><strong>Pay the balance.</strong> If we win, you pay the winning bid, the auction&apos;s buyer&apos;s premium, our fee and shipping, before pickup.</li>
            <li><strong>We pick up and ship.</strong> We arrange the carrier or the export shipment and send you photos at pickup.</li>
          </ol>
        </section>

        <section className="page-section">
          <h2>What it costs</h2>
          <table className="simple-table">
            <tbody>
              <tr><th scope="row">Our fee</th><td>{BROKER_FEE_TEXT}, only if we win</td></tr>
              <tr><th scope="row">Deposit</th><td>10% of your top bid (min $250, max $2,500), credited to your total</td></tr>
              <tr><th scope="row">Auction charges</th><td>The auction site&apos;s buyer&apos;s premium and any sales tax, at cost</td></tr>
              <tr><th scope="row">Shipping</th><td>Quoted before we bid, at cost plus a coordination fee</td></tr>
            </tbody>
          </table>
        </section>

        <section className="page-section" id="terms">
          <h2>Terms</h2>
          <ul>
            <li>Government surplus is sold as is, where is, with no warranty and no returns. Look at every photo and ask questions before you set your top bid.</li>
            <li>If we win at or under your top bid, the deposit is non-refundable and you agree to pay the balance within 2 business days.</li>
            <li>If we don&apos;t win, the deposit is refunded within 5 business days, or held for your next request if you ask.</li>
            <li>Auction sites set pickup deadlines. Late payment can mean storage fees or losing the item, which are charged to you.</li>
            <li>Export buyers are responsible for import duties and paperwork in their country. We provide the title and bill of sale.</li>
          </ul>
        </section>

        <p className="page-section">Need financing? <a href="/financing">Get pre-approved before you bid</a>, then we can bid up to your approval.</p>

        <p><a className="btn btn-primary" href="/search">Find a lot</a></p>
      </main>
    </>
  );
}
