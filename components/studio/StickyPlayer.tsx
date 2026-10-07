"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play, Pause, Volume2, VolumeX, Download, Music2
} from "lucide-react";
import { useAudio } from "@/lib/audio-context";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StickyPlayer() {
  const { currentTrack, isPlaying, volume, toggle, setVolume, _setIsPlaying } = useAudio();

  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showVolume, setShowVolume] = useState(false);
  const draggingRef  = useRef(false);

  // Sync audio src when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) return;

    audio.src = currentTrack.audioUrl;
    audio.volume = volume;
    setCurrentTime(0);
    setAudioDuration(0);

    if (isPlaying) {
      audio.play().catch(() => _setIsPlaying(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Sync play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) return;

    if (isPlaying) {
      audio.play().catch(() => _setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, _setIsPlaying, currentTrack?.audioUrl]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Audio element event handlers
  function handleTimeUpdate() {
    if (draggingRef.current || !audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    const b = audioRef.current.buffered;
    if (b.length > 0) setBuffered(b.end(b.length - 1));
  }

  function handleLoadedMetadata() {
    if (!audioRef.current) return;
    setAudioDuration(audioRef.current.duration);
  }

  function handleEnded() {
    _setIsPlaying(false);
    setCurrentTime(0);
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const el  = e.currentTarget;
    const pct = (e.clientX - el.getBoundingClientRect().left) / el.offsetWidth;
    const t   = pct * audioDuration;
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  }

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
  const bufferedPct = audioDuration > 0 ? (buffered / audioDuration) * 100 : 0;

  if (!currentTrack) return null;

  const title = currentTrack.title || "Generated Track";
  const providerLabel = currentTrack.provider
    ? currentTrack.provider.charAt(0).toUpperCase() + currentTrack.provider.slice(1)
    : "Suno";
  const modelLabel = currentTrack.model ?? providerLabel;

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Sticky bar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-[#0c0c0f]/95 backdrop-blur-xl border-t border-white/[0.08]",
          "h-[68px] flex items-center px-4 gap-4",
          "shadow-[0_-8px_32px_rgba(0,0,0,0.6)]"
        )}
      >
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 w-[220px] flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ff7849]/30 to-[#ff3d6e]/20 flex items-center justify-center flex-shrink-0 border border-white/[0.06]">
            <Music2 className="w-4 h-4 text-[#ff9a7a]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate leading-none">{title}</p>
            <p className="text-[10px] text-white/35 mt-0.5 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 text-[9px] font-semibold">
                {modelLabel}
              </span>
              {currentTrack.watermarked && (
                <span className="text-amber-500/70">·</span>
              )}
              {currentTrack.watermarked && (
                <span className="text-amber-500/70 text-[9px]">watermarked</span>
              )}
            </p>
          </div>
        </div>

        {/* Controls + Progress (center, grows) */}
        <div className="flex-1 flex flex-col gap-1.5">
          {/* Play/Pause */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff7849] to-[#ff3d6e] flex items-center justify-center shadow-lg shadow-orange-900/30 transition-transform hover:scale-105 flex-shrink-0"
            >
              {isPlaying
                ? <Pause className="w-3.5 h-3.5 text-white fill-white" />
                : <Play  className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              }
            </button>

            {/* Seekable progress bar */}
            <div
              className="relative flex-1 h-1.5 rounded-full bg-white/10 cursor-pointer group"
              onClick={handleProgressClick}
            >
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/[0.08] transition-all"
                style={{ width: `${bufferedPct}%` }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ff7849] to-[#ff3d6e] transition-all"
                style={{ width: `${progress}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Time */}
            <span className="text-[10px] text-white/30 tabular-nums w-[72px] text-right flex-shrink-0">
              {formatTime(currentTime)} / {formatTime(audioDuration)}
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Volume */}
          <div className="relative">
            <button
              onClick={() => setShowVolume((v) => !v)}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
            >
              {volume === 0
                ? <VolumeX className="w-3.5 h-3.5 text-white/40" />
                : <Volume2  className="w-3.5 h-3.5 text-white/40" />
              }
            </button>

            {showVolume && (
              <div className="absolute bottom-10 right-0 bg-[#1a1a20] border border-white/10 rounded-xl p-3 shadow-xl w-28">
                <p className="text-[10px] text-white/30 mb-2">Volume</p>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 accent-[#ff7849]"
                />
              </div>
            )}
          </div>

          {/* Download */}
          {!currentTrack.watermarked && (
            <a
              href={currentTrack.audioUrl}
              download="acoustic-track.mp3"
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
              title="Download"
            >
              <Download className="w-3.5 h-3.5 text-white/40" />
            </a>
          )}
        </div>
      </div>

      {/* Space at bottom of page to avoid content hiding behind the player */}
      <div className="h-[68px]" aria-hidden />
    </>
  );
}
