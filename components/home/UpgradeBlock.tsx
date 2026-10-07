"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";

interface UpgradeBlockProps {
  used: number;
  limit: number;
}

export function UpgradeBlock({ used, limit }: UpgradeBlockProps) {
  const [loading, setLoading] = useState(false);

  if (used < limit) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "creator" }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch {
      window.location.href = "/pricing";
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0f08] to-[#150a10] border border-[#ff7849]/20 rounded-2xl p-5 flex items-center gap-4">
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#ff7849]/5 to-[#ff3d6e]/5 pointer-events-none" />

      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff7849] to-[#ff3d6e] flex items-center justify-center flex-shrink-0">
        <Zap className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Free plan limit reached</p>
        <p className="text-xs text-white/40 mt-0.5">
          You've used {used}/{limit} daily generations. Upgrade for unlimited access.
        </p>
      </div>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="btn-primary flex-shrink-0 px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <Zap className="w-3.5 h-3.5" />
            Upgrade
          </>
        )}
      </button>
    </div>
  );
}
