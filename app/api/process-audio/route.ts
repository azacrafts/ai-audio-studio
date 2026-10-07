import { NextRequest, NextResponse } from "next/server";
import { processAudio } from "@/lib/audio/ffmpeg";
import type { ProcessAudioRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: ProcessAudioRequest = await req.json();
    const { musicUrl, sfxUrl, trim, fadeIn, fadeOut, ducking } = body;

    if (!musicUrl) {
      return NextResponse.json(
        { error: "musicUrl is required" },
        { status: 400 }
      );
    }

    const processedUrl = await processAudio({
      musicUrl,
      sfxUrl,
      trim,
      fadeIn,
      fadeOut,
      ducking,
    });

    return NextResponse.json({ processedUrl });
  } catch (err) {
    console.error("[/api/process-audio] Error:", err);
    return NextResponse.json(
      { error: "Audio processing failed. Please try again." },
      { status: 500 }
    );
  }
}
