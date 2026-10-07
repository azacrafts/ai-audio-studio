"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { ScoredClip } from "@/lib/video/analysis";

interface VideoPreviewProps {
  url:           string | null;
  clips?:        ScoredClip[];
  className?:    string;
  onDuration?:   (d: number)  => void;
  onTimeUpdate?: (t: number)  => void;
}

export function VideoPreview({
  url,
  clips = [],
  className = "",
  onDuration,
  onTimeUpdate,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration,  setDuration]  = useState(0);
  const [current,   setCurrent]   = useState(0);
  const [playing,   setPlaying]   = useState(false);
  const [activeClip, setActiveClip] = useState<number | null>(null);

  // Sync playing state with video element
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play",  onPlay);
    el.addEventListener("pause", onPause);
    return () => { el.removeEventListener("play", onPlay); el.removeEventListener("pause", onPause); };
  }, [url]);

  const handleMeta = useCallback(() => {
    const d = videoRef.current?.duration ?? 0;
    setDuration(d);
    onDuration?.(d);
  }, [onDuration]);

  const handleTimeUpdate = useCallback(() => {
    const t = videoRef.current?.currentTime ?? 0;
    setCurrent(t);
    onTimeUpdate?.(t);

    // Highlight active clip
    const idx = clips.findIndex((c) => t >= c.start && t < c.end);
    setActiveClip(idx >= 0 ? idx : null);
  }, [clips, onTimeUpdate]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    playing ? el.pause() : el.play();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = ratio * duration;
  };

  const seekToClip = (clip: ScoredClip) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = clip.start;
    el.play();
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Video element */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full">
        {url ? (
          <video
            ref={videoRef}
            src={url}
            className="w-full h-full object-contain"
            onLoadedMetadata={handleMeta}
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            No video loaded
          </div>
        )}

        {/* Play/pause overlay */}
        {url && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="bg-black/50 rounded-full p-3">
              {playing ? (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Seekbar + time */}
      {url && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-10 text-right tabular-nums">{fmt(current)}</span>

          {/* Timeline with clip markers */}
          <div
            className="relative flex-1 h-2 bg-zinc-700 rounded-full cursor-pointer group"
            onClick={seek}
          >
            {/* Clip highlight bands */}
            {duration > 0 && clips.map((c, i) => (
              <div
                key={i}
                className={`absolute top-0 h-full rounded-full transition-colors ${
                  activeClip === i ? "bg-violet-400" : "bg-violet-600/50"
                }`}
                style={{
                  left:  `${(c.start / duration) * 100}%`,
                  width: `${(c.durationSec  / duration) * 100}%`,
                }}
              />
            ))}

            {/* Playhead */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow -ml-1.5 pointer-events-none"
              style={{ left: `${pct}%` }}
            />
            {/* Progress fill */}
            <div
              className="h-full bg-zinc-400 rounded-full pointer-events-none"
              style={{ width: `${pct}%` }}
            />
          </div>

          <span className="w-10 tabular-nums">{fmt(duration)}</span>
        </div>
      )}

      {/* Clip list */}
      {clips.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
            Selected clips ({clips.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {clips.map((c, i) => (
              <button
                key={i}
                onClick={() => seekToClip(c)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  activeClip === i
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {fmt(c.start)} – {fmt(c.end)}
                <span className="ml-1 text-zinc-500">({c.durationSec.toFixed(1)}s)</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
