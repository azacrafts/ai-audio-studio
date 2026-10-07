/**
 * Client-side audio processing using @ffmpeg/ffmpeg (WebAssembly).
 *
 * Loads FFmpeg WASM from CDN on first call (≈30 MB, cached by browser).
 * Runs entirely in the browser — no server timeouts, works on Vercel.
 */

let ffmpegInstance: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

export interface TimelineTrack {
  /** Fetch URL or blob URL for the audio */
  url: string;
  type: "main" | "overlay";
  /** 0–2 volume multiplier (1 = original) */
  volume: number;
  /** Trim: seconds from start of source to begin reading */
  trimStart?: number;
  /** Trim: seconds from start of source to stop reading (null = use full length) */
  trimEnd?: number | null;
  /** Delay offset in milliseconds before this track starts on the timeline */
  offsetMs?: number;
}

export interface ProcessConfig {
  tracks: TimelineTrack[];
  effects: {
    /** Fade-in duration in seconds (0 = off) */
    fadeIn?: number;
    /** Fade-out duration in seconds (0 = off) */
    fadeOut?: number;
    /** Normalize audio levels */
    normalize?: boolean;
  };
  /** Output format, defaults to "mp3" */
  format?: "mp3" | "wav";
  onProgress?: (ratio: number) => void;
}

async function getFFmpeg(): Promise<import("@ffmpeg/ffmpeg").FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) {
    await loadPromise;
    return ffmpegInstance!;
  }

  const { FFmpeg }      = await import("@ffmpeg/ffmpeg");
  const { toBlobURL }   = await import("@ffmpeg/util");

  const ff = new FFmpeg();
  const BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

  loadPromise = ff.load({
    coreURL: await toBlobURL(`${BASE}/ffmpeg-core.js`,   "text/javascript"),
    wasmURL: await toBlobURL(`${BASE}/ffmpeg-core.wasm`, "application/wasm"),
  }).then(() => {});  // normalize to Promise<void>

  await loadPromise;
  ffmpegInstance = ff;
  return ff;
}

async function urlToUint8Array(url: string): Promise<Uint8Array> {
  const { fetchFile } = await import("@ffmpeg/util");
  return fetchFile(url);
}

/**
 * Process an array of timeline tracks into a single audio output.
 * Returns a Blob ready for playback or upload.
 */
export async function processAudioTracks(config: ProcessConfig): Promise<Blob> {
  const { tracks, effects, format = "mp3", onProgress } = config;
  const ff = await getFFmpeg();

  if (onProgress) {
    ff.on("progress", ({ progress }) => onProgress(progress));
  }

  try {
    const mainTrack    = tracks.find((t) => t.type === "main");
    const overlayTracks = tracks.filter((t) => t.type === "overlay");

    if (!mainTrack) throw new Error("No main track provided");

    // Write all tracks to WASM virtual FS
    const mainFilename = "main.mp3";
    ff.writeFile(mainFilename, await urlToUint8Array(mainTrack.url));

    const overlayFilenames: string[] = [];
    for (let i = 0; i < overlayTracks.length; i++) {
      const fn = `overlay_${i}.mp3`;
      ff.writeFile(fn, await urlToUint8Array(overlayTracks[i].url));
      overlayFilenames.push(fn);
    }

    const outputFilename = `output.${format}`;

    // Build FFmpeg command
    const args: string[] = [];
    const inputFlags: string[] = [];

    // Inputs
    inputFlags.push("-i", mainFilename);
    for (const fn of overlayFilenames) {
      inputFlags.push("-i", fn);
    }

    // Build filter_complex
    const filterParts: string[] = [];

    // Main track filter
    const mainParts: string[] = [];
    if (mainTrack.trimStart != null || mainTrack.trimEnd != null) {
      const ts = mainTrack.trimStart ?? 0;
      const te = mainTrack.trimEnd;
      if (te != null) {
        mainParts.push(`atrim=start=${ts}:end=${te}`);
      } else {
        mainParts.push(`atrim=start=${ts}`);
      }
      mainParts.push("asetpts=PTS-STARTPTS");
    }
    mainParts.push(`volume=${mainTrack.volume ?? 1}`);

    if (effects.normalize) {
      mainParts.push("loudnorm");
    }

    // Compute effective main duration for fade-out timing
    const mainDur =
      (mainTrack.trimEnd ?? 999) - (mainTrack.trimStart ?? 0);

    if (effects.fadeIn && effects.fadeIn > 0) {
      mainParts.push(`afade=t=in:st=0:d=${effects.fadeIn}`);
    }
    if (effects.fadeOut && effects.fadeOut > 0) {
      const foStart = Math.max(0, mainDur - effects.fadeOut);
      mainParts.push(`afade=t=out:st=${foStart}:d=${effects.fadeOut}`);
    }

    filterParts.push(`[0:a]${mainParts.join(",")}[main]`);

    // Overlay track filters
    const overlayLabels: string[] = [];
    for (let i = 0; i < overlayTracks.length; i++) {
      const ot  = overlayTracks[i];
      const parts: string[] = [`volume=${ot.volume ?? 0.5}`];
      if (ot.offsetMs && ot.offsetMs > 0) {
        parts.push(`adelay=${Math.round(ot.offsetMs)}|${Math.round(ot.offsetMs)}`);
      }
      const label = `ov${i}`;
      filterParts.push(`[${i + 1}:a]${parts.join(",")}[${label}]`);
      overlayLabels.push(`[${label}]`);
    }

    // Mix
    const mixInputs = ["[main]", ...overlayLabels];
    if (overlayLabels.length > 0) {
      filterParts.push(
        `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0[out]`
      );
    } else {
      filterParts.push("[main]acopy[out]");
    }

    // Assemble command
    args.push(...inputFlags);
    args.push("-filter_complex", filterParts.join(";"));
    args.push("-map", "[out]");
    args.push("-ar", "44100", "-ac", "2");

    if (format === "mp3") {
      args.push("-b:a", "192k", "-f", "mp3");
    } else {
      args.push("-f", "wav");
    }

    args.push(outputFilename);

    await ff.exec(args);

    const data = await ff.readFile(outputFilename);

    // Clean up WASM FS
    await ff.deleteFile(mainFilename).catch(() => {});
    for (const fn of overlayFilenames) {
      await ff.deleteFile(fn).catch(() => {});
    }
    await ff.deleteFile(outputFilename).catch(() => {});

    // Normalize Uint8Array to plain ArrayBuffer for Blob constructor
    const raw = data instanceof Uint8Array ? data.buffer.slice(0) : data;
    return new Blob([raw as ArrayBuffer], {
      type: format === "mp3" ? "audio/mpeg" : "audio/wav",
    });
  } finally {
    ff.off("progress", () => {});
  }
}

/** Preload FFmpeg WASM in the background so it's ready when user clicks Process */
export function preloadFFmpeg(): void {
  getFFmpeg().catch(() => {});
}
