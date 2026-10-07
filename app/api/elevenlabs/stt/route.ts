import { NextRequest, NextResponse } from "next/server";
import { speechToText } from "@/lib/ai/elevenlabs";
import { persistTranscript } from "@/lib/studio/persist";

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData();
    const file     = form.get("audio")    as File | null;
    const language = form.get("language") as string | null;
    const userId   = form.get("userId")   as string | null;

    if (!file) return NextResponse.json({ error: "audio file is required" }, { status: 400 });

    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const result      = await speechToText(audioBuffer, language ?? undefined);

    const trackId = await persistTranscript({
      userId,
      provider:   "elevenlabs",
      mode:       "stt",
      model:      "scribe_v1",
      transcript: result.text,
      metadata:   { language_code: result.language_code, word_count: result.words?.length },
    });

    return NextResponse.json({ transcript: result.text, language_code: result.language_code, trackId });
  } catch (err) {
    console.error("[/api/elevenlabs/stt]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
