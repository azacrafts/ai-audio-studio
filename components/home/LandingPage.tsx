"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/shared/Navbar";

// ── Shared gradient string ────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg, #FFC857 0%, #FF6A3D 50%, #FF2E63 100%)";

// ─────────────────────────────────────────────────────────────────────────────
// 1. HERO
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS = [
  "Travel Vlog",
  "TikTok Hook",
  "Cinematic",
  "Dynamic",
  "Podcast Intro",
  "Chill Morning",
];
const DURATIONS = ["15s", "30s", "60s"];
const DURATION_VALUES: Record<string, string> = { "15s": "15", "30s": "30", "60s": "60" };

function Hero() {
  const router = useRouter();
  const [selectedPreset,   setSelectedPreset]   = useState(1);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [prompt,           setPrompt]           = useState("");

  const generate = () => {
    const params = new URLSearchParams();
    const p = prompt.trim() || PRESETS[selectedPreset];
    // Convert preset name → kebab-case ID (matches constants/presets.ts ids)
    const presetId = PRESETS[selectedPreset].toLowerCase().replace(/\s+/g, "-");
    params.set("prompt",   p);
    params.set("preset",   presetId);
    params.set("duration", DURATION_VALUES[DURATIONS[selectedDuration]]);
    router.push(`/generate?${params.toString()}`);
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Mesh gradient background — exact replica */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 15% -5%, rgba(255,200,87,0.75) 0%, transparent 55%),
            radial-gradient(ellipse 70% 60% at 85%  5%, rgba(255,106,61,0.65) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 50% 25%, rgba(255,46,99,0.5)  0%, transparent 60%),
            linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 55%, #000000 100%)
          `,
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-3xl mx-auto">
        {/* Animated badge */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-white/70 text-xs"
          style={{ backdropFilter: "blur(8px)", fontFamily: "Inter, sans-serif" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFC857] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6A3D]" />
          </span>
          All AI audio models in one workspace
        </div>

        {/* Headline */}
        <h1
          className="text-white mb-4"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
            fontWeight: 500,
            lineHeight: 1.15,
          }}
        >
          All AI audio models in one workspace
        </h1>

        {/* Sub */}
        <p
          className="text-white/70 mb-10 max-w-md"
          style={{ fontFamily: "Inter, sans-serif", fontSize: "1rem" }}
        >
          Smart presets, built-in editor, and full ownership of every track
        </p>

        {/* Generator box */}
        <div className="w-full max-w-2xl mb-4 flex flex-col gap-3">
          {/* Input row with duration inside */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-full border border-white/15"
            style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="Add your preferences..."
              className="flex-1 bg-transparent text-white text-sm placeholder-white/40 outline-none min-w-0"
              style={{ fontFamily: "Inter, sans-serif" }}
            />
            <div className="flex items-center gap-1 shrink-0">
              {DURATIONS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(i)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedDuration === i ? "text-white" : "text-white/50 hover:text-white/70"
                  }`}
                  style={{
                    fontFamily: "Inter, sans-serif",
                    background: selectedDuration === i ? GRAD : "transparent",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Preset chips */}
          <div className="flex gap-2 flex-wrap justify-center">
            {PRESETS.map((preset, i) => (
              <button
                key={preset}
                onClick={() => { setSelectedPreset(i); setPrompt(preset); }}
                className={`px-4 py-1.5 rounded-full text-sm transition-all border ${
                  selectedPreset === i
                    ? "text-white border-white/40 bg-white/10"
                    : "text-white/60 border-white/15 bg-white/5 hover:text-white/80 hover:border-white/25"
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            className="w-full py-3.5 rounded-full text-white text-sm font-medium tracking-widest uppercase transition-opacity hover:opacity-90 active:opacity-80"
            style={{ fontFamily: "Inter, sans-serif", background: GRAD }}
          >
            GENERATE
          </button>
        </div>

        {/* Trust line */}
        <p className="text-white/40 text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
          No signup required · Takes 5 seconds · Yours forever
        </p>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #000)" }}
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CREATORS STRIP (marquee — platform logos)
// ─────────────────────────────────────────────────────────────────────────────

function YouTubeLogo() {
  return (
    <svg height="44" width="62" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="#FF0000"
        d="M23.5 4.76c0-.27-.05-1.53-.42-2.2-.45-.8-1.07-1.2-2.26-1.38C17.2.86 12 1 12 1S6.8.86 3.18 1.18c-1.19.18-1.81.58-2.26 1.38C.55 3.23.5 4.5.5 4.76v8.48c0 .27.05 1.53.42 2.2.45.8 1.07 1.2 2.26 1.38C6.8 17.14 12 17 12 17s5.2.14 8.82-.18c1.19-.18 1.81-.58 2.26-1.38.37-.67.42-1.93.42-2.2V4.76z"
      />
      <path fill="#fff" d="M9.5 5.5v7l6.25-3.5L9.5 5.5z" />
    </svg>
  );
}

function TikTokLogo() {
  return (
    <svg height="44" width="44" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="#25F4EE"
        d="M19.589 6.686a4.793 4.793 0 01-3.77-4.245V2h-3.667v13.27a2.898 2.898 0 01-5.202 1.733 2.898 2.898 0 012.31-4.631 2.93 2.93 0 01.88.127V9.4a6.844 6.844 0 00-1-.005A6.33 6.33 0 004.946 19.1a6.33 6.33 0 0010.663 4.627v-7.011a8.155 8.155 0 004.77 1.524v-3.4a4.85 4.85 0 01-1.001-.154z"
        transform="translate(-0.4, -0.4)"
      />
      <path
        fill="#FE2C55"
        d="M19.589 6.686a4.793 4.793 0 01-3.77-4.245V2h-3.667v13.27a2.898 2.898 0 01-5.202 1.733 2.898 2.898 0 012.31-4.631 2.93 2.93 0 01.88.127V9.4a6.844 6.844 0 00-1-.005A6.33 6.33 0 004.946 19.1a6.33 6.33 0 0010.663 4.627v-7.011a8.155 8.155 0 004.77 1.524v-3.4a4.85 4.85 0 01-1.001-.154z"
        transform="translate(0.4, 0.4)"
      />
      <path
        fill="#ffffff"
        d="M19.589 6.686a4.793 4.793 0 01-3.77-4.245V2h-3.667v13.27a2.898 2.898 0 01-5.202 1.733 2.898 2.898 0 012.31-4.631 2.93 2.93 0 01.88.127V9.4a6.844 6.844 0 00-1-.005A6.33 6.33 0 004.946 19.1a6.33 6.33 0 0010.663 4.627v-7.011a8.155 8.155 0 004.77 1.524v-3.4a4.85 4.85 0 01-1.001-.154z"
      />
    </svg>
  );
}

function InstagramLogo() {
  const gradId = React.useId().replace(/:/g, "");
  return (
    <svg height="44" width="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f58529" />
          <stop offset="45%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285AEB" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
      />
    </svg>
  );
}

function TwitchLogo() {
  return (
    <svg height="44" width="44" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M2.149 0L.5 4.454v19.111h6.5V28h3.65l4.45-4.435h5.35L24 18.946V0H2.149zM21.85 17.78l-4.1 4.111h-6.55L6.75 26.337V21.89H2.3V2.224h19.55V17.78zm-4.1-10.113v8.89h-2.2V7.667h2.2zm-5.85 0v8.89H9.7V7.667h2.2z" fill="#9146FF" />
    </svg>
  );
}

function SpotifyLogo() {
  return (
    <svg height="44" width="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="#1ED760"
        d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
      />
    </svg>
  );
}

function DiscordLogo() {
  return (
    <svg height="44" width="48" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="#5865F2"
        d="M20.317 1.492A19.825 19.825 0 0015.985.116a.074.074 0 00-.079.037c-.187.333-.394.766-.54 1.108a18.296 18.296 0 00-5.487 0 11.275 11.275 0 00-.548-1.108.077.077 0 00-.079-.037A19.736 19.736 0 003.677 1.492a.07.07 0 00-.032.027C.533 6.093-.32 10.555.099 14.961a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.029.078.078 0 00.084-.026 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.029.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.442a.061.061 0 00-.031-.03zM8.02 12.278c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"
      />
    </svg>
  );
}

// Record label image logos (original colors — no CSS filters)
const LABEL_LOGOS = [
  { src: "/capitol-records.png", alt: "Capitol Records", h: 55 },
  { src: "/sony-music.png", alt: "Sony Music", h: 50 },
  { src: "/columbia-records.png", alt: "Columbia Records", h: 55 },
  { src: "/ovo.png", alt: "OVO", h: 50 },
  { src: "/universal-music.png", alt: "Universal Music", h: 48 },
  { src: "/spinnin-records.png", alt: "Spinnin' Records", h: 55 },
] as const;

// Platform SVG logos + record label image logos combined
const ALL_LOGOS: Array<
  | { kind: "svg"; component: () => React.ReactElement; alt: string }
  | { kind: "img"; src: string; alt: string; h: number }
> = [
  { kind: "svg", component: YouTubeLogo,   alt: "YouTube"          },
  { kind: "img", ...LABEL_LOGOS[0]                                  },
  { kind: "svg", component: TikTokLogo,    alt: "TikTok"           },
  { kind: "img", ...LABEL_LOGOS[1]                                  },
  { kind: "svg", component: InstagramLogo, alt: "Instagram"        },
  { kind: "img", ...LABEL_LOGOS[2]                                  },
  { kind: "svg", component: TwitchLogo,    alt: "Twitch"           },
  { kind: "img", ...LABEL_LOGOS[3]                                  },
  { kind: "svg", component: SpotifyLogo,   alt: "Spotify"          },
  { kind: "img", ...LABEL_LOGOS[4]                                  },
  { kind: "svg", component: DiscordLogo,   alt: "Discord"          },
  { kind: "img", ...LABEL_LOGOS[5]                                  },
];

function CreatorsSection() {
  const repeated = [...ALL_LOGOS, ...ALL_LOGOS];
  return (
    <section
      className="relative py-20 overflow-hidden"
      style={{ background: "#000" }}
    >
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div className="max-w-5xl mx-auto px-8 text-center">
        <p
          className="text-white/40 text-sm mb-10 tracking-wide uppercase"
          style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.1em" }}
        >
          Built for every creator workflow
        </p>
        <div
          className="relative overflow-hidden"
          style={{
            maskImage: "linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
          }}
        >
          <div
            className="flex items-center gap-16"
            style={{ animation: "marquee 32s linear infinite", width: "max-content" }}
          >
            {repeated.map((logo, i) =>
              logo.kind === "svg" ? (
                <div
                  key={i}
                  className="shrink-0 opacity-90 hover:opacity-100 transition-opacity"
                  title={logo.alt}
                >
                  <logo.component />
                </div>
              ) : (
                <div
                  key={i}
                  className="shrink-0 opacity-90 hover:opacity-100 transition-opacity"
                  title={logo.alt}
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={300}
                    height={logo.h}
                    className="w-auto object-contain"
                    style={{ height: `${logo.h}px`, background: "transparent" }}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FEATURES SECTION
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    badge: "ALL-IN-ONE AI AUDIO WORKSPACE",
    title: "All-in-one AI audio workspace",
    desc:  "Generate music, sound effects, and audio using the best AI models - all inside one workflow, without switching between tools.",
    hasImage: true,
  },
  {
    badge: "OWNERSHIP",
    title: "Ownership",
    desc:  "Unlike traditional libraries, your tracks don't disappear when you cancel. Use them anywhere - YouTube, TikTok, podcasts - forever.",
    hasImage: true,
  },
  {
    badge: "SMART PRESETS",
    title: "Smart Presets",
    desc:  "Skip prompt engineering. Use presets for YouTube intros, TikTok hooks, podcasts, and more - optimized for real creator workflows.",
    hasImage: true,
  },
  {
    badge: "BUILT-IN SOUND EDITOR",
    title: "Built-in Sound Editor",
    desc:  "Trim tracks, add fade in and fade out, and layer extra sound effects - all directly in the browser, without switching to another editor.",
    hasImage: false,
  },
  {
    badge: "5 FREE SONGS DAILY",
    title: "5 free songs daily",
    desc:  "Get 5 free generations every day to test ideas, explore presets, and hear the quality before paying for a subscription.",
    hasImage: false,
  },
  {
    badge: "FLEXIBLE PAYMENTS",
    title: "Flexible Payments",
    desc:  "Not ready for a subscription? Use tokens to generate audio on demand. Perfect for occasional creators - and upgrade when you're ready.",
    hasImage: false,
  },
];

/** Placeholder for Figma feature images */
function FeaturePlaceholder({ index }: { index: number }) {
  const palettes = [
    ["#FFC857", "#FF6A3D"],
    ["#FF6A3D", "#FF2E63"],
    ["#FFC857", "#FF2E63"],
  ];
  const [a, b] = palettes[index % palettes.length];
  return (
    <div
      className="rounded-xl overflow-hidden flex items-center justify-center"
      style={{
        height: "120px",
        background: `linear-gradient(135deg, ${a}18, ${b}25)`,
        border: `1px solid ${a}20`,
      }}
    >
      {/* Mini waveform decoration */}
      <div className="flex items-center gap-[3px]">
        {[4, 8, 12, 7, 16, 10, 6, 14, 9, 5, 13, 8].map((h, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{ height: `${h}px`, background: `linear-gradient(180deg, ${a}, ${b})`, opacity: 0.6 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI MODELS SECTION
// ─────────────────────────────────────────────────────────────────────────────

const AI_MODELS = [
  { src: "/ai-model-1.png", alt: "Suno",           label: "Suno"           },
  { src: "/ai-model-2.png", alt: "ElevenLabs",     label: "ElevenLabs"     },
  { src: "/ai-model-3.png", alt: "Epidemic Sound", label: "Epidemic Sound" },
] as const;

function AIModelsSection() {
  return (
    <section className="py-16 px-8" style={{ background: "#000" }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2
          className="text-white mb-3"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
            fontWeight: 500,
          }}
        >
          We combined Top Audio AI models
        </h2>
        <p
          className="text-white/45 text-sm mb-12"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Access the best music, voice, and sound generation models — all in one workflow
        </p>

        <div className="flex items-center justify-center gap-10 flex-wrap">
          {AI_MODELS.map((m) => (
            <div key={m.alt} className="flex flex-col items-center gap-3">
              <div
                className="rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  width: "72px",
                  height: "72px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                <img
                  src={m.src}
                  alt={m.alt}
                  style={{
                    width: "72px",
                    height: "72px",
                    objectFit: "cover",
                    borderRadius: "16px",
                    opacity: 0.92,
                    transition: "opacity 150ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.92")}
                />
              </div>
              <span
                className="text-white/40 text-xs"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 px-8" style={{ background: "#000" }}>
      <div className="max-w-5xl mx-auto">
        <p
          className="text-white/40 text-xs uppercase tracking-widest mb-3 text-center"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Everything you need
        </p>
        <h2
          className="text-white text-center mb-16"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(1.6rem, 3vw, 2.5rem)",
            fontWeight: 500,
          }}
        >
          Everything you need to create audio — in one place
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 flex flex-col gap-3 border border-white/5 hover:border-white/10 transition-all"
              style={{ background: "#111113" }}
            >
              <span
                className="inline-block px-2 py-0.5 rounded text-[10px] font-medium text-white/80 w-fit"
                style={{
                  fontFamily: "Inter, sans-serif",
                  background: "linear-gradient(135deg, rgba(255,200,87,0.15), rgba(255,46,99,0.15))",
                  border: "1px solid rgba(255,106,61,0.2)",
                }}
              >
                {f.badge}
              </span>

              {f.hasImage && <FeaturePlaceholder index={i} />}

              <div>
                <h3
                  className="text-white text-sm font-medium mb-1.5"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-white/50 text-xs leading-relaxed"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROBLEM / SOLUTION
// ─────────────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  "Multiple tools for music, SFX, and editing",
  "3–4 subscriptions to manage",
  "Constant switching between platforms",
  "Broken workflow",
  "You don't own your audio",
];

const SOLUTIONS = [
  "All AI audio tools in one place",
  "1 subscription",
  "Seamless workflow from idea to export",
  "Built-in editor",
  "You own every track forever",
];

/** Problem section — single static image */
function ScreenshotStack() {
  return (
    <div className="mb-6">
      <img
        src="/ф1.png"
        alt="Problem — fragmented tools"
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto",
          display: "block",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}

/** Solution section — single static image */
function SolutionVisual() {
  return (
    <div className="mb-6">
      <img
        src="/ф.png"
        alt="Solution — Acoustic workspace"
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto",
          display: "block",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}

function ProblemSolution() {
  return (
    <section className="py-24 px-8" style={{ background: "#000" }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Problem */}
          <div
            className="rounded-2xl p-6 border border-white/5"
            style={{ background: "#0e0e10" }}
          >
            <h3
              className="text-white mb-5"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 500 }}
            >
              Problem
            </h3>
            <ScreenshotStack />
            <ul className="space-y-2">
              {PROBLEMS.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-white/60 text-sm"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <span className="mt-0.5 text-red-400/70">✗</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div
            className="rounded-2xl p-6 border relative overflow-hidden"
            style={{ background: "#0e0e10", borderColor: "rgba(255,106,61,0.2)" }}
          >
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(255,106,61,0.12) 0%, transparent 70%)",
                transform: "translate(30%, -30%)",
              }}
            />
            <h3
              className="text-white mb-5 relative"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 500 }}
            >
              Solution
            </h3>
            <SolutionVisual />
            <ul className="space-y-2">
              {SOLUTIONS.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-white/80 text-sm"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <span
                    className="mt-0.5"
                    style={{
                      background: "linear-gradient(135deg, #FFC857, #FF6A3D)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    ✓
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. QUALITY / AUDIO SHOWCASE
// ─────────────────────────────────────────────────────────────────────────────

const TRACKS = [
  { title: "Chill Morning", genre: "Lo-fi Hip Hop",    src: "/audio/track1.mp3" },
  { title: "Epic Trailer",  genre: "Orchestral",       src: "/audio/track2.mp3" },
  { title: "TikTok Hook",   genre: "Pop / Electronic", src: "/audio/track3.mp3" },
];

const WAVE_H = [3, 7, 12, 9, 17, 11, 19, 7, 15, 5, 13, 9, 17, 11, 7, 15, 9, 19, 5, 13];

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "–:––";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function WaveformBars({ playing }: { playing: boolean }) {
  return (
    <>
      {playing && (
        <style>{`
          @keyframes waveBar {
            0%,100% { transform: scaleY(0.4); }
            50%      { transform: scaleY(1);   }
          }
        `}</style>
      )}
      <div className="flex items-end gap-[2px]" style={{ height: "32px" }}>
        {WAVE_H.map((h, i) => (
          <div
            key={i}
            className="w-[2px] rounded-full"
            style={{
              height:           `${h}px`,
              transformOrigin:  "bottom",
              background:       playing
                ? "linear-gradient(180deg, #FFC857, #FF6A3D)"
                : "rgba(255,255,255,0.2)",
              animation:        playing
                ? `waveBar ${0.6 + (i % 5) * 0.12}s ease-in-out infinite`
                : undefined,
              animationDelay:   playing ? `${i * 35}ms` : undefined,
            }}
          />
        ))}
      </div>
    </>
  );
}

function QualitySection() {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [durations,  setDurations]  = useState<Record<number, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (idx: number) => {
    if (typeof window === "undefined") return;
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    if (playingIdx === idx) {
      audio.pause();
      setPlayingIdx(null);
      return;
    }

    // Stop current → load new
    audio.pause();
    audio.src = TRACKS[idx].src;
    audio.load();
    audio.play().catch(() => {});
    setPlayingIdx(idx);

    audio.onloadedmetadata = () =>
      setDurations((prev) => ({ ...prev, [idx]: audio.duration }));
    audio.onended = () => setPlayingIdx(null);
  };

  // Cleanup on unmount
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  return (
    <section className="py-24 px-8 overflow-hidden" style={{ background: "#000" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-white mb-4"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 500 }}
          >
            Mindblowing{" "}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: GRAD }}>
              audio
            </span>{" "}
            quality
          </h2>
          <p
            className="text-white/50 text-sm max-w-md mx-auto"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Music, sound effects, and tracks you can drop directly into your content
          </p>
        </div>

        <div className="space-y-3">
          {TRACKS.map((track, i) => {
            const isPlaying = playingIdx === i;
            return (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none"
                style={{
                  background:   isPlaying ? "#141416" : "#0e0e10",
                  borderColor:  isPlaying ? "rgba(255,106,61,0.35)" : "rgba(255,255,255,0.05)",
                  fontFamily:   "Inter, sans-serif",
                }}
                onClick={() => togglePlay(i)}
              >
                {/* Play / Pause button */}
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-90"
                  style={{ background: GRAD }}
                  onClick={(e) => { e.stopPropagation(); togglePlay(i); }}
                >
                  {isPlaying ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1"   y="0" width="3.5" height="12" fill="white" rx="1" />
                      <rect x="7.5" y="0" width="3.5" height="12" fill="white" rx="1" />
                    </svg>
                  ) : (
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                      <path d="M1 1l10 6-10 6V1z" fill="white" />
                    </svg>
                  )}
                </button>

                {/* Title + genre */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{track.title}</p>
                  <p className="text-white/40 text-xs">{track.genre}</p>
                </div>

                {/* Animated waveform */}
                <WaveformBars playing={isPlaying} />

                {/* Duration */}
                <span className="text-white/30 text-xs shrink-0 w-10 text-right">
                  {formatTime(durations[i] ?? NaN)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link href="/generate">
            <button
              className="px-8 py-3.5 rounded-full text-white font-medium transition-opacity hover:opacity-90"
              style={{ fontFamily: "Inter, sans-serif", background: GRAD }}
            >
              Try for free
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PRICING SECTION
// ─────────────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name:      "Free",
    subtitle:  "No barriers. No card required.",
    highlight: false,
    badge:     null,
    monthly:   { price: "$0",  period: "",    note: null },
    yearly:    { price: "$0",  period: "",    note: null },
    features:  [
      "5 generations per day",
      "All presets available",
      "Watermark on export",
      "Personal use only",
    ],
    cta:  "Get started free",
    href: "/auth",
  },
  {
    name:      "Creator",
    subtitle:  "For creators who generate daily.",
    highlight: true,
    badge:     "MOST POPULAR",
    monthly:   { price: "$20", period: "/mo", note: null },
    yearly:    { price: "$16", period: "/mo", note: "Billed $192/year · Save $48/yr" },
    features:  [
      "Unlimited generations",
      "4 AI models (Suno, Udio, ElevenLabs, Stable)",
      "Built-in editor",
      "Commercial license forever",
      "All presets + custom presets",
      "Priority queue",
    ],
    cta:  "Select Creator",
    href: "/pricing",
  },
  {
    name:      "Pro",
    subtitle:  "Everything in Creator — scaled for teams.",
    highlight: false,
    badge:     null,
    monthly:   { price: "$49", period: "/mo", note: null },
    yearly:    { price: "$39", period: "/mo", note: "Billed $468/year · Save $120/yr" },
    features:  [
      "Everything in Creator × 3 seats",
      "Team workspace",
      "White-label export",
      "API access",
      "Priority support",
    ],
    cta:  "Select Pro",
    href: "/pricing",
  },
  {
    name:      "Tokens (à la carte)",
    subtitle:  "No limits — buy as much as you want.",
    highlight: false,
    badge:     null,
    monthly:   { price: "Pay as you go", period: "", note: null },
    yearly:    { price: "Pay as you go", period: "", note: null },
    features:  [
      "50 generations — $5",
      "150 generations — $12",
      "500 generations — $35",
      "Tokens never expire",
      "No watermark",
      "Commercial license",
    ],
    cta:  "Buy tokens",
    href: "/pricing",
  },
];

function BillingToggle({ billing, setBilling }: { billing: string; setBilling: (v: string) => void }) {
  const yearly = billing === "yearly";
  return (
    <div
      className="flex items-center justify-center gap-3 mb-10"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <span
        className="text-sm cursor-pointer transition-colors select-none"
        style={{ color: yearly ? "rgba(255,255,255,0.4)" : "white" }}
        onClick={() => setBilling("monthly")}
      >
        Monthly
      </span>

      {/* Pill toggle */}
      <button
        role="switch"
        aria-checked={yearly}
        onClick={() => setBilling(yearly ? "monthly" : "yearly")}
        className="relative shrink-0"
        style={{
          width:        "44px",
          height:       "24px",
          borderRadius: "12px",
          border:       "none",
          cursor:       "pointer",
          background:   yearly
            ? "linear-gradient(135deg, #FFC857, #FF6A3D)"
            : "rgba(255,255,255,0.12)",
          transition:   "background 200ms ease",
          padding:      0,
        }}
      >
        <span
          style={{
            position:     "absolute",
            top:          "3px",
            left:         yearly ? "23px" : "3px",
            width:        "18px",
            height:       "18px",
            borderRadius: "50%",
            background:   "white",
            transition:   "left 200ms ease",
            boxShadow:    "0 1px 4px rgba(0,0,0,0.3)",
          }}
        />
      </button>

      <span
        className="text-sm cursor-pointer transition-colors select-none flex items-center gap-2"
        style={{ color: yearly ? "white" : "rgba(255,255,255,0.4)" }}
        onClick={() => setBilling("yearly")}
      >
        Yearly
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(255,200,87,0.15)",
            color:      "#FFC857",
            border:     "1px solid rgba(255,200,87,0.25)",
          }}
        >
          2 months free
        </span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTIMONIALS — Vertical CSS Carousel
// ─────────────────────────────────────────────────────────────────────────────

interface Testimonial {
  text: string;
  name: string;
  role: string;
}

const TESTIMONIALS: readonly Testimonial[] = [
  {
    text: "I used to jump between Suno, ElevenLabs, and random tools. Now everything is in one place. It honestly feels like a real workflow, not a hack.",
    name: "Arman K.",
    role: "Indie Music Creator",
  },
  {
    text: "We generate audio for ads daily. This saves us hours — from idea to ready-to-use sound in minutes.",
    name: "Diana Volkova",
    role: "Performance Marketer",
  },
  {
    text: "Finally something that makes AI audio usable for real projects. Clean, fast, and actually consistent.",
    name: "Michael Chen",
    role: "Product Manager",
  },
  {
    text: "I create TikToks and Reels every day — the presets + quick generation are insane. This is a must-have tool.",
    name: "Aliya S.",
    role: "Content Creator",
  },
  {
    text: "As a developer, I love how everything is structured. APIs, generation, editing — all in one system.",
    name: "Sergey T.",
    role: "Software Engineer",
  },
  {
    text: "We replaced 3 tools with this. Music, voice, effects — everything works together.",
    name: "Daniel R.",
    role: "Startup Founder",
  },
  {
    text: "The ability to generate and edit audio in one place is a game changer for our production team.",
    name: "Elena V.",
    role: "Video Producer",
  },
  {
    text: "Simple enough for beginners, powerful enough for professionals. That's rare.",
    name: "Nurdaulet B.",
    role: "Angel Investor",
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <div
      className="rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors flex flex-col gap-4 shrink-0"
      style={{ background: "#111113" }}
    >
      {/* Gradient quote mark */}
      <span
        className="text-2xl leading-none font-serif select-none"
        style={{
          backgroundImage: GRAD,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        &ldquo;
      </span>

      <p
        className="text-white/65 text-sm leading-relaxed -mt-1"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {item.text}
      </p>

      {/* Author row */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: GRAD }}
        >
          {getInitials(item.name)}
        </div>
        <div>
          <p
            className="text-white text-sm font-medium leading-snug"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {item.name}
          </p>
          <p
            className="text-white/40 text-xs"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {item.role}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Single vertical column — scrolls bottom→top with CSS animation.
 * Items are duplicated (×2) so translateY(-50%) loops seamlessly.
 */
function TestimonialsColumn({
  items,
  durationSeconds,
  columnId,
}: {
  items: readonly Testimonial[];
  durationSeconds: number;
  columnId: string;
}) {
  const looped = [...items, ...items];

  return (
    <div
      className="testimonials-col relative h-full overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
      }}
    >
      <div
        className="testimonials-track flex flex-col gap-5"
        style={{
          animationName: "testimonialsUp",
          animationDuration: `${durationSeconds}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      >
        {looped.map((item, i) => (
          <TestimonialCard key={`${columnId}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function TestimonialsSection() {
  // Rotate starting positions so columns feel desynchronised
  const col1 = TESTIMONIALS;
  const col2 = [...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3)];
  const col3 = [...TESTIMONIALS.slice(5), ...TESTIMONIALS.slice(0, 5)];

  return (
    <section className="py-24 px-6 sm:px-8 overflow-hidden" style={{ background: "#000" }}>
      {/* Keyframes + hover pause */}
      <style>{`
        @keyframes testimonialsUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .testimonials-col:hover .testimonials-track {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        {/* Section header — matches existing heading pattern */}
        <div className="text-center mb-14">
          <p
            className="text-white/40 text-xs uppercase tracking-widest mb-3"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Testimonials
          </p>
          <h2
            className="text-white mb-3"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(1.6rem, 3vw, 2.5rem)",
              fontWeight: 500,
            }}
          >
            What our{" "}
            <span
              style={{
                backgroundImage: GRAD,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              users
            </span>{" "}
            say
          </h2>
          <p
            className="text-white/50 text-sm max-w-sm mx-auto"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            See how creators, marketers, and teams use Acoustic.
          </p>
        </div>

        {/* Carousel grid — 1 col mobile / 2 col tablet / 3 col desktop */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          style={{ height: "560px" }}
        >
          {/* Column 1 — always visible */}
          <TestimonialsColumn items={col1} durationSeconds={30} columnId="tc1" />

          {/* Column 2 — visible on sm+ */}
          <div className="hidden sm:block h-full">
            <TestimonialsColumn items={col2} durationSeconds={38} columnId="tc2" />
          </div>

          {/* Column 3 — visible on lg+ */}
          <div className="hidden lg:block h-full">
            <TestimonialsColumn items={col3} durationSeconds={24} columnId="tc3" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────────────────────────────────────
function PricingSection() {
  const [billing, setBilling] = useState<string>("monthly");

  return (
    <section className="py-24 px-8" style={{ background: "#000" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h2
            className="text-white mb-4"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 500 }}
          >
            Start creating amazing audio
          </h2>
          <p className="text-white/50 text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
            Add AI audio tools to your creator toolkit
          </p>
        </div>

        <BillingToggle billing={billing} setBilling={setBilling} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan, i) => {
            const pricing = billing === "yearly" ? plan.yearly : plan.monthly;
            return (
              <div
                key={i}
                className={`rounded-2xl p-5 flex flex-col border transition-all relative overflow-hidden ${
                  plan.highlight ? "border-transparent" : "border-white/5 hover:border-white/10"
                }`}
                style={{
                  background: plan.highlight ? "#131315" : "#0e0e10",
                  ...(plan.highlight
                    ? { boxShadow: "0 0 0 1px rgba(255,106,61,0.4), 0 8px 32px rgba(255,106,61,0.1)" }
                    : {}),
                }}
              >
                {plan.highlight && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: GRAD }}
                  />
                )}

                {/* Name + badge row */}
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="text-white/50 text-xs uppercase tracking-wider"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {plan.name}
                  </span>
                  {plan.badge && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,200,87,0.2), rgba(255,46,99,0.2))",
                        color:      "#FFC857",
                        border:     "1px solid rgba(255,200,87,0.25)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Subtitle */}
                <p
                  className="text-white/30 text-[11px] mb-3 leading-snug"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {plan.subtitle}
                </p>

                {/* Price */}
                <div className="mb-1 flex items-baseline gap-1">
                  <span
                    className="font-medium"
                    style={{
                      fontFamily:          "Inter, sans-serif",
                      fontSize:            pricing.price.length > 4 ? "0.9rem" : "1.8rem",
                      background:          plan.highlight ? GRAD : undefined,
                      WebkitBackgroundClip: plan.highlight ? "text" : undefined,
                      WebkitTextFillColor: plan.highlight ? "transparent" : undefined,
                      color:               plan.highlight ? undefined : "white",
                      transition:          "all 150ms",
                    }}
                  >
                    {pricing.price}
                  </span>
                  {pricing.period && (
                    <span
                      className="text-white/40 text-xs"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {pricing.period}
                    </span>
                  )}
                </div>

                {/* Yearly savings note */}
                <div className="mb-4" style={{ minHeight: "16px" }}>
                  {pricing.note && (
                    <p
                      className="text-[10px]"
                      style={{ fontFamily: "Inter, sans-serif", color: "#FFC857", opacity: 0.8 }}
                    >
                      {pricing.note}
                    </p>
                  )}
                </div>

                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.map((f, j) => (
                    <li
                      key={j}
                      className="text-white/50 text-xs flex items-start gap-1.5"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      <span className="text-white/30 mt-0.5">·</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}>
                  <button
                    className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      background: plan.highlight ? GRAD : "rgba(255,255,255,0.08)",
                    }}
                  >
                    {plan.cta}
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      className="py-16 px-8 border-t border-white/5"
      style={{ background: "#000", fontFamily: "Inter, sans-serif" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <span className="text-white font-medium text-lg tracking-tight">
              Acoustic
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: GRAD }}
              >
                .
              </span>
            </span>
            <p className="text-white/30 text-xs mt-3 leading-relaxed">
              All AI audio models in one workspace.
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">Product</p>
            <ul className="space-y-2">
              {[
                { label: "Features", href: "#" },
                { label: "Pricing",  href: "/pricing" },
                { label: "Studio",   href: "/generate" },
                { label: "Editor",   href: "/editor" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-white/30 text-xs hover:text-white/60 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">Support</p>
            <ul className="space-y-2">
              {["Help Center", "Discord", "Contact", "Status"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-white/30 text-xs hover:text-white/60 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">Legal</p>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-white/30 text-xs hover:text-white/60 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} Acoustic. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <Link href="/auth">
              <button
                className="px-5 py-2 rounded-full text-white text-xs font-medium hover:opacity-90 transition-opacity"
                style={{ background: GRAD }}
              >
                Start for free
              </button>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

interface UserData {
  user:       { id: string };
  plan:       string;
  username?:  string;
  dailyUsed:  number;
  dailyLimit: number;
}

export function LandingPage({ userData }: { userData: UserData | null }) {
  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <Navbar />
      <Hero />
      <CreatorsSection />
      <AIModelsSection />
      <FeaturesSection />
      <ProblemSolution />
      <QualitySection />
      <TestimonialsSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
