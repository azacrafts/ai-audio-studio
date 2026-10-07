"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Play, Pause, Download, Copy, Pencil } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import Link from "next/link";

interface Generation {
  id: string;
  prompt: string;
  preset: string;
  audio_url: string;
  created_at: string;
  watermarked: boolean;
}

function GenerationRow({ gen }: { gen: Generation }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
      {/* Play button */}
      <button
        onClick={handlePlayPause}
        className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center flex-shrink-0 transition-colors"
      >
        {playing ? (
          <Pause className="w-3.5 h-3.5 text-white fill-white" />
        ) : (
          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate font-medium">
          {gen.prompt ?? gen.preset ?? "Untitled"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ff7849] to-[#ff3d6e] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-white/25 flex-shrink-0">
            {duration > 0 ? formatDuration(Math.floor(duration)) : "--:--"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/editor?url=${encodeURIComponent(gen.audio_url)}`}>
          <button className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
        </Link>
        <button
          onClick={() => {
            const a = document.createElement("a");
            a.href = gen.audio_url;
            a.download = "acoustic-track.mp3";
            a.click();
          }}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
        >
          <Download className="w-3 h-3" />
        </button>
      </div>

      <audio
        ref={audioRef}
        src={gen.audio_url}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      />
    </div>
  );
}

export function RecentGenerations() {
  const [gens, setGens] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("generations")
        .select("id, prompt, preset, audio_url, created_at, watermarked")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setGens(data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

  if (gens.length === 0) return null;

  return (
    <div className="space-y-1">
      {gens.map((gen) => (
        <GenerationRow key={gen.id} gen={gen} />
      ))}
    </div>
  );
}
