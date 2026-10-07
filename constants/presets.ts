import type { Preset } from "@/types";

export const PRESETS: Preset[] = [
  {
    id: "travel-vlog",
    name: "Travel Vlog",
    category: "Travel Vlog",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-tropical-beach-2263-large.mp4",
    audioPreviewUrl: "/audio/previews/travel-vlog.mp3",
    tags: ["upbeat", "adventure", "cinematic"],
    config: {
      model: "suno",
      duration: 60,
      defaultPrompt:
        "upbeat cinematic travel music, acoustic guitar, light percussion, adventurous feel",
      bpm: 110,
      mood: "adventurous",
    },
  },
  {
    id: "tiktok-hook",
    name: "TikTok Hook",
    category: "TikTok Hook",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-taking-a-selfie-in-the-city-4397-large.mp4",
    audioPreviewUrl: "/audio/previews/tiktok-hook.mp3",
    tags: ["viral", "punchy", "energetic"],
    config: {
      model: "suno",
      duration: 30,
      defaultPrompt:
        "viral TikTok beat, punchy bass drop, hyperpop energy, short hook, trending",
      bpm: 140,
      mood: "energetic",
    },
  },
  {
    id: "podcast-background",
    name: "Podcast Background",
    category: "Podcast Background",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-talking-on-a-microphone-in-a-studio-40169-large.mp4",
    audioPreviewUrl: "/audio/previews/podcast-bg.mp3",
    tags: ["ambient", "calm", "lofi"],
    config: {
      model: "stable-audio",
      duration: 120,
      defaultPrompt:
        "calm lofi background music, soft piano, ambient textures, no melody, podcast intro",
      bpm: 80,
      mood: "calm",
    },
  },
  {
    id: "gaming-montage",
    name: "Gaming Montage",
    category: "Gaming Montage",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-game-controller-5145-large.mp4",
    audioPreviewUrl: "/audio/previews/gaming-montage.mp3",
    tags: ["intense", "dubstep", "hype"],
    config: {
      model: "suno",
      duration: 60,
      defaultPrompt:
        "aggressive gaming montage music, dubstep drop, heavy synths, intense energy, esports hype",
      bpm: 150,
      mood: "intense",
    },
  },
  {
    id: "cinematic",
    name: "Cinematic",
    category: "Cinematic",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4",
    audioPreviewUrl: "/audio/previews/cinematic.mp3",
    tags: ["orchestral", "epic", "emotional"],
    config: {
      model: "stable-audio",
      duration: 90,
      defaultPrompt:
        "epic cinematic orchestral score, strings, brass, emotional build-up, Hollywood trailer style",
      bpm: 90,
      mood: "epic",
    },
  },
  {
    id: "dynamic",
    name: "Dynamic",
    category: "Dynamic",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-runner-on-a-track-4517-large.mp4",
    audioPreviewUrl: "/audio/previews/dynamic.mp3",
    tags: ["sport", "motivational", "upbeat"],
    config: {
      model: "suno",
      duration: 60,
      defaultPrompt:
        "motivational sport music, dynamic beat, energetic drums, modern electronic, fitness motivation",
      bpm: 128,
      mood: "motivational",
    },
  },
];

export const DAILY_LIMITS: Record<string, number> = {
  free:    5,
  creator: 99999,  // unlimited
  pro:     99999,  // unlimited
};
