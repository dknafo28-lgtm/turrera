export default function NewsletterForm({ source = "footer", tone = "light" }: { source?: string; tone?: "light" | "dark" }) {
  return (
    <form className={`signup signup-${tone}`} action="/api/subscribe" method="post">
      <input type="hidden" name="source" value={source} />
      <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label htmlFor={`nl-${source}`} className="visually-hidden">Email address</label>
      <input id={`nl-${source}`} type="email" name="email" required placeholder="you@example.com" autoComplete="email" />
      <button type="submit" className="btn btn-primary">Get the weekly list</button>
    </form>
  );
}
