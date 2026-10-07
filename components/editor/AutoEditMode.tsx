"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoPreview } from "./VideoPreview";
import { runAutoEdit, type AutoEditConfig, type EditStyle } from "@/lib/video/pipeline";
import type { ScoredClip } from "@/lib/video/analysis";

interface AutoEditModeProps {
  userId?:     string;
  /** Called when output is saved; parent can refresh job history */
  onJobSaved?: (outputUrl: string) => void;
}

const DURATIONS: (10 | 15 | 30)[] = [10, 15, 30];
const STYLES: { id: EditStyle; label: string; desc: string }[] = [
  { id: "viral",     label: "Viral",     desc: "High cuts, peak energy moments" },
  { id: "cinematic", label: "Cinematic", desc: "Fewer cuts, long smooth scenes"  },
  { id: "vlog",      label: "Vlog",      desc: "Balanced pacing, natural flow"   },
];

function DropZone({
  onFile,
  videoUrl,
}: {
  onFile:   (f: File) => void;
  videoUrl: string | null;
}) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) onFile(f);
  };

  if (videoUrl) return null;

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 h-52 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
        dragging ? "border-violet-500 bg-violet-900/20" : "border-zinc-700 hover:border-zinc-500"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <svg className="w-10 h-10 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
      <p className="text-zinc-400 text-sm text-center">
        Drop a video file here, or <span className="text-violet-400 underline">browse</span>
      </p>
      <p className="text-zinc-600 text-xs">MP4, MOV, WEBM — up to 500 MB</p>
    </div>
  );
}

export function AutoEditMode({ userId, onJobSaved }: AutoEditModeProps) {
  const [videoFile,  setVideoFile]  = useState<File | null>(null);
  const [videoUrl,   setVideoUrl]   = useState<string | null>(null);
  const [outputUrl,  setOutputUrl]  = useState<string | null>(null);
  const [clips,      setClips]      = useState<ScoredClip[]>([]);

  const [duration,   setDuration]   = useState<10 | 15 | 30>(15);
  const [style,      setStyle]      = useState<EditStyle>("viral");
  const [cropTo9x16, setCropTo9x16] = useState(false);
  const [addMusic,   setAddMusic]   = useState(false);

  const [step,       setStep]       = useState("");
  const [pct,        setPct]        = useState(0);
  const [processing, setProcessing] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [jobId,      setJobId]      = useState<string | null>(null);

  const outputBlobRef = useRef<Blob | null>(null);

  const handleFile = useCallback((f: File) => {
    setVideoFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setOutputUrl(null);
    setClips([]);
    setError(null);
  }, []);

  const handleProcess = async () => {
    if (!videoFile) return;
    setProcessing(true);
    setError(null);
    setOutputUrl(null);
    setClips([]);
    setPct(0);

    // Create job record
    let jid: string | null = null;
    if (userId) {
      try {
        const res = await fetch("/api/video-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            type:      "auto_edit",
            inputData: { duration, style, cropTo9x16, addMusic },
          }),
        });
        const j = await res.json();
        jid = j.jobId ?? null;
        setJobId(jid);
      } catch {}
    }

    try {
      const config: AutoEditConfig = {
        targetDuration: duration,
        style,
        cropTo9x16,
        addMusic,
        fadeIn:  1.5,
        fadeOut: 1.5,
      };

      const result = await runAutoEdit(videoFile, config, (s, p) => {
        setStep(s);
        setPct(p);
      });

      outputBlobRef.current = result.outputBlob;
      const url = URL.createObjectURL(result.outputBlob);
      setOutputUrl(url);
      setClips(result.clips);

      // Update job status (upload happens on explicit save)
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
      if (jid && userId) {
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
    const a = document.createElement("a");
    a.href = URL.createObjectURL(outputBlobRef.current);
    a.download = `acoustic_edit_${Date.now()}.mp4`;
    a.click();
  };

  const handleSave = async () => {
    if (!outputBlobRef.current || !userId || !jobId) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.set("jobId",  jobId);
      form.set("status", "done");
      form.set("userId", userId);
      form.set("video",  new File([outputBlobRef.current], "output.mp4", { type: "video/mp4" }));
      const res  = await fetch("/api/video-jobs", { method: "PATCH", body: form });
      const data = await res.json();
      if (data.outputUrl) onJobSaved?.(data.outputUrl);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setOutputUrl(null);
    setClips([]);
    setError(null);
    outputBlobRef.current = null;
  };

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* Video drop zone / preview */}
      <DropZone onFile={handleFile} videoUrl={videoUrl} />

      {videoUrl && !outputUrl && (
        <div className="relative">
          <VideoPreview url={videoUrl} clips={[]} />
          <button
            onClick={handleReset}
            className="absolute top-2 right-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded"
          >
            Change
          </button>
        </div>
      )}

      {/* Output preview */}
      {outputUrl && (
        <div>
          <p className="text-xs text-violet-400 font-medium mb-1.5 uppercase tracking-wide">
            Output — {clips.reduce((s, c) => s + c.durationSec, 0).toFixed(1)}s
          </p>
          <VideoPreview url={outputUrl} clips={clips} />
        </div>
      )}

      {/* Config (only visible before processing) */}
      {!outputUrl && (
        <div className="space-y-4">
          {/* Duration */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block uppercase tracking-wide">
              Target duration
            </label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    duration === d
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block uppercase tracking-wide">
              Edit style
            </label>
            <div className="space-y-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    style === s.id
                      ? "bg-violet-600/20 border border-violet-500/40 text-violet-200"
                      : "bg-zinc-800/60 border border-transparent text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span className="font-medium">{s.label}</span>
                  <span className="text-zinc-500 text-xs mt-0.5">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wide block">Options</label>

            {[
              { label: "Crop to 9:16 (Reels / TikTok)", value: cropTo9x16, set: setCropTo9x16 },
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
        </div>
      )}

      {/* Processing state */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-2"
          >
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{step}</span>
              <span>{pct}%</span>
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

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 mt-auto pt-2">
        {!outputUrl ? (
          <button
            onClick={handleProcess}
            disabled={!videoFile || processing}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {processing ? `${pct}% — ${step}` : "Analyze & Generate Clips"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors"
            >
              Download
            </button>
            {userId && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                {saving ? "Saving…" : "Save to Library"}
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
