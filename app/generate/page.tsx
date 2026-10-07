"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { GeneratorPanel } from "@/components/studio/GeneratorPanel";
import { LibraryPanel, type StudioTrack } from "@/components/studio/LibraryPanel";
import { UpgradeCTA } from "@/components/generate/UpgradeCTA";
import { createClient } from "@/lib/supabase/client";
import { useAudio } from "@/lib/audio-context";
import { ArrowLeft, Music2 } from "lucide-react";
import Link from "next/link";
import type { StudioRequest } from "@/types";
import type { GenerationPhase } from "@/components/studio/types";
import { GRAD } from "@/lib/design-tokens";

const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 36;

interface GenerationContext {
  userId?: string | null;
  preset?: string;
  model?: string;
  provider?: string;
  mode?: string;
  duration?: number | null;
  prompt?: string;
  plan: string;
}

// ── Route a StudioRequest to the correct API endpoint ────────────────────────

async function callStudioAPI(
  req: StudioRequest,
  userId: string | null,
  plan: string
): Promise<{ audioUrl?: string; transcript?: string; trackId?: string; taskId?: string; pending?: boolean; watermarked?: boolean; context?: GenerationContext; error?: string }> {
  const base = { userId, plan };

  // ── ElevenLabs: file-based modes ─────────────────────────────────
  if (req.provider === "elevenlabs" && req.audioFile) {
    const fd = new FormData();
    fd.append("audio", req.audioFile);
    if (userId)         fd.append("userId",   userId);
    if (plan)           fd.append("plan",     plan);
    if (req.voiceId)    fd.append("voiceId",  req.voiceId);
    if (req.voiceName)  fd.append("voiceName", req.voiceName);
    if (req.language)   fd.append("language", req.language);
    if (req.stability   != null) fd.append("stability",        String(req.stability));
    if (req.similarity_boost != null) fd.append("similarity_boost", String(req.similarity_boost));
    if (req.styleExaggeration != null) fd.append("style",        String(req.styleExaggeration));
    if (req.model)      fd.append("modelId",  req.model);

    const endpointMap: Record<string, string> = {
      s2s:       "/api/elevenlabs/s2s",
      stt:       "/api/elevenlabs/stt",
      isolation: "/api/elevenlabs/isolation",
    };
    const endpoint = endpointMap[req.mode] ?? "/api/elevenlabs/isolation";

    const res = await fetch(endpoint, { method: "POST", body: fd });
    return res.json();
  }

  // ── ElevenLabs: TTS ──────────────────────────────────────────────
  if (req.provider === "elevenlabs" && req.mode === "tts") {
    const res = await fetch("/api/elevenlabs/tts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text:             req.text,
        voiceId:          req.voiceId,
        voiceName:        req.voiceName,
        modelId:          req.model,
        stability:        req.stability,
        similarity_boost: req.similarity_boost,
        style:            req.styleExaggeration,
        speed:            req.speed,
        ...base,
      }),
    });
    return res.json();
  }

  // ── ElevenLabs: SFX ─────────────────────────────────────────────
  if (req.provider === "elevenlabs" && req.mode === "sfx") {
    const res = await fetch("/api/elevenlabs/sfx", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt:           req.prompt,
        durationSeconds:  req.duration,
        ...base,
      }),
    });
    return res.json();
  }

  // ── Suno / Stable Audio: Music ───────────────────────────────────
  const res = await fetch("/api/generate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider:    req.provider,
      mode:        req.mode,
      prompt:      req.prompt,
      preset:      req.preset,
      model:       req.model ?? "V4_5",
      duration:    req.duration ?? null,
      vocalGender: req.vocalGender ?? null,
      style:       req.style,
      bpm:         req.bpm,
      instrumental: req.instrumental,
    }),
  });
  return res.json();
}

// ── Page inner ────────────────────────────────────────────────────────────────

