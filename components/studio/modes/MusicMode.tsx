"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { PRESETS } from "@/constants/presets";
import { cn } from "@/lib/utils";
import type { StudioRequest, VocalGender } from "@/types";

interface ModelOption {
  value: string;
  label: string;
  badge: string;
  description: string;
}

const SUNO_MODELS: ModelOption[] = [
  { value: "V4",       label: "V4",    badge: "Stable",  description: "Clear vocals · up to 4 min" },
  { value: "V4_5",     label: "V4.5",  badge: "Fast",    description: "Smart prompts · up to 8 min" },
  { value: "V4_5PLUS", label: "V4.5+", badge: "Rich",    description: "Richer sound · up to 8 min" },
  { value: "V5",       label: "V5",    badge: "Best",    description: "Superior quality · up to 8 min" },
];

const DURATION_OPTIONS = [
  { label: "Auto",  value: null },
  { label: "15s",   value: 15   },
  { label: "30s",   value: 30   },
  { label: "60s",   value: 60   },
  { label: "90s",   value: 90   },
  { label: "120s",  value: 120  },
] as const;

interface MusicModeProps {
  provider?:        "suno" | "stable-audio";
  defaultPresetId?: string;
  defaultPrompt?:   string;
  defaultDuration?: number;
  isLoading:        boolean;
  onSubmit:         (req: Partial<StudioRequest>) => void;
}

export function MusicMode({ provider = "suno", defaultPresetId, defaultPrompt, defaultDuration, isLoading, onSubmit }: MusicModeProps) {
  const [model, setModel]           = useState("V4_5");
  const [prompt, setPrompt]         = useState(defaultPrompt ?? "");
  const [selectedPreset, setPreset] = useState<string | null>(defaultPresetId ?? null);
  const [showAdvanced, setShowAdv]  = useState(false);
  const [duration, setDuration]     = useState<number | null>(defaultDuration ?? null);
  const [vocalGender, setVocalGender] = useState<VocalGender>(null);
  const [style, setStyle]           = useState("");
  const [bpm, setBpm]               = useState("");
  const [instrumental, setInstrumental] = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const activePreset = PRESETS.find((p) => p.id === selectedPreset);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!prompt.trim() && !selectedPreset) {
      setError("Enter a prompt or select a preset.");
      return;
    }
    onSubmit({
      provider,
      mode:        "music",
      model,
      prompt:      prompt.trim() || undefined,
      preset:      selectedPreset ?? undefined,
      duration,
      vocalGender: instrumental ? null : vocalGender,
      style:       style.trim() || undefined,
      bpm:         bpm ? parseInt(bpm, 10) : undefined,
      instrumental,
      displayTitle: prompt.trim() || activePreset?.name || "Generated Track",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Model */}
      <section>
        <label className="section-label">Model</label>
        <div className="grid grid-cols-4 gap-2">
          {SUNO_MODELS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setModel(m.value)}
              className={cn(
                "flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all",
                model === m.value
                  ? "border-[#ff7849]/60 bg-[#ff7849]/10 text-white"
                  : "border-white/8 bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <span className="text-xs font-bold leading-none">{m.label}</span>
              <span className={cn(
                "text-[9px] font-semibold px-1 py-0.5 rounded-sm leading-none",
                model === m.value ? "bg-[#ff7849]/20 text-[#ff9a7a]" : "bg-white/5 text-white/25"
              )}>{m.badge}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/25 mt-1.5 ml-0.5">
          {SUNO_MODELS.find((m) => m.value === model)?.description}
        </p>
      </section>

      {/* Prompt */}
      <section>
        <label className="section-label">
          Describe your track
          {!prompt && !selectedPreset && (
            <span className="normal-case text-[#ff7849]/70 text-[10px] ml-1.5">required if no preset</span>
          )}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); setError(null); }}
          rows={3}
          placeholder={activePreset?.config.defaultPrompt ?? "Upbeat cinematic travel music with light percussion..."}
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff7849]/40 resize-none transition-colors leading-relaxed"
        />
      </section>

      {/* Presets */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="section-label !mb-0">
            Preset <span className="normal-case text-white/25 text-[10px] ml-1.5">optional</span>
          </label>
          {selectedPreset && (
            <button type="button" onClick={() => setPreset(null)}
              className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} type="button"
              onClick={() => { setPreset(p.id === selectedPreset ? null : p.id); setError(null); }}
              className={cn(
                "px-3 py-2 rounded-xl border text-left transition-all",
                selectedPreset === p.id
                  ? "border-[#ff7849]/50 bg-[#ff7849]/10 text-white"
                  : "border-white/8 bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]"
              )}>
              <span className="block text-[11px] font-semibold leading-none">{p.name}</span>
              <span className="block text-[10px] text-white/30 mt-0.5">{p.config.bpm ?? "--"} BPM</span>
            </button>
          ))}
        </div>
      </section>

      {/* Advanced */}
      <section>
        <button type="button" onClick={() => setShowAdv(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors w-full">
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
          <span>Advanced options</span>
          {(duration != null || vocalGender || style || bpm) && (
            <span className="ml-auto text-[10px] text-[#ff7849]/60 font-semibold">
              {[duration != null && `${duration}s`, vocalGender, style && "style", bpm && "BPM"].filter(Boolean).join(" · ")}
            </span>
          )}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4 border border-white/8 rounded-xl p-4 bg-white/[0.02]">
            {/* Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Duration</label>
                <span className="text-[11px] font-semibold text-[#ff7849]">{duration == null ? "Auto" : `${duration}s`}</span>
              </div>
              <div className="flex gap-1.5">
                {DURATION_OPTIONS.map((d) => (
                  <button key={d.label} type="button"
                    onClick={() => setDuration(d.value as number | null)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                      duration === d.value ? "bg-[#ff7849] text-white" : "bg-white/5 text-white/35 hover:text-white hover:bg-white/10"
                    )}>{d.label}</button>
                ))}
              </div>
            </div>

            {/* Instrumental */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Instrumental only</span>
              <button type="button" onClick={() => setInstrumental(!instrumental)}
                className={cn("relative w-10 h-5 rounded-full transition-colors", instrumental ? "bg-[#ff7849]" : "bg-white/10")}>
                <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", instrumental ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>

            {!instrumental && (
              <div>
                <label className="block text-[11px] text-white/35 mb-1.5">Vocal gender</label>
                <div className="flex gap-2">
                  {(["None", "Male", "Female"] as const).map((v) => {
                    const val = v === "None" ? null : v.toLowerCase() as VocalGender;
                    return (
                      <button key={v} type="button" onClick={() => setVocalGender(val)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                          vocalGender === val ? "border-[#ff7849]/50 bg-[#ff7849]/10 text-white" : "border-white/8 bg-white/[0.03] text-white/40 hover:text-white"
                        )}>{v}</button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-white/35 mb-1">Style hints</label>
              <input value={style} onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g. folk, acoustic, nostalgic"
                className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff7849]/30 transition-colors" />
            </div>

            <div>
              <label className="block text-[11px] text-white/35 mb-1">BPM override</label>
              <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)}
                placeholder="e.g. 128" min={40} max={220}
                className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff7849]/30 transition-colors" />
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
          : "Generate Music"
        }
      </button>
    </form>
  );
}
