import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { getReadClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Unsubscribe | Turrera" };
export const dynamic = "force-dynamic";

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  let email: string | null = null;
  if (t && /^[a-f0-9]{20,80}$/.test(t)) {
    const { data } = (await getReadClient()?.rpc("unsubscribe", { p_token: t })) ?? { data: null };
    email = (data as string | null) ?? null;
  }
  return (
    <>
      <SiteHeader />
      <main className="results">
        <div className="empty empty-page">
          <h1>{email ? "You're unsubscribed" : "Link not recognized"}</h1>
          <p>{email ? `${email} won't get any more emails from Turrera.` : "This unsubscribe link has expired or was already used. Reply to any email and we'll remove you by hand."}</p>
          <a className="btn btn-outline" href="/">Go to Turrera</a>
        </div>
      </main>
    </>
  );
}
