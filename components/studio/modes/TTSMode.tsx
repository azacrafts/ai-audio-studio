"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Mic, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ElevenLabsVoice } from "@/lib/ai/elevenlabs";
import type { StudioRequest } from "@/types";

interface TTSModeProps {
  isLoading: boolean;
  onSubmit: (req: Partial<StudioRequest>) => void;
}

const TTS_MODELS = [
  { value: "eleven_multilingual_v2", label: "Multilingual v2", badge: "Best", description: "29 languages, highest quality" },
  { value: "eleven_turbo_v2_5",      label: "Turbo v2.5",      badge: "Fast",  description: "Low latency, 32 languages" },
  { value: "eleven_flash_v2_5",      label: "Flash v2.5",      badge: "Ultra", description: "Ultra-fast generation" },
];

export function TTSMode({ isLoading, onSubmit }: TTSModeProps) {
  const [text, setText]           = useState("");
  const [modelId, setModelId]     = useState("eleven_multilingual_v2");
  const [voices, setVoices]       = useState<ElevenLabsVoice[]>([]);
  const [voiceId, setVoiceId]     = useState("21m00Tcm4TlvDq8ikWAM"); // Rachel
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [showAdvanced, setShowAdv] = useState(false);
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [style, setStyle]         = useState(0);
  const [speed, setSpeed]         = useState(1.0);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    setLoadingVoices(true);
    fetch("/api/elevenlabs/voices")
      .then((r) => r.json())
      .then((d) => { setVoices(d.voices ?? []); })
      .catch(() => {})
      .finally(() => setLoadingVoices(false));
  }, []);

  const selectedVoice = voices.find((v) => v.voice_id === voiceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!text.trim()) { setError("Enter the text to speak."); return; }
    if (!voiceId)     { setError("Select a voice."); return; }

    onSubmit({
      provider:    "elevenlabs",
      mode:        "tts",
      model:       modelId,
      text:        text.trim(),
      voiceId,
      voiceName:   selectedVoice?.name,
      stability,
      similarity_boost: similarity,
      styleExaggeration: style,
      speed,
      displayTitle: `"${text.trim().slice(0, 40)}${text.length > 40 ? "…" : ""}" — ${selectedVoice?.name ?? "Voice"}`,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Model */}
      <section>
        <label className="section-label">Model</label>
        <div className="space-y-1.5">
          {TTS_MODELS.map((m) => (
            <button key={m.value} type="button" onClick={() => setModelId(m.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                modelId === m.value
                  ? "border-[#ff7849]/60 bg-[#ff7849]/10"
                  : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
              )}>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-bold text-white leading-none">{m.label}</span>
                <span className="block text-[10px] text-white/30 mt-0.5">{m.description}</span>
              </div>
              <span className={cn(
                "text-[9px] font-semibold px-1.5 py-0.5 rounded-md",
                modelId === m.value ? "bg-[#ff7849]/20 text-[#ff9a7a]" : "bg-white/5 text-white/25"
              )}>{m.badge}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Text input */}
      <section>
        <label className="section-label">
          Text to speak
          <span className="normal-case text-white/25 text-[10px] ml-1.5">
            {text.length}/5000
          </span>
        </label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value.slice(0, 5000)); setError(null); }}
          rows={5}
          placeholder="Enter the text you want to convert to speech. Can be any language..."
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff7849]/40 resize-none transition-colors leading-relaxed"
        />
      </section>

      {/* Voice selector */}
      <section>
        <label className="section-label">Voice</label>
        {loadingVoices ? (
          <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
        ) : (
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto scrollbar-hide pr-0.5">
            {voices.map((v) => (
              <button key={v.voice_id} type="button" onClick={() => setVoiceId(v.voice_id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all",
                  voiceId === v.voice_id
                    ? "border-[#ff7849]/50 bg-[#ff7849]/10"
                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                )}>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                  v.labels.gender === "female" ? "bg-pink-500/20 text-pink-400" : "bg-blue-500/20 text-blue-400"
                )}>
                  {v.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate leading-none">{v.name}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 capitalize truncate">
                    {v.labels.gender ?? ""}
                    {v.labels.accent ? ` · ${v.labels.accent}` : ""}
                  </p>
                </div>
                {v.preview_url && voiceId === v.voice_id && (
                  <Play className="w-3 h-3 text-[#ff7849] flex-shrink-0 ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Advanced settings */}
      <section>
        <button type="button" onClick={() => setShowAdv(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
          Voice settings
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-4 border border-white/8 rounded-xl p-4 bg-white/[0.02]">
            {[
              { label: "Stability",         value: stability,  set: setStability,  min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
              { label: "Similarity Boost",  value: similarity, set: setSimilarity, min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
              { label: "Style Exaggeration",value: style,      set: setStyle,      min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
              { label: "Speed",             value: speed,      set: setSpeed,      min: 0.7, max: 1.2, step: 0.05, fmt: (v: number) => `${v.toFixed(2)}x` },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-white/35">{s.label}</label>
                  <span className="text-[11px] font-semibold text-[#ff7849]">{s.fmt(s.value)}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                  onChange={(e) => s.set(parseFloat(e.target.value))}
                  className="w-full h-1 accent-[#ff7849]" />
              </div>
            ))}
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
          : <><Mic className="w-4 h-4" /> Generate Voice</>
        }
      </button>
    </form>
  );
}
