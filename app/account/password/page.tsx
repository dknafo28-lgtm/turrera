import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Change password | Turrera", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ChangePassword({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const q = await searchParams;
  if (!(await getUser())) redirect("/signin?next=/account/password");
  return (
    <>
      <SiteHeader />
      <main className="page auth-page">
        <nav className="crumbs" aria-label="Breadcrumb"><a href="/account">My account</a><span aria-hidden="true">/</span><span>Password</span></nav>
        <h1>Set a new password</h1>
        {q.e === "short" ? <p className="form-error" role="alert">Use a password of at least 8 characters.</p> : null}
        {q.e === "failed" ? <p className="form-error" role="alert">That didn&apos;t save. Please try again.</p> : null}
        <section className="page-section auth-box">
          <form action="/api/auth/password" method="post" className="form-grid">
            <label className="span-2">New password<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
            <div className="span-2"><button type="submit" className="btn btn-primary">Save password</button></div>
          </form>
        </section>
      </main>
    </>
  );
}
