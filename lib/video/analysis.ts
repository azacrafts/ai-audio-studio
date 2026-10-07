/**
 * Browser-based audio/video analysis.
 *
 * Uses Web Audio API for audio energy analysis (fast, no WASM).
 * FFmpeg-based scene detection results are parsed here as well.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EnergyAnalysis {
  /** Raw RMS energy per window */
  rms:              Float32Array;
  /** 0–1 normalized energy */
  normalized:       Float32Array;
  /** Timestamps (seconds) of significant energy peaks */
  peaks:            number[];
  /** Segments where energy crosses speech threshold */
  speechSegments:   { start: number; end: number }[];
  windowSec:        number;
  audioDuration:    number;
}

export interface SceneList {
  /** Scene boundaries (start of each scene in seconds) */
  changeTimes:  number[];
  /** Derived {start,end} pairs */
  scenes:       { start: number; end: number; durationSec: number }[];
  videoDuration: number;
}

export interface ScoredClip {
  start:        number;
  end:          number;
  score:        number;
  durationSec:  number;
}

// ── Audio energy (Web Audio API) ──────────────────────────────────────────────

/**
 * Compute RMS energy analysis from a WAV ArrayBuffer.
 * Pass the raw bytes of an audio.wav extracted by FFmpeg.
 */
export async function analyzeAudioEnergy(
  wavBuffer: ArrayBuffer,
  windowSec          = 0.5,
  speechThreshRatio  = 0.15   // fraction of max RMS to count as "speech presence"
): Promise<EnergyAnalysis> {
  const ctx = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(wavBuffer.slice(0));
  } finally {
    ctx.close().catch(() => {});
  }

  const channel    = audioBuffer.getChannelData(0);
  const sr         = audioBuffer.sampleRate;
  const winSize    = Math.floor(windowSec * sr);
  const numWin     = Math.floor(channel.length / winSize);

  const rms = new Float32Array(numWin);
  for (let i = 0; i < numWin; i++) {
    const base = i * winSize;
    let sum = 0;
    for (let j = base; j < base + winSize; j++) sum += channel[j] * channel[j];
    rms[i] = Math.sqrt(sum / winSize);
  }

  const maxRms     = Math.max(...rms) || 1;
  const normalized = rms.map((v) => v / maxRms) as Float32Array;

  // Peaks: local maxima above median × 1.5
  const sorted  = [...normalized].sort((a, b) => a - b);
  const median  = sorted[Math.floor(sorted.length / 2)];
  const peakThr = Math.min(0.7, Math.max(0.4, median * 1.8));
  const peaks: number[] = [];
  for (let i = 1; i < normalized.length - 1; i++) {
    if (
      normalized[i] > peakThr &&
      normalized[i] >= normalized[i - 1] &&
      normalized[i] >= normalized[i + 1]
    ) peaks.push(i * windowSec);
  }

  // Speech segments: continuous runs above threshold
  const speechThr = speechThreshRatio;
  const speechSegments: { start: number; end: number }[] = [];
  let speechStart: number | null = null;
  for (let i = 0; i < normalized.length; i++) {
    const t = i * windowSec;
    if (normalized[i] >= speechThr) {
      if (speechStart === null) speechStart = t;
    } else if (speechStart !== null) {
      speechSegments.push({ start: speechStart, end: t });
      speechStart = null;
    }
  }
  if (speechStart !== null) speechSegments.push({ start: speechStart, end: numWin * windowSec });

  return { rms, normalized, peaks, speechSegments, windowSec, audioDuration: audioBuffer.duration };
}

/** Find the largest single-window energy increase ("drop" moment) */
export function findEnergyDrop(energy: EnergyAnalysis): number {
  const { normalized, windowSec } = energy;
  let maxIncrease = 0;
  let dropIdx = 0;
  for (let i = 1; i < normalized.length; i++) {
    const inc = normalized[i] - normalized[i - 1];
    if (inc > maxIncrease) { maxIncrease = inc; dropIdx = i; }
  }
  return dropIdx * windowSec;
}

// ── Scene list helpers ────────────────────────────────────────────────────────

