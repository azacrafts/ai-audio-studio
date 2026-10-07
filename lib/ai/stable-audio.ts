export interface StableAudioParams {
  prompt: string;
  duration: number;
  negativePrompt?: string;
}

export interface StableAudioResult {
  audioUrl: string;
  jobId: string;
}

export async function generateWithStableAudio(
  params: StableAudioParams
): Promise<StableAudioResult> {
  const apiKey = process.env.STABILITY_API_KEY;

  if (!apiKey || apiKey === "your_stability_api_key_here") {
    return getMockAudio();
  }

  const res = await fetch(
    "https://api.stability.ai/v2beta/audio/stable-audio/generate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        prompt: params.prompt,
        duration: params.duration,
        negative_prompt: params.negativePrompt ?? "distorted, noisy",
        output_format: "mp3",
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Stable Audio API error: ${res.status} ${res.statusText}`
    );
  }

  const audioBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(audioBuffer).toString("base64");
  const dataUrl = `data:audio/mpeg;base64,${base64}`;

  return { audioUrl: dataUrl, jobId: `sa-${Date.now()}` };
}

function getMockAudio(): StableAudioResult {
  const samples = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  ];
  const randomSample = samples[Math.floor(Math.random() * samples.length)];
  return {
    audioUrl: randomSample,
    jobId: `mock-sa-${Date.now()}`,
  };
}
