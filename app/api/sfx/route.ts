// Legacy SFX endpoint — proxies to /api/elevenlabs/sfx
import { NextRequest, NextResponse } from "next/server";
import { generateSFX } from "@/lib/ai/elevenlabs";
import { uploadAudioBuffer } from "@/lib/storage/r2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, durationSeconds = 5 } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const buffer = await generateSFX({ prompt, durationSeconds });
    const { url: audioUrl } = await uploadAudioBuffer(buffer, "anon", `sfx-${Date.now()}.mp3`);

    return NextResponse.json({ audioUrl });
  } catch (err) {
    console.error("[/api/sfx]", err);
    return NextResponse.json({ error: "SFX generation failed" }, { status: 500 });
  }
}
