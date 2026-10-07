"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { cn, formatDuration } from "@/lib/utils";

export interface WaveformEditorHandle {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  isPlaying: () => boolean;
}

interface RegionData {
  start: number;
  end: number;
}

interface WaveformEditorProps {
  audioUrl: string;
  label?: string;
  color?: string;
  trimRegion?: RegionData;
  onTrimChange?: (region: RegionData) => void;
  onReady?: (duration: number) => void;
  onTimeUpdate?: (time: number) => void;
  className?: string;
  showTrimHandles?: boolean;
}

export const WaveformEditor = forwardRef<WaveformEditorHandle, WaveformEditorProps>(
  function WaveformEditor(
    {
      audioUrl,
      label,
      color = "#a855f7",
      trimRegion,
      onTrimChange,
      onReady,
      onTimeUpdate,
      className,
      showTrimHandles = false,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<import("wavesurfer.js").default | null>(null);
    const [ready, setReady] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      getCurrentTime: () => wsRef.current?.getCurrentTime() ?? 0,
      getDuration: () => wsRef.current?.getDuration() ?? 0,
      seekTo: (s: number) => wsRef.current?.seekTo(s / (wsRef.current.getDuration() || 1)),
      play: () => wsRef.current?.play(),
      pause: () => wsRef.current?.pause(),
      isPlaying: () => wsRef.current?.isPlaying() ?? false,
    }));

    useEffect(() => {
      if (!containerRef.current) return;
      let ws: import("wavesurfer.js").default;

      import("wavesurfer.js").then(({ default: WaveSurfer }) => {
        if (!containerRef.current) return;
        ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: "rgba(255,255,255,0.12)",
          progressColor: color,
          cursorColor: "rgba(255,255,255,0.5)",
          cursorWidth: 2,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 56,
          normalize: true,
          interact: true,
          url: audioUrl,
        });

        wsRef.current = ws;

        ws.on("ready", () => {
          const dur = ws.getDuration();
          setDuration(dur);
          setReady(true);
          onReady?.(dur);
        });

        ws.on("audioprocess", () => {
          const t = ws.getCurrentTime();
          setCurrentTime(t);
          onTimeUpdate?.(t);
        });

        ws.on("seeking", () => {
          setCurrentTime(ws.getCurrentTime());
        });
      });

      return () => {
        ws?.destroy();
        wsRef.current = null;
        setReady(false);
      };
    }, [audioUrl, color]);

    // Trim handle dragging
    const handleTrimDrag = useCallback(
      (e: React.MouseEvent<HTMLDivElement>, type: "start" | "end") => {
        if (!duration || !containerRef.current) return;
        e.preventDefault();
        setIsDragging(type);

        const rect = containerRef.current.getBoundingClientRect();

        const onMouseMove = (ev: MouseEvent) => {
          const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
          const time = ratio * duration;
          onTrimChange?.({
            start: type === "start" ? Math.min(time, (trimRegion?.end ?? duration) - 0.5) : trimRegion?.start ?? 0,
            end: type === "end" ? Math.max(time, (trimRegion?.start ?? 0) + 0.5) : trimRegion?.end ?? duration,
          });
        };

        const onMouseUp = () => {
          setIsDragging(null);
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      },
      [duration, trimRegion, onTrimChange]
    );

    const startPct = duration > 0 ? ((trimRegion?.start ?? 0) / duration) * 100 : 0;
    const endPct = duration > 0 ? ((trimRegion?.end ?? duration) / duration) * 100 : 100;

    return (
      <div className={cn("space-y-1", className)}>
        {label && (
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-1">
            {label}
          </p>
        )}
        <div className="relative bg-white/[0.03] rounded-xl px-3 pt-3 pb-2 border border-white/5">
          {/* Loading overlay */}
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl">
              <div className="w-4 h-4 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
            </div>
          )}

          {/* Trim overlay */}
          {showTrimHandles && ready && (
            <>
              {/* Dimmed regions outside trim */}
              <div
                className="absolute top-0 bottom-0 left-3 bg-black/40 pointer-events-none rounded-l-xl"
                style={{ width: `${startPct}%` }}
              />
              <div
                className="absolute top-0 bottom-0 right-3 bg-black/40 pointer-events-none rounded-r-xl"
                style={{ width: `${100 - endPct}%` }}
              />

              {/* Start handle */}
              <div
                className={cn(
                  "absolute top-0 bottom-0 w-1 bg-purple-500 cursor-ew-resize z-10 flex items-center justify-center group",
                  isDragging === "start" && "bg-purple-400"
                )}
                style={{ left: `calc(${startPct}% + 12px)` }}
                onMouseDown={(e) => handleTrimDrag(e, "start")}
              >
                <div className="w-3 h-6 bg-purple-500 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -ml-1">
                  <div className="flex flex-col gap-0.5">
                    <div className="w-0.5 h-2 bg-white/60 rounded" />
                    <div className="w-0.5 h-2 bg-white/60 rounded" />
                  </div>
                </div>
              </div>

              {/* End handle */}
              <div
                className={cn(
                  "absolute top-0 bottom-0 w-1 bg-purple-500 cursor-ew-resize z-10 flex items-center justify-center group",
                  isDragging === "end" && "bg-purple-400"
                )}
                style={{ left: `calc(${endPct}% + 12px)` }}
                onMouseDown={(e) => handleTrimDrag(e, "end")}
              >
                <div className="w-3 h-6 bg-purple-500 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -ml-1">
                  <div className="flex flex-col gap-0.5">
                    <div className="w-0.5 h-2 bg-white/60 rounded" />
                    <div className="w-0.5 h-2 bg-white/60 rounded" />
                  </div>
                </div>
              </div>
            </>
          )}

          <div ref={containerRef} className={cn("w-full", !ready && "opacity-0")} />

          {/* Time row */}
          <div className="flex items-center justify-between mt-1 px-0.5">
            <span className="text-[10px] text-white/20">{formatDuration(Math.floor(currentTime))}</span>
            {showTrimHandles && trimRegion && (
              <span className="text-[10px] text-purple-400/70">
                {formatDuration(Math.floor(trimRegion.start))} –{" "}
                {formatDuration(Math.floor(trimRegion.end ?? duration))}
              </span>
            )}
            <span className="text-[10px] text-white/20">{formatDuration(Math.floor(duration))}</span>
          </div>
        </div>
      </div>
    );
  }
);
