/**
 * Shared helper: upload Buffer to R2 + save generation record to Supabase.
 */
import { uploadAudioBuffer } from "@/lib/storage/r2";

export interface PersistAudioOptions {
  buffer:     Buffer;
  userId:     string | null;
  provider:   string;
  mode:       string;
  model?:     string;
  prompt?:    string;
  inputText?: string;
  metadata?:  Record<string, unknown>;
  plan:       string;
  filename?:  string;
}

export interface PersistAudioResult {
  audioUrl:  string;
  trackId?:  string;
  watermarked: boolean;
}

export async function persistAudio(opts: PersistAudioOptions): Promise<PersistAudioResult> {
  const { buffer, userId, provider, mode, model, prompt, inputText, metadata, plan, filename } = opts;
  const watermarked = plan === "free";

  // Upload to R2
  const { url: audioUrl } = await uploadAudioBuffer(
    buffer,
    userId ?? "anon",
    filename ?? `${mode}-${Date.now()}.mp3`
  );

  let trackId: string | undefined;

  // Save to Supabase
  if (userId) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data } = await supabase
        .from("generations")
        .insert({
          user_id:    userId,
          provider,
          mode,
          model,
          prompt,
          input_text: inputText,
          audio_url:  audioUrl,
          watermarked,
          metadata:   metadata ?? null,
        })
        .select("id")
        .single();
      trackId = data?.id;
    } catch {
      // Best-effort
    }
  }

  return { audioUrl, trackId, watermarked };
}

export interface PersistTranscriptOptions {
  userId:   string | null;
  provider: string;
  mode:     string;
  model?:   string;
  transcript: string;
  metadata?:  Record<string, unknown>;
}

export async function persistTranscript(opts: PersistTranscriptOptions): Promise<string | undefined> {
  if (!opts.userId) return;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("generations")
      .insert({
        user_id:    opts.userId,
        provider:   opts.provider,
        mode:       opts.mode,
        model:      opts.model,
        transcript: opts.transcript,
        metadata:   opts.metadata ?? null,
      })
      .select("id")
      .single();
    return data?.id;
  } catch {
    return undefined;
  }
}
