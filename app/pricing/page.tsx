"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { GRAD } from "@/lib/design-tokens";
import {
  SUBSCRIPTION_PLANS,
  TOKEN_PLAN,
  getPlanPrice,
  getYearlySavings,
  type SubscriptionPlan,
  type BillingInterval,
} from "@/lib/config/pricing";

// ── Subscription pricing card ─────────────────────────────────────────────────

function PricingCard({
  plan,
  billing,
  onSelect,
  loading,
}: {
  plan: SubscriptionPlan;
  billing: BillingInterval;
  onSelect: (planId: string) => void;
  loading: string | null;
}) {
  const price     = getPlanPrice(plan, billing);
  const savings   = getYearlySavings(plan);
  const Icon      = plan.icon;
  const isLoading = loading === plan.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition-shadow",
        plan.highlighted
          ? "bg-[#111113] border-[#FF6A3D]/40 shadow-2xl shadow-[#FF6A3D]/20 scale-[1.03]"
          : "bg-white/[0.025] border-white/8"
      )}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-[#FFC857] via-[#FF6A3D] to-[#FF2E63] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
            {plan.badge}
          </span>
        </div>
      )}

      {plan.highlighted && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF6A3D]/8 to-transparent" />
          <div className="absolute inset-0 rounded-2xl border border-[#FF6A3D]/25" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          plan.highlighted
            ? "bg-gradient-to-br from-[#FFC857] via-[#FF6A3D] to-[#FF2E63] shadow-lg shadow-[#FF6A3D]/30"
            : "bg-white/5"
        )}>
          <Icon className={cn("w-5 h-5", plan.highlighted ? "text-white" : "text-white/40")} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{plan.name}</p>
          <p className="text-[11px] text-white/35">{plan.description}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-3">
        <div className="flex items-end gap-1">
          <AnimatePresence mode="wait">
            <motion.span
              key={`${plan.id}-${billing}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className={cn(
                "text-4xl font-bold leading-none",
                plan.highlighted ? "text-white" : "text-white/80"
              )}
            >
              ${price}
            </motion.span>
          </AnimatePresence>
          {plan.monthlyPrice > 0 && (
            <span className="text-white/30 text-sm mb-0.5">/mo</span>
          )}
        </div>
        <p className="text-[11px] text-white/30 mt-1 leading-tight">{plan.tagline}</p>
        {billing === "yearly" && savings > 0 && (
          <p className="text-[11px] text-[#FFC857] mt-1 font-medium">
            Billed ${price * 12}/year · Save ${savings}/yr
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2.5 flex-1 mb-6">
        {plan.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5">
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
              plan.highlighted
                ? "bg-gradient-to-br from-[#FFC857] via-[#FF6A3D] to-[#FF2E63]"
                : "bg-white/8"
            )}>
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
            <span className="text-xs text-white/55 leading-tight">{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={() => onSelect(plan.id)}
        disabled={isLoading}
        className={cn(
          "w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
          plan.highlighted
            ? "btn-primary"
            : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
        )}
      >
        {isLoading ? (
          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          plan.cta
        )}
      </button>
    </motion.div>
  );
}

// ── Tokens card (à la carte) ──────────────────────────────────────────────────

function TokensCard({
  onSelect,
  loading,
}: {
  onSelect: (planId: string) => void;
  loading: string | null;
}) {
  const Icon = TOKEN_PLAN.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col rounded-2xl border border-white/8 bg-white/[0.025] p-6 col-span-1 md:col-span-3"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Left: header + benefits */}
        <div className="md:w-56 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white/40" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{TOKEN_PLAN.name} <span className="text-white/30 font-normal text-xs">(à la carte)</span></p>
              <p className="text-[11px] text-white/35">{TOKEN_PLAN.description}</p>
            </div>
          </div>
          <p className="text-[11px] text-white/30 mb-4">{TOKEN_PLAN.tagline}</p>
          <ul className="space-y-1.5">
            {TOKEN_PLAN.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
                <span className="text-xs text-white/55">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: tier buttons */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TOKEN_PLAN.tiers.map((tier) => (
            <button
              key={tier.tokens}
              onClick={() => onSelect(`tokens_${tier.tokens}`)}
              disabled={loading !== null}
              className="flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all group disabled:opacity-50"
            >
              <span className="text-2xl font-bold text-white/80 group-hover:text-white transition-colors">
                ${tier.price}
              </span>
              <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
                {tier.label}
              </span>
              {loading === `tokens_${tier.tokens}` && (
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin mt-1" />
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Billing toggle ────────────────────────────────────────────────────────────

function BillingToggle({
  billing,
  onChange,
}: {
  billing: "monthly" | "yearly";
  onChange: (v: "monthly" | "yearly") => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("text-sm transition-colors", billing === "monthly" ? "text-white" : "text-white/35")}>
        Monthly
      </span>

      <button
        onClick={() => onChange(billing === "monthly" ? "yearly" : "monthly")}
        className="relative w-12 h-6 rounded-full bg-white/10 border border-white/10"
      >
        <motion.div
          animate={{ x: billing === "yearly" ? 24 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-gradient-to-br from-[#FFC857] via-[#FF6A3D] to-[#FF2E63] shadow-sm"
        />
      </button>

      <div className="flex items-center gap-2">
        <span className={cn("text-sm transition-colors", billing === "yearly" ? "text-white" : "text-white/35")}>
          Yearly
        </span>
        <AnimatePresence>
          {billing === "yearly" && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8, x: -4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="text-[10px] font-bold bg-gradient-to-r from-[#FFC857] via-[#FF6A3D] to-[#FF2E63] text-white px-2 py-0.5 rounded-full"
            >
              2 months free
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function PricingPageInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams.get("from") === "onboarding";

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (planId: string) => {
    // Free plan or onboarding skip → go straight to studio
    if (planId === "free") {
      router.push("/generate");
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, billing }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push("/generate");
      }
    } catch {
      router.push("/generate");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#FF6A3D]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[350px] bg-[#FF2E63]/4 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Back nav */}
        {fromOnboarding ? (
          <div className="flex items-center justify-between mb-14">
            <Image
              src="/logo.png"
              alt="Acoustic"
              width={100}
              height={32}
              className="h-7 w-auto object-contain"
              style={{ mixBlendMode: "screen" }}
            />
            <span className="text-xs text-white/25">Step 4 of 4</span>
          </div>
        ) : (
          <div className="mb-12">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>
        )}

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="text-center space-y-4 mb-10"
        >
          <p className="text-xs font-semibold text-[#FF6A3D] uppercase tracking-widest">Pricing</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white leading-[1.05]">
            Start creating<br className="hidden sm:block" /> amazing audio
          </h1>
          <p className="text-white/40 text-base max-w-md mx-auto leading-relaxed">
            Pick the plan that fits your workflow. Upgrade or cancel anytime.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex justify-center mb-12"
        >
          <BillingToggle billing={billing} onChange={setBilling} />
        </motion.div>

        {/* Subscription pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center mb-5">
          {SUBSCRIPTION_PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            >
              <PricingCard
                plan={plan}
                billing={billing}
                onSelect={handleSelect}
                loading={loading}
              />
            </motion.div>
          ))}
        </div>

        {/* Tokens à la carte */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          <TokensCard onSelect={handleSelect} loading={loading} />
        </motion.div>

        {/* Skip */}
        {fromOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-center mt-10"
          >
            <button
              onClick={() => router.push("/generate")}
              className="text-sm text-white/25 hover:text-white/50 transition-colors"
            >
              Skip for now — start with free plan
            </button>
          </motion.div>
        )}

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-14 text-xs text-white/20"
        >
          {["Cancel anytime", "No hidden fees", "Instant access", "14-day money-back"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-[#FF6A3D]/50" />
              {t}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000000]" />}>
      <PricingPageInner />
    </Suspense>
  );
}
