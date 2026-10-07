"use client";

import { PRESETS } from "@/constants/presets";
import { PresetCard } from "./PresetCard";

export function PresetGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {PRESETS.map((preset) => (
        <PresetCard key={preset.id} preset={preset} />
      ))}
    </div>
  );
}
