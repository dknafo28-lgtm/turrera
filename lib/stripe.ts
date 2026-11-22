// Minimal Stripe Checkout through the REST API. Only used when STRIPE_SECRET_KEY is set in Vercel.
const API = "https://api.stripe.com/v1";

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

async function stripe(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? `Stripe error ${res.status}`);
  return body;
}

export async function createDepositCheckout(opts: { amount: number; description: string; email: string; requestId: string; origin: string }) {
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("customer_email", opts.email);
  p.set("line_items[0][quantity]", "1");
  p.set("line_items[0][price_data][currency]", "usd");
  p.set("line_items[0][price_data][unit_amount]", String(Math.round(opts.amount * 100)));
  p.set("line_items[0][price_data][product_data][name]", "Bidding deposit");
  p.set("line_items[0][price_data][product_data][description]", opts.description.slice(0, 300));
  p.set("metadata[request_id]", opts.requestId);
  p.set("success_url", `${opts.origin}/thanks?k=buy&r=${opts.requestId}&s={CHECKOUT_SESSION_ID}`);
  p.set("cancel_url", `${opts.origin}/thanks?k=buy&r=${opts.requestId}&unpaid=1`);
  const session = await stripe("/checkout/sessions", { method: "POST", body: p.toString() });
  return session.url as string;
}

export async function checkoutPaid(sessionId: string) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const s = await stripe(`/checkout/sessions/${sessionId}`);
  return s.payment_status === "paid" ? { requestId: s.metadata?.request_id as string, amount: (s.amount_total ?? 0) / 100 } : null;
}
