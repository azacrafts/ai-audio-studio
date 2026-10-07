"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Zap, Music } from "lucide-react";
import Link from "next/link";
import { GRAD } from "@/lib/design-tokens";

function SuccessContent() {
  const searchParams = useSearchParams();
  const plan   = searchParams.get("plan");
  const tokens = searchParams.get("tokens");

  const isTokens = Boolean(tokens);
  const planName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Ambient glow — home palette */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(ellipse, rgba(255,106,61,0.08) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative text-center max-w-md">
        {/* Success icon */}
        <div className="relative inline-flex mb-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Check className="w-9 h-9 text-emerald-400" />
          </div>
          <div
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: GRAD }}
          >
            {isTokens ? (
              <Zap className="w-4 h-4 text-white" />
            ) : (
              <Music className="w-4 h-4 text-white" />
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          {isTokens ? "Tokens added!" : "You're upgraded!"}
        </h1>

        <p className="text-white/50 mb-2">
          {isTokens
            ? `${tokens} generation tokens have been added to your account.`
            : `Welcome to Acoustic ${planName}. Your account has been upgraded.`}
        </p>

        <p className="text-sm text-white/30 mb-8">
          {isTokens
            ? "Start generating — your tokens are ready to use."
            : "No watermarks, commercial use, and all AI models are now unlocked."}
        </p>

        {/* What's unlocked */}
        {!isTokens && planName && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
              Now unlocked on {planName}
            </p>
            <ul className="space-y-2">
              {[
                "Watermark-free downloads",
                "Commercial use license",
                planName === "Pro" ? "API access" : "4 AI models (Suno, Udio, ElevenLabs, Stable)",
                planName === "Pro" ? "Team workspace + white-label export" : "Built-in audio editor",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href="/generate">
          <button
            className="w-full text-white font-semibold py-3 rounded-xl transition-all hover:opacity-90 text-sm"
            style={{ background: GRAD }}
          >
            Start generating →
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SuccessContent />
    </Suspense>
  );
}