function StudioPageInner() {
  const searchParams   = useSearchParams();
  const defaultPreset  = searchParams.get("preset")   ?? undefined;
  const defaultPrompt  = searchParams.get("prompt")   ?? undefined;
  const defaultDuration = searchParams.get("duration")
    ? parseInt(searchParams.get("duration")!, 10)
    : undefined;
  const { play }      = useAudio();

  // ── Initialize tracks from localStorage immediately (zero-flicker restore) ──
  const [tracks, setTracks] = useState<StudioTrack[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("acoustic_studio_tracks");
      return raw ? (JSON.parse(raw) as StudioTrack[]) : [];
    } catch { return []; }
  });

  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [phase, setPhase]                 = useState<GenerationPhase>("idle");
  const [error, setError]                 = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen]     = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"limit" | "download" | "watermark">("limit");
  const [lastRequest, setLastRequest]     = useState<StudioRequest | null>(null);
  const [userId, setUserId]               = useState<string | null>(null);
  const [userPlan, setUserPlan]           = useState("free");

  const pollRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCount = useRef(0);
  const ctxRef    = useRef<GenerationContext | null>(null);
  const tempIdRef = useRef<string>("");
  // Ref gives synchronous access to userId — avoids race where state is still null
  const userIdRef = useRef<string | null>(null);

  // ── Persist tracks to localStorage whenever they change ──────────────────
  useEffect(() => {
    const persisted = tracks.filter(
      (t) => !t.id.startsWith("temp-") && (t.audioUrl || t.transcript)
    );
    if (persisted.length === 0) return;
    try {
      localStorage.setItem(
        "acoustic_studio_tracks",
        JSON.stringify(persisted.slice(0, 50))
      );
    } catch { /* storage full — ignore */ }
  }, [tracks]);

  // ── Load user + library from Supabase on mount ────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // Keep ref in sync so generate calls always have an up-to-date userId
      setUserId(user.id);
      userIdRef.current = user.id;

      const [profileRes, genRes] = await Promise.all([
        supabase.from("users").select("plan").eq("id", user.id).single(),
        supabase
          .from("generations")
          .select("id, prompt, preset, audio_url, duration, watermarked, created_at, model, provider, mode, transcript")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (profileRes.data?.plan) setUserPlan(profileRes.data.plan);

      if (genRes.data && genRes.data.length > 0) {
        const dbTracks: StudioTrack[] = genRes.data.map((g) => ({
          id:          g.id,
          mode:        g.mode ?? "music",
          audioUrl:    g.audio_url ?? undefined,
          transcript:  g.transcript ?? undefined,
          prompt:      g.prompt,
          preset:      g.preset,
          provider:    g.provider ?? "suno",
          duration:    g.duration,
          watermarked: g.watermarked ?? true,
          createdAt:   g.created_at,
          model:       g.model,
        }));

        // Merge: DB is ground truth; keep any local-only tracks not yet in DB
        // (e.g. anon-generated tracks or in-flight temp entries)
        setTracks((prev) => {
          const dbIds = new Set(dbTracks.map((t) => t.id));
          const localOnly = prev.filter(
            (t) => !dbIds.has(t.id) && !t.id.startsWith("temp-")
          );
          const merged = [...dbTracks, ...localOnly];
          return merged;
        });

        setActiveTrackId((prev) => prev ?? genRes.data![0].id);
      }
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = null;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollStatus = useCallback(async (taskId: string, tempId: string) => {
    if (pollCount.current >= MAX_POLLS) {
      stopPolling();
      setPhase("error");
      setError("Generation timed out. Please try again.");
      setTracks((prev) => prev.filter((t) => t.id !== tempId));
      return;
    }
    pollCount.current++;

    const ctx    = ctxRef.current;
    const params = new URLSearchParams({ taskId });
    if (ctx?.userId)           params.set("userId",   ctx.userId!);
    if (ctx?.preset)           params.set("preset",   ctx.preset);
    if (ctx?.model)            params.set("model",    ctx.model);
    if (ctx?.provider)         params.set("provider", ctx.provider);
    if (ctx?.mode)             params.set("mode",     ctx.mode);
    if (ctx?.duration != null) params.set("duration", String(ctx.duration));
    if (ctx?.prompt)           params.set("prompt",   ctx.prompt);
    if (ctx?.plan)             params.set("plan",     ctx.plan);

    try {
      const res  = await fetch(`/api/generate/status?${params}`);
      const data = await res.json();

      if (!res.ok || ["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "SENSITIVE_WORD_ERROR", "CALLBACK_EXCEPTION"].includes(data.status)) {
        stopPolling();
        setPhase("error");
        setError(data.error ?? "Generation failed. Please try again.");
        setTracks((prev) => prev.filter((t) => t.id !== tempId));
        return;
      }

      if (data.status === "SUCCESS" || data.status === "FIRST_SUCCESS") {
        stopPolling();
        if (data.audioUrl) {
          const finalId = data.trackId ?? tempId;
          setTracks((prev) =>
            prev.map((t) => t.id === tempId ? { ...t, audioUrl: data.audioUrl, id: finalId } : t)
          );
          setActiveTrackId(finalId);
          setPhase("done");
          play({
            id:          finalId,
            audioUrl:    data.audioUrl,
            title:       ctx?.prompt ?? ctx?.preset ?? "Generated Track",
            model:       ctx?.model,
            provider:    ctx?.provider ?? "suno",
            watermarked: data.watermarked,
          });
        } else {
          setPhase("error");
          setError("No audio URL received.");
          setTracks((prev) => prev.filter((t) => t.id !== tempId));
        }
        return;
      }

      setPhase("generating");
      pollRef.current = setTimeout(() => pollStatus(taskId, tempId), POLL_INTERVAL_MS);
    } catch {
      pollRef.current = setTimeout(() => pollStatus(taskId, tempId), POLL_INTERVAL_MS);
    }
  }, [stopPolling, play]);

  const handleGenerate = async (req: StudioRequest) => {
    stopPolling();
    pollCount.current = 0;
    setPhase("submitting");
    setError(null);
    setLastRequest(req);

    const tempId = `temp-${Date.now()}`;
    tempIdRef.current = tempId;

    // Add placeholder to library immediately
    const placeholder: StudioTrack = {
      id:          tempId,
      mode:        req.mode,
      audioUrl:    undefined,
      prompt:      req.prompt ?? req.text ?? req.displayTitle,
      preset:      req.preset,
      provider:    req.provider,
      duration:    req.duration,
      watermarked: true,
      createdAt:   new Date().toISOString(),
      model:       req.model,
    };
    setTracks((prev) => [placeholder, ...prev]);
    setActiveTrackId(tempId);

    try {
      // Use ref for synchronous access — avoids race where userId state is still null
      const resolvedUserId = userId ?? userIdRef.current;
      const data = await callStudioAPI(req, resolvedUserId, userPlan);

      if (data.error) {
        setPhase("error");
        setError(data.error);
        setTracks((prev) => prev.filter((t) => t.id !== tempId));
        return;
      }

      // Suno async — poll for result
      if (data.pending && data.taskId) {
        ctxRef.current = {
          userId: resolvedUserId,
          preset:   req.preset,
          model:    req.model,
          provider: req.provider,
          mode:     req.mode,
          duration: req.duration,
          prompt:   req.prompt ?? req.text ?? req.displayTitle,
          plan:     userPlan,
        };
        setPhase("queued");
        pollRef.current = setTimeout(() => pollStatus(data.taskId!, tempId), POLL_INTERVAL_MS);
        return;
      }

      // STT — transcript output
      if (req.mode === "stt" && data.transcript) {
        const finalId = data.trackId ?? tempId;
        setTracks((prev) =>
          prev.map((t) =>
            t.id === tempId
              ? { ...t, transcript: data.transcript, id: finalId }
              : t
          )
        );
        setActiveTrackId(finalId);
        setPhase("done");
        return;
      }

      // Audio output (TTS, SFX, S2S, Isolation, Suno sync)
      if (data.audioUrl) {
        const finalId = data.trackId ?? tempId;
        setTracks((prev) =>
          prev.map((t) =>
            t.id === tempId
              ? { ...t, audioUrl: data.audioUrl, watermarked: data.watermarked ?? true, id: finalId }
              : t
          )
        );
        setActiveTrackId(finalId);
        setPhase("done");
        play({
          id:          finalId,
          audioUrl:    data.audioUrl!,
          title:       req.displayTitle,
          model:       req.model,
          provider:    req.provider,
          watermarked: data.watermarked,
        });
        return;
      }

      setTracks((prev) => prev.filter((t) => t.id !== tempId));
      setPhase("error");
      setError("No output received from AI.");
    } catch (err) {
      setTracks((prev) => prev.filter((t) => t.id !== tempId));
      setPhase("error");
      setError(err instanceof Error ? err.message : "Network error. Please check your connection.");
    }
  };

  const handleRegenerate = () => {
    if (lastRequest) handleGenerate(lastRequest);
  };

  const isLoading = phase === "submitting" || phase === "queued" || phase === "generating";

  return (
    <div className="min-h-screen bg-black text-white relative" style={{ fontFamily: "Inter, sans-serif" }}>
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/"
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: GRAD }}>
              <Music2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">AI Audio Studio</h1>
              <p className="text-[11px] text-white/35 mt-0.5">
                Music · Voice · SFX · Transcription · Isolation
              </p>
            </div>
          </div>

          {phase === "error" && error && (
            <div className="ml-auto flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              <p className="text-xs text-red-400">{error}</p>
              <button onClick={handleRegenerate}
                className="text-xs text-red-400/60 hover:text-red-400 transition-colors whitespace-nowrap">
                Try again →
              </button>
            </div>
          )}
        </div>

        {/* Dual panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">

          {/* LEFT — Library */}
          <div className="bg-[#111113] border border-white/5 rounded-2xl p-4 min-h-[560px]">
            <LibraryPanel
              tracks={tracks}
              activeTrackId={activeTrackId}
              phase={phase}
              onSelectTrack={(id) => {
                setActiveTrackId(id);
                const t = tracks.find((t) => t.id === id);
                if (t?.audioUrl) {
                  play({
                    id:          t.id,
                    audioUrl:    t.audioUrl,
                    title:       t.prompt ?? t.preset ?? "Generated Track",
                    model:       t.model,
                    provider:    t.provider ?? "suno",
                    watermarked: t.watermarked,
                  });
                }
              }}
              onRegenerate={handleRegenerate}
              onUpgrade={() => { setUpgradeReason("download"); setUpgradeOpen(true); }}
            />
          </div>

          {/* RIGHT — Generator */}
          <div className="bg-[#111113] border border-white/5 rounded-2xl p-5 lg:sticky lg:top-24 overflow-y-auto max-h-[calc(100vh-8rem)]">
            <GeneratorPanel
              defaultPresetId={defaultPreset}
              defaultPrompt={defaultPrompt}
              defaultDuration={defaultDuration}
              isLoading={isLoading}
              onGenerate={handleGenerate}
            />
          </div>
        </div>
      </div>

      <UpgradeCTA
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <StudioPageInner />
    </Suspense>
  );
}
