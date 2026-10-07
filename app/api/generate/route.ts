import { NextRequest, NextResponse } from "next/server";
import { DAILY_LIMITS, PRESETS } from "@/constants/presets";
import { submitSunoGeneration, generateWithSuno, SunoApiError, type SunoModel } from "@/lib/ai/suno";
import { generateWithStableAudio } from "@/lib/ai/stable-audio";
import { uploadAudioFromUrl } from "@/lib/storage/r2";
import type { GenerateRequest } from "@/types";

// Allow up to 120 s for synchronous Suno polling (Vercel Pro)
export const maxDuration = 120;

// In-memory fallback rate limiting for anonymous users
const anonCounts = new Map<string, { count: number; date: string }>();

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "anon";
}

function checkAnonLimit(ip: string): { allowed: boolean; used: number; limit: number } {
  const today = getTodayString();
  const key = `${ip}:${today}`;
  const current = anonCounts.get(key) ?? { count: 0, date: today };
  if (current.date !== today) { current.count = 0; current.date = today; }
  const limit = DAILY_LIMITS.free;
  return { allowed: current.count < limit, used: current.count, limit };
}

function incrementAnonCount(ip: string) {
  const today = getTodayString();
  const key = `${ip}:${today}`;
  const current = anonCounts.get(key) ?? { count: 0, date: today };
  anonCounts.set(key, { count: current.count + 1, date: today });
}

/** True when a valid Suno API key is configured */
function hasSunoKey(): boolean {
  const key = process.env.SUNO_API_KEY;
  return Boolean(key && key !== "your_suno_api_key_here");
}

/**
 * Whether the model string is a Suno version (V4, V4_5, V4_5PLUS, V5, V5_5…)
 * as opposed to "stable-audio".
 */
function isSunoModel(model: string): boolean {
  return model !== "stable-audio";
}

/**
 * Map UI model string to kie.ai SunoModel enum value.
 * Handles both the new explicit versions ("V4", "V4_5", …) and legacy "suno".
 */
function toSunoModel(model: string): SunoModel {
  const map: Record<string, SunoModel> = {
    "V4":        "V4",
    "V4_5":      "V4_5",
    "V4.5":      "V4_5",
    "V4_5PLUS":  "V4_5PLUS",
    "V4.5+":     "V4_5PLUS",
    "V4_5ALL":   "V4_5ALL",
    "V5":        "V5",
    "V5_5":      "V5_5",
    "suno":      "V4_5",   // legacy default
  };
  return map[model] ?? "V4_5";
}

/**
 * Build the final prompt by enriching it with vocal gender, style, BPM hints.
 */
function buildPrompt(req: GenerateRequest, fallback: string): string {
  const base = req.prompt?.trim() || fallback;
  const parts: string[] = [base];

  if (req.style?.trim())            parts.push(req.style.trim());
  if (req.bpm)                      parts.push(`${req.bpm} BPM`);
  if (req.vocalGender === "male")   parts.push("male vocals, male singer");
  if (req.vocalGender === "female") parts.push("female vocals, female singer");
  if (req.duration)                 parts.push(`approximately ${req.duration} seconds`);

  return parts.join(", ");
}

