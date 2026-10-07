"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { WaveformEditor, type WaveformEditorHandle } from "@/components/editor/WaveformEditor";
import { OverlayTrack, type OverlayTrackData } from "@/components/editor/OverlayTrack";
import { SourceLibrary, type LibraryTrack } from "@/components/editor/SourceLibrary";
import { AutoEditMode } from "@/components/editor/AutoEditMode";
import { VideoSyncMode } from "@/components/editor/VideoSyncMode";
import { useAudio } from "@/lib/audio-context";
import { createClient } from "@/lib/supabase/client";
import { SFX_CATEGORIES } from "@/lib/ai/elevenlabs";
import {
  ArrowLeft, Scissors, Play, Pause, Wand2, Download, Layers,
  Volume2, Zap, RotateCcw, CheckCircle, Loader2, ChevronDown, ChevronUp,
  BookOpen, Upload as UploadIcon, Film, Music2,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { GRAD, ACCENT_ORANGE } from "@/lib/design-tokens";
import Link from "next/link";

type EditorMode = "audio" | "auto-edit" | "video-sync";

const EDITOR_MODES: { id: EditorMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "audio",      label: "Audio Edit",  icon: <Music2 className="w-3.5 h-3.5" />, desc: "Trim, mix & enhance audio"     },
  { id: "auto-edit",  label: "AI Auto-Edit", icon: <Film   className="w-3.5 h-3.5" />, desc: "Auto-cut short-form video clips" },
  { id: "video-sync", label: "Video Sync",  icon: <Zap    className="w-3.5 h-3.5" />, desc: "Sync music drop to video beat"  },
];

interface RegionData { start: number; end: number; }

interface AudioEffects {
  fadeIn:   number;   // seconds, 0 = off
  fadeOut:  number;   // seconds, 0 = off
  normalize: boolean;
  masterVolume: number; // 0–2
}

const DEFAULT_EFFECTS: AudioEffects = {
  fadeIn: 0, fadeOut: 0, normalize: false, masterVolume: 1,
};

