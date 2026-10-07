/**
 * POST /api/editor/export
 *
 * Receives processed audio from the browser (FormData), uploads to R2,
 * saves metadata to Supabase `edited_audio`, and returns the final URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { uploadAudioBuffer } from "@/lib/storage/r2";
import { createClient }     from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const form       = await req.formData();
    const audioFile  = form.get("audio")       as File | null;
    const userId     = form.get("userId")      as string | null;
    const sourceType = form.get("sourceType")  as string | null;   // "generated" | "uploaded"
    const sourceId   = form.get("sourceId")    as string | null;   // trackId if from Studio
    const configJson = form.get("configJson")  as string | null;   // editor state JSON

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const buffer    = Buffer.from(await audioFile.arrayBuffer());
    const filename  = `edited-${Date.now()}.mp3`;

    // Upload to R2 (or fall back to data URL)
    const { url: outputUrl } = await uploadAudioBuffer(
      buffer,
      userId ?? "anon",
      filename,
      "audio/mpeg"
    );

    // Save metadata to Supabase
    let editId: string | undefined;
    if (userId) {
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("edited_audio")
          .insert({
            user_id:     userId,
            source_type: sourceType ?? "uploaded",
            source_id:   sourceId,
            output_url:  outputUrl,
            config_json: configJson ? JSON.parse(configJson) : null,
          })
          .select("id")
          .single();
        editId = data?.id;
      } catch {
        // Best-effort — don't fail the export if DB write fails
      }
    }

    return NextResponse.json({ outputUrl, editId });
  } catch (err) {
    console.error("[/api/editor/export]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
