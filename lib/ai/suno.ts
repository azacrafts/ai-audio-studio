const SUNO_BASE = "https://api.kie.ai/api/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SunoGenerateParams {
  prompt: string;
  duration?: number;
  model?: SunoModel;
  instrumental?: boolean;
  customMode?: boolean;
  style?: string;
  title?: string;
  negativeTags?: string;
  callBackUrl?: string;
}

export type SunoModel =
  | "V3_5"
  | "V4"
  | "V4_5"
  | "V4_5PLUS"
  | "V4_5ALL"
  | "V5"
  | "V5_5";

export type SunoTaskStatus =
  | "PENDING"
  | "TEXT_SUCCESS"
  | "FIRST_SUCCESS"
  | "SUCCESS"
  | "CREATE_TASK_FAILED"
  | "GENERATE_AUDIO_FAILED"
  | "CALLBACK_EXCEPTION"
  | "SENSITIVE_WORD_ERROR";

export interface SunoTrack {
  id: string;
  audioUrl: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  title: string;
  tags: string;
  duration: number;
  prompt: string;
  createTime?: string;
}

export interface SunoTaskInfo {
  taskId: string;
  status: SunoTaskStatus;
  errorMessage?: string;
  response?: {
    sunoData?: SunoTrack[];
  };
}

// Result returned to callers
export interface SunoGenerateResult {
  /** Suno taskId — always populated */
  taskId: string;
  /** First available audio URL — populated once FIRST_SUCCESS or SUCCESS */
  audioUrl: string;
  /** All returned tracks */
  tracks: SunoTrack[];
  /** Internal job ID alias */
  jobId: string;
}

// ── Core API helpers ───────────────────────────────────────────────────────────

function getApiKey(): string | undefined {
  const key = process.env.SUNO_API_KEY;
  return key && key !== "your_suno_api_key_here" ? key : undefined;
}

