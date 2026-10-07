import { NextRequest, NextResponse } from "next/server";
import {
  getSunoTaskStatus,
  SunoApiError,
  type SunoTaskInfo,
} from "@/lib/ai/suno";
import { uploadAudioFromUrl } from "@/lib/storage/r2";

// GET /api/generate/status?taskId=...&userId=...&preset=...&model=...&duration=...&prompt=...
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }

  // Mock tasks (no real API configured) resolve immediately
  if (taskId.startsWith("mock-")) {
    return NextResponse.json({
      status: "SUCCESS",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      tracks: [],
    });
  }

  try {
    const info: SunoTaskInfo = await getSunoTaskStatus(taskId);
    const { status, errorMessage, response } = info;

    // Terminal error states
    if (
      status === "CREATE_TASK_FAILED" ||
      status === "GENERATE_AUDIO_FAILED" ||
      status === "CALLBACK_EXCEPTION" ||
      status === "SENSITIVE_WORD_ERROR"
    ) {
      return NextResponse.json(
        {
          status,
          error: errorMessage ?? "Generation failed",
        },
        { status: 422 }
      );
    }

    // Still generating
    if (status === "PENDING" || status === "TEXT_SUCCESS") {
      return NextResponse.json({ status, audioUrl: null, tracks: [] });
    }

    // Done — FIRST_SUCCESS or SUCCESS
    const tracks = response?.sunoData ?? [];
    const first = tracks.find((t) => t.audioUrl);

    if (!first?.audioUrl) {
      return NextResponse.json({ status, audioUrl: null, tracks });
    }

    // Optionally upload to R2 + save to DB when we have context
    const userId   = searchParams.get("userId");
    const preset   = searchParams.get("preset") ?? "unknown";
    const model    = searchParams.get("model") ?? "suno";
    const provider = searchParams.get("provider") ?? "suno";
    const duration = parseInt(searchParams.get("duration") ?? "30", 10);
    const prompt   = searchParams.get("prompt") ?? "";
    const plan     = searchParams.get("plan") ?? "free";

    let storedUrl = first.audioUrl;

    try {
      const { url } = await uploadAudioFromUrl(
        first.audioUrl,
        userId ?? "anon",
        `${first.id}.mp3`
      );
      storedUrl = url;
    } catch {
      // R2 not configured — use Suno CDN URL directly
    }

    // Persist to DB if user is authenticated
    if (userId) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        await supabase.from("generations").insert({
          user_id:       userId,
          prompt,
          preset,
          model,
          provider,
          duration,
          audio_url:     storedUrl,
          watermarked:   plan === "free",
          suno_task_id:  taskId,
          suno_track_id: first.id,
        });
      } catch {
        // DB save is best-effort
      }
    }

    return NextResponse.json({
      status,
      audioUrl: storedUrl,
      tracks: tracks.map((t) => ({
        id: t.id,
        audioUrl: t.audioUrl,
        imageUrl: t.imageUrl,
        title: t.title,
        tags: t.tags,
        duration: t.duration,
      })),
    });
  } catch (err) {
    if (err instanceof SunoApiError) {
      return NextResponse.json(
        { status: "GENERATE_AUDIO_FAILED", error: err.message },
        { status: err.code === 400 ? 422 : 500 }
      );
    }
    console.error("[/api/generate/status]", err);
    return NextResponse.json(
      { status: "GENERATE_AUDIO_FAILED", error: "Status check failed" },
      { status: 500 }
    );
  }
}
