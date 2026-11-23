import { INSPECTION_FEE } from "@/lib/inspection";

const RUNS = new Set(["boats", "trucks", "cars", "equipment", "buses", "powersports", "emergency", "aircraft"]);

export default function InspectForm({ lotId, place, category, missing = false }: { lotId: string; place: string; category?: string | null; missing?: boolean }) {
  const runs = RUNS.has(category ?? "");
  const fee = `$${INSPECTION_FEE.toLocaleString()}`;
  return (
    <section className="lot-section inspect-form" id="inspect" aria-labelledby="inspect-h">
      <h2 id="inspect-h">Want more info? Hire a Turrera local inspector</h2>
      <p>
        For {fee}, a local rep goes to see it{place ? ` in ${place}` : ""} before the auction closes. You get photos, video and
        answers to your questions{runs ? ", plus a start-up check where the seller allows it" : ""}, so you can bid with confidence.
      </p>
      {missing ? <p className="form-error" role="alert">Please fill in your name and email, and agree to the terms.</p> : null}
      <form action="/api/inspect" method="post" className="form-grid">
        <input type="hidden" name="lot_id" value={lotId} />
        <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label>Your name<input name="name" required autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label className="span-2">Phone<input name="phone" type="tel" autoComplete="tel" /></label>
        <label className="span-2">What do you want us to check?<textarea name="questions" rows={3} placeholder={runs ? "e.g. Does it start? Any rust? Engine hours? Condition of the hull or tires?" : "e.g. Is anything missing or damaged? How many pieces are there? Model numbers?"} /></label>
        <label className="check span-2"><input type="checkbox" name="terms" value="yes" required /> <span>I understand the inspection depends on the seller allowing a visit before the auction closes. If we can&apos;t get access, the {fee} is refunded. We report what we see; the lot is still sold as is.</span></label>
        <div className="span-2 form-actions">
          <button type="submit" className="btn btn-primary">Book an inspection for {fee}</button>
          <span className="fine">We confirm the visit within one business day.</span>
        </div>
      </form>
    </section>
  );
}
