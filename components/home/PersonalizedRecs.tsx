"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRESETS } from "@/constants/presets";
import type { Preset } from "@/types";

// Map genres → relevant preset IDs
const GENRE_PRESET_MAP: Record<string, string[]> = {
  "Electronic": ["tiktok-hook", "dynamic"],
  "EDM": ["tiktok-hook", "dynamic"],
  "Techno": ["tiktok-hook", "gaming-montage"],
  "House": ["tiktok-hook", "dynamic"],
  "Trap": ["gaming-montage", "tiktok-hook"],
  "Hip Hop": ["tiktok-hook", "gaming-montage"],
  "Classical": ["cinematic", "podcast-background"],
  "Jazz": ["podcast-background", "cinematic"],
  "Lo-Fi Beats": ["podcast-background", "travel-vlog"],
  "Pop": ["tiktok-hook", "travel-vlog"],
  "Indie": ["travel-vlog", "cinematic"],
  "Synthwave": ["cinematic", "gaming-montage"],
};

const PERSONA_PRESET_MAP: Record<string, string[]> = {
  "content-creator": ["tiktok-hook", "travel-vlog", "dynamic"],
  "musician": ["cinematic", "dynamic", "gaming-montage"],
  "hobby": ["travel-vlog", "cinematic"],
  "poet": ["podcast-background", "cinematic"],
  "creative-pro": ["cinematic", "dynamic"],
};

export function PersonalizedRecs() {
  const router = useRouter();
  const [recs, setRecs] = useState<Preset[]>([]);
  const [label, setLabel] = useState("Recommended for you");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setRecs(PRESETS.slice(0, 3));
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("persona, genres")
        .eq("id", user.id)
        .single();

      if (!profile) { setRecs(PRESETS.slice(0, 3)); return; }

      const scored = new Map<string, number>();
      PRESETS.forEach((p) => scored.set(p.id, 0));

      // Score by genres
      const genres: string[] = profile.genres ?? [];
      genres.forEach((g) => {
        const ids = GENRE_PRESET_MAP[g] ?? [];
        ids.forEach((id) => scored.set(id, (scored.get(id) ?? 0) + 2));
      });

      // Score by persona
      const personaIds = PERSONA_PRESET_MAP[profile.persona] ?? [];
      personaIds.forEach((id) => scored.set(id, (scored.get(id) ?? 0) + 3));

      const sorted = PRESETS.slice().sort(
        (a, b) => (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0)
      );

      setRecs(sorted.slice(0, 3));
      if (genres.length > 0) {
        setLabel(`Based on your taste: ${genres.slice(0, 2).join(", ")}`);
      }
    });
  }, []);

  if (recs.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">{label}</p>
      <div className="grid grid-cols-3 gap-3">
        {recs.map((preset) => (
          <button
            key={preset.id}
            onClick={() => router.push(`/generate?preset=${preset.id}`)}
            className="relative rounded-xl overflow-hidden aspect-video bg-zinc-900 hover:ring-2 hover:ring-[#ff7849]/50 transition-all group"
          >
            <video
              src={preset.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <p className="absolute bottom-2 left-2 text-[11px] font-semibold text-white leading-tight">
              {preset.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
