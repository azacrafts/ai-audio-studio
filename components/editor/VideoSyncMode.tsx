"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoPreview } from "./VideoPreview";
import { runVideoSync, type SyncConfig } from "@/lib/video/sync-pipeline";
import type { StudioTrack } from "@/components/studio/LibraryPanel";
import { createClient } from "@/lib/supabase/client";

interface VideoSyncModeProps {
  userId?:     string;
  onJobSaved?: (outputUrl: string) => void;
}

function DropZone({ onFile, label }: { onFile: (f: File) => void; label: string }) {
  const ref     = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
        drag ? "border-violet-500 bg-violet-900/20" : "border-zinc-700 hover:border-zinc-600"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept="video/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <svg className="w-7 h-7 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
      <p className="text-zinc-400 text-sm">{label}</p>
    </div>
  );
}

export function VideoSyncMode({ userId, onJobSaved }: VideoSyncModeProps) {
  // Video source
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl,  setVideoUrl]  = useState<string | null>(null);
  const [vidDuration, setVidDuration] = useState(0);

  // Audio source (from library or upload)
  const [audioTracks, setAudioTracks]   = useState<StudioTrack[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<StudioTrack | null>(null);
  const [audioFile, setAudioFile]         = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);

  const effectiveAudioUrl = selectedAudio?.audioUrl ?? uploadedAudioUrl;

  // Sync config
  const [videoDropTime, setVideoDropTime] = useState(0);
  const [autoDetectDrop, setAutoDetectDrop] = useState(true);
  const [ducking,        setDucking]        = useState(true);
  const [autoCut,        setAutoCut]        = useState(true);
  const [musicVolume,    setMusicVolume]    = useState(0.8);
  const [fadeIn,         setFadeIn]         = useState(1.5);
  const [fadeOut,        setFadeOut]        = useState(1.5);

  // Output
  const [outputUrl,  setOutputUrl]  = useState<string | null>(null);
  const outputBlobRef = useRef<Blob | null>(null);

  // Progress
  const [step,       setStep]       = useState("");
  const [pct,        setPct]        = useState(0);
  const [processing, setProcessing] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [detectedDrop, setDetectedDrop] = useState<number | null>(null);

  // Load library audio tracks
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("generations")
      .select("id, prompt, provider, mode, audio_url, duration, created_at, model")
      .eq("user_id", userId)
      .not("audio_url", "is", null)
      .in("mode", ["music", "sfx", "tts"])
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data) return;
        setAudioTracks(
          data.map((r) => ({
            id:          r.id,
            mode:        r.mode,
            audioUrl:    r.audio_url,
            prompt:      r.prompt,
            provider:    r.provider,
            model:       r.model,
            duration:    r.duration,
            watermarked: false,
            createdAt:   r.created_at,
          }))
        );
      });
  }, [userId]);

  const handleVideoFile = useCallback((f: File) => {
    setVideoFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setOutputUrl(null);
    setError(null);
    outputBlobRef.current = null;
  }, []);

  const handleAudioFile = useCallback((f: File) => {
    setAudioFile(f);
    setUploadedAudioUrl(URL.createObjectURL(f));
    setSelectedAudio(null);
  }, []);

  const handleProcess = async () => {
    if (!videoFile || !effectiveAudioUrl) return;
    setProcessing(true);
    setError(null);
    setOutputUrl(null);
    setPct(0);
    setDetectedDrop(null);

    let jid: string | null = null;
    if (userId) {
      try {
        const res = await fetch("/api/video-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            type:      "sync",
            inputData: { videoDropTime, autoDetectDrop, ducking, autoCut },
          }),
        });
        jid = (await res.json()).jobId ?? null;
      } catch {}
    }

    try {
      const config: SyncConfig = {
        videoDropTime,
        audioDropTime: autoDetectDrop ? -1 : 0,
        ducking,
        autoCut,
        fadeIn,
        fadeOut,
        musicVolume,
      };

      const result = await runVideoSync(
        videoFile,
        effectiveAudioUrl,
        config,
        (s, p) => { setStep(s); setPct(p); }
      );

      outputBlobRef.current = result.outputBlob;
      setOutputUrl(URL.createObjectURL(result.outputBlob));
      setDetectedDrop(result.detectedDrop);

      if (jid && userId) {
        const form = new FormData();
        form.set("jobId",  jid);
        form.set("status", "done");
        form.set("userId", userId);
        await fetch("/api/video-jobs", { method: "PATCH", body: form });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (jid) {
        const form = new FormData();
        form.set("jobId",  jid);
        form.set("status", "error");
        form.set("error",  msg);
        await fetch("/api/video-jobs", { method: "PATCH", body: form });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = () => {
    if (!outputBlobRef.current) return;
    const a  = document.createElement("a");
    a.href   = URL.createObjectURL(outputBlobRef.current);
    a.download = `acoustic_sync_${Date.now()}.mp4`;
    a.click();
  };

  const handleSave = async () => {
    if (!outputBlobRef.current || !userId) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.set("userId", userId);
      form.set("status", "done");
      form.set("video",  new File([outputBlobRef.current], "sync.mp4", { type: "video/mp4" }));
      const res  = await fetch("/api/video-jobs", { method: "PATCH", body: form });
      const data = await res.json();
      if (data.outputUrl) onJobSaved?.(data.outputUrl);
    } finally {
      setSaving(false);
    }
  };

  const fmtSec = (s: number) => `${s.toFixed(1)}s`;
  const canProcess = !!videoFile && !!effectiveAudioUrl && !processing;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {/* ── Video input ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1.5">
          Video file
        </p>
        {videoUrl ? (
          <div className="relative">
            <VideoPreview
              url={videoUrl}
              onDuration={setVidDuration}
              onTimeUpdate={(t) => !outputUrl && setVideoDropTime(parseFloat(t.toFixed(1)))}
            />
            <button
              onClick={() => { setVideoFile(null); setVideoUrl(null); setOutputUrl(null); }}
              className="absolute top-2 right-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded"
            >
              Change
            </button>
          </div>
        ) : (
          <DropZone onFile={handleVideoFile} label="Drop video file here or browse" />
        )}
      </div>

      {/* ── Audio source ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1.5">
          Audio / Music track
        </p>

        {/* Library picker */}
        {audioTracks.length > 0 && (
          <div className="flex flex-col gap-1 mb-2 max-h-36 overflow-y-auto">
            {audioTracks.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedAudio(t); setAudioFile(null); setUploadedAudioUrl(null); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  selectedAudio?.id === t.id
                    ? "bg-violet-600/20 border border-violet-500/40 text-violet-200"
                    : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <span className="text-violet-400 text-xs uppercase font-mono w-8 shrink-0">{t.mode}</span>
                <span className="truncate flex-1">{t.prompt ?? "Untitled"}</span>
                {t.duration && (
                  <span className="text-zinc-500 text-xs shrink-0">{fmtSec(t.duration)}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Upload audio */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
            uploadedAudioUrl && !selectedAudio
              ? "border-violet-500/40 bg-violet-600/10 text-violet-200"
              : "border-zinc-700 hover:border-zinc-600 text-zinc-400"
          }`}
          onClick={() => {
            const i = document.createElement("input");
            i.type   = "file";
            i.accept = "audio/*";
            i.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleAudioFile(f);
            };
            i.click();
          }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>{audioFile ? audioFile.name : "Upload audio file (MP3, WAV)"}</span>
        </div>
      </div>

      {/* ── Sync settings ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Sync settings</p>

        {/* Drop time */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-zinc-300">Video drop time</label>
            <span className="text-xs text-violet-400 tabular-nums">{videoDropTime.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={vidDuration || 60}
            step={0.1}
            value={videoDropTime}
            onChange={(e) => setVideoDropTime(parseFloat(e.target.value))}
            className="w-full accent-violet-500"
          />
          <p className="text-zinc-600 text-xs mt-0.5">
            Click in the video timeline above to set the sync point
          </p>
        </div>

        {/* Auto-detect toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div
            onClick={() => setAutoDetectDrop(!autoDetectDrop)}
            className={`relative w-8 h-4 rounded-full transition-colors ${autoDetectDrop ? "bg-violet-600" : "bg-zinc-700"}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${autoDetectDrop ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm text-zinc-300">Auto-detect audio drop point</span>
        </label>

        {/* Music volume */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-zinc-300">Music volume</label>
            <span className="text-xs text-zinc-400 tabular-nums">{Math.round(musicVolume * 100)}%</span>
          </div>
          <input
            type="range" min={0} max={1.5} step={0.05} value={musicVolume}
            onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
            className="w-full accent-violet-500"
          />
        </div>

        {/* Fade */}
        <div className="flex gap-3">
          {([["Fade in", fadeIn, setFadeIn], ["Fade out", fadeOut, setFadeOut]] as const).map(
            ([label, val, setter]) => (
              <div key={label} className="flex-1">
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-zinc-300">{label}</label>
                  <span className="text-xs text-zinc-400">{(val as number).toFixed(1)}s</span>
                </div>
                <input type="range" min={0} max={4} step={0.5}
                  value={val as number}
                  onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
            )
          )}
        </div>

        {/* Toggles */}
        {[
          { label: "Duck music under speech",        value: ducking,  set: setDucking  },
          { label: "Auto-trim video to audio length", value: autoCut,  set: setAutoCut  },
        ].map(({ label, value, set }) => (
          <label key={label} className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => set(!value)}
              className={`relative w-8 h-4 rounded-full transition-colors ${value ? "bg-violet-600" : "bg-zinc-700"}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-zinc-300">{label}</span>
          </label>
        ))}
      </div>

      {/* Output */}
      {outputUrl && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs text-violet-400 font-medium uppercase tracking-wide">Synced output</p>
            {detectedDrop !== null && (
              <span className="text-xs text-zinc-500">
                (auto drop at {detectedDrop.toFixed(2)}s)
              </span>
            )}
          </div>
          <VideoPreview url={outputUrl} clips={[]} />
        </div>
      )}

      {/* Progress */}
      <AnimatePresence>
        {processing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{step}</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-violet-500 rounded-full"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-auto pt-2">
        {!outputUrl ? (
          <button
            onClick={handleProcess}
            disabled={!canProcess}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {processing ? `${pct}% — ${step}` : "Sync Audio to Video"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleExport}
              className="flex-1 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium">
              Download
            </button>
            {userId && (
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold">
                {saving ? "Saving…" : "Save to Library"}
              </button>
            )}
            <button
              onClick={() => { setOutputUrl(null); outputBlobRef.current = null; setDetectedDrop(null); }}
              className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
