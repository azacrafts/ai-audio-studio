"use client";

import { cn } from "@/lib/utils";
import { OnboardingShell } from "./OnboardingShell";
import { Check } from "lucide-react";

const PERSONAS = [
  { value: "non-creator", label: "I don't create music, lyrics, or poetry" },
  { value: "creative-pro", label: "I'm a creative professional (e.g. advertising)" },
  { value: "musician", label: "I'm a professional musician, producer, or DJ" },
  { value: "poet", label: "I write poetry / lyrics" },
  { value: "hobby", label: "I make music as a hobby" },
  { value: "content-creator", label: "I'm a content creator" },
];

interface Props {
  step: number;
  totalSteps: number;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

export function StepPersona({ step, totalSteps, value, onChange, onNext }: Props) {
  return (
    <OnboardingShell
      step={step}
      totalSteps={totalSteps}
      onContinue={onNext}
      ctaDisabled={!value}
    >
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl sm:text-5xl text-white leading-tight">
          How would you describe yourself?
        </h1>
        <p className="text-sm text-white/40">
          We'll use this to get you set up correctly
        </p>
      </div>

      <div className="space-y-2.5">
        {PERSONAS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-4 rounded-2xl border text-left text-sm font-medium transition-all",
              value === p.value
                ? "border-[#ff7849]/50 bg-[#ff7849]/10 text-white"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06]"
            )}
          >
            <span>{p.label}</span>
            {value === p.value && (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#ff7849] to-[#ff3d6e] flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </OnboardingShell>
  );
}
