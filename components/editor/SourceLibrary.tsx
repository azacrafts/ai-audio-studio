"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Music2, Zap, Mic, RefreshCw, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export interface LibraryTrack {
  id:         string;
  url:        string;
  name:       string;
  mode:       string;   // "music" | "sfx" | "tts" | ...
  provider?:  string;
  model?:     string;
  createdAt:  string;
}

interface SourceLibraryProps {
  onLoadMain:    (track: LibraryTrack) => void;
  onAddOverlay:  (track: LibraryTrack) => void;
  currentMainId?: string;
}

type Tab = "studio" | "upload";

const MODE_ICONS: Record<string, React.ElementType> = {
  music: Music2, sfx: Zap, tts: Mic, s2s: RefreshCw,
};

export function SourceLibrary({ onLoadMain, onAddOverlay, currentMainId }: SourceLibraryProps) {
  const fileRef             = useRef<HTMLInputElement>(null);
  const [tab, setTab]       = useState<Tab>("studio");
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (tab !== "studio") return;
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("generations")
        .select("id, prompt, audio_url, mode, provider, model, created_at")
        .eq("user_id", user.id)
        .not("audio_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(40);
      if (data) {
        setTracks(
          data.map((g) => ({
            id:        g.id,
            url:       g.audio_url!,
            name:      g.prompt ?? `${g.mode ?? "Track"} — ${g.model ?? ""}`,
            mode:      g.mode ?? "music",
            provider:  g.provider,
            model:     g.model,
            createdAt: g.created_at,
          }))
        );
      }
      setLoading(false);
    });
  }, [tab]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("audio/")) return;
    const url = URL.createObjectURL(file);
    const track: LibraryTrack = {
      id:        `upload-${Date.now()}`,
      url,
      name:      file.name.replace(/\.[^.]+$/, ""),
      mode:      "upload",
      createdAt: new Date().toISOString(),
    };
    onLoadMain(track);
    setTab("studio");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/8 mb-3 flex-shrink-0">
        {(["studio", "upload"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === t ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"
            )}
          >
            {t === "studio" ? "Studio" : "Upload"}
          </button>
        ))}
      </div>

      {/* Studio tab */}
      {tab === "studio" && (
        <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
            </div>
          )}
          {!loading && tracks.length === 0 && (
            <div className="text-center py-8">
              <Music2 className="w-6 h-6 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/25">No generated tracks yet.</p>
              <p className="text-[11px] text-white/15 mt-0.5">Go to Studio to generate audio.</p>
            </div>
          )}
          {tracks.map((t) => {
            const Icon    = MODE_ICONS[t.mode] ?? Music2;
            const isMain  = t.id === currentMainId;
            return (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-2.5 p-2.5 rounded-xl border transition-all",
                  isMain
                    ? "border-[#ff7849]/40 bg-[#ff7849]/8"
                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                  isMain ? "bg-[#ff7849]/20" : "bg-white/5"
                )}>
                  <Icon className={cn("w-3.5 h-3.5", isMain ? "text-[#ff7849]" : "text-white/30")} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white/70 truncate leading-none">
                    {t.name.length > 32 ? t.name.slice(0, 32) + "…" : t.name}
                  </p>
                  <p className="text-[10px] text-white/25 mt-0.5 capitalize">{t.mode} · {t.provider ?? "suno"}</p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    title="Load as main track"
                    onClick={() => onLoadMain(t)}
                    className="w-6 h-6 rounded-md bg-[#ff7849]/20 hover:bg-[#ff7849]/40 flex items-center justify-center transition-colors"
                  >
                    <span className="text-[9px] text-[#ff7849] font-bold">ED</span>
                  </button>
                  <button
                    title="Add as overlay"
                    onClick={() => onAddOverlay(t)}
                    className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3 h-3 text-white/40" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload tab */}
      {tab === "upload" && (
        <div className="flex-1 flex flex-col gap-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFileSelect(f);
            }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex-1 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
              dragOver ? "border-[#ff7849]/50 bg-[#ff7849]/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              dragOver ? "bg-[#ff7849]/20" : "bg-white/5"
            )}>
              <Upload className={cn("w-5 h-5", dragOver ? "text-[#ff7849]" : "text-white/20")} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/40">
                {dragOver ? "Drop to load" : "Upload audio"}
              </p>
              <p className="text-[11px] text-white/20 mt-0.5">MP3, WAV, M4A · up to 50 MB</p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />

          <div className="text-center text-[11px] text-white/15">
            Loaded files are processed locally — they never leave your browser.
          </div>
        </div>
      )}
    </div>
  );
}
