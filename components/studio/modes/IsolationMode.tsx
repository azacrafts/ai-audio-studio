"use client";

import { useRef, useState } from "react";
import { Scissors, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioRequest } from "@/types";

interface IsolationModeProps {
  isLoading: boolean;
  onSubmit: (req: Partial<StudioRequest>) => void;
}

export function IsolationMode({ isLoading, onSubmit }: IsolationModeProps) {
  const fileRef              = useRef<HTMLInputElement>(null);
  const [audioFile, setFile] = useState<File | null>(null);
  const [error, setError]    = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("audio/")) setFile(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!audioFile) { setError("Upload an audio file."); return; }

    onSubmit({
      provider:     "elevenlabs",
      mode:         "isolation",
      model:        "audio-isolation",
      audioFile,
      displayTitle: `Isolated: ${audioFile.name}`,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
        <Scissors className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-emerald-300">Audio Isolation</p>
          <p className="text-[11px] text-emerald-400/70 mt-0.5">
            Separate vocals from background music and remove noise. Perfect for clean vocal extraction.
          </p>
        </div>
      </div>

      {/* What it does */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: "🎤", label: "Extract vocals",      desc: "Clean isolated voice" },
          { icon: "🔇", label: "Remove music",         desc: "Strip background track" },
          { icon: "✨", label: "Reduce noise",         desc: "AI noise reduction" },
        ].map((f) => (
          <div key={f.label} className="bg-white/[0.02] border border-white/6 rounded-xl p-3 text-center">
            <div className="text-xl mb-1">{f.icon}</div>
            <p className="text-[10px] font-semibold text-white/60">{f.label}</p>
            <p className="text-[9px] text-white/25 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* File upload */}
      <section>
        <label className="section-label">Audio file</label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors",
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
              <Upload className="w-8 h-8 text-white/15 mx-auto mb-3" />
              <p className="text-sm text-white/40">Drop audio or click to browse</p>
              <p className="text-[11px] text-white/20 mt-1">MP3, WAV, M4A up to 50 MB</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="audio/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
        </div>
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
          : <><Scissors className="w-4 h-4" /> Isolate Vocals</>
        }
      </button>
    </form>
  );
}
