"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Upload } from "lucide-react";

export function HeroInput() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  const handleGenerate = () => {
    const params = new URLSearchParams();
    if (prompt) params.set("prompt", prompt);
    params.set("preset", "travel-vlog");
    router.push(`/generate?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Create audio for your video... (e.g. 'epic cinematic music for travel vlog')"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          className="w-full bg-[#1a1a20] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff7849]/40 transition-colors resize-none pr-36 leading-relaxed"
        />

        {/* Action buttons inside textarea */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            title="Upload video"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleGenerate}
            className="btn-primary flex items-center gap-1.5 px-4 h-8 rounded-xl text-xs font-semibold"
          >
            <Sparkles className="w-3 h-3" />
            Generate
          </button>
        </div>
      </div>

      <p className="text-xs text-white/25 text-center">
        Press Enter to generate · Shift+Enter for new line
      </p>
    </div>
  );
}
