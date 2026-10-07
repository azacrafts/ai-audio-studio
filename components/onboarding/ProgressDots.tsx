"use client";

import { cn } from "@/lib/utils";

interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i === current
              ? "w-6 h-2 bg-[#ff7849]"
              : i < current
              ? "w-2 h-2 bg-white/30"
              : "w-2 h-2 bg-white/15"
          )}
        />
      ))}
    </div>
  );
}
