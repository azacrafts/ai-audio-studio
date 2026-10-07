"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioRequest } from "@/types";

interface STTModeProps {
  isLoading: boolean;
  onSubmit: (req: Partial<StudioRequest>) => void;
}

const LANGUAGES = [
  { code: "",   label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
];

export function STTMode({ isLoading, onSubmit }: STTModeProps) {
  const fileRef              = useRef<HTMLInputElement>(null);
  const [audioFile, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("");
  const [error, setError]    = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("audio/")) setFile(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!audioFile) { setError("Upload an audio file to transcribe."); return; }

    onSubmit({
      provider:     "elevenlabs",
      mode:         "stt",
      model:        "scribe_v1",
      audioFile,
      language:     language || undefined,
      displayTitle: `Transcript: ${audioFile.name}`,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      <div className="bg-blue-500/[0.08] border border-blue-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-300">Scribe v1 Model</p>
          <p className="text-[11px] text-blue-400/70 mt-0.5">
            Highest accuracy STT with 99 language support and word-level timestamps
          </p>
        </div>
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
              <p className="text-[11px] text-white/20 mt-1">MP3, WAV, M4A, FLAC up to 25 MB</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="audio/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
        </div>
      </section>

      {/* Language */}
      <section>
        <label className="section-label">Language</label>
        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff7849]/40 transition-colors appearance-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-[#1a1a20]">{l.label}</option>
            ))}
          </select>
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
          : <><FileText className="w-4 h-4" /> Transcribe Audio</>
        }
      </button>
    </form>
  );
}
