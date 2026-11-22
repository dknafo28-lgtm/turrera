// Deposit for a "Buy this for me" request: 10% of the max bid, at least $250, at most $2,500.
export function depositFor(maxBid: number) {
  return Math.min(2500, Math.max(250, Math.round(maxBid * 0.1 / 10) * 10));
}

export const BROKER_FEE_TEXT = "8% of the winning bid, minimum $300";
