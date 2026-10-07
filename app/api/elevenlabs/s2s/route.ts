import { NextRequest, NextResponse } from "next/server";
import { speechToSpeech } from "@/lib/ai/elevenlabs";
import { persistAudio } from "@/lib/studio/persist";

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData();
    const file     = form.get("audio") as File | null;
    const voiceId  = form.get("voiceId") as string | null;
    const modelId  = (form.get("modelId") as string | null) ?? "eleven_english_sts_v2";
    const plan     = (form.get("plan")    as string | null) ?? "free";
    const userId   = form.get("userId")  as string | null;
    const stability          = parseFloat(form.get("stability")         as string ?? "0.5");
    const similarity_boost   = parseFloat(form.get("similarity_boost")  as string ?? "0.75");
    const style              = parseFloat(form.get("style")             as string ?? "0");
    const voiceName          = form.get("voiceName") as string | null;

    if (!file)    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    if (!voiceId) return NextResponse.json({ error: "voiceId is required" },   { status: 400 });

    const audioBuffer = Buffer.from(await file.arrayBuffer());

    const buffer = await speechToSpeech({
      audioBuffer,
      voiceId,
      modelId,
      settings: { stability, similarity_boost, style },
    });

    const result = await persistAudio({
      buffer,
      userId,
      provider:  "elevenlabs",
      mode:      "s2s",
      model:     modelId,
      prompt:    `Voice transformation → ${voiceName ?? voiceId}`,
      metadata:  { voiceId, voiceName },
      plan,
      filename:  `s2s-${Date.now()}.mp3`,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/elevenlabs/s2s]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
