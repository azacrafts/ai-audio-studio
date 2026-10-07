"use client";

import { OnboardingShell } from "./OnboardingShell";
import { Music2, Sparkles, Zap } from "lucide-react";

interface Props {
  step: number;
  totalSteps: number;
  onGenerate: () => void;
  isLoading: boolean;
  persona: string;
  genres: string[];
  prompt: string;
}

export function StepGenerate({ step, totalSteps, onGenerate, isLoading, persona, genres, prompt }: Props) {
  return (
    <OnboardingShell
      step={step}
      totalSteps={totalSteps}
      onContinue={onGenerate}
      ctaLabel={isLoading ? "Generating..." : "Make my first audio"}
      ctaLoading={isLoading}
    >
      <div className="text-center space-y-4">
        {/* Animated icon */}
        <div className="relative inline-flex">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ff7849] to-[#ff3d6e] flex items-center justify-center shadow-2xl shadow-orange-900/40">
            <Sparkles className="w-9 h-9 text-white" />
          </div>
          {/* Orbiting dots */}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center animate-bounce">
            <Music2 className="w-2.5 h-2.5 text-white" />
          </div>
          <div
            className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center animate-bounce"
            style={{ animationDelay: "0.15s" }}
          >
            <Zap className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl text-white leading-tight">
          Let's make your first audio
        </h1>
        <p className="text-sm text-white/40 max-w-xs mx-auto leading-relaxed">
          We'll generate 2 unique variations based on your preferences — ready in seconds.
        </p>
      </div>

      {/* Summary of choices */}
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 space-y-2.5">
        {prompt && (
          <div className="flex gap-3">
            <span className="text-white/25 text-xs w-16 flex-shrink-0 mt-0.5">Theme</span>
            <span className="text-white/60 text-xs leading-relaxed">{prompt}</span>
          </div>
        )}
        {genres.length > 0 && (
          <div className="flex gap-3">
            <span className="text-white/25 text-xs w-16 flex-shrink-0 mt-0.5">Style</span>
            <span className="text-white/60 text-xs leading-relaxed">
              {genres.slice(0, 3).join(", ")}{genres.length > 3 ? ` +${genres.length - 3} more` : ""}
            </span>
          </div>
        )}
        {persona && (
          <div className="flex gap-3">
            <span className="text-white/25 text-xs w-16 flex-shrink-0 mt-0.5">You are</span>
            <span className="text-white/60 text-xs">{persona}</span>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}
