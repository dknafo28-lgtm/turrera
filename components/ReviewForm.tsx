// Write a review of the site, or of one lot. Every review is checked before it's shown.
export default function ReviewForm({ lotId, email, status, heading = "Write a review" }: { lotId?: string; email?: string | null; status?: string; heading?: string }) {
  const msg: Record<string, [string, string]> = {
    thanks: ["form-note", "Thanks for your review. It will show here once it's been checked, usually within a day."],
    missing: ["form-error", "Please pick a star rating and write at least a sentence."],
    again: ["form-error", "You've already sent a review for this today."],
    failed: ["form-error", "That didn't send. Please try again."],
  };
  const m = status ? msg[status] : null;
  return (
    <form action="/api/review" method="post" className="form-grid review-form" id="write-review">
      <h3 className="span-2">{heading}</h3>
      {m ? <p className={`${m[0]} span-2`} role={m[0] === "form-error" ? "alert" : "status"}>{m[1]}</p> : null}
      {lotId ? <input type="hidden" name="lot_id" value={lotId} /> : null}
      <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <fieldset className="span-2 star-field">
        <legend>Your rating</legend>
        <div className="star-input">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n}><input type="radio" name="rating" value={n} required /><span aria-hidden="true">★</span><span className="visually-hidden">{n} star{n > 1 ? "s" : ""}</span></label>
          ))}
        </div>
      </fieldset>
      <label className="span-2">{lotId ? "Your review of this lot or its listing" : "Your review"}<textarea name="body" rows={4} required minLength={10} maxLength={2000} placeholder={lotId ? "Was the listing accurate? How was pickup, condition, or the deal?" : "How was your experience finding, bidding or buying through Turrera?"} /></label>
      <label>Your name (shown)<input name="name" required maxLength={60} autoComplete="name" placeholder="e.g. Mike R." /></label>
      <label>Email (not shown)<input name="email" type="email" required autoComplete="email" defaultValue={email ?? ""} /></label>
      <div className="span-2 form-actions">
        <button type="submit" className="btn btn-primary">Post review</button>
        <span className="fine">Reviews are checked before they appear. Signed-in buyers get a &ldquo;Verified buyer&rdquo; badge.</span>
      </div>
    </form>
  );
}
