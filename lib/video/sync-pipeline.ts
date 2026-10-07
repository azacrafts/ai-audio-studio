/**
 * Video + Audio Sync pipeline — client-side using @ffmpeg/ffmpeg WASM.
 *
 * Pipeline:
 *  1. Load video + audio into WASM FS
 *  2. Extract video audio → analyze energy → find "drop" point
 *  3. Calculate offset = videoDropTime - audioDropTime
 *  4. Merge audio onto video at correct offset
 *  5. Apply ducking if speech detected under music
 *  6. Optional: trim video to match audio duration
 */

import { analyzeAudioEnergy, findEnergyDrop } from "./analysis";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SyncConfig {
  /** Video timestamp (seconds) where the audio drop should land */
  videoDropTime:  number;
  /** Set to -1 to auto-detect from audio energy */
  audioDropTime:  number;
  /** Lower music when speech is detected in the original video audio */
  ducking:        boolean;
  /** Trim video end to match audio length */
  autoCut:        boolean;
  fadeIn:         number;
  fadeOut:        number;
  /** 0–2 music volume multiplier */
  musicVolume:    number;
}

export interface SyncResult {
  outputBlob:       Blob;
  appliedOffset:    number;  // seconds audio was shifted
  detectedDrop:     number;  // auto-detected audio drop point
}

