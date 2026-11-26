import type { Metadata } from "next";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import SiteHeader from "@/components/SiteHeader";
import Stars from "@/components/Stars";
import { getUser } from "@/lib/auth";
import { loadReviews } from "@/lib/reviews";

export const metadata: Metadata = { title: "Reviews | Turrera", description: "What buyers say about Turrera: reviews of the site, our buy-for-me and inspection services, and the lots they bought." };
export const dynamic = "force-dynamic";

export default async function Reviews({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const q = await searchParams;
  const [{ reviews, count, average }, me] = await Promise.all([loadReviews({ limit: 100 }), getUser()]);
  return (
    <>
      <SiteHeader />
      <main className="page reviews-page">
        <h1>Reviews</h1>
        {count && average ? (
          <p className="review-summary"><Stars rating={average} size={20} /> <strong>{average.toFixed(1)}</strong> out of 5, from {count} review{count === 1 ? "" : "s"}</p>
        ) : (
          <p className="page-lead">No reviews yet. Bought something through Turrera, or used the site to find a deal? Be the first to say how it went.</p>
        )}
        <div className="reviews-layout">
          <section className="page-section" aria-label="Reviews">
            {reviews.length ? <ReviewList reviews={reviews} showLot /> : <p className="fine">Reviews will show here once they&apos;ve been checked.</p>}
          </section>
          <section className="page-section">
            <ReviewForm email={me?.user.email} status={q.review} />
          </section>
        </div>
      </main>
    </>
  );
}
