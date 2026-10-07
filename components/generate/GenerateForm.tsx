"use client";

import { useState } from "react";
import { Wand2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PRESETS } from "@/constants/presets";
import { cn } from "@/lib/utils";
import type { AIModel, GenerateRequest } from "@/types";

interface GenerateFormProps {
  defaultPresetId?: string;
  onGenerate: (req: GenerateRequest) => Promise<void>;
  isLoading: boolean;
}

const DURATION_OPTIONS = [15, 30, 60, 90, 120];
const MODEL_OPTIONS: { value: AIModel; label: string; description: string }[] = [
  { value: "suno", label: "Suno", description: "Best for music with structure" },
  { value: "stable-audio", label: "Stable Audio", description: "Best for ambient & SFX" },
];

export function GenerateForm({
  defaultPresetId,
  onGenerate,
  isLoading,
}: GenerateFormProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(
    defaultPresetId ?? PRESETS[0].id
  );
  const [model, setModel] = useState<AIModel>("suno");
  const [duration, setDuration] = useState(60);
  const [expanded, setExpanded] = useState(false);

  const activePreset = PRESETS.find((p) => p.id === selectedPreset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerate({ prompt, preset: selectedPreset, model, duration });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Preset selector */}
      <div>
        <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-3">
          Preset
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPreset(p.id)}
              className={cn(
                "relative px-3 py-2.5 rounded-xl border text-left transition-all text-sm font-medium",
                selectedPreset === p.id
                  ? "bg-purple-600/20 border-purple-500/50 text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
              )}
            >
              <span className="block text-xs font-semibold">{p.name}</span>
              <span className="block text-[10px] text-white/30 mt-0.5 truncate">
                {p.config.bpm} BPM · {p.config.mood}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div>
        <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-3">
          Describe your music{" "}
          <span className="normal-case text-white/25 ml-1">
            (optional — preset used if empty)
          </span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            activePreset?.config.defaultPrompt ??
            "e.g. upbeat cinematic music with soft guitar..."
          }
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 resize-none transition-colors"
        />
      </div>

      {/* Duration */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-white/50 uppercase tracking-widest">
            Duration
          </label>
          <span className="text-xs font-semibold text-purple-400">
            {duration}s
          </span>
        </div>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                duration === d
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* Advanced options toggle */}
      <div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform",
              expanded && "rotate-180"
            )}
          />
          Advanced options
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Model selector */}
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-3">
                AI Model
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MODEL_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setModel(m.value)}
                    className={cn(
                      "px-3 py-2.5 rounded-xl border text-left transition-all",
                      model === m.value
                        ? "bg-purple-600/20 border-purple-500/50"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "block text-xs font-semibold",
                        model === m.value ? "text-white" : "text-white/50"
                      )}
                    >
                      {m.label}
                    </span>
                    <span className="block text-[10px] text-white/30 mt-0.5">
                      {m.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold py-6 rounded-xl shadow-lg shadow-purple-900/40 border-0 text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Generating...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Generate Audio
          </span>
        )}
      </Button>
    </form>
  );
}
