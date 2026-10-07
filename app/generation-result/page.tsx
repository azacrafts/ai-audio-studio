"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Headphones, Play, Pause, Download, Sparkles, ArrowRight } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

function ResultCard({
  audioUrl,
  index,
  prompt,
}: {
  audioUrl: string;
  index: number;
  prompt: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `acoustic-variation-${index + 1}.mp3`;
    a.click();
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  // Fake waveform bars
  const bars = Array.from({ length: 40 }, () => 0.2 + Math.random() * 0.8);

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-4 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background:
                index === 0
                  ? "linear-gradient(135deg, #ff7849, #ff3d6e)"
                  : "linear-gradient(135deg, #a855f7, #6366f1)",
            }}
          >
            <span className="text-white font-bold text-sm">{index + 1}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Variation {index + 1}</p>
            <p className="text-[11px] text-white/30 truncate max-w-[180px]">{prompt}</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>

      {/* Mini waveform */}
      <div
        className="flex items-center gap-px h-10 cursor-pointer"
        onClick={(e) => {
          if (!audioRef.current || !duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          audioRef.current.currentTime = ratio * duration;
        }}
      >
        {bars.map((h, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full",
              i / bars.length <= progress
                ? index === 0
                  ? "bg-[#ff7849]"
                  : "bg-violet-500"
                : "bg-white/10"
            )}
            style={{ height: `${h * 100}%` }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{
            background:
              index === 0
                ? "linear-gradient(135deg, #ff7849, #ff3d6e)"
                : "linear-gradient(135deg, #a855f7, #6366f1)",
          }}
        >
          {playing ? (
            <Pause className="w-4 h-4 text-white fill-white" />
          ) : (
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          )}
        </button>
        <span className="text-xs text-white/30">
          {formatDuration(Math.floor(currentTime))} /{" "}
          {formatDuration(Math.floor(duration))}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

function ResultPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const url1 = searchParams.get("url1");
  const url2 = searchParams.get("url2");
  const prompt = searchParams.get("prompt") ?? "Your audio";

  const urls = [url1, url2].filter(Boolean) as string[];

  const handleContinue = () => router.push("/");

  return (
    <div className="min-h-screen bg-[#0c0c0f] grain flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff7849] to-[#ff3d6e] items-center justify-center shadow-xl shadow-orange-900/30 mb-2">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-4xl text-white leading-tight">
            {urls.length === 2
              ? "You created your first two audios!"
              : "Your first audio is ready!"}
          </h1>
          <p className="text-sm text-white/40">
            Here {urls.length === 2 ? "are 2 variations" : "is your track"}.
            Continue to edit or create more.
          </p>
        </div>

        {/* Result cards */}
        <div className="space-y-3">
          {urls.length > 0 ? (
            urls.map((url, i) => (
              <ResultCard key={i} audioUrl={url} index={i} prompt={prompt} />
            ))
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
              <Headphones className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">
                Generation is processing — your tracks will appear shortly.
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleContinue}
          className="btn-primary w-full py-4 rounded-2xl text-base flex items-center justify-center gap-2"
        >
          Continue to Studio
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-xs text-white/20">
          Your tracks are saved in your library
        </p>
      </div>
    </div>
  );
}

export default function GenerationResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0c0f]" />}>
      <ResultPageInner />
    </Suspense>
  );
}
