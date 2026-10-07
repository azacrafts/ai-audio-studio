import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[Stripe] STRIPE_SECRET_KEY not set — payment features disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    })
  : null;

export const PLANS = {
  creator: {
    name:     "Creator",
    priceId:  process.env.STRIPE_PRICE_CREATOR ?? "",
    amount:   2000,   // $20.00/mo
    currency: "usd",
    features: ["Unlimited generations", "4 AI models", "Commercial license", "Built-in editor"],
  },
  pro: {
    name:     "Pro",
    priceId:  process.env.STRIPE_PRICE_PRO ?? "",
    amount:   4900,   // $49.00/mo
    currency: "usd",
    features: ["Everything in Creator × 3 seats", "Team workspace", "White-label export", "API access"],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** À la carte token packs — not subscriptions */
export const TOKEN_PACKS = [
  { tokens: 50,  price: 500,  label: "50 generations",  priceId: process.env.STRIPE_PRICE_TOKENS_50  ?? "" },
  { tokens: 150, price: 1200, label: "150 generations", priceId: process.env.STRIPE_PRICE_TOKENS_150 ?? "" },
  { tokens: 500, price: 3500, label: "500 generations", priceId: process.env.STRIPE_PRICE_TOKENS_500 ?? "" },
] as const;
