/**
 * Single source of truth for all pricing content.
 *
 * All UI (pricing page, upgrade modal, AudioPlayer notice, etc.) must import
 * from here — never hardcode plan names, prices, or feature lists elsewhere.
 */

import { Sparkles, Zap, Crown, Coins } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Plan types ─────────────────────────────────────────────────────────────────

export type PlanId = "free" | "creator" | "pro";
export type BillingInterval = "monthly" | "yearly";

export interface SubscriptionPlan {
  id:            PlanId;
  name:          string;
  monthlyPrice:  number;
  yearlyPrice:   number;
  badge?:        string;
  highlighted:   boolean;
  tagline:       string;   // one-liner under price
  description:   string;   // shown under plan name
  icon:          LucideIcon;
  features:      string[];
  cta:           string;
}

export interface TokenTier {
  tokens:  number;  // generation credits
  price:   number;  // USD
  label:   string;
  priceId?: string; // Stripe price ID env key
}

export interface TokenPlan {
  id:          "tokens";
  name:        string;
  tagline:     string;
  description: string;
  icon:        LucideIcon;
  highlighted: false;
  tiers:       TokenTier[];
  features:    string[];   // shared benefits across all tiers
  cta:         string;
}

// ── Subscription plans ─────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id:           "free",
    name:         "Free",
    monthlyPrice: 0,
    yearlyPrice:  0,
    highlighted:  false,
    tagline:      "Sign in and try.",
    description:  "No barriers. No card required.",
    icon:         Sparkles,
    features: [
      "5 generations per day",
      "All presets available",
      "Watermark on export",
      "Personal use only",
    ],
    cta: "Get started free",
  },
  {
    id:           "creator",
    name:         "Creator",
    monthlyPrice: 20,
    yearlyPrice:  16,
    badge:        "Most Popular",
    highlighted:  true,
    tagline:      "Full access. One subscription instead of four.",
    description:  "For creators who generate daily.",
    icon:         Zap,
    features: [
      "Unlimited generations",
      "4 AI models (Suno, Udio, ElevenLabs, Stable)",
      "Built-in editor",
      "Commercial license forever",
      "All presets + custom presets",
      "Priority queue",
    ],
    cta: "Select Creator",
  },
  {
    id:           "pro",
    name:         "Pro",
    monthlyPrice: 49,
    yearlyPrice:  39,
    highlighted:  false,
    tagline:      "For agencies, brands, production teams.",
    description:  "Everything in Creator — scaled for teams.",
    icon:         Crown,
    features: [
      "Everything in Creator × 3 seats",
      "Team workspace",
      "White-label export",
      "API access",
      "Priority support",
    ],
    cta: "Select Pro",
  },
];

// ── Token plan (à la carte) ────────────────────────────────────────────────────

export const TOKEN_PLAN: TokenPlan = {
  id:          "tokens",
  name:        "Tokens",
  tagline:     "Pay only for what you need.",
  description: "No limits — buy as much as you want.",
  icon:        Coins,
  highlighted: false,
  tiers: [
    { tokens: 50,  price: 5,  label: "50 generations"  },
    { tokens: 150, price: 12, label: "150 generations" },
    { tokens: 500, price: 35, label: "500 generations" },
  ],
  features: [
    "Tokens never expire",
    "No watermark",
    "Commercial license",
  ],
  cta: "Buy tokens",
};

// ── Daily limits (for backend enforcement) ─────────────────────────────────────

export const DAILY_LIMITS: Record<PlanId | string, number> = {
  free:    5,
  creator: 99999,  // effectively unlimited
  pro:     99999,
};

// ── Upgrade CTA copy ───────────────────────────────────────────────────────────

export const UPGRADE_REASONS = {
  limit: {
    title:    "You've hit your daily limit",
    subtitle: "Free plan: 5 gen/day. Upgrade to keep creating.",
  },
  download: {
    title:    "Unlock clean downloads",
    subtitle: "Remove the watermark and get commercial use rights.",
  },
  watermark: {
    title:    "Remove the watermark",
    subtitle: "Upgrade to download studio-quality, watermark-free audio.",
  },
} as const;

export type UpgradeReason = keyof typeof UPGRADE_REASONS;

// ── Stripe amounts (cents) ─────────────────────────────────────────────────────

export const STRIPE_AMOUNTS = {
  creator_monthly: 2000,
  creator_yearly:  1600,
  pro_monthly:     4900,
  pro_yearly:      3900,
  tokens_50:       500,
  tokens_150:      1200,
  tokens_500:      3500,
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getPlanPrice(plan: SubscriptionPlan, billing: BillingInterval) {
  return billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
}

export function getYearlySavings(plan: SubscriptionPlan) {
  return (plan.monthlyPrice - plan.yearlyPrice) * 12;
}
