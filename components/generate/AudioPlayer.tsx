"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Download, RotateCcw, Volume2, VolumeX, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDuration } from "@/lib/utils";
import Link from "next/link";

interface AudioPlayerProps {
  audioUrl: string;
  watermarked?: boolean;
  onRegenerate?: () => void;
  onUpgrade?: () => void;
}

export function AudioPlayer({
  audioUrl,
  watermarked = false,
  onRegenerate,
  onUpgrade,
}: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<import("wavesurfer.js").default | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let ws: import("wavesurfer.js").default;

    import("wavesurfer.js").then(({ default: WaveSurfer }) => {
      if (!containerRef.current) return;

      ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "rgba(255,255,255,0.15)",
        progressColor: "#a855f7",
        cursorColor: "rgba(255,255,255,0.6)",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 64,
        normalize: true,
        interact: true,
        url: audioUrl,
      });

      wsRef.current = ws;

      ws.on("ready", () => {
        setDuration(ws.getDuration());
        setReady(true);
      });

      ws.on("audioprocess", () => {
        setCurrentTime(ws.getCurrentTime());
      });

      ws.on("finish", () => {
        setPlaying(false);
        setCurrentTime(0);
      });

      ws.on("seeking", () => {
        setCurrentTime(ws.getCurrentTime());
      });
    });

    return () => {
      ws?.destroy();
      wsRef.current = null;
      setPlaying(false);
      setReady(false);
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!wsRef.current || !ready) return;
    wsRef.current.playPause();
    setPlaying(!playing);
  };

  const handleMute = () => {
    if (!wsRef.current) return;
    wsRef.current.setMuted(!muted);
    setMuted(!muted);
  };

  const handleDownload = () => {
    if (watermarked && onUpgrade) { onUpgrade(); return; }
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = "acoustic-generated.mp3";
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Waveform */}
      <div className="relative bg-white/[0.03] rounded-xl px-4 pt-4 pb-3 border border-white/5">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20">
            <div className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          </div>
        )}
        <div ref={containerRef} className={cn("w-full", !ready && "opacity-0")} />
        {/* Time */}
        <div className="flex items-center justify-between mt-2 px-0.5">
          <span className="text-[10px] text-white/25">{formatDuration(Math.floor(currentTime))}</span>
          <span className="text-[10px] text-white/25">{formatDuration(Math.floor(duration))}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          disabled={!ready}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center hover:from-purple-500 hover:to-violet-500 transition-all shadow-lg shadow-purple-900/40 disabled:opacity-40 flex-shrink-0"
        >
          {playing ? (
            <Pause className="w-4 h-4 text-white fill-white" />
          ) : (
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          )}
        </button>

        {/* Mute */}
        <button
          onClick={handleMute}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          {muted ? (
            <VolumeX className="w-4 h-4 text-white/40" />
          ) : (
            <Volume2 className="w-4 h-4 text-white/40" />
          )}
        </button>

        <div className="flex-1" />

        {/* Open in Editor */}
        <Link href={`/editor?url=${encodeURIComponent(audioUrl)}`}>
          <button
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            title="Open in editor"
          >
            <Scissors className="w-4 h-4 text-white/40" />
          </button>
        </Link>

        {/* Regenerate */}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            title="Regenerate"
          >
            <RotateCcw className="w-4 h-4 text-white/40" />
          </button>
        )}

        {/* Download */}
        <Button
          onClick={handleDownload}
          size="sm"
          className={cn(
            "font-semibold text-xs rounded-xl border-0 gap-1.5",
            watermarked
              ? "bg-white/5 text-white/40 hover:bg-purple-600/20 hover:text-purple-300"
              : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          <Download className="w-3.5 h-3.5" />
          {watermarked ? "Download (Upgrade)" : "Download"}
        </Button>
      </div>

      {/* Watermark notice */}
      {watermarked && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-amber-400">
              Free plan — audio includes watermark
            </p>
            <p className="text-[11px] text-amber-400/60 mt-0.5">
              Upgrade to Creator ($20/mo) for clean downloads + commercial use
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>
      )}
    </div>
  );
}
