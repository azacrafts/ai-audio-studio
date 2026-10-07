/**
 * ElevenLabs multi-capability AI audio engine.
 * All audio-output functions return Buffer (raw MP3).
 * Routes upload to R2 and persist to Supabase.
 */

const BASE = "https://api.elevenlabs.io/v1";

const MOCK_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3";

function isMock(): boolean {
  const k = process.env.ELEVENLABS_API_KEY;
  return !k || k === "your_elevenlabs_api_key_here";
}

function authHeaders(): Record<string, string> {
  const k = process.env.ELEVENLABS_API_KEY!;
  return { "xi-api-key": k };
}

async function mockBuffer(): Promise<Buffer> {
  const r = await fetch(MOCK_AUDIO);
  return Buffer.from(await r.arrayBuffer());
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ElevenLabsVoice {
  voice_id:    string;
  name:        string;
  category:    string;
  labels:      Record<string, string>;
  preview_url?: string;
  description?: string;
}

export interface VoiceSettings {
  stability?:         number;  // 0–1, default 0.5
  similarity_boost?:  number;  // 0–1, default 0.75
  style?:             number;  // 0–1, default 0
  use_speaker_boost?: boolean; // default true
  speed?:             number;  // 0.7–1.2, default 1.0
}

export interface STTResult {
  text:          string;
  language_code?: string;
  words?:        { text: string; start: number; end: number; type: string }[];
}

// ── Voices ────────────────────────────────────────────────────────────────────

export async function getVoices(): Promise<ElevenLabsVoice[]> {
  if (isMock()) {
    return [
      { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",  category: "premade", labels: { gender: "female", accent: "american",   age: "young"       }, preview_url: MOCK_AUDIO },
      { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",    category: "premade", labels: { gender: "female", accent: "american",   age: "young"       }, preview_url: MOCK_AUDIO },
      { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",   category: "premade", labels: { gender: "female", accent: "american",   age: "young"       }, preview_url: MOCK_AUDIO },
      { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni",  category: "premade", labels: { gender: "male",   accent: "american",   age: "young"       }, preview_url: MOCK_AUDIO },
      { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",    category: "premade", labels: { gender: "male",   accent: "american",   age: "young"       }, preview_url: MOCK_AUDIO },
      { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold",  category: "premade", labels: { gender: "male",   accent: "american",   age: "middle-aged" }, preview_url: MOCK_AUDIO },
      { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam",    category: "premade", labels: { gender: "male",   accent: "american",   age: "middle-aged" }, preview_url: MOCK_AUDIO },
      { voice_id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam",     category: "premade", labels: { gender: "male",   accent: "american",   age: "young"       }, preview_url: MOCK_AUDIO },
      { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",  category: "premade", labels: { gender: "male",   accent: "british",    age: "middle-aged" }, preview_url: MOCK_AUDIO },
      { voice_id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte",category:"premade", labels: { gender: "female", accent: "british",    age: "young"       }, preview_url: MOCK_AUDIO },
    ];
  }

  const res = await fetch(`${BASE}/voices`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch voices: ${res.status}`);
  const data = await res.json();
  return data.voices ?? [];
}

// ── Text to Speech ────────────────────────────────────────────────────────────

export interface TTSParams {
  text:     string;
  voiceId:  string;
  modelId?: string;  // default: eleven_multilingual_v2
  settings?: VoiceSettings;
}

export async function generateTTS(params: TTSParams): Promise<Buffer> {
  if (isMock()) return mockBuffer();

  const { text, voiceId, modelId = "eleven_multilingual_v2", settings = {} } = params;

  const res = await fetch(
    `${BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method:  "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability:         settings.stability         ?? 0.5,
          similarity_boost:  settings.similarity_boost  ?? 0.75,
          style:             settings.style             ?? 0,
          use_speaker_boost: settings.use_speaker_boost ?? true,
          speed:             settings.speed             ?? 1.0,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`ElevenLabs TTS (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Speech to Speech ──────────────────────────────────────────────────────────

export interface S2SParams {
  audioBuffer: Buffer;
  voiceId:     string;
  modelId?:    string;  // default: eleven_english_sts_v2
  settings?:   VoiceSettings;
}

export async function speechToSpeech(params: S2SParams): Promise<Buffer> {
  if (isMock()) return mockBuffer();

  const { audioBuffer, voiceId, modelId = "eleven_english_sts_v2", settings = {} } = params;

  const form = new FormData();
  form.append("audio", new Blob([Uint8Array.from(audioBuffer)], { type: "audio/mpeg" }), "input.mp3");
  form.append("model_id", modelId);
  form.append("voice_settings", JSON.stringify({
    stability:         settings.stability         ?? 0.5,
    similarity_boost:  settings.similarity_boost  ?? 0.75,
    style:             settings.style             ?? 0,
    use_speaker_boost: settings.use_speaker_boost ?? true,
  }));

  const res = await fetch(
    `${BASE}/speech-to-speech/${voiceId}?output_format=mp3_44100_128`,
    { method: "POST", headers: authHeaders(), body: form }
  );

  if (!res.ok) throw new Error(`ElevenLabs S2S (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Speech to Text ────────────────────────────────────────────────────────────

export async function speechToText(
  audioBuffer: Buffer,
  language?: string
): Promise<STTResult> {
  if (isMock()) {
    return {
      text: "Mock transcript: The quick brown fox jumps over the lazy dog. This is a placeholder generated in development mode.",
      language_code: language ?? "en",
    };
  }

  const form = new FormData();
  form.append("file", new Blob([Uint8Array.from(audioBuffer)], { type: "audio/mpeg" }), "audio.mp3");
  form.append("model_id", "scribe_v1");
  if (language) form.append("language_code", language);

  const res = await fetch(`${BASE}/speech-to-text`, {
    method: "POST",
    headers: authHeaders(),
    body:    form,
  });

  if (!res.ok) throw new Error(`ElevenLabs STT (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { text: data.text ?? "", language_code: data.language_code, words: data.words };
}

// ── Audio Isolation ───────────────────────────────────────────────────────────

export async function isolateAudio(audioBuffer: Buffer): Promise<Buffer> {
  if (isMock()) return mockBuffer();

  const form = new FormData();
  form.append("audio", new Blob([Uint8Array.from(audioBuffer)], { type: "audio/mpeg" }), "input.mp3");

  const res = await fetch(`${BASE}/audio-isolation`, {
    method: "POST",
    headers: authHeaders(),
    body:    form,
  });

  if (!res.ok) throw new Error(`ElevenLabs isolation (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Sound Effects ─────────────────────────────────────────────────────────────

export interface SFXGenerateParams {
  prompt:            string;
  durationSeconds?:  number;
  promptInfluence?:  number;
}

export async function generateSFX(params: SFXGenerateParams): Promise<Buffer> {
  if (isMock()) return mockBuffer();

  const body: Record<string, unknown> = {
    text:             params.prompt,
    prompt_influence: params.promptInfluence ?? 0.3,
  };
  if (params.durationSeconds) body.duration_seconds = params.durationSeconds;

  const res = await fetch(`${BASE}/sound-generation`, {
    method:  "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`ElevenLabs SFX (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── SFX categories (for UI) ───────────────────────────────────────────────────

export const SFX_CATEGORIES = [
  { id: "nature",    label: "Nature",    prompts: ["rain on window glass",    "ocean waves at sunset",     "birds chirping in forest"   ] },
  { id: "urban",     label: "Urban",     prompts: ["coffee shop ambience",    "city traffic ambience",     "crowd applause"             ] },
  { id: "tech",      label: "Tech / UI", prompts: ["notification ding",       "button click",              "level up chime"             ] },
  { id: "dramatic",  label: "Dramatic",  prompts: ["thunder crashing",        "door slam",                 "glass shatter"              ] },
  { id: "cinematic", label: "Cinematic", prompts: ["dramatic orchestral hit", "suspense tension build",    "adventure fanfare"          ] },
  { id: "cartoon",   label: "Cartoon",   prompts: ["comedy boing",            "whoosh swoosh",             "cartoon pop"                ] },
];
