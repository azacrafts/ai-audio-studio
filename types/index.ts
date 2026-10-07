export type Plan = "free" | "creator" | "pro";

// ── Studio Modes ──────────────────────────────────────────────────────────────

export type StudioMode =
  | "music"      // Suno / Stable Audio
  | "sfx"        // ElevenLabs sound effects
  | "tts"        // ElevenLabs text-to-speech
  | "s2s"        // ElevenLabs speech-to-speech (voice cloning/transformation)
  | "stt"        // ElevenLabs speech-to-text (transcription)
  | "isolation"; // ElevenLabs audio isolation

/** Unified request shape for all Studio modes */
export interface StudioRequest {
  provider: "suno" | "elevenlabs" | "stable-audio";
  mode:     StudioMode;

  /** Display title for the library entry */
  displayTitle: string;

  // Music / SFX
  model?:       string;
  prompt?:      string;
  preset?:      string;
  duration?:    number | null;
  vocalGender?: string | null;
  style?:       string;
  bpm?:         number;
  instrumental?: boolean;

  // TTS
  text?:    string;
  voiceId?: string;
  voiceName?: string;

  // ElevenLabs voice settings (TTS + S2S)
  stability?:         number;
  similarity_boost?:  number;
  styleExaggeration?: number;
  speed?:             number;

  // File-based modes (S2S, STT, Isolation)
  audioFile?: File;
  language?:  string;
}

export type PresetCategory =
  | "Travel Vlog"
  | "TikTok Hook"
  | "Podcast Background"
  | "Gaming Montage"
  | "Cinematic"
  | "Dynamic";

export type AIModel = "suno" | "stable-audio";

/** Suno model version exposed in the Studio UI */
export type SunoVersion = "V4" | "V4_5" | "V4_5PLUS" | "V5";

export type VocalGender = "male" | "female" | null;

export interface PresetConfig {
  model: AIModel;
  duration: number;
  defaultPrompt: string;
  bpm?: number;
  mood?: string;
}

export interface Preset {
  id: string;
  name: string;
  category: PresetCategory;
  videoUrl: string;
  audioPreviewUrl: string;
  config: PresetConfig;
  tags: string[];
}

export interface User {
  id: string;
  email: string;
  plan: Plan;
  tokenBalance: number;
  dailyGenerationsUsed: number;
  dailyLimit: number;
}

export interface Generation {
  id: string;
  userId: string;
  prompt?: string;
  preset?: string;
  model: string;
  duration: number | null;
  audioUrl: string;
  watermarked: boolean;
  createdAt: string;
  vocalGender?: VocalGender;
}

/** Sent from client to POST /api/generate */
export interface GenerateRequest {
  provider?: string;        // "suno" | "elevenlabs" | "stable-audio" (defaults to "suno")
  prompt?: string;
  preset?: string;          // optional — must provide prompt if no preset
  model: string;            // SunoVersion | "sfx" | "voice" | "stable-audio"
  duration: number | null;  // null = let model decide
  vocalGender?: VocalGender;
  style?: string;           // advanced
  bpm?: number;             // advanced
  instrumental?: boolean;   // advanced
}

export interface GenerateResponse {
  audioUrl: string;
  watermarked: boolean;
  jobId?: string;
}

export interface ProcessAudioRequest {
  musicUrl: string;
  sfxUrl?: string;
  trim?: { start: number; end: number };
  fadeIn?: number;
  fadeOut?: number;
  ducking?: boolean;
}

export interface ProcessAudioResponse {
  processedUrl: string;
}
