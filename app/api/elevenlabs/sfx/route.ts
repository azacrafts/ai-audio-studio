import { NextRequest, NextResponse } from "next/server";
import { generateSFX } from "@/lib/ai/elevenlabs";
import { persistAudio } from "@/lib/studio/persist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, durationSeconds, promptInfluence, plan = "free", userId } = body;

    if (!prompt?.trim()) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

    const buffer = await generateSFX({ prompt, durationSeconds, promptInfluence });

    const result = await persistAudio({
      buffer,
      userId:    userId ?? null,
      provider:  "elevenlabs",
      mode:      "sfx",
      model:     "sound-generation",
      prompt,
      metadata:  { durationSeconds, promptInfluence },
      plan,
      filename:  `sfx-${Date.now()}.mp3`,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/elevenlabs/sfx]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
