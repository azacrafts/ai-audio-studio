import { NextRequest, NextResponse } from "next/server";
import { isolateAudio } from "@/lib/ai/elevenlabs";
import { persistAudio } from "@/lib/studio/persist";

export async function POST(req: NextRequest) {
  try {
    const form   = await req.formData();
    const file   = form.get("audio")  as File | null;
    const plan   = (form.get("plan")   as string | null) ?? "free";
    const userId = form.get("userId") as string | null;

    if (!file) return NextResponse.json({ error: "audio file is required" }, { status: 400 });

    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const buffer      = await isolateAudio(audioBuffer);

    const result = await persistAudio({
      buffer,
      userId,
      provider: "elevenlabs",
      mode:     "isolation",
      model:    "audio-isolation",
      prompt:   "Audio isolation — vocals separated",
      plan,
      filename: `isolated-${Date.now()}.mp3`,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/elevenlabs/isolation]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
