import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uploadAudioBuffer } from "@/lib/storage/r2";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── POST /api/video-jobs — create a new job ────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { userId, type, inputData } = body as {
      userId:    string;
      type:      "auto_edit" | "sync";
      inputData: Record<string, unknown>;
    };

    if (!userId || !type) {
      return NextResponse.json({ error: "userId and type required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("video_jobs")
      .insert({
        user_id:    userId,
        type,
        status:     "processing",
        input_data: inputData ?? {},
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
    }

    return NextResponse.json({ jobId: data.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── PATCH /api/video-jobs — update job status + output_url ────────────────

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const form = await req.formData();

    const jobId     = form.get("jobId")   as string | null;
    const status    = form.get("status")  as string | null;   // "done" | "error"
    const userId    = form.get("userId")  as string | null;
    const errorMsg  = form.get("error")   as string | null;
    const videoFile = form.get("video")   as File   | null;

    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    let outputUrl: string | null = null;

    if (videoFile && userId) {
      const buffer = Buffer.from(await videoFile.arrayBuffer());
      const ext    = videoFile.name.endsWith(".mp4") ? "mp4" : "mp4";
      const { url } = await uploadAudioBuffer(buffer, userId, `video_${Date.now()}.${ext}`, "video/mp4");
      outputUrl = url;
    }

    const update: Record<string, unknown> = { status: status ?? "done" };
    if (outputUrl) update.output_url = outputUrl;
    if (errorMsg)  update.error_msg  = errorMsg;

    const { error } = await supabase
      .from("video_jobs")
      .update(update)
      .eq("id", jobId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ outputUrl, jobId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── GET /api/video-jobs?userId= — list user's video jobs ──────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ jobs: [] });

    const { data, error } = await supabase
      .from("video_jobs")
      .select("id, type, status, output_url, created_at, input_data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ jobs: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
