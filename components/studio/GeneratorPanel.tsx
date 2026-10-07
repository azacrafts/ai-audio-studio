"use client";

import { useState } from "react";
import { Music2, Zap, Mic, RefreshCw, FileText, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { MusicMode }     from "./modes/MusicMode";
import { SFXMode }       from "./modes/SFXMode";
import { TTSMode }       from "./modes/TTSMode";
import { S2SMode }       from "./modes/S2SMode";
import { STTMode }       from "./modes/STTMode";
import { IsolationMode } from "./modes/IsolationMode";
import type { StudioMode, StudioRequest } from "@/types";

// ── Provider / Mode config ────────────────────────────────────────────────────

type ProviderId = "suno" | "elevenlabs";

interface ModeConfig {
  id:          StudioMode;
  label:       string;
  description: string;
  icon:        React.ElementType;
}

interface ProviderConfig {
  id:     ProviderId;
  name:   string;
  color:  string;
  modes:  ModeConfig[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    id:    "suno",
    name:  "Suno",
    color: "#ff7849",
    modes: [
      { id: "music", label: "Music",     description: "AI music generation",   icon: Music2 },
    ],
  },
  {
    id:    "elevenlabs",
    name:  "ElevenLabs",
    color: "#9c5cf5",
    modes: [
      { id: "sfx",       label: "Sound FX",    description: "Sound effects & ambience",     icon: Zap      },
      { id: "tts",       label: "Text → Speech",description: "Convert text to natural voice", icon: Mic      },
      { id: "s2s",       label: "Voice Clone",  description: "Transform voice style/accent",  icon: RefreshCw },
      { id: "stt",       label: "Transcribe",   description: "Audio to text transcript",      icon: FileText  },
      { id: "isolation", label: "Isolate",      description: "Remove background, clean vocals",icon: Scissors  },
    ],
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface GeneratorPanelProps {
  defaultPresetId?:  string;
  defaultPrompt?:    string;
  defaultDuration?:  number;
  isLoading:         boolean;
  onGenerate:        (req: StudioRequest) => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GeneratorPanel({ defaultPresetId, defaultPrompt, defaultDuration, isLoading, onGenerate }: GeneratorPanelProps) {
  const [providerId, setProviderId] = useState<ProviderId>("suno");
  const [modeId, setModeId]         = useState<StudioMode>("music");

  const provider   = PROVIDERS.find((p) => p.id === providerId)!;
  const activeMode = provider.modes.find((m) => m.id === modeId) ?? provider.modes[0];

  const switchProvider = (pid: ProviderId) => {
    setProviderId(pid);
    const p = PROVIDERS.find((p) => p.id === pid)!;
    setModeId(p.modes[0].id);
  };

  const handleModeSubmit = async (partial: Partial<StudioRequest>) => {
    await onGenerate({
      provider:     providerId,
      mode:         modeId,
      displayTitle: partial.displayTitle ?? "Generated",
      ...partial,
    } as StudioRequest);
  };

  // ── Render active mode form ────────────────────────────────────────────────
  const modeProps = { isLoading, onSubmit: handleModeSubmit };

  function renderMode() {
    switch (modeId) {
      case "music":     return <MusicMode {...modeProps} provider={providerId === "suno" ? "suno" : "stable-audio"} defaultPresetId={defaultPresetId} defaultPrompt={defaultPrompt} defaultDuration={defaultDuration} />;
      case "sfx":       return <SFXMode  {...modeProps} />;
      case "tts":       return <TTSMode  {...modeProps} />;
      case "s2s":       return <S2SMode  {...modeProps} />;
      case "stt":       return <STTMode  {...modeProps} />;
      case "isolation": return <IsolationMode {...modeProps} />;
      default:          return null;
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Provider selector ────────────────────────────────────────── */}
      <div className="flex gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/8">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => switchProvider(p.id)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
              providerId === p.id
                ? "text-white shadow-sm"
                : "text-white/30 hover:text-white/60"
            )}
            style={providerId === p.id
              ? { background: `${p.color}22`, border: `1px solid ${p.color}44`, color: p.color }
              : {}
            }
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* ── Mode selector (ElevenLabs has multiple modes) ──────────── */}
      {provider.modes.length > 1 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-0.5">Mode</p>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
            {provider.modes.map((m) => {
              const Icon = m.icon;
              const isActive = modeId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModeId(m.id)}
                  className={cn(
                    "flex flex-col gap-1 px-3 py-2.5 rounded-xl border text-left transition-all",
                    isActive
                      ? "border-[#9c5cf5]/50 bg-[#9c5cf5]/10"
                      : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#b27af5]" : "text-white/25")} />
                  <span className={cn("text-[11px] font-bold leading-none", isActive ? "text-white" : "text-white/40")}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* ── Active mode form ──────────────────────────────────────────── */}
      <div key={`${providerId}-${modeId}`}>
        {renderMode()}
      </div>
    </div>
  );
}
