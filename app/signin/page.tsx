import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { GOOGLE_SIGN_IN, getUser, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in | Turrera", robots: { index: false } };
export const dynamic = "force-dynamic";

type Q = { mode?: string; next?: string; e?: string; check?: string; reset?: string };

const ERRORS: Record<string, string> = {
  missing: "Enter your email and a password.",
  short: "Use a password of at least 8 characters.",
  wrong: "That email and password don't match. Try again, or reset your password.",
  exists: "There's already an account with that email. Sign in instead.",
  confirm: "Confirm your email first: open the link we sent you, then sign in.",
  link: "That sign-in link has expired. Sign in again, or request a new reset link.",
  failed: "Something went wrong. Please try again in a minute.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const next = safeNext(q.next);
  if (await getUser()) redirect(next);
  const signup = q.mode === "signup";
  const bidding = next.startsWith("/bid/");
  const toggle = `/signin?${new URLSearchParams({ ...(signup ? {} : { mode: "signup" }), ...(q.next ? { next: q.next } : {}) })}`;
  return (
    <>
      <SiteHeader />
      <main className="page auth-page">
        {bidding ? (
          <ol className="bid-steps" aria-label="Steps">
            <li className="done"><span className="bid-step-num">{"\u2713"}</span>Your bid</li>
            <li className="current" aria-current="step"><span className="bid-step-num">2</span>Your account</li>
            <li><span className="bid-step-num">3</span>Deposit</li>
          </ol>
        ) : null}
        <h1>{bidding ? (signup ? "Create a free account to place your bid" : "Sign in to place your bid") : signup ? "Create your Turrera account" : "Sign in"}</h1>
        <p className="page-lead">{bidding ? "Your bid is saved. We use your account to keep you updated on the auction and to return your deposit if we don't win." : signup ? "Save your watchlist across your phone and computer, keep your auction alerts in one place, and track your buy-for-me and inspection requests." : "Your watchlist, alerts and requests, on any device."}</p>

        {q.check ? <p className="form-note" role="status">Check your email for a link to confirm your account, then sign in.</p> : null}
        {q.reset ? <p className="form-note" role="status">If there&apos;s an account for that email, a reset link is on its way.</p> : null}
        {q.e && ERRORS[q.e] ? <p className="form-error" role="alert">{ERRORS[q.e]}</p> : null}

        <section className="page-section auth-box">
          {GOOGLE_SIGN_IN ? (
            <>
              <a className="btn btn-outline btn-block auth-google" href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" /></svg>
                Continue with Google
              </a>
              <p className="auth-or"><span>or use your email</span></p>
            </>
          ) : null}
          <form action="/api/auth/signin" method="post" className="form-grid auth-form">
            <input type="hidden" name="mode" value={signup ? "signup" : "signin"} />
            <input type="hidden" name="next" value={next} />
            <label className="span-2">Email<input name="email" type="email" required autoComplete="email" /></label>
            <label className="span-2">Password<input name="password" type="password" required minLength={signup ? 8 : undefined} autoComplete={signup ? "new-password" : "current-password"} /></label>
            {signup ? <label className="check span-2"><input type="checkbox" name="weekly" value="yes" defaultChecked /> <span>Email me the upcoming government auctions every Monday</span></label> : null}
            <div className="span-2"><button type="submit" className="btn btn-primary btn-block">{signup ? "Create account" : "Sign in"}</button></div>
          </form>
          {!signup ? (
            <details className="auth-forgot">
              <summary>Forgot your password?</summary>
              <form action="/api/auth/forgot" method="post" className="form-grid">
                <label className="span-2">Email<input name="email" type="email" required autoComplete="email" /></label>
                <div className="span-2"><button type="submit" className="btn btn-outline">Email me a reset link</button></div>
              </form>
            </details>
          ) : null}
        </section>
        <p className="auth-switch">{signup ? "Already have an account?" : "New to Turrera?"} <a href={toggle}>{signup ? "Sign in" : "Create a free account"}</a></p>
      </main>
    </>
  );
}
