// Lending partners shown on lot pages and the Financing page.
// Partner links come from Vercel env vars once David signs up; until then the
// lender's public page is used (or our own form, when there's no public application).
export type LenderKey = "currency" | "clicklease" | "lightstream";

export type Lender = {
  key: LenderKey;
  name: string;
  forWho: string;
  range: string;
  speed: string;
  note: string;
  url: () => string | null; // null = send people to our own form for now
};

export const LENDERS: Record<LenderKey, Lender> = {
  currency: {
    key: "currency",
    name: "CurrencyFinance",
    forWho: "Businesses buying trucks, buses and equipment",
    range: "Larger purchases, through a network of lenders",
    speed: "Pre-approval often the same day; apply a few days before the auction",
    note: "Built for auction buyers. Get pre-approved, then bid up to your approval.",
    url: () => process.env.CURRENCY_PARTNER_URL || "https://www.gocurrency.com/finance/pre-qualify-for-equipment-financing-ahead-of-auctions/",
  },
  clicklease: {
    key: "clicklease",
    name: "Clicklease",
    forWho: "Businesses, including new ones",
    range: "Equipment up to about $25,000",
    speed: "Decision in minutes, no hard credit pull to pre-qualify",
    note: "A lease, not a loan. Works with our Buy for me service: the lender pays for the item directly.",
    url: () => process.env.CLICKLEASE_PARTNER_URL || null,
  },
  lightstream: {
    key: "lightstream",
    name: "LightStream",
    forWho: "Individuals with good to excellent credit",
    range: "$5,000 to $100,000, unsecured",
    speed: "Funds can arrive the same business day",
    note: "No lien on the boat or vehicle, so the auction's title delay doesn't hold up the loan.",
    url: () => process.env.LIGHTSTREAM_URL || "https://www.lightstream.com/",
  },
};

const PERSONAL = new Set(["boats", "cars", "golf carts"]);

// Which lenders to show for a lot, best fit first.
export function lendersFor(category: string | null | undefined, amount: number | null): LenderKey[] {
  if (!category && amount === null) return ["currency", "clicklease", "lightstream"];
  const small = amount !== null && amount <= 25000;
  if (category && PERSONAL.has(category)) {
    return amount !== null && amount > 100000 ? ["currency", "lightstream"] : ["lightstream", "currency", ...(small ? ["clicklease" as const] : [])];
  }
  return small ? ["clicklease", "currency", "lightstream"] : ["currency", "lightstream"];
}

export function lenderHref(key: LenderKey, lotId?: string, amount?: number | null) {
  const p = new URLSearchParams({ l: key });
  if (lotId) p.set("lot", lotId);
  if (amount) p.set("amt", String(Math.round(amount)));
  return `/api/finance/go?${p.toString()}`;
}
