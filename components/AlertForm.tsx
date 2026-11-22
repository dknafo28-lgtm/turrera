import type { Params } from "@/lib/lots";

const KEYS = ["q", "category", "state", "min", "max", "source", "deal", "ease"] as const;

export default function AlertForm({ p, label }: { p: Params; label: string }) {
  return (
    <form className="alert-form" action="/api/alert" method="post">
      {KEYS.map((k) => (p[k] ? <input key={k} type="hidden" name={k} value={String(p[k])} /> : null))}
      <input type="hidden" name="label" value={label} />
      <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div>
        <strong>Email me new matches</strong>
        <span>New lots for “{label}”, checked every 4 hours.</span>
      </div>
      <label htmlFor="alert-email" className="visually-hidden">Email address</label>
      <input id="alert-email" type="email" name="email" required placeholder="you@example.com" autoComplete="email" />
      <button type="submit" className="btn btn-outline">Create alert</button>
    </form>
  );
}
