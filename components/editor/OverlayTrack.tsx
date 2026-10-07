"use client";

import { useRef, useState } from "react";
import { X, GripVertical, Music2, Zap, Mic } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { WaveformEditor, type WaveformEditorHandle } from "./WaveformEditor";

export interface OverlayTrackData {
  id:         string;
  url:        string;
  name:       string;
  type:       "sfx" | "music" | "tts";
  volume:     number;    // 0–1
  offsetMs:   number;    // timeline delay in ms
  trimStart?: number;
  trimEnd?:   number | null;
}

interface OverlayTrackProps {
  track:       OverlayTrackData;
  totalDuration: number;
  onChange:    (id: string, patch: Partial<OverlayTrackData>) => void;
  onRemove:    (id: string) => void;
}

const TYPE_ICONS: Record<OverlayTrackData["type"], React.ElementType> = {
  sfx:   Zap,
  music: Music2,
  tts:   Mic,
};

const TYPE_COLORS: Record<OverlayTrackData["type"], string> = {
  sfx:   "#f59e0b",
  music: "#8b5cf6",
  tts:   "#06b6d4",
};

export function OverlayTrack({ track, totalDuration, onChange, onRemove }: OverlayTrackProps) {
  const wsRef = useRef<WaveformEditorHandle>(null);
  const Icon  = TYPE_ICONS[track.type];
  const color = TYPE_COLORS[track.type];

  const offsetSec = track.offsetMs / 1000;

  return (
    <div className="group bg-white/[0.03] border border-white/8 rounded-xl p-3 space-y-2.5 relative">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="cursor-grab active:cursor-grabbing text-white/15 flex-shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}22`, border: `1px solid ${color}40` }}
        >
          <Icon className="w-3 h-3" style={{ color }} />
        </div>

        <p className="text-xs font-semibold text-white/70 truncate flex-1">{track.name}</p>

        <button
          type="button"
          onClick={() => onRemove(track.id)}
          className="w-6 h-6 rounded-lg bg-white/0 hover:bg-red-500/15 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          <X className="w-3 h-3 text-white/30 hover:text-red-400" />
        </button>
      </div>

      {/* Mini waveform */}
      <WaveformEditor
        ref={wsRef}
        audioUrl={track.url}
        color={color}
        className="opacity-70"
      />

      {/* Volume + offset controls */}
      <div className="grid grid-cols-2 gap-3">
        {/* Volume */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Volume</label>
            <span className="text-[10px] font-semibold" style={{ color }}>
              {Math.round(track.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={track.volume}
            onChange={(e) => onChange(track.id, { volume: parseFloat(e.target.value) })}
            className="w-full h-1"
            style={{ accentColor: color }}
          />
        </div>

        {/* Offset */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Start</label>
            <span className="text-[10px] font-semibold" style={{ color }}>
              {formatDuration(Math.floor(offsetSec))}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(totalDuration * 1000, 1)}
            step={500}
            value={track.offsetMs}
            onChange={(e) => onChange(track.id, { offsetMs: parseFloat(e.target.value) })}
            className="w-full h-1"
            style={{ accentColor: color }}
          />
        </div>
      </div>

      {/* Type badge */}
      <span
        className="absolute top-3 right-8 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `${color}22`, color }}
      >
        {track.type}
      </span>
    </div>
  );
}
