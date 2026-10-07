/**
 * Auto-edit pipeline — client-side using @ffmpeg/ffmpeg WASM.
 *
 * Pipeline steps:
 *  1. Load video into WASM FS
 *  2. Extract audio (WAV)  → Web Audio API energy analysis
 *  3. Detect scene changes → FFmpeg showinfo filter
 *  4. Score each scene     → audio energy + speech + scene-change bonus
 *  5. Select best clips    → greedy to target duration
 *  6. Cut + concatenate    → FFmpeg concat filter
 *  7. Optional 9:16 crop
 *  8. Optional music overlay
 */

import {
  analyzeAudioEnergy,
  parseSceneChanges,
  parseVideoDuration,
  scoreScenes,
  selectBestClips,
  type ScoredClip,
} from "./analysis";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EditStyle = "viral" | "cinematic" | "vlog";

export interface AutoEditConfig {
  targetDuration: 10 | 15 | 30;
  style:          EditStyle;
  cropTo9x16:     boolean;
  addMusic:       boolean;
  musicUrl?:      string;
  fadeIn:         number;
  fadeOut:        number;
}

export interface AutoEditResult {
  outputBlob:     Blob;
  clips:          ScoredClip[];
  totalDuration:  number;
}

export type ProgressCb = (step: string, pct: number) => void;

// ── Style weights ─────────────────────────────────────────────────────────────

const STYLE_SCENE_THRESHOLD: Record<EditStyle, number> = {
  viral:     0.30,   // more sensitive → more cuts = high energy
  cinematic: 0.45,   // fewer cuts = smooth pacing
  vlog:      0.35,   // balanced
};

const STYLE_MIN_CLIP: Record<EditStyle, number> = {
  viral:     1.0,
  cinematic: 3.0,
  vlog:      2.0,
};

// ── FFmpeg helpers ────────────────────────────────────────────────────────────

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
  const handler = ({ message }: { message: string }) => lines.push(message);
  ff.on("log", handler);
  try { await ff.exec(args); } catch {}
  ff.off("log", handler);
  return lines;
}

