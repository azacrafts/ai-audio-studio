"use client";

import { useState } from "react";
import { ChevronDown, Zap } from "lucide-react";
import { SFX_CATEGORIES } from "@/lib/ai/elevenlabs";
import { cn } from "@/lib/utils";
import type { StudioRequest } from "@/types";

interface SFXModeProps {
  isLoading: boolean;
  onSubmit: (req: Partial<StudioRequest>) => void;
}

const DURATION_OPTIONS = [
  { label: "Auto", value: null },
  { label: "2s",   value: 2  },
  { label: "5s",   value: 5  },
  { label: "10s",  value: 10 },
  { label: "20s",  value: 20 },
  { label: "30s",  value: 30 },
] as const;

export function SFXMode({ isLoading, onSubmit }: SFXModeProps) {
  const [prompt, setPrompt]         = useState("");
  const [activeCategory, setCategory] = useState<string | null>(null);
  const [duration, setDuration]     = useState<number | null>(null);
  const [showAdvanced, setShowAdv]  = useState(false);
  const [promptInfluence, setInfluence] = useState(0.3);
  const [error, setError]           = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!prompt.trim()) {
      setError("Describe the sound effect you want.");
      return;
    }
    onSubmit({
      provider: "elevenlabs",
      mode:     "sfx",
      model:    "sound-generation",
      prompt:   prompt.trim(),
      duration,
      displayTitle: prompt.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Category quick-picks */}
      <section>
        <label className="section-label">Category</label>
        <div className="flex flex-wrap gap-1.5">
          {SFX_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(activeCategory === c.id ? null : c.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                activeCategory === c.id
                  ? "border-[#ff7849]/50 bg-[#ff7849]/10 text-[#ff9a7a]"
                  : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Suggestion prompts from active category */}
        {activeCategory && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SFX_CATEGORIES.find((c) => c.id === activeCategory)?.prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrompt(p)}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Prompt */}
      <section>
        <label className="section-label">Describe the sound</label>
        <textarea
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); setError(null); }}
          rows={3}
          placeholder="Rain on a metal roof, heavy downpour with distant thunder..."
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff7849]/40 resize-none transition-colors leading-relaxed"
        />
      </section>

      {/* Duration */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="section-label !mb-0">Duration</label>
          <span className="text-[11px] font-semibold text-[#ff7849]">{duration == null ? "Auto" : `${duration}s`}</span>
        </div>
        <div className="flex gap-1.5">
          {DURATION_OPTIONS.map((d) => (
            <button key={d.label} type="button"
              onClick={() => setDuration(d.value as number | null)}
              className={cn(
                "flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all",
                duration === d.value ? "bg-[#ff7849] text-white shadow-md" : "bg-white/5 text-white/35 hover:text-white hover:bg-white/10"
              )}>{d.label}</button>
          ))}
        </div>
      </section>

      {/* Advanced */}
      <section>
        <button type="button" onClick={() => setShowAdv(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
          Advanced options
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-3 border border-white/8 rounded-xl p-4 bg-white/[0.02]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-white/35">Prompt influence</label>
                <span className="text-[11px] font-semibold text-[#ff7849]">{Math.round(promptInfluence * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={promptInfluence}
                onChange={(e) => setInfluence(parseFloat(e.target.value))}
                className="w-full h-1 accent-[#ff7849]" />
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-white/20">More variation</span>
                <span className="text-[10px] text-white/20">Strict to prompt</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button type="submit" disabled={isLoading}
        className="btn-primary w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
        {isLoading
          ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          : <><Zap className="w-4 h-4" /> Generate Sound Effect</>
        }
      </button>
    </form>
  );
}
