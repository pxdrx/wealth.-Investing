import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazy-init Stripe client — avoids build-time crash when env var is missing */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  elite_monthly: process.env.STRIPE_ELITE_MONTHLY_PRICE_ID!,
  elite_annual: process.env.STRIPE_ELITE_ANNUAL_PRICE_ID!,
} as const;

/** Map Stripe price ID → plan name */
export function planFromPriceId(priceId: string): "pro" | "elite" | null {
  if (priceId === PRICE_IDS.pro_monthly || priceId === PRICE_IDS.pro_annual) return "pro";
  if (priceId === PRICE_IDS.elite_monthly || priceId === PRICE_IDS.elite_annual) return "elite";
  return null;
}
