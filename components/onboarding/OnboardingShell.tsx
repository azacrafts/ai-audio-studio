"use client";

import { cn } from "@/lib/utils";
import { ProgressDots } from "./ProgressDots";
import { Headphones } from "lucide-react";
import Link from "next/link";

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
  onContinue: () => void;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}

export function OnboardingShell({
  step,
  totalSteps,
  children,
  onContinue,
  ctaLabel = "Continue",
  ctaDisabled = false,
  ctaLoading = false,
  onSkip,
  skipLabel = "Skip",
}: OnboardingShellProps) {
  return (
    <div className="onboarding-step grain">
      {/* Logo top */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ff7849] to-[#ff3d6e] flex items-center justify-center shadow-lg">
          <Headphones className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-white text-sm tracking-tight">Acoustic</span>
      </div>

      {/* Content */}
      <div className="w-full max-w-md mx-auto flex flex-col gap-8">
        {children}

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={onContinue}
            disabled={ctaDisabled || ctaLoading}
            className="btn-primary w-full py-4 rounded-2xl text-base flex items-center justify-center gap-2"
          >
            {ctaLoading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              ctaLabel
            )}
          </button>

          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-3 text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              {skipLabel}
            </button>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <ProgressDots total={totalSteps} current={step} />
      </div>
    </div>
  );
}
