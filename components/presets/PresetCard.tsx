"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Preset } from "@/types";

interface PresetCardProps {
  preset: Preset;
}

export function PresetCard({ preset }: PresetCardProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = () => {
    setHovered(true);
    videoRef.current?.play().catch(() => {});
    if (audioRef.current) {
      audioRef.current.volume = 0;
      audioRef.current.play().catch(() => {});
      fadeIn(audioRef.current);
      setPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    videoRef.current?.pause();
    if (audioRef.current) {
      fadeOut(audioRef.current, () => {
        audioRef.current!.pause();
        audioRef.current!.currentTime = 0;
        setPlaying(false);
      });
    }
  };

  const handleClick = () => {
    router.push(`/generate?preset=${preset.id}`);
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group aspect-video bg-zinc-900 border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/30 hover:-translate-y-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Video background */}
      <video
        ref={videoRef}
        src={preset.videoUrl}
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          "bg-gradient-to-t from-black/80 via-black/30 to-transparent",
          hovered ? "opacity-70" : "opacity-90"
        )}
      />

      {/* Play indicator */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          hovered ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          {playing ? (
            <Pause className="w-6 h-6 text-white fill-white" />
          ) : (
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          )}
        </div>
      </div>

      {/* Category badge */}
      <div className="absolute top-3 left-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/60 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
          {preset.category}
        </span>
      </div>

      {/* Live indicator */}
      {playing && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-medium">Playing</span>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-semibold text-white text-sm leading-tight">
              {preset.name}
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {preset.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-white/50 bg-white/5 px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 text-white/40">
            <Music2 className="w-3 h-3" />
            <span className="text-[10px]">{preset.config.duration}s</span>
          </div>
        </div>

        {/* CTA on hover */}
        <div
          className={cn(
            "mt-3 transition-all duration-300 overflow-hidden",
            hovered ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="w-full bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg py-2 text-center text-xs font-semibold text-white">
            Use This Preset →
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={preset.audioPreviewUrl} preload="none" />
    </div>
  );
}

// Volume fade helpers
function fadeIn(audio: HTMLAudioElement, duration = 400) {
  const steps = 20;
  const stepTime = duration / steps;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    audio.volume = Math.min(step / steps, 0.7);
    if (step >= steps) clearInterval(interval);
  }, stepTime);
}

function fadeOut(audio: HTMLAudioElement, onDone: () => void, duration = 300) {
  const startVolume = audio.volume;
  const steps = 15;
  const stepTime = duration / steps;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    audio.volume = Math.max(startVolume * (1 - step / steps), 0);
    if (step >= steps) {
      clearInterval(interval);
      onDone();
    }
  }, stepTime);
}
