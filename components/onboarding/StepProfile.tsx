"use client";

import { useEffect, useState } from "react";
import { OnboardingShell } from "./OnboardingShell";
import { RefreshCw, Upload, User } from "lucide-react";

const AVATAR_COLORS = [
  ["#ff7849", "#ff3d6e"],
  ["#a855f7", "#6366f1"],
  ["#10b981", "#0ea5e9"],
  ["#f59e0b", "#ef4444"],
  ["#ec4899", "#8b5cf6"],
  ["#14b8a6", "#6366f1"],
];

const ADJECTIVES = ["Creative","Sonic","Vibrant","Cosmic","Dreamy","Bold","Neon","Electric"];
const NOUNS = ["Wave","Pulse","Beat","Sound","Echo","Rhythm","Vibe","Note"];
const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const genUsername = () => `${rand(ADJECTIVES)}${rand(NOUNS)}${Math.floor(Math.random() * 999)}`;

interface ProfileData {
  username: string;
  fullName: string;
  avatarColor: number;
}

interface Props {
  step: number;
  totalSteps: number;
  value: ProfileData;
  onChange: (v: ProfileData) => void;
  onNext: () => void;
  userEmail?: string;
}

export function StepProfile({ step, totalSteps, value, onChange, onNext, userEmail }: Props) {
  const [colors] = useState(() => AVATAR_COLORS[value.avatarColor]);

  useEffect(() => {
    if (!value.username) {
      onChange({ ...value, username: genUsername() });
    }
  }, []);

  const handleRandomUsername = () => {
    onChange({ ...value, username: genUsername() });
  };

  const handleRandomAvatar = () => {
    const next = (value.avatarColor + 1) % AVATAR_COLORS.length;
    onChange({ ...value, avatarColor: next });
  };

  const currentColors = AVATAR_COLORS[value.avatarColor];
  const initials = value.fullName
    ? value.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? "A";

  return (
    <OnboardingShell
      step={step}
      totalSteps={totalSteps}
      onContinue={onNext}
      ctaDisabled={!value.username}
    >
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl sm:text-5xl text-white leading-tight">
          Complete your profile
        </h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl"
          style={{ background: `linear-gradient(135deg, ${currentColors[0]}, ${currentColors[1]})` }}
        >
          {initials}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            <Upload className="w-3 h-3" />
            Replace Photo
          </button>
          <button
            onClick={handleRandomAvatar}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Random
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/40 mb-1.5 ml-1">Username</label>
          <div className="relative">
            <input
              value={value.username}
              onChange={(e) => onChange({ ...value, username: e.target.value })}
              placeholder="your_username"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff7849]/50 transition-colors pr-10"
            />
            <button
              onClick={handleRandomUsername}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              title="Random username"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 ml-1">Full Name <span className="text-white/20">(optional)</span></label>
          <input
            value={value.fullName}
            onChange={(e) => onChange({ ...value, fullName: e.target.value })}
            placeholder="Your full name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff7849]/50 transition-colors"
          />
        </div>
      </div>
    </OnboardingShell>
  );
}
