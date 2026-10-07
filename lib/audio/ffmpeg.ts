/**
 * FFmpeg processing helpers.
 * In production, run FFmpeg in a serverless container (AWS Lambda Layer or
 * a dedicated processing worker). For MVP, processing is deferred to the
 * client or done via a stub that returns the source unchanged.
 */

export interface TrimOptions {
  start: number;
  end: number;
}

export interface ProcessOptions {
  musicUrl: string;
  sfxUrl?: string;
  trim?: TrimOptions;
  fadeIn?: number;
  fadeOut?: number;
  ducking?: boolean;
}

export async function processAudio(options: ProcessOptions): Promise<string> {
  // In production: spawn ffmpeg process or call a processing Lambda.
  // For MVP stub, return the music URL unchanged.
  console.log("[ffmpeg] Processing audio:", options);

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return options.musicUrl;
}

export function buildFfmpegArgs(options: ProcessOptions): string[] {
  const args: string[] = ["-i", options.musicUrl];

  if (options.sfxUrl) {
    args.push("-i", options.sfxUrl);
  }

  const filters: string[] = [];

  if (options.trim) {
    args.push("-ss", String(options.trim.start));
    args.push("-to", String(options.trim.end));
  }

  if (options.fadeIn) {
    filters.push(`afade=t=in:st=0:d=${options.fadeIn}`);
  }

  if (options.fadeOut && options.trim) {
    const duration = options.trim.end - options.trim.start;
    filters.push(`afade=t=out:st=${duration - options.fadeOut}:d=${options.fadeOut}`);
  }

  if (options.sfxUrl && options.ducking) {
    filters.push("sidechaincompress=threshold=0.1:ratio=6:attack=10:release=200");
  }

  if (filters.length > 0) {
    args.push("-af", filters.join(","));
  }

  args.push("-codec:a", "libmp3lame", "-q:a", "2", "output.mp3");

  return args;
}
