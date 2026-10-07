"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  User, Pencil, Briefcase, Mic, Code2, TrendingUp, BookOpen, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Data ──────────────────────────────────────────────────────────────────────

const USER_TYPES = [
  { id: "personal",  label: "Personal use",     icon: User,           desc: "Hobby projects & fun" },
  { id: "creator",   label: "Creator",           icon: Pencil,         desc: "Content & social media" },
  { id: "business",  label: "Content business",  icon: Briefcase,      desc: "Agencies & studios" },
  { id: "voice",     label: "Voice actor",       icon: Mic,            desc: "Voiceover & narration" },
  { id: "engineer",  label: "Engineer",          icon: Code2,          desc: "Dev & product building" },
  { id: "marketer",  label: "Marketer",          icon: TrendingUp,     desc: "Ads & campaigns" },
  { id: "education", label: "Education",         icon: BookOpen,       desc: "Teaching & e-learning" },
  { id: "other",     label: "Other",             icon: MoreHorizontal, desc: "Something else" },
];

// ── Animation phases ──────────────────────────────────────────────────────────

type AnimPhase = "idle" | "highlight" | "dimming" | "hold" | "exit";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function getCardAnimate(
  cardId: string,
  selectedId: string | null,
  phase: AnimPhase
): { opacity: number; scale: number; y: number | number[] } {
  const isSelected = cardId === selectedId;

  switch (phase) {
    case "idle":
      return { opacity: 1, scale: 1, y: 0 };
    case "highlight":
      return isSelected
        ? { opacity: 1, scale: 1.05, y: 0 }
        : { opacity: 1, scale: 1, y: 0 };
    case "dimming":
      return isSelected
        ? { opacity: 1, scale: 1.05, y: 0 }
        : { opacity: 0, scale: 0.94, y: 0 };
    case "hold":
      return isSelected
        ? { opacity: 1, scale: 1.03, y: [0, -8, 0] }
        : { opacity: 0, scale: 0.94, y: 0 };
    case "exit":
      return { opacity: 0, scale: 0.95, y: 0 };
  }
}

function getCardTransition(
  cardId: string,
  selectedId: string | null,
  phase: AnimPhase
): object {
  const isSelected = cardId === selectedId;

  switch (phase) {
    case "highlight":
      return { duration: 0.12, ease: "easeOut" };
    case "dimming":
      return isSelected
        ? { duration: 0.15 }
        : { duration: 0.32, ease: "easeOut" };
    case "hold":
      return isSelected
        ? { duration: 0.7, ease: "easeInOut" }
        : { duration: 0.1 };
    case "exit":
      return { duration: 0.3, ease: "easeIn" };
    default:
      return { duration: 0.2 };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Step1Props {
  onSelect: (userType: string) => void;
}

export function Step1UserType({ onSelect }: Step1Props) {
  const [phase, setPhase]       = useState<AnimPhase>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCardClick = useCallback(
    async (id: string) => {
      if (phase !== "idle") return; // prevent double-click

      // Phase 1 — Highlight selected (0 ms)
      setSelectedId(id);
      setPhase("highlight");

      // Phase 2 — Dim others (150 ms)
      await sleep(150);
      setPhase("dimming");

      // Phase 3 — Hold + float (500 ms after dimming starts)
      await sleep(480);
      setPhase("hold");

      // Phase 4 — Exit all (500 ms of floating)
      await sleep(500);
      setPhase("exit");

      // Transition to next step (after exit animation)
      await sleep(320);
      onSelect(id);
    },
    [phase, onSelect]
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-white leading-tight">
          Which one describes you the best?
        </h1>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {USER_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = type.id === selectedId;

          return (
            <motion.button
              key={type.id}
              onClick={() => handleCardClick(type.id)}
              animate={getCardAnimate(type.id, selectedId, phase)}
              transition={getCardTransition(type.id, selectedId, phase)}
              style={{
                boxShadow:
                  isSelected && (phase === "highlight" || phase === "dimming" || phase === "hold")
                    ? "0 0 0 1.5px rgba(255,106,61,0.7), 0 0 32px rgba(255,200,87,0.2), 0 0 80px rgba(255,46,99,0.12)"
                    : "none",
              }}
              disabled={phase !== "idle"}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border text-center transition-colors cursor-pointer",
                isSelected
                  ? "bg-[#111113] border-[#FF6A3D]/40"
                  : "bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/15"
              )}
            >
              {/* Icon container */}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-gradient-to-br from-[#FFC857] via-[#FF6A3D] to-[#FF2E63]"
                  : "bg-white/5"
              )}>
                <Icon className={cn("w-5 h-5", isSelected ? "text-white" : "text-white/40")} />
              </div>

              <div>
                <p className={cn(
                  "text-xs font-semibold leading-tight",
                  isSelected ? "text-white" : "text-white/60"
                )}>
                  {type.label}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5 leading-tight">
                  {type.desc}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
