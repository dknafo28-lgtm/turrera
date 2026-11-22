import SiteHeader from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="results">
        <div className="empty empty-page">
          <h1>This lot isn&apos;t here anymore</h1>
          <p>It may have closed or been pulled by the auction site.</p>
          <a className="btn btn-primary" href="/search">Search open lots</a>
        </div>
      </main>
    </>
  );
}