async function sunoFetch(path: string, init: RequestInit = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("SUNO_API_KEY not configured");

  const res = await fetch(`${SUNO_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const json = await res.json();

  if (!res.ok || json.code !== 200) {
    const msg = json.msg ?? `HTTP ${res.status}`;
    throw new SunoApiError(msg, json.code ?? res.status, json);
  }

  return json;
}

export class SunoApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly raw: unknown
  ) {
    super(message);
    this.name = "SunoApiError";
  }
}

// ── Submit generation ─────────────────────────────────────────────────────────

/**
 * Submit a generation request to kie.ai.
 * Returns a taskId immediately — the generation is async.
 */
export async function submitSunoGeneration(
  params: SunoGenerateParams
): Promise<string> {
  const body: Record<string, unknown> = {
    prompt: params.prompt.slice(0, params.customMode ? 5000 : 500),
    customMode: params.customMode ?? false,
    instrumental: params.instrumental ?? true,
    model: params.model ?? "V4_5",
  };

  if (params.customMode) {
    if (params.style)
      body.style = params.style.slice(0, 1000);
    if (params.title)
      body.title = params.title.slice(0, 80);
  }
  if (params.negativeTags) body.negativeTags = params.negativeTags;

  // callBackUrl is required by kie.ai — use provided URL or the app's webhook endpoint
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://acoustic-kappa.vercel.app";
  body.callBackUrl = params.callBackUrl ?? `${appUrl}/api/webhooks/suno`;

  const json = await sunoFetch("/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return json.data.taskId as string;
}

// ── Poll task status ──────────────────────────────────────────────────────────

/**
 * Fetch the current status of a Suno generation task.
 */
export async function getSunoTaskStatus(taskId: string): Promise<SunoTaskInfo> {
  const json = await sunoFetch(
    `/generate/record-info?taskId=${encodeURIComponent(taskId)}`
  );
  return json.data as SunoTaskInfo;
}

/**
 * Poll until FIRST_SUCCESS / SUCCESS (or terminal error), then return.
 * Throws on error states or timeout.
 *
 * @param taskId    kie.ai task ID
 * @param maxMs     Maximum wait time in milliseconds (default 120 s)
 * @param intervalMs Polling interval (default 5 s)
 */
export async function waitForSunoCompletion(
  taskId: string,
  maxMs = 120_000,
  intervalMs = 5_000
): Promise<SunoTaskInfo> {
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    const info = await getSunoTaskStatus(taskId);

    switch (info.status) {
      case "SUCCESS":
      case "FIRST_SUCCESS":
        return info;

      case "TEXT_SUCCESS":
      case "PENDING":
        break; // keep polling

      case "CREATE_TASK_FAILED":
        throw new SunoApiError(
          info.errorMessage ?? "Task creation failed",
          0,
          info
        );
      case "GENERATE_AUDIO_FAILED":
        throw new SunoApiError(
          info.errorMessage ?? "Audio generation failed",
          0,
          info
        );
      case "CALLBACK_EXCEPTION":
        throw new SunoApiError(
          info.errorMessage ?? "Callback error",
          0,
          info
        );
      case "SENSITIVE_WORD_ERROR":
        throw new SunoApiError(
          info.errorMessage ?? "Content filtered — try rephrasing your prompt",
          400,
          info
        );
      default:
        // Unknown status — keep waiting
        break;
    }

    await delay(intervalMs);
  }

  throw new SunoApiError("Generation timed out — try again", 408, { taskId });
}

// ── High-level wrapper (submit + poll) ────────────────────────────────────────

/**
 * Submit + poll until first track is ready, then return.
 * Falls back to mock audio when SUNO_API_KEY is not set.
 */
export async function generateWithSuno(
  params: SunoGenerateParams
): Promise<SunoGenerateResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return getMockResult();
  }

  const taskId = await submitSunoGeneration(params);
  const info = await waitForSunoCompletion(taskId);

  const tracks = info.response?.sunoData ?? [];
  const first = tracks.find((t) => t.audioUrl) ?? tracks[0];

  if (!first?.audioUrl) {
    throw new SunoApiError("No audio URL in completed task", 0, info);
  }

  return {
    taskId,
    audioUrl: first.audioUrl,
    tracks,
    jobId: first.id,
  };
}

// ── Extend music ──────────────────────────────────────────────────────────────

export interface SunoExtendParams {
  audioId: string;
  model?: SunoModel;
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
  defaultParamFlag?: boolean;
  callBackUrl?: string;
}

export async function submitSunoExtend(params: SunoExtendParams): Promise<string> {
  const body: Record<string, unknown> = {
    audioId: params.audioId,
    defaultParamFlag: params.defaultParamFlag ?? false,
    model: params.model ?? "V4_5",
  };
  if (params.prompt) body.prompt = params.prompt;
  if (params.style) body.style = params.style;
  if (params.title) body.title = params.title;
  if (params.continueAt !== undefined) body.continueAt = params.continueAt;
  if (params.callBackUrl) body.callBackUrl = params.callBackUrl;

  const json = await sunoFetch("/generate/extend", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json.data.taskId as string;
}

// ── Lyrics generation ─────────────────────────────────────────────────────────

export async function generateSunoLyrics(
  prompt: string,
  callBackUrl?: string
): Promise<string> {
  const json = await sunoFetch("/lyrics", {
    method: "POST",
    body: JSON.stringify({ prompt, callBackUrl }),
  });
  return json.data.taskId as string;
}

// ── Style boost (V4_5+ models) ────────────────────────────────────────────────

export async function boostSunoStyle(content: string): Promise<string> {
  const json = await sunoFetch("/style/generate", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return json.data.result as string;
}

// ── Audio processing ──────────────────────────────────────────────────────────

export async function convertSunoToWav(
  taskId: string,
  audioId: string,
  callBackUrl?: string
): Promise<string> {
  const json = await sunoFetch("/wav/generate", {
    method: "POST",
    body: JSON.stringify({ taskId, audioId, callBackUrl }),
  });
  return json.data.taskId as string;
}

export async function separateSunoVocals(
  taskId: string,
  audioId: string,
  callBackUrl?: string
): Promise<string> {
  const json = await sunoFetch("/vocal-removal/generate", {
    method: "POST",
    body: JSON.stringify({ taskId, audioId, callBackUrl }),
  });
  return json.data.taskId as string;
}

export async function createSunoMusicVideo(
  taskId: string,
  audioId: string,
  opts: { author?: string; domainName?: string; callBackUrl?: string } = {}
): Promise<string> {
  const json = await sunoFetch("/mp4/generate", {
    method: "POST",
    body: JSON.stringify({ taskId, audioId, ...opts }),
  });
  return json.data.taskId as string;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getMockResult(): SunoGenerateResult {
  const samples = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  ];
  const url = samples[Math.floor(Math.random() * samples.length)];
  const id = `mock-${Date.now()}`;

  const mockTrack: SunoTrack = {
    id,
    audioUrl: url,
    title: "Mock Track",
    tags: "demo",
    duration: 180,
    prompt: "demo",
  };

  return {
    taskId: id,
    audioUrl: url,
    tracks: [mockTrack],
    jobId: id,
  };
}
