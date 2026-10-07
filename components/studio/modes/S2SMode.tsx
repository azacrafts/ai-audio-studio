"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ElevenLabsVoice } from "@/lib/ai/elevenlabs";
import type { StudioRequest } from "@/types";

interface S2SModeProps {
  isLoading: boolean;
  onSubmit: (req: Partial<StudioRequest>) => void;
}

const S2S_MODELS = [
  { value: "eleven_english_sts_v2",       label: "English STS v2",  badge: "English",  description: "Optimized for English, high quality" },
  { value: "eleven_multilingual_sts_v2",   label: "Multilingual STS",badge: "Multi",    description: "29 languages support" },
];

export function S2SMode({ isLoading, onSubmit }: S2SModeProps) {
  const fileRef              = useRef<HTMLInputElement>(null);
  const [audioFile, setFile] = useState<File | null>(null);
  const [modelId, setModelId] = useState("eleven_english_sts_v2");
  const [voices, setVoices]  = useState<ElevenLabsVoice[]>([]);
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [showAdvanced, setShowAdv] = useState(false);
  const [stability, setStability]  = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [style, setStyle]          = useState(0);
  const [error, setError]          = useState<string | null>(null);

  useEffect(() => {
    setLoadingVoices(true);
    fetch("/api/elevenlabs/voices")
      .then((r) => r.json())
      .then((d) => setVoices(d.voices ?? []))
      .catch(() => {})
      .finally(() => setLoadingVoices(false));
  }, []);

  const selectedVoice = voices.find((v) => v.voice_id === voiceId);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("audio/")) setFile(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!audioFile) { setError("Upload an audio file."); return; }
    if (!voiceId)   { setError("Select a target voice."); return; }

    onSubmit({
      provider:    "elevenlabs",
      mode:        "s2s",
      model:       modelId,
      voiceId,
      voiceName:   selectedVoice?.name,
      audioFile,
      stability,
      similarity_boost: similarity,
      styleExaggeration: style,
      displayTitle: `Voice clone → ${selectedVoice?.name ?? voiceId}`,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Model */}
      <section>
        <label className="section-label">Model</label>
        <div className="space-y-1.5">
          {S2S_MODELS.map((m) => (
            <button key={m.value} type="button" onClick={() => setModelId(m.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                modelId === m.value ? "border-[#ff7849]/60 bg-[#ff7849]/10" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
              )}>
              <div className="flex-1">
                <span className="block text-xs font-bold text-white leading-none">{m.label}</span>
                <span className="block text-[10px] text-white/30 mt-0.5">{m.description}</span>
              </div>
              <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-md", modelId === m.value ? "bg-[#ff7849]/20 text-[#ff9a7a]" : "bg-white/5 text-white/25")}>
                {m.badge}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* File upload */}
      <section>
        <label className="section-label">Source audio</label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors",
            audioFile ? "border-[#ff7849]/40 bg-[#ff7849]/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
          )}
        >
          {audioFile ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff7849]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-base">🎵</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-white truncate">{audioFile.name}</p>
                <p className="text-[11px] text-white/30">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center flex-shrink-0">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/40">Drop audio file or click to browse</p>
              <p className="text-[11px] text-white/20 mt-1">MP3, WAV, M4A up to 10 MB</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="audio/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
        </div>
      </section>

      {/* Target voice */}
      <section>
        <label className="section-label">Target voice</label>
        {loadingVoices ? (
          <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
        ) : (
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto scrollbar-hide">
            {voices.map((v) => (
              <button key={v.voice_id} type="button" onClick={() => setVoiceId(v.voice_id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all",
                  voiceId === v.voice_id ? "border-[#ff7849]/50 bg-[#ff7849]/10" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                )}>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                  v.labels.gender === "female" ? "bg-pink-500/20 text-pink-400" : "bg-blue-500/20 text-blue-400"
                )}>
                  {v.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate leading-none">{v.name}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 capitalize">{v.labels.gender ?? ""}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Advanced */}
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
          : "Transform Voice"
        }
      </button>
    </form>
  );
}
