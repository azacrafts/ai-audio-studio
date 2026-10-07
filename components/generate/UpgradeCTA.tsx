"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Zap, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SUBSCRIPTION_PLANS,
  UPGRADE_REASONS,
  type UpgradeReason,
} from "@/lib/config/pricing";

interface UpgradeCTAProps {
  open: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
}

const creatorPlan = SUBSCRIPTION_PLANS.find((p) => p.id === "creator")!;
const proPlan     = SUBSCRIPTION_PLANS.find((p) => p.id === "pro")!;

async function startCheckout(plan: string): Promise<string | null> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (data.checkoutUrl) return data.checkoutUrl;
  return null;
}

export function UpgradeCTA({ open, onClose, reason = "limit" }: UpgradeCTAProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const { title, subtitle } = UPGRADE_REASONS[reason] ?? UPGRADE_REASONS.limit;

  const handlePlan = async (plan: string) => {
    setLoading(plan);
    try {
      const url = await startCheckout(plan);
      if (url) {
        window.location.href = url;
      } else {
        // Stripe not configured — redirect to auth + pricing
        router.push(`/auth?redirect=/pricing`);
        onClose();
      }
    } catch {
      router.push("/pricing");
      onClose();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-md p-0 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-purple-600 to-violet-600" />

        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <DialogTitle className="text-lg font-bold text-white text-left">
              {title}
            </DialogTitle>
            <p className="text-sm text-white/50 text-left mt-1">{subtitle}</p>
          </DialogHeader>

          {/* Plans */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Creator */}
            <div className="relative bg-purple-600/10 border border-purple-500/30 rounded-xl p-4">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="bg-purple-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  POPULAR
                </span>
              </div>
              <p className="text-xs text-purple-300 font-semibold mb-1">{creatorPlan.name}</p>
              <div className="flex items-baseline gap-0.5 mb-3">
                <span className="text-2xl font-bold text-white">${creatorPlan.monthlyPrice}</span>
                <span className="text-white/30 text-xs">/mo</span>
              </div>
              <ul className="space-y-1.5">
                {creatorPlan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-white/60">
                    <Check className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-white/50 font-semibold mb-1">{proPlan.name}</p>
              <div className="flex items-baseline gap-0.5 mb-3">
                <span className="text-2xl font-bold text-white">${proPlan.monthlyPrice}</span>
                <span className="text-white/30 text-xs">/mo</span>
              </div>
              <ul className="space-y-1.5">
                {proPlan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-white/60">
                    <Check className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTAs */}
          <button
            onClick={() => handlePlan("creator")}
            disabled={loading !== null}
            className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-purple-900/40 text-sm mb-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading === "creator" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `Start ${creatorPlan.name} — $${creatorPlan.monthlyPrice}/mo`
            )}
          </button>

          <button
            onClick={() => handlePlan("pro")}
            disabled={loading !== null}
            className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium py-2.5 rounded-xl transition-all text-sm mb-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading === "pro" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `${proPlan.name} — $${proPlan.monthlyPrice}/mo`
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full text-white/25 hover:text-white/50 text-xs py-2 transition-colors"
          >
            Continue with Free plan (5 gen/day, watermarked)
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
