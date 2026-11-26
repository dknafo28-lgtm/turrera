// Read-only star rating.
export default function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const r = Math.round(rating * 2) / 2;
  return (
    <span className="stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} aria-hidden="true" viewBox="0 0 20 20" width={size} height={size}>
          <defs><linearGradient id={`half-${i}`}><stop offset="50%" stopColor="currentColor" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs>
          <path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z" fill={r >= i ? "currentColor" : r >= i - 0.5 ? `url(#half-${i})` : "none"} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}