export type ProgressCb = (step: string, pct: number) => void;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadFFmpeg() {
  const { FFmpeg }    = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  const ff = new FFmpeg();
  const BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ff.load({
    coreURL: await toBlobURL(`${BASE}/ffmpeg-core.js`,   "text/javascript"),
    wasmURL: await toBlobURL(`${BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ff;
}

async function execCapture(
  ff: import("@ffmpeg/ffmpeg").FFmpeg,
  args: string[]
): Promise<string[]> {
  const lines: string[] = [];
  const h = ({ message }: { message: string }) => lines.push(message);
  ff.on("log", h);
  try { await ff.exec(args); } catch {}
  ff.off("log", h);
  return lines;
}

function parseVideoDuration(lines: string[]): number {
  for (const l of lines) {
    const m = l.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (m) return +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
  }
  return 0;
}

// ── Main sync pipeline ────────────────────────────────────────────────────────

export async function runVideoSync(
  videoFile:  File,
  audioUrl:   string,
  config:     SyncConfig,
  onProgress: ProgressCb
): Promise<SyncResult> {
  onProgress("Loading FFmpeg WASM…", 2);
  const ff = await loadFFmpeg();

  try {
    // ── Load files ────────────────────────────────────────────────────────────
    onProgress("Reading video file…", 8);
    const { fetchFile } = await import("@ffmpeg/util");
    ff.writeFile("input.mp4", new Uint8Array(await videoFile.arrayBuffer()));

    onProgress("Loading audio…", 12);
    ff.writeFile("audio.mp3", await fetchFile(audioUrl));

    // ── Get video duration ────────────────────────────────────────────────────
    onProgress("Reading metadata…", 16);
    const metaLog   = await execCapture(ff, ["-i", "input.mp4", "-f", "null", "-"]);
    const vidDur    = parseVideoDuration(metaLog);

    // ── Auto-detect audio drop (if requested) ─────────────────────────────────
    onProgress("Analyzing audio drop point…", 22);
    let detectedDrop = config.audioDropTime;

    if (config.audioDropTime < 0) {
      // Extract audio track from the music file for analysis
      await ff.exec(["-i", "audio.mp3", "-ar", "22050", "-ac", "1", "-f", "wav", "aud_raw.wav"]);
      const wavData = await ff.readFile("aud_raw.wav") as Uint8Array;
      await ff.deleteFile("aud_raw.wav").catch(() => {});
      const energy  = await analyzeAudioEnergy((wavData.buffer as ArrayBuffer).slice(0));
      detectedDrop  = findEnergyDrop(energy);
    }

    // ── Calculate offset ──────────────────────────────────────────────────────
    // Positive offset = audio starts after video; negative = audio starts before video
    const offset = config.videoDropTime - detectedDrop;

    onProgress(`Syncing (offset: ${offset >= 0 ? "+" : ""}${offset.toFixed(2)}s)…`, 35);

    // ── Extract audio duration from music file ────────────────────────────────
    const audMetaLog = await execCapture(ff, ["-i", "audio.mp3", "-f", "null", "-"]);
    const audioDur   = parseVideoDuration(audMetaLog);

    // ── Optional: Detect speech in video for ducking ──────────────────────────
    let duckFilter = "";
    if (config.ducking) {
      onProgress("Detecting speech for ducking…", 45);
      // Extract original video audio for analysis
      await ff.exec(["-i", "input.mp4", "-vn", "-ar", "22050", "-ac", "1", "-f", "wav", "vid_aud.wav"]);
      const vidWav  = await ff.readFile("vid_aud.wav") as Uint8Array;
      await ff.deleteFile("vid_aud.wav").catch(() => {});
      const vidEnergy = await analyzeAudioEnergy((vidWav.buffer as ArrayBuffer).slice(0));

      // If original video has significant audio → add sidechain compression
      const avgEnergy = vidEnergy.normalized.reduce((s, v) => s + v, 0) / vidEnergy.normalized.length;
      if (avgEnergy > 0.1) {
        // Duck music to 20% when video audio is present
        duckFilter =
          `[0:a]volume=1.0[origvid];` +
          `[1:a]volume=${config.musicVolume}[mus];` +
          `[origvid][mus]sidechaincompress=threshold=0.05:ratio=4:attack=200:release=1000:gain=0.8[outa]`;
      }
    }

    onProgress("Merging audio and video…", 58);

    // ── Build filter_complex ──────────────────────────────────────────────────
    let filterComplex: string;

    if (duckFilter) {
      filterComplex = duckFilter;
    } else {
      const fadeParts: string[] = [`volume=${config.musicVolume}`];
      if (config.fadeIn  > 0) fadeParts.push(`afade=t=in:st=0:d=${config.fadeIn}`);
      if (config.fadeOut > 0) {
        const foSt = Math.max(0, audioDur - config.fadeOut);
        fadeParts.push(`afade=t=out:st=${foSt}:d=${config.fadeOut}`);
      }
      filterComplex = `[1:a]${fadeParts.join(",")}[outa]`;
    }

    // ── Decide on video trimming ──────────────────────────────────────────────
    const videoArgs: string[] = ["-i", "input.mp4"];
    if (offset > 0) {
      // Audio starts later — add silent gap by using itsoffset
      videoArgs.push("-itsoffset", String(offset.toFixed(3)));
    }
    videoArgs.push("-i", "audio.mp3");

    const outputArgs: string[] = [
      "-filter_complex", filterComplex,
      "-map", "0:v",
      "-map", "[outa]",
    ];

    if (config.autoCut && audioDur > 0) {
      // Trim output to audio length + offset
      const endTime = (offset > 0 ? offset : 0) + audioDur;
      outputArgs.push("-t", String(Math.min(endTime, vidDur).toFixed(3)));
    }

    // Negative offset: audio should start before video (shift video start)
    if (offset < 0) {
      outputArgs.push("-ss", String(Math.abs(offset).toFixed(3)));
    }

    outputArgs.push("-c:v", "copy", "-c:a", "aac", "synced.mp4");

    await ff.exec([...videoArgs, ...outputArgs]);

    // ── Read result ───────────────────────────────────────────────────────────
    onProgress("Finalizing…", 92);
    const rawData    = await ff.readFile("synced.mp4") as Uint8Array;
    const outputBlob = new Blob([rawData.buffer.slice(0) as ArrayBuffer], { type: "video/mp4" });

    onProgress("Done", 100);
    return { outputBlob, appliedOffset: offset, detectedDrop };
  } finally {
    for (const f of ["input.mp4", "audio.mp3", "synced.mp4"]) {
      await ff.deleteFile(f).catch(() => {});
    }
  }
}