// ── Track pending jobs per user in memory ─────────────────────────────────────
const pendingByUser = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { prompt, preset: presetId, model, duration, vocalGender, instrumental } = body;
    const provider = body.provider ?? "suno";

    // Validate: need at least prompt or preset
    if (!prompt?.trim() && !presetId) {
      return NextResponse.json(
        { error: "Enter a prompt or select a preset to continue." },
        { status: 400 }
      );
    }
    if (!model) {
      return NextResponse.json(
        { error: "AI model is required." },
        { status: 400 }
      );
    }

    // ── Auth + rate limiting ────────────────────────────────────────────────
    let userId: string | null = null;
    let plan = "free";
    let used = 0;
    let limit = DAILY_LIMITS.free;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabase = Boolean(supabaseUrl && supabaseUrl !== "your_supabase_project_url_here");

    if (hasSupabase) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          userId = user.id;
          const { data: profile } = await supabase
            .from("users")
            .select("plan")
            .eq("id", user.id)
            .single();

          plan = profile?.plan ?? "free";
          limit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;

          const { count } = await supabase
            .from("generations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("created_at", getTodayString());

          used = count ?? 0;

          if (used >= limit) {
            return NextResponse.json(
              { error: "Daily limit reached", used, limit, upgradeUrl: "/pricing" },
              { status: 429 }
            );
          }
        }
      } catch {
        // Supabase not fully configured
      }
    }

    if (!userId) {
      const ip = getClientIp(req);
      const check = checkAnonLimit(ip);
      used = check.used;
      limit = check.limit;
      if (!check.allowed) {
        return NextResponse.json(
          { error: "Daily limit reached", used, limit, upgradeUrl: "/pricing" },
          { status: 429 }
        );
      }
    }

    // ── Resolve fallback prompt from preset ─────────────────────────────────
    const presetConfig = PRESETS.find((p) => p.id === presetId);
    const fallbackPrompt = presetConfig?.config.defaultPrompt ?? "upbeat background music";
    const finalPrompt = buildPrompt(body, fallbackPrompt);

    // ── ElevenLabs SFX (legacy provider routing — new modes handled client-side) ───────────
    if (provider === "elevenlabs") {
      const { generateSFX } = await import("@/lib/ai/elevenlabs");
      const { uploadAudioBuffer } = await import("@/lib/storage/r2");
      const durationSeconds = duration ?? 15;
      const buffer = await generateSFX({ prompt: finalPrompt, durationSeconds });
      const { url: storedUrl } = await uploadAudioBuffer(buffer, userId ?? "anon", `sfx-${Date.now()}.mp3`);

      if (userId && hasSupabase) {
        try {
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          await supabase.from("generations").insert({
            user_id: userId, prompt: finalPrompt, preset: presetId, model,
            provider: "elevenlabs", mode: "sfx", duration: durationSeconds,
            audio_url: storedUrl, watermarked: plan === "free",
          });
        } catch {}
      } else {
        incrementAnonCount(getClientIp(req));
      }

      return NextResponse.json({
        audioUrl: storedUrl, pending: false,
        watermarked: plan === "free", used: used + 1, limit,
      });
    }

    // ── Stable Audio (synchronous) ───────────────────────────────────────────
    if (!isSunoModel(model)) {
      const result = await generateWithStableAudio({ prompt: finalPrompt, duration: duration ?? 30 });
      const { url: storedUrl } = await uploadAudioFromUrl(result.audioUrl, userId ?? getClientIp(req), `${result.jobId}.mp3`);

      if (userId && hasSupabase) {
        try {
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          await supabase.from("generations").insert({
            user_id: userId, prompt: finalPrompt, preset: presetId, model,
            provider: "stable-audio", duration: duration ?? 30, audio_url: storedUrl, watermarked: plan === "free",
          });
        } catch {}
      } else {
        incrementAnonCount(getClientIp(req));
      }

      return NextResponse.json({
        audioUrl: storedUrl, taskId: result.jobId, pending: false,
        watermarked: plan === "free", used: used + 1, limit,
      });
    }

    // ── Suno API ─────────────────────────────────────────────────────────────
    if (!hasSunoKey()) {
      // No key — return mock synchronously
      const result = await generateWithSuno({
        prompt: finalPrompt,
        model: toSunoModel(model),
        instrumental: instrumental ?? true,
      });
      const { url: storedUrl } = await uploadAudioFromUrl(result.audioUrl, userId ?? "anon", `${result.jobId}.mp3`);

      if (userId && hasSupabase) {
        try {
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          await supabase.from("generations").insert({
            user_id: userId, prompt: finalPrompt, preset: presetId, model,
            provider: "suno", duration: duration ?? 30, audio_url: storedUrl, watermarked: plan === "free",
          });
        } catch {}
      } else {
        incrementAnonCount(getClientIp(req));
      }

      return NextResponse.json({
        audioUrl: storedUrl, taskId: result.jobId, pending: false,
        watermarked: plan === "free", used: used + 1, limit,
      });
    }

    // Real Suno — submit and return taskId immediately
    const sunoVersion = toSunoModel(model);
    const taskId = await submitSunoGeneration({
      prompt: finalPrompt,
      model: sunoVersion,
      instrumental: instrumental ?? true,
      customMode: Boolean(body.style),
      style: body.style,
    });

    // Track optimistic usage
    if (userId) {
      pendingByUser.set(userId, (pendingByUser.get(userId) ?? 0) + 1);
    } else {
      incrementAnonCount(getClientIp(req));
    }

    return NextResponse.json({
      taskId,
      pending: true,
      context: {
        userId,
        preset: presetId,
        model,
        provider: "suno",
        duration,
        prompt: finalPrompt,
        plan,
      },
      watermarked: plan === "free",
      used: used + 1,
      limit,
    });
  } catch (err) {
    if (err instanceof SunoApiError) {
      const status = err.code === 400 ? 422 : err.code === 402 ? 402 : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[/api/generate] Error:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
