"use client";

import { cn } from "@/lib/utils";
import { OnboardingShell } from "./OnboardingShell";
import { Plus } from "lucide-react";

const GENRES = [
  "Pop","Hip Hop","Rock","Latin","R&B","Country","EDM","K-Pop",
  "Afrobeats","Trap","Indie","Lo-Fi Beats","Electronic","Techno",
  "House","Heavy Metal","Jazz","Soul","Classical","Reggaeton",
  "Alternative Pop","Drum And Bass","Synthwave","Funk","Blues",
];

interface Props {
  step: number;
  totalSteps: number;
  value: string[];
  onChange: (v: string[]) => void;
  onNext: () => void;
}

export function StepGenres({ step, totalSteps, value, onChange, onNext }: Props) {
  const toggle = (g: string) => {
    onChange(
      value.includes(g) ? value.filter((x) => x !== g) : [...value, g]
    );
  };

  return (
    <OnboardingShell
      step={step}
      totalSteps={totalSteps}
      onContinue={onNext}
      ctaDisabled={value.length === 0}
    >
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl sm:text-5xl text-white leading-tight">
          Select genres
        </h1>
        <p className="text-sm text-white/40">
          We'll use this to personalize your experience
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5 justify-center max-h-64 overflow-y-auto scrollbar-hide">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => toggle(g)}
            className={cn("chip", value.includes(g) && "selected")}
          >
            {g}
          </button>
        ))}
        <button className="chip flex items-center gap-1">
          <Plus className="w-3 h-3" />
          Add Genre
        </button>
      </div>

      {value.length > 0 && (
        <p className="text-center text-xs text-white/30">
          {value.length} selected
        </p>
      )}
    </OnboardingShell>
  );
}
