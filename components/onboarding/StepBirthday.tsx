"use client";

import { OnboardingShell } from "./OnboardingShell";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

interface Props {
  step: number;
  totalSteps: number;
  value: { month: string; day: string; year: string };
  onChange: (v: { month: string; day: string; year: string }) => void;
  onNext: () => void;
  onSkip: () => void;
}

export function StepBirthday({ step, totalSteps, value, onChange, onNext, onSkip }: Props) {
  const selectClass =
    "flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3.5 text-sm text-white appearance-none focus:outline-none focus:border-[#ff7849]/50 transition-colors cursor-pointer";

  return (
    <OnboardingShell
      step={step}
      totalSteps={totalSteps}
      onContinue={onNext}
      onSkip={onSkip}
      skipLabel="Skip for now"
    >
      <div className="text-center space-y-3">
        <h1 className="font-display text-4xl sm:text-5xl text-white leading-tight">
          When's your birthday?
        </h1>
        <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">
          Your birthday is kept private.{" "}
          <span className="underline underline-offset-2 cursor-pointer">
            Learn more about why we need this information
          </span>
        </p>
      </div>

      <div className="flex gap-3">
        <select
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
          className={selectClass}
        >
          <option value="" className="bg-zinc-900">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)} className="bg-zinc-900">{m}</option>
          ))}
        </select>

        <select
          value={value.day}
          onChange={(e) => onChange({ ...value, day: e.target.value })}
          className={selectClass}
        >
          <option value="" className="bg-zinc-900">Day</option>
          {DAYS.map((d) => (
            <option key={d} value={String(d)} className="bg-zinc-900">{d}</option>
          ))}
        </select>

        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
          className={selectClass}
        >
          <option value="" className="bg-zinc-900">Year</option>
          {YEARS.map((y) => (
            <option key={y} value={String(y)} className="bg-zinc-900">{y}</option>
          ))}
        </select>
      </div>
    </OnboardingShell>
  );
}