/** Parse FFmpeg showinfo log lines into scene change timestamps */
export function parseSceneChanges(logLines: string[], videoDuration: number): SceneList {
  const changeTimes: number[] = [0];

  for (const line of logLines) {
    // FFmpeg showinfo: "n:  1 pts:    XXX pts_time:4.167 pos:..."
    const m = line.match(/pts_time:([\d.]+)/);
    if (m) {
      const t = parseFloat(m[1]);
      if (t > 0.1) changeTimes.push(t);
    }
  }

  // Deduplicate + sort
  const unique = [...new Set(changeTimes)].sort((a, b) => a - b);
  if (unique[unique.length - 1] < videoDuration - 0.5) unique.push(videoDuration);

  const scenes = unique.slice(0, -1).map((start, i) => ({
    start,
    end:         unique[i + 1],
    durationSec: unique[i + 1] - start,
  }));

  return { changeTimes: unique, scenes, videoDuration };
}

/** Parse video duration from FFmpeg log lines */
export function parseVideoDuration(logLines: string[]): number {
  for (const line of logLines) {
    const m = line.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (m) {
      return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
    }
  }
  return 0;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

const WEIGHTS = { audio: 0.5, motion: 0.3, speech: 0.2 } as const;

/**
 * Score each scene based on audio energy, motion proxy (scene change = high motion),
 * and speech presence.
 */
export function scoreScenes(
  scenes:        SceneList["scenes"],
  energy:        EnergyAnalysis,
  motionBonus:   number = 0.3   // bonus applied to scenes preceded by a scene change
): ScoredClip[] {
  const { normalized, windowSec } = energy;

  return scenes.map((scene, idx) => {
    // Average audio energy over this scene
    const winStart = Math.floor(scene.start / windowSec);
    const winEnd   = Math.min(Math.ceil(scene.end / windowSec), normalized.length);
    let sumEnergy  = 0;
    let speechSecs = 0;
    for (let w = winStart; w < winEnd; w++) {
      sumEnergy += normalized[w];
      const t = w * windowSec;
      if (energy.speechSegments.some((s) => t >= s.start && t < s.end)) speechSecs += windowSec;
    }
    const numWins       = Math.max(winEnd - winStart, 1);
    const avgEnergy     = sumEnergy / numWins;
    const speechRatio   = Math.min(1, speechSecs / Math.max(scene.durationSec, 0.1));
    const motionScore   = idx > 0 ? motionBonus : 0;  // scene change = motion proxy

    const score =
      WEIGHTS.audio  * avgEnergy +
      WEIGHTS.motion * motionScore +
      WEIGHTS.speech * speechRatio;

    return {
      start:       scene.start,
      end:         scene.end,
      score,
      durationSec: scene.durationSec,
    };
  });
}

// ── Clip selection ────────────────────────────────────────────────────────────

/**
 * Select best clips by score, greedily merging adjacent high-score scenes
 * until we reach targetDuration.
 */
export function selectBestClips(
  scoredScenes:    ScoredClip[],
  targetDuration:  number,
  minClipDuration  = 1.5,
  mergeGapSec      = 1.0
): ScoredClip[] {
  if (scoredScenes.length === 0) return [];

  // Step 1: Merge adjacent scenes with no large gap into "segments"
  const segments: ScoredClip[] = [];
  let current: ScoredClip = { ...scoredScenes[0] };

  for (let i = 1; i < scoredScenes.length; i++) {
    const sc = scoredScenes[i];
    if (sc.start - current.end <= mergeGapSec) {
      // Extend current segment, take max score
      current = {
        start:       current.start,
        end:         sc.end,
        score:       (current.score * current.durationSec + sc.score * sc.durationSec) /
                     (current.durationSec + sc.durationSec),
        durationSec: sc.end - current.start,
      };
    } else {
      if (current.durationSec >= minClipDuration) segments.push(current);
      current = { ...sc };
    }
  }
  if (current.durationSec >= minClipDuration) segments.push(current);

  // Fallback: if no segments meet minDuration, use top scenes directly
  if (segments.length === 0) {
    const sorted = [...scoredScenes].sort((a, b) => b.score - a.score);
    return sorted.slice(0, Math.max(1, Math.ceil(targetDuration / 5)));
  }

  // Step 2: Sort by score, greedy select until target duration
  const ranked = [...segments].sort((a, b) => b.score - a.score);
  const selected: ScoredClip[] = [];
  let total = 0;

  for (const seg of ranked) {
    const take = Math.min(seg.durationSec, targetDuration - total);
    if (take < minClipDuration) continue;
    selected.push({ ...seg, end: seg.start + take, durationSec: take });
    total += take;
    if (total >= targetDuration * 0.9) break;
  }

  // Sort chronologically for natural flow
  return selected.sort((a, b) => a.start - b.start);
}