// ── Fade chip component ───────────────────────────────────────────────────────
function FadeChips({
  label, value, options, onChange, color,
}: {
  label: string; value: number; options: number[]; onChange: (v: number) => void; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">{label}</label>
        <span className="text-[11px] font-semibold" style={{ color }}>{value === 0 ? "Off" : `${value}s`}</span>
      </div>
      <div className="flex gap-1">
        {options.map((v) => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all",
              value === v
                ? "text-white shadow-sm"
                : "bg-white/5 text-white/30 hover:text-white hover:bg-white/10"
            )}
            style={value === v ? { background: `${color}22`, color, border: `1px solid ${color}40` } : {}}
          >
            {v === 0 ? "Off" : `${v}s`}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Inner page ────────────────────────────────────────────────────────────────
function EditorInner() {
  const searchParams = useSearchParams();
  const urlParam     = searchParams.get("url");
  const trackIdParam = searchParams.get("trackId");

  // Top-level mode selector
  const [editorMode, setEditorMode] = useState<EditorMode>("audio");

  const { play } = useAudio();
  const wsRef    = useRef<WaveformEditorHandle>(null);

  // Source state
  const [mainUrl, setMainUrl]       = useState<string | null>(urlParam);
  const [mainName, setMainName]     = useState("Untitled Track");
  const [mainTrackId, setMainTrackId] = useState<string | null>(trackIdParam);
  const [sourceType, setSourceType] = useState<"generated" | "uploaded">(
    trackIdParam ? "generated" : "uploaded"
  );

  // Playback
  const [playing, setPlaying]       = useState(false);
  const [duration, setDuration]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Edit controls
  const [trimRegion, setTrimRegion]    = useState<RegionData | null>(null);
  const [effects, setEffects]          = useState<AudioEffects>(DEFAULT_EFFECTS);
  const [overlays, setOverlays]        = useState<OverlayTrackData[]>([]);

  // SFX generation panel
  const [sfxOpen, setSfxOpen]          = useState(false);
  const [sfxPrompt, setSfxPrompt]      = useState("");
  const [sfxLoading, setSfxLoading]    = useState(false);

  // Processing state
  const [processing, setProcessing]    = useState(false);
  const [processProgress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl]      = useState<string | null>(null);
  const [outputSaved, setOutputSaved]  = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // Layout
  const [libOpen, setLibOpen]          = useState(true);
  const [userId, setUserId]            = useState<string | null>(null);

  // Track loading states
  const [trackLoading, setTrackLoading] = useState(!!trackIdParam);
  const [trackError, setTrackError]     = useState<string | null>(null);

  // Load user
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Load track from ?trackId= param — tries Supabase first, then localStorage fallback
  useEffect(() => {
    if (!trackIdParam) return;
    setTrackLoading(true);
    setTrackError(null);

    const loadTrack = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("generations")
          .select("id, audio_url, prompt, model, provider, mode")
          .eq("id", trackIdParam)
          .single();

        if (data?.audio_url) {
          setMainUrl(data.audio_url);
          setMainName(data.prompt ?? `${data.mode ?? "Track"} — ${data.model ?? ""}`);
          setMainTrackId(data.id);
          setSourceType("generated");
          setTrackLoading(false);
          return;
        }

        // Fallback: check localStorage studio tracks (for anon-generated or unsynced tracks)
        try {
          const raw = localStorage.getItem("acoustic_studio_tracks");
          if (raw) {
            const localTracks = JSON.parse(raw) as { id: string; audioUrl?: string; prompt?: string; mode?: string; model?: string }[];
            const match = localTracks.find((t) => t.id === trackIdParam);
            if (match?.audioUrl) {
              setMainUrl(match.audioUrl);
              setMainName(match.prompt ?? `${match.mode ?? "Track"} — ${match.model ?? ""}`);
              setMainTrackId(match.id);
              setSourceType("generated");
              setTrackLoading(false);
              return;
            }
          }
        } catch { /* localStorage parse error — ignore */ }

        // Track not found anywhere
        setTrackError("Track not found. It may have been deleted or the URL has expired.");
        setTrackLoading(false);
      } catch {
        setTrackError("Failed to load track. Please check your connection.");
        setTrackLoading(false);
      }
    };

    loadTrack();
  }, [trackIdParam]);

  // Restore editor session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("acoustic_editor_session");
      if (!saved) return;
      const session = JSON.parse(saved);
      if (session.mainUrl && !urlParam && !trackIdParam) {
        setMainUrl(session.mainUrl);
        setMainName(session.mainName ?? "Untitled Track");
        setEffects(session.effects ?? DEFAULT_EFFECTS);
        setOverlays(session.overlays ?? []);
        if (session.trimRegion) setTrimRegion(session.trimRegion);
      }
    } catch {}
  }, []); // eslint-disable-line

  // Persist session to localStorage on change
  useEffect(() => {
    if (!mainUrl) return;
    const session = {
      mainUrl,
      mainName,
      effects,
      overlays: overlays.filter((o) => !o.url.startsWith("blob:")), // don't persist blobs
      trimRegion,
    };
    try { localStorage.setItem("acoustic_editor_session", JSON.stringify(session)); } catch {}
  }, [mainUrl, mainName, effects, overlays, trimRegion]);

  // Callbacks
  const handleWaveformReady = useCallback((dur: number) => {
    setDuration(dur);
    setTrimRegion({ start: 0, end: dur });
  }, []);

  const handlePlayPause = () => {
    if (playing) wsRef.current?.pause();
    else wsRef.current?.play();
    setPlaying(!playing);
  };

  const handleLoadMain = (track: LibraryTrack) => {
    setMainUrl(track.url);
    setMainName(track.name);
    setMainTrackId(track.id.startsWith("upload-") ? null : track.id);
    setSourceType(track.id.startsWith("upload-") ? "uploaded" : "generated");
    setOutputUrl(null);
    setOutputSaved(false);
    setPlaying(false);
  };

  const handleAddOverlay = (track: LibraryTrack) => {
    const typeMap: Record<string, OverlayTrackData["type"]> = {
      sfx: "sfx", music: "music", tts: "tts", s2s: "tts",
    };
    setOverlays((prev) => [
      ...prev,
      {
        id:       `ov-${Date.now()}`,
        url:      track.url,
        name:     track.name,
        type:     typeMap[track.mode] ?? "music",
        volume:   0.5,
        offsetMs: 0,
      },
    ]);
  };

  const handleOverlayChange = (id: string, patch: Partial<OverlayTrackData>) => {
    setOverlays((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } : o));
  };

  const handleOverlayRemove = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
  };

  const handleGenerateSFX = async () => {
    if (!sfxPrompt.trim()) return;
    setSfxLoading(true);
    try {
      const res = await fetch("/api/elevenlabs/sfx", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: sfxPrompt, userId }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setOverlays((prev) => [
          ...prev,
          { id: `sfx-${Date.now()}`, url: data.audioUrl, name: sfxPrompt, type: "sfx", volume: 0.6, offsetMs: 0 },
        ]);
        setSfxPrompt("");
      }
    } catch {}
    finally { setSfxLoading(false); }
  };

  const handleProcess = async () => {
    if (!mainUrl) return;
    setProcessing(true);
    setProcessError(null);
    setOutputSaved(false);
    setProgress(0);

    try {
      const { processAudioTracks } = await import("@/lib/audio/ffmpeg-client");

      const mainTrackConfig = {
        url:       mainUrl,
        type:      "main" as const,
        volume:    effects.masterVolume,
        trimStart: trimRegion?.start,
        trimEnd:   trimRegion?.end,
      };

      const overlayConfigs = overlays.map((o) => ({
        url:      o.url,
        type:     "overlay" as const,
        volume:   o.volume,
        offsetMs: o.offsetMs,
      }));

      const blob = await processAudioTracks({
        tracks:  [mainTrackConfig, ...overlayConfigs],
        effects: {
          fadeIn:    effects.fadeIn   > 0 ? effects.fadeIn   : undefined,
          fadeOut:   effects.fadeOut  > 0 ? effects.fadeOut  : undefined,
          normalize: effects.normalize,
        },
        onProgress: (p) => setProgress(Math.round(p * 100)),
      });

      const localUrl = URL.createObjectURL(blob);
      setOutputUrl(localUrl);

      // Play preview immediately
      play({ id: `edited-${Date.now()}`, audioUrl: localUrl, title: `✂ ${mainName}`, provider: "edited" });
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : "Processing failed. Please try again.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleExport = () => {
    const url = outputUrl ?? mainUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mainName.slice(0, 40)}-edited.mp3`;
    a.click();
  };

  const handleSaveToLibrary = async () => {
    if (!outputUrl) return;
    try {
      const blob    = await fetch(outputUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append("audio",       new File([blob], "edited.mp3", { type: "audio/mpeg" }));
      if (userId)      formData.append("userId",     userId);
      formData.append("sourceType",  sourceType);
      if (mainTrackId) formData.append("sourceId",  mainTrackId);
      formData.append("configJson",  JSON.stringify({ trimRegion, effects, overlayCount: overlays.length }));

      const res  = await fetch("/api/editor/export", { method: "POST", body: formData });
      const data = await res.json();
      if (data.outputUrl) setOutputSaved(true);
    } catch {}
  };

  const resetEditor = () => {
    setTrimRegion(duration > 0 ? { start: 0, end: duration } : null);
    setEffects(DEFAULT_EFFECTS);
    setOverlays([]);
    setOutputUrl(null);
    setOutputSaved(false);
    setProcessError(null);
  };

  const trimmedDur =
    trimRegion ? trimRegion.end - trimRegion.start : duration;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Mesh gradient — same palette as hero */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 10% -10%, rgba(255,200,87,0.22) 0%, transparent 60%),
            radial-gradient(ellipse 60% 45% at 90% -5%,  rgba(255,106,61,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 15%,  rgba(255,46,99,0.12)  0%, transparent 60%)
          `,
        }}
      />
      <Navbar />

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-shrink-0 border-b border-white/[0.06] bg-[#0e0e10]/80 backdrop-blur-sm px-4 sm:px-6 py-2.5 mt-16 flex items-center gap-3 flex-wrap">
        <Link href="/generate"
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
          <ArrowLeft className="w-3.5 h-3.5 text-white/40" />
        </Link>

        {/* Mode selector tabs */}
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1">
          {EDITOR_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setEditorMode(m.id)}
              style={editorMode === m.id ? { background: GRAD } : undefined}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                editorMode === m.id
                  ? "text-white shadow"
                  : "text-white/35 hover:text-white/70 hover:bg-white/5"
              )}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Track name (audio mode only) */}
        {editorMode === "audio" && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-white/60 truncate hidden md:block">{mainName}</span>
            {outputSaved && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                <CheckCircle className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {editorMode === "audio" && (
            <>
              <button onClick={resetEditor}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/40 hover:text-white transition-all">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                onClick={() => setLibOpen(!libOpen)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/40 hover:text-white transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Video modes ──────────────────────────────────────────────────── */}
      {editorMode !== "audio" && (
        <div className="relative z-10 flex-1 overflow-y-auto p-5">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <h2 className="text-base font-bold text-white">
                {editorMode === "auto-edit" ? "AI Auto-Edit" : "Video + Audio Sync"}
              </h2>
              <p className="text-xs text-white/35 mt-0.5">
                {editorMode === "auto-edit"
                  ? "Upload a video → pipeline scores scenes by energy + motion → cuts the best clips automatically."
                  : "Upload a video + pick a music track → sync the music drop to an exact video beat."}
              </p>
            </div>

            {editorMode === "auto-edit" && (
              <AutoEditMode
                userId={userId ?? undefined}
                onJobSaved={(url) => console.log("Video saved:", url)}
              />
            )}
            {editorMode === "video-sync" && (
              <VideoSyncMode
                userId={userId ?? undefined}
                onJobSaved={(url) => console.log("Sync saved:", url)}
              />
            )}
          </div>
        </div>
      )}

      {/* ── 3-panel layout (audio mode only) ─────────────────────────────── */}
      {editorMode === "audio" && (<>
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* LEFT: Source Library */}
        <aside className={cn(
          "flex-shrink-0 border-r border-white/[0.06] bg-[#0e0e10]/80 backdrop-blur-sm transition-all overflow-hidden flex flex-col",
          libOpen ? "w-64" : "w-0 lg:w-64"
        )}>
          <div className="flex-1 overflow-hidden flex flex-col p-3">
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3 px-0.5">
              Source Library
            </p>
            <SourceLibrary
              currentMainId={mainTrackId ?? undefined}
              onLoadMain={handleLoadMain}
              onAddOverlay={handleAddOverlay}
            />
          </div>
        </aside>

        {/* CENTER: Main editor */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-w-0">

          {/* Loading state — fetching track from Studio */}
          {trackLoading && (
            <div className="h-full min-h-96 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-white/30 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/40">Loading track…</p>
                <p className="text-[11px] text-white/20 mt-1">Fetching audio from your library</p>
              </div>
            </div>
          )}

          {/* Error state — track not found or failed to load */}
          {!trackLoading && trackError && !mainUrl && (
            <div className="h-full min-h-96 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Scissors className="w-7 h-7 text-red-400/50" />
              </div>
              <div className="text-center max-w-sm">
                <p className="text-sm font-semibold text-red-400/80">{trackError}</p>
                <p className="text-[11px] text-white/20 mt-1">Try uploading a file or go back to the Studio</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/generate"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/8">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Studio
                </Link>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90" style={{ background: GRAD }}>
                  <UploadIcon className="w-4 h-4" />
                  Upload audio
                  <input type="file" accept="audio/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      setTrackError(null);
                      handleLoadMain({ id: `upload-${Date.now()}`, url, name: f.name.replace(/\.[^.]+$/, ""), mode: "upload", createdAt: "" });
                    }} />
                </label>
              </div>
            </div>
          )}

          {/* Empty state — no track selected */}
          {!trackLoading && !trackError && !mainUrl && (
            <div className="h-full min-h-96 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <Scissors className="w-7 h-7 text-white/15" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/40">No audio loaded</p>
                <p className="text-[11px] text-white/20 mt-1">Select a track from the library or upload a file</p>
              </div>
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90" style={{ background: GRAD }}>
                <UploadIcon className="w-4 h-4" />
                Upload audio
                <input type="file" accept="audio/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const url = URL.createObjectURL(f);
                    handleLoadMain({ id: `upload-${Date.now()}`, url, name: f.name.replace(/\.[^.]+$/, ""), mode: "upload", createdAt: "" });
                  }} />
              </label>
            </div>
          )}

          {mainUrl && (
            <>
              {/* Main track waveform */}
              <div className="bg-[#111113] border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayPause}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 hover:opacity-90"
                    style={{ background: GRAD, boxShadow: "0 4px 16px rgba(255,106,61,0.35)" }}
                  >
                    {playing
                      ? <Pause className="w-4 h-4 text-white fill-white" />
                      : <Play  className="w-4 h-4 text-white fill-white ml-0.5" />
                    }
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 truncate">{mainName}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">
                      {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                      {trimRegion && (
                        <span className="ml-2" style={{ color: ACCENT_ORANGE }}>
                          · Trim: {formatDuration(Math.floor(trimRegion.start))}–{formatDuration(Math.floor(trimRegion.end))}
                          ({formatDuration(Math.floor(trimmedDur))})
                        </span>
                      )}
                    </p>
                  </div>

                  {trimRegion && (
                    <button
                      onClick={() => setTrimRegion({ start: 0, end: duration })}
                      className="text-[10px] text-white/25 hover:text-white/50 transition-colors flex-shrink-0"
                    >
                      Reset trim
                    </button>
                  )}
                </div>

                <WaveformEditor
                  ref={wsRef}
                  audioUrl={mainUrl}
                  color={ACCENT_ORANGE}
                  showTrimHandles
                  trimRegion={trimRegion ?? undefined}
                  onTrimChange={setTrimRegion}
                  onReady={handleWaveformReady}
                  onTimeUpdate={setCurrentTime}
                />
              </div>

              {/* Overlay tracks */}
              {overlays.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-0.5">Overlays</p>
                    <span className="text-[10px] text-white/20">{overlays.length} track{overlays.length > 1 ? "s" : ""}</span>
                  </div>
                  {overlays.map((ov) => (
                    <OverlayTrack
                      key={ov.id}
                      track={ov}
                      totalDuration={duration}
                      onChange={handleOverlayChange}
                      onRemove={handleOverlayRemove}
                    />
                  ))}
                </div>
              )}

              {/* SFX Generator (collapsible) */}
              <div className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setSfxOpen(!sfxOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <span className="text-sm font-semibold text-white">Generate SFX overlay</span>
                    {overlays.filter((o) => o.type === "sfx").length > 0 && (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">
                        {overlays.filter((o) => o.type === "sfx").length}
                      </span>
                    )}
                  </div>
                  {sfxOpen
                    ? <ChevronUp className="w-4 h-4 text-white/30" />
                    : <ChevronDown className="w-4 h-4 text-white/30" />
                  }
                </button>
                {sfxOpen && (
                  <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
                    <div className="flex gap-2">
                      <input
                        value={sfxPrompt}
                        onChange={(e) => setSfxPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleGenerateSFX()}
                        placeholder='e.g. "gentle rain on a window"'
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
                      />
                      <button
                        onClick={handleGenerateSFX}
                        disabled={sfxLoading || !sfxPrompt.trim()}
                        className="bg-amber-600/80 hover:bg-amber-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {sfxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-3.5 h-3.5" />Add</>}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SFX_CATEGORIES.flatMap((c) => c.prompts.slice(0, 2)).slice(0, 8).map((p) => (
                        <button key={p} onClick={() => setSfxPrompt(p)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-white/35 hover:text-white/70 hover:bg-white/10 transition-colors">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Output preview (after processing) */}
              {outputUrl && (
                <div className="bg-emerald-500/[0.07] border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-emerald-300">Output ready</span>
                  </div>
                  <WaveformEditor
                    audioUrl={outputUrl}
                    color="#10b981"
                    label="Processed output"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleExport}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-sm font-bold text-white transition-colors">
                      <Download className="w-4 h-4" /> Download
                    </button>
                    {!outputSaved && userId && (
                      <button onClick={handleSaveToLibrary}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold text-white transition-colors">
                        <Layers className="w-4 h-4" /> Save to library
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* RIGHT: Controls */}
        <aside className="flex-shrink-0 w-72 border-l border-white/[0.06] bg-[#0e0e10]/80 backdrop-blur-sm overflow-y-auto p-4 space-y-5 hidden xl:flex xl:flex-col">

          {/* Trim */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,106,61,0.15)" }}>
                <Scissors className="w-3 h-3" style={{ color: ACCENT_ORANGE }} />
              </div>
              <span className="text-xs font-bold text-white/70">Trim</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-white/25 mb-1">Start (s)</label>
                <input
                  type="number"
                  min={0}
                  max={trimRegion?.end ?? duration}
                  step={0.1}
                  value={(trimRegion?.start ?? 0).toFixed(1)}
                  onChange={(e) => setTrimRegion((r) => ({
                    start: Math.max(0, parseFloat(e.target.value) || 0),
                    end:   r?.end ?? duration,
                  }))}
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF6A3D]/40"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/25 mb-1">End (s)</label>
                <input
                  type="number"
                  min={trimRegion?.start ?? 0}
                  max={duration}
                  step={0.1}
                  value={(trimRegion?.end ?? duration).toFixed(1)}
                  onChange={(e) => setTrimRegion((r) => ({
                    start: r?.start ?? 0,
                    end:   Math.min(duration, parseFloat(e.target.value) || duration),
                  }))}
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF6A3D]/40"
                />
              </div>
            </div>
            {trimRegion && duration > 0 && (
              <p className="text-[10px] mt-1.5 px-0.5" style={{ color: "rgba(255,106,61,0.6)" }}>
                {formatDuration(Math.floor(trimmedDur))} of {formatDuration(Math.floor(duration))} selected
              </p>
            )}
          </section>

          <div className="h-px bg-white/[0.06]" />

          {/* Volume */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,106,61,0.15)" }}>
                <Volume2 className="w-3 h-3" style={{ color: ACCENT_ORANGE }} />
              </div>
              <span className="text-xs font-bold text-white/70">Master Volume</span>
              <span className="ml-auto text-[11px] font-semibold" style={{ color: ACCENT_ORANGE }}>
                {Math.round(effects.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0} max={2} step={0.05}
              value={effects.masterVolume}
              onChange={(e) => setEffects((ef) => ({ ...ef, masterVolume: parseFloat(e.target.value) }))}
              className="w-full h-1 accent-[#FF6A3D]"
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[9px] text-white/20">Mute</span>
              <span className="text-[9px] text-white/20">Boost ×2</span>
            </div>
          </section>

          <div className="h-px bg-white/[0.06]" />

          {/* Effects */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#ff7849]/15 flex items-center justify-center">
                <Wand2 className="w-3 h-3 text-[#ff7849]" />
              </div>
              <span className="text-xs font-bold text-white/70">Effects</span>
            </div>

            <FadeChips label="Fade In"  value={effects.fadeIn}  options={[0,1,2,3,5]}
              onChange={(v) => setEffects((e) => ({ ...e, fadeIn: v }))}  color={ACCENT_ORANGE} />
            <FadeChips label="Fade Out" value={effects.fadeOut} options={[0,1,2,3,5]}
              onChange={(v) => setEffects((e) => ({ ...e, fadeOut: v }))} color={ACCENT_ORANGE} />

            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-white/40">Normalize levels</span>
              <button
                type="button"
                onClick={() => setEffects((e) => ({ ...e, normalize: !e.normalize }))}
                className={cn("relative w-9 h-5 rounded-full transition-colors", effects.normalize ? "" : "bg-white/10")}
                style={effects.normalize ? { background: GRAD } : undefined}
              >
                <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", effects.normalize ? "left-[18px]" : "left-0.5")} />
              </button>
            </div>
          </section>

          <div className="h-px bg-white/[0.06]" />

          {/* Overlays summary */}
          {overlays.length > 0 && (
            <>
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <Layers className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-white/70">Overlays</span>
                  <span className="ml-auto text-[10px] text-white/30">{overlays.length} track{overlays.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-1.5">
                  {overlays.map((o) => (
                    <div key={o.id} className="flex items-center gap-2 text-[11px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="text-white/50 truncate flex-1">{o.name}</span>
                      <span className="text-white/25 flex-shrink-0">
                        {Math.round(o.volume * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <div className="h-px bg-white/[0.06]" />
            </>
          )}

          {/* Active edit summary chips */}
          {mainUrl && (
            <div className="flex flex-wrap gap-1.5">
              {trimRegion && trimRegion.start > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,106,61,0.1)", color: ACCENT_ORANGE, border: "1px solid rgba(255,106,61,0.2)" }}>
                  ✂ {trimRegion.start.toFixed(1)}s–{trimRegion.end.toFixed(1)}s
                </span>
              )}
              {effects.fadeIn > 0 && (
                <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full">↑ {effects.fadeIn}s in</span>
              )}
              {effects.fadeOut > 0 && (
                <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full">↓ {effects.fadeOut}s out</span>
              )}
              {effects.normalize && (
                <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full">⟡ Normalize</span>
              )}
            </div>
          )}

          {/* Process button */}
          <div className="space-y-2 mt-auto pt-2">
            {processError && (
              <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {processError}
              </p>
            )}

            <button
              onClick={handleProcess}
              disabled={!mainUrl || processing}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: GRAD, boxShadow: "0 8px 24px rgba(255,106,61,0.25)" }}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing{processProgress > 0 ? ` ${processProgress}%` : "…"}
                </>
              ) : (
                <><Wand2 className="w-4 h-4" /> Apply &amp; Process</>
              )}
            </button>

            {outputUrl && (
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/8 hover:bg-white/12 text-sm font-bold text-white transition-all"
              >
                <Download className="w-4 h-4" /> Download .mp3
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile controls */}
      <div className="relative z-10 xl:hidden border-t border-white/[0.06] bg-[#0e0e10]/80 backdrop-blur-sm p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FadeChips label="Fade In"  value={effects.fadeIn}  options={[0,1,2,3,5]}
            onChange={(v) => setEffects((e) => ({ ...e, fadeIn: v }))}  color={ACCENT_ORANGE} />
          <FadeChips label="Fade Out" value={effects.fadeOut} options={[0,1,2,3,5]}
            onChange={(v) => setEffects((e) => ({ ...e, fadeOut: v }))} color={ACCENT_ORANGE} />
        </div>
        <div className="flex gap-2">
          <button onClick={handleProcess} disabled={!mainUrl || processing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
            style={{ background: GRAD }}
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4" />Process</>}
          </button>
          {outputUrl && (
            <button onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/8 text-sm font-bold text-white">
              <Download className="w-4 h-4" /> Download
            </button>
          )}
        </div>
      </div>
      </>)}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <EditorInner />
    </Suspense>
  );
}
