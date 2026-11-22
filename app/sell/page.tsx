import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Sell your fleet | Turrera" };

export default function Sell() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <nav className="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Sell your fleet</span></nav>
        <h1>Sell your used trucks and equipment for more than trade-in</h1>
        <p className="page-lead">We put your vehicles in front of buyers who are already looking for them, in the US and overseas. Vehicles stay at your yard until they sell, and you only pay when they do.</p>

        <div className="page-split">
          <section className="page-section">
            <h2>Who we work with</h2>
            <ul>
              <li>Contractors, landscapers, pool, pest, HVAC and towing companies</li>
              <li>Towns, school districts and special districts</li>
              <li>Churches, private schools and nonprofits with vans and buses</li>
              <li>Equipment rental and shuttle operators</li>
            </ul>
            <h2>What we handle</h2>
            <ul>
              <li>Photos, a condition report and the listing</li>
              <li>Marketing to our weekly buyer list and export buyers</li>
              <li>Collecting payment before the title or keys change hands</li>
              <li>Scheduling pickup with the buyer</li>
            </ul>
          </section>

          <section className="page-section form-card" aria-labelledby="sell-h">
            <h2 id="sell-h">Get a free estimate</h2>
            <form action="/api/sell" method="post" className="form-grid">
              <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <label className="span-2">You are
                <select name="kind" defaultValue="business">
                  <option value="business">A business</option>
                  <option value="government">A government agency</option>
                  <option value="nonprofit">A church, school or nonprofit</option>
                </select>
              </label>
              <label className="span-2">Company or agency<input name="company" required autoComplete="organization" /></label>
              <label>Your name<input name="name" required autoComplete="name" /></label>
              <label>Email<input name="email" type="email" required autoComplete="email" /></label>
              <label>Phone<input name="phone" type="tel" autoComplete="tel" /></label>
              <label>City and state<input name="location" placeholder="Miami, FL" /></label>
              <label>Fleet size
                <select name="fleet_size" defaultValue="">
                  <option value="">Choose</option><option>1–9</option><option>10–49</option><option>50–199</option><option>200+</option>
                </select>
              </label>
              <label>When do you want to sell?
                <select name="timeline" defaultValue="">
                  <option value="">Choose</option><option>Now</option><option>Next 3 months</option><option>Later this year</option><option>Just pricing it out</option>
                </select>
              </label>
              <label className="span-2">What do you want to sell?<textarea name="items" rows={4} placeholder="2016 Ford F-250, 140k miles; 2012 Bobcat S650, 3,200 hours" /></label>
              <label className="check span-2"><input type="checkbox" name="call_consent" value="yes" /> <span>You can call or text me at this number about my vehicles. Consent isn&apos;t required to get an estimate.</span></label>
              <div className="span-2 form-actions"><button type="submit" className="btn btn-primary">Request an estimate</button></div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
