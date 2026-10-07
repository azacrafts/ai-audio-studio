"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download, RotateCcw, Music2, Sparkles, Wand2, Mic2, Radio,
  Scissors, Zap, Mic, RefreshCw, FileText, Copy, Check
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { useAudio } from "@/lib/audio-context";
import Link from "next/link";
import type { GenerationPhase } from "./types";

// ── Shared track type ─────────────────────────────────────────────────────────

export interface StudioTrack {
  id:         string;
  mode?:      string;   // "music" | "sfx" | "tts" | "s2s" | "stt" | "isolation"
  audioUrl?:  string;   // undefined for STT (text output)
  transcript?: string;  // for STT mode
  prompt?:    string;
  preset?:    string;
  provider?:  string;
  duration?:  number | null;
  watermarked: boolean;
  createdAt:  string;
  model?:     string;
}

// ── Generating indicator ──────────────────────────────────────────────────────

const PHASE_LABELS: Partial<Record<GenerationPhase, string>> = {
  submitting:  "Submitting your request...",
  queued:      "Added to generation queue...",
  generating:  "AI is composing your track...",
};

const PHASE_ICONS = [Music2, Wand2, Mic2, Radio];

function GeneratingCard({ phase }: { phase: GenerationPhase }) {
  const [iconIdx, setIconIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      setIconIdx((i) => (i + 1) % PHASE_ICONS.length);
    }, 2000);
    return () => clearInterval(tick);
  }, []);

  const Icon = PHASE_ICONS[iconIdx];
  const pseudo = Math.min(88, elapsed * 1.2);

  return (
    <div className="bg-gradient-to-br from-[#1a0f08] to-[#120a14] border border-[#ff7849]/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full border-2 border-[#ff7849]/25 border-t-[#ff7849] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#ff7849]" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            {PHASE_LABELS[phase] ?? "Generating..."}
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            {elapsed < 8 ? "Usually 30–90 seconds" : `${elapsed}s elapsed`}
          </p>
        </div>
      </div>

      <div className="h-1 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#ff7849] to-[#ff3d6e] rounded-full transition-all duration-1000"
          style={{ width: `${pseudo}%` }}
        />
      </div>

      <div className="flex items-center gap-px h-8">
        {Array.from({ length: 36 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-[#ff7849]/30 rounded-full animate-pulse"
            style={{
              height: `${20 + Math.abs(Math.sin(i * 0.55)) * 80}%`,
              animationDelay: `${i * 0.055}s`,
              animationDuration: `${0.7 + (i % 5) * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Mode icon helper ──────────────────────────────────────────────────────────

function ModeIcon({ mode, className }: { mode?: string; className?: string }) {
  const icons: Record<string, React.ElementType> = {
    music: Music2, sfx: Zap, tts: Mic, s2s: RefreshCw, stt: FileText, isolation: Scissors,
  };
  const Icon = icons[mode ?? "music"] ?? Music2;
  return <Icon className={cn("w-3.5 h-3.5", className)} />;
}

// ── Transcript Card (STT output) ──────────────────────────────────────────────

function TranscriptCard({ track }: { track: StudioTrack }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!track.transcript) return;
    await navigator.clipboard.writeText(track.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Transcript</span>
          </div>
          <p className="text-sm font-semibold text-white truncate">{track.prompt ?? "Audio transcript"}</p>
          <p className="text-[11px] text-white/30 mt-0.5">ElevenLabs Scribe · {track.model ?? "scribe_v1"}</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/50 hover:text-white transition-all"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="bg-black/20 rounded-xl p-3 max-h-40 overflow-y-auto scrollbar-hide">
        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
          {track.transcript ?? "No transcript available."}
        </p>
      </div>
    </div>
  );
}

// ── Active Track Card (replaces embedded WaveSurfer) ─────────────────────────

function ActiveTrackCard({
  track,
  onRegenerate,
  onUpgrade,
}: {
  track: StudioTrack;
  onRegenerate?: () => void;
  onUpgrade?: () => void;
}) {
  const { currentTrack, isPlaying, play, pause } = useAudio();
  const isActive = currentTrack?.id === track.id && isPlaying;

  const handlePlayPause = () => {
    if (!track.audioUrl) return;
    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : play(toPlayerTrack(track)!);
    } else {
      play(toPlayerTrack(track)!);
    }
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-4">
      {/* Track header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              isActive ? "bg-emerald-400 animate-pulse" : "bg-white/20"
            )} />
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              isActive ? "text-emerald-400" : "text-white/30"
            )}>
              {isActive ? "Now Playing" : "Ready to play"}
            </span>
          </div>
          <p className="text-sm font-semibold text-white truncate">
            {track.prompt ?? track.preset ?? "Generated Track"}
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            {track.provider
              ? `${track.provider.charAt(0).toUpperCase() + track.provider.slice(1)} · `
              : "Suno · "
            }
            {track.model ?? "V4.5"} · {track.duration ? formatDuration(track.duration) : "--:--"}
          </p>
        </div>
        {track.watermarked && (
          <span className="flex-shrink-0 text-[9px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
            WATERMARKED
          </span>
        )}
      </div>

      {/* Waveform placeholder (visual, not interactive – real controls in StickyPlayer) */}
      <div className="flex items-center gap-px h-10 bg-black/20 rounded-xl px-3">
        {Array.from({ length: 48 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors",
              isActive ? "bg-[#ff7849]/50 animate-pulse" : "bg-white/10"
            )}
            style={{
              height: `${20 + Math.abs(Math.sin(i * 0.42 + 1)) * 80}%`,
              animationDelay: isActive ? `${i * 0.035}s` : "0s",
              animationDuration: isActive ? `${0.8 + (i % 4) * 0.15}s` : "0s",
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          disabled={!track.audioUrl}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff7849] to-[#ff3d6e] flex items-center justify-center shadow-lg shadow-orange-900/30 disabled:opacity-40 flex-shrink-0 transition-transform hover:scale-105"
        >
          {isActive
            ? <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          }
        </button>

        <p className="text-[10px] text-white/30 flex-1">
          {isActive ? "Playing in bottom player ↓" : "Click to play in bottom player"}
        </p>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            title="Regenerate"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-white/35" />
          </button>
        )}

        {track.audioUrl && !track.id.startsWith("temp-") && (
          <Link
            href={`/editor?trackId=${encodeURIComponent(track.id)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-white/5 hover:bg-white/10 border border-white/8 hover:border-[#FF6A3D]/40 text-white/50 hover:text-white"
          >
            <Scissors className="w-3 h-3" />
            Edit
          </Link>
        )}

        <button
          onClick={() => {
            if (!track.audioUrl) return;
            if (track.watermarked && onUpgrade) { onUpgrade(); return; }
            const a = document.createElement("a");
            a.href = track.audioUrl;
            a.download = "acoustic-track.mp3";
            a.click();
          }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            track.watermarked
              ? "bg-white/5 text-white/35 hover:bg-amber-500/15 hover:text-amber-400"
              : "bg-white/10 text-white hover:bg-white/15"
          )}
        >
          <Download className="w-3 h-3" />
          {track.watermarked ? "Upgrade" : "Download"}
        </button>
      </div>
    </div>
  );
}

// ── Track row ─────────────────────────────────────────────────────────────────

function toPlayerTrack(t: StudioTrack): import("@/lib/audio-context").PlayerTrack | null {
  if (!t.audioUrl) return null;
  return {
    id:          t.id,
    audioUrl:    t.audioUrl,
    title:       t.prompt ?? t.preset ?? "Generated Track",
    model:       t.model,
    provider:    t.provider,
    duration:    t.duration,
    watermarked: t.watermarked,
  };
}

function TrackRow({
  track,
  isSelected,
  onSelect,
}: {
  track: StudioTrack;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { currentTrack, isPlaying } = useAudio();
  const isGloballyPlaying = currentTrack?.id === track.id && isPlaying;
  const [dur, setDur] = useState(track.duration ?? 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const canEdit = !!track.audioUrl && !track.id.startsWith("temp-");

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group",
        isSelected
          ? "bg-[#ff7849]/10 border border-[#ff7849]/20"
          : "hover:bg-white/[0.03] border border-transparent"
      )}
    >
      {/* Play indicator */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
        isSelected ? "bg-[#ff7849]/20" : "bg-white/5 group-hover:bg-white/10"
      )}>
        {isGloballyPlaying
          ? <div className="flex gap-0.5 items-end h-3.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-1 bg-[#ff7849] rounded-full animate-bounce"
                  style={{ height: `${40 + i * 20}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          : <ModeIcon mode={track.mode} className="text-white/30" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs font-medium truncate",
          isSelected ? "text-[#ff9a7a]" : "text-white/60 group-hover:text-white/80"
        )}>
          {track.prompt ?? track.preset ?? "Generated Track"}
        </p>
        <p className="text-[10px] text-white/25 mt-0.5">
          {track.provider
            ? `${track.provider.charAt(0).toUpperCase() + track.provider.slice(1)} · `
            : "Suno · "
          }
          {track.mode && track.mode !== "music" ? `${track.mode.toUpperCase()} · ` : ""}
          {dur > 0 ? formatDuration(Math.floor(dur)) : track.mode === "stt" ? "Transcript" : "--:--"}
        </p>
      </div>

      {/* Edit shortcut — visible on hover */}
      {canEdit && (
        <Link
          href={`/editor?trackId=${encodeURIComponent(track.id)}`}
          onClick={(e) => e.stopPropagation()}
          title="Edit in Editor"
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-white/5 hover:bg-white/10 border border-transparent hover:border-[#FF6A3D]/30"
        >
          <Scissors className="w-3 h-3 text-white/40 group-hover:text-white/70" />
        </Link>
      )}

      <audio
        ref={audioRef}
        src={track.audioUrl || undefined}
        onLoadedMetadata={() => setDur(audioRef.current?.duration ?? track.duration ?? 0)}
        preload="metadata"
        className="hidden"
      />
    </div>
  );
}

// ── Library Panel ─────────────────────────────────────────────────────────────

interface LibraryPanelProps {
  tracks: StudioTrack[];
  activeTrackId: string | null;
  phase: GenerationPhase;
  onSelectTrack: (id: string) => void;
  onRegenerate?: () => void;
  onUpgrade?: () => void;
}

export function LibraryPanel({
  tracks,
  activeTrackId,
  phase,
  onSelectTrack,
  onRegenerate,
  onUpgrade,
}: LibraryPanelProps) {
  const isGenerating = phase === "submitting" || phase === "queued" || phase === "generating";
  const activeTrack  = tracks.find((t) => t.id === activeTrackId && t.audioUrl);

  if (!isGenerating && tracks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white/15" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/30">Your library is empty</p>
          <p className="text-xs text-white/20 mt-1">Generated tracks appear here instantly</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Generating indicator */}
      {isGenerating && <GeneratingCard phase={phase} />}

      {/* Active track card — mode-aware */}
      {activeTrack && !isGenerating && (
        activeTrack.mode === "stt"
          ? <TranscriptCard track={activeTrack} />
          : <ActiveTrackCard track={activeTrack} onRegenerate={onRegenerate} onUpgrade={onUpgrade} />
      )}

      {/* Track history */}
      {tracks.length > 0 && (
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 min-h-0">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-1 mb-2">
            Library · {tracks.length} track{tracks.length !== 1 ? "s" : ""}
          </p>
          {tracks.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              isSelected={t.id === activeTrackId}
              onSelect={() => onSelectTrack(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
