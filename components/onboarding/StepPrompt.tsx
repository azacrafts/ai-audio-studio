"use client";

import { cn } from "@/lib/utils";
import { OnboardingShell } from "./OnboardingShell";

const SUGGESTIONS = [
  "Romance","Love","My feelings","Nostalgic memory","Roasting someone","My favorite genre",
];

interface Props {
  step: number;
  totalSteps: number;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

export function StepPrompt({ step, totalSteps, value, onChange, onNext }: Props) {
  const handleChip = (chip: string) => {
    if (value.includes(chip)) {
      onChange(value.replace(chip, "").trim().replace(/^,\s*|,\s*$/g, "").replace(/,\s*,/g, ","));
    } else {
      onChange(value ? `${value}, ${chip}` : chip);
    }
  };

  return (
    <OnboardingShell
      step={step}
      totalSteps={totalSteps}
      onContinue={onNext}
    >
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl sm:text-5xl text-white leading-tight">
          What is your audio about?
        </h1>
        <p className="text-sm text-white/40">
          Describe the mood or theme — or pick a suggestion
        </p>
      </div>

      <div className="space-y-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder="The audio should be about..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff7849]/50 transition-colors resize-none"
        />

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleChip(s)}
              className={cn(
                "chip text-xs",
                value.includes(s) && "selected"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </OnboardingShell>
  );
}