async function fileToUint8(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

async function urlToUint8(url: string): Promise<Uint8Array> {
  const { fetchFile } = await import("@ffmpeg/util");
  return fetchFile(url);
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runAutoEdit(
  videoFile:  File,
  config:     AutoEditConfig,
  onProgress: ProgressCb
): Promise<AutoEditResult> {
  onProgress("Loading FFmpeg WASM…", 2);
  const ff = await loadFFmpeg();

  try {
    // ── Step 1: Write video ──────────────────────────────────────────────────
    onProgress("Reading video file…", 5);
    ff.writeFile("input.mp4", await fileToUint8(videoFile));

    // ── Step 2: Get duration ─────────────────────────────────────────────────
    onProgress("Parsing video metadata…", 8);
    const metaLog  = await execCapture(ff, ["-i", "input.mp4", "-f", "null", "-"]);
    const duration = parseVideoDuration(metaLog);
    if (!duration) throw new Error("Could not read video duration.");

    // ── Step 3: Extract audio ────────────────────────────────────────────────
    onProgress("Extracting audio track…", 15);
    await ff.exec(["-i", "input.mp4", "-vn", "-ar", "22050", "-ac", "1", "-f", "wav", "audio.wav"]);
    const wavData   = await ff.readFile("audio.wav") as Uint8Array;
    await ff.deleteFile("audio.wav").catch(() => {});

    // ── Step 4: Analyze audio energy ─────────────────────────────────────────
    onProgress("Analyzing audio energy…", 25);
    const energy   = await analyzeAudioEnergy((wavData.buffer as ArrayBuffer).slice(0));

    // ── Step 5: Detect scene changes ─────────────────────────────────────────
    onProgress("Detecting scene changes…", 38);
    const sceneThreshold = STYLE_SCENE_THRESHOLD[config.style];
    const sceneLog = await execCapture(ff, [
      "-i", "input.mp4",
      "-vf", `select='gt(scene,${sceneThreshold})',showinfo`,
      "-vsync", "0", "-an", "-f", "null", "-",
    ]);
    const sceneList = parseSceneChanges(sceneLog, duration);

    // Fallback: if no scene changes detected, divide into equal segments
    if (sceneList.scenes.length < 2) {
      const segLen = Math.min(5, duration / 4);
      const t: number[] = [];
      for (let s = 0; s <= duration; s += segLen) t.push(s);
      sceneList.changeTimes = t;
      sceneList.scenes = t.slice(0, -1).map((start, i) => ({
        start, end: t[i + 1], durationSec: t[i + 1] - start,
      }));
    }

    // ── Step 6: Score + select clips ─────────────────────────────────────────
    onProgress("Scoring and selecting clips…", 50);
    const scored = scoreScenes(sceneList.scenes, energy);
    const clips  = selectBestClips(scored, config.targetDuration, STYLE_MIN_CLIP[config.style]);

    if (clips.length === 0) throw new Error("Could not identify suitable clip segments.");

    // ── Step 7: Cut each clip ────────────────────────────────────────────────
    onProgress("Cutting clips…", 58);
    const clipFiles: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const c  = clips[i];
      const fn = `clip_${i}.mp4`;
      onProgress(`Cutting clip ${i + 1}/${clips.length}…`, 58 + (i / clips.length) * 20);
      await ff.exec([
        "-i",  "input.mp4",
        "-ss", String(c.start.toFixed(3)),
        "-to", String(c.end.toFixed(3)),
        "-c",  "copy",
        fn,
      ]);
      clipFiles.push(fn);
    }

    // ── Step 8: Concatenate ──────────────────────────────────────────────────
    onProgress("Concatenating clips…", 78);
    let outputFile = "concat.mp4";

    if (clipFiles.length === 1) {
      outputFile = clipFiles[0];
    } else {
      const inputArgs   = clipFiles.flatMap((f) => ["-i", f]);
      const filterParts = clipFiles.map((_, i) => `[${i}:v][${i}:a]`).join("");
      await ff.exec([
        ...inputArgs,
        "-filter_complex",
        `${filterParts}concat=n=${clipFiles.length}:v=1:a=1[v][a]`,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac",
        outputFile,
      ]);
    }

    // ── Step 9: Crop to 9:16 (optional) ─────────────────────────────────────
    if (config.cropTo9x16) {
      onProgress("Cropping to 9:16…", 84);
      await ff.exec([
        "-i", outputFile,
        "-vf", "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920",
        "-c:a", "copy", "cropped.mp4",
      ]);
      outputFile = "cropped.mp4";
    }

    // ── Step 10: Add music overlay (optional) ────────────────────────────────
    if (config.addMusic && config.musicUrl) {
      onProgress("Mixing music…", 88);
      ff.writeFile("music.mp3", await urlToUint8(config.musicUrl));
      const totalDur = clips.reduce((s, c) => s + c.durationSec, 0);
      const filters: string[] = [];
      if (config.fadeIn  > 0) filters.push(`afade=t=in:st=0:d=${config.fadeIn}`);
      if (config.fadeOut > 0) filters.push(`afade=t=out:st=${Math.max(0, totalDur - config.fadeOut)}:d=${config.fadeOut}`);
      const musicFilter = filters.length > 0
        ? `[1:a]${filters.join(",")}[mus];[0:a][mus]amix=inputs=2:duration=first:weights=1 0.3[outa]`
        : `[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.3[outa]`;

      await ff.exec([
        "-i", outputFile,
        "-i", "music.mp3",
        "-filter_complex", musicFilter,
        "-map", "0:v", "-map", "[outa]",
        "-c:v", "copy", "-c:a", "aac", "final.mp4",
      ]);
      outputFile = "final.mp4";
      await ff.deleteFile("music.mp3").catch(() => {});
    }

    // ── Read output ──────────────────────────────────────────────────────────
    onProgress("Finalizing…", 95);
    const rawData   = await ff.readFile(outputFile) as Uint8Array;
    const outputBlob = new Blob([rawData.buffer.slice(0) as ArrayBuffer], { type: "video/mp4" });

    const totalDuration = clips.reduce((s, c) => s + c.durationSec, 0);
    onProgress("Done", 100);
    return { outputBlob, clips, totalDuration };
  } finally {
    // Best-effort cleanup of WASM FS
    for (const f of ["input.mp4", "concat.mp4", "cropped.mp4", "final.mp4"]) {
      await ff.deleteFile(f).catch(() => {});
    }
  }
}
