import { NextRequest, NextResponse } from "next/server";
import { generateTTS } from "@/lib/ai/elevenlabs";
import { persistAudio } from "@/lib/studio/persist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceId, modelId, stability, similarity_boost, style, speed, plan = "free", userId } = body;

    if (!text?.trim())   return NextResponse.json({ error: "text is required" },    { status: 400 });
    if (!voiceId?.trim()) return NextResponse.json({ error: "voiceId is required" }, { status: 400 });

    const buffer = await generateTTS({
      text,
      voiceId,
      modelId,
      settings: { stability, similarity_boost, style, speed },
    });

    const result = await persistAudio({
      buffer,
      userId:    userId ?? null,
      provider:  "elevenlabs",
      mode:      "tts",
      model:     modelId ?? "eleven_multilingual_v2",
      inputText: text,
      metadata:  { voiceId, voiceName: body.voiceName },
      plan,
      filename:  `tts-${Date.now()}.mp3`,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/elevenlabs/tts]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
