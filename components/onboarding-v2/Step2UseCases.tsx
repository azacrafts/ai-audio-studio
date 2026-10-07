"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Play, Megaphone, Headphones, Music, Mic2, MoreHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const USE_CASES = [
  { id: "tiktok",    label: "TikTok / Reels",    icon: Smartphone,   desc: "Short-form social content" },
  { id: "youtube",   label: "YouTube videos",     icon: Play,         desc: "Long-form video content" },
  { id: "ads",       label: "Ads / marketing",    icon: Megaphone,    desc: "Campaigns & commercials" },
  { id: "podcasts",  label: "Podcasts",           icon: Headphones,   desc: "Episodes & intros" },
  { id: "music",     label: "Music production",   icon: Music,        desc: "Original tracks & beats" },
  { id: "voiceover", label: "Voiceovers",         icon: Mic2,         desc: "Narration & dubbing" },
  { id: "other",     label: "Other",              icon: MoreHorizontal, desc: "Something else" },
];

interface Step2Props {
  onContinue: (useCases: string[]) => void;
}

export function Step2UseCases({ onContinue }: Step2Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl text-white leading-tight">
          What are you trying to create?
        </h1>
        <p className="text-sm text-white/35">Select all that apply</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {USE_CASES.map((uc) => {
          const Icon = uc.icon;
          const isSelected = selected.has(uc.id);

          return (
            <motion.button
              key={uc.id}
              onClick={() => toggle(uc.id)}
              whileTap={{ scale: 0.97 }}
              style={{
                boxShadow: isSelected
                  ? "0 0 0 1.5px rgba(255,120,73,0.5), 0 0 24px rgba(255,120,73,0.12)"
                  : "none",
              }}
              className={cn(
                "relative flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200",
                isSelected
                  ? "bg-[#FF6A3D]/8 border-[#FF6A3D]/35 text-white"
                  : "bg-white/[0.03] border-white/8 text-white/55 hover:bg-white/[0.06] hover:text-white hover:border-white/15"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                isSelected ? "bg-gradient-to-br from-[#FFC857] via-[#FF6A3D] to-[#FF2E63]" : "bg-white/5"
              )}>
                <Icon className={cn("w-4.5 h-4.5", isSelected ? "text-white" : "text-white/35")} style={{ width: 18, height: 18 }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-none">{uc.label}</p>
                <p className="text-[10px] text-white/30 mt-1 leading-tight">{uc.desc}</p>
              </div>

              {/* Check mark */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FFC857] via-[#FF6A3D] to-[#FF2E63] flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => onContinue(Array.from(selected))}
        disabled={selected.size === 0}
        whileTap={{ scale: 0.98 }}
        className="btn-primary w-full py-4 rounded-2xl text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        Continue
        {selected.size > 0 && (
          <span className="text-white/60 font-normal text-xs">
            · {selected.size} selected
          </span>
        )}
      </motion.button>
    </div>
  );
}
