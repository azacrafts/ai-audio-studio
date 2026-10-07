"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const GENRES = [
  "Pop", "Hip Hop", "EDM", "Lo-Fi", "Cinematic", "Rock", "Jazz",
  "Electronic", "Trap", "R&B", "Country", "Classical", "Synthwave",
  "Blues", "Latin", "Funk", "Afrobeats", "K-Pop", "Indie", "House",
  "Techno", "Drum & Bass", "Ambient", "Soul",
];

interface Step3Props {
  onContinue: (genres: string[]) => void;
}

export function Step3Genres({ onContinue }: Step3Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = (genre: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(genre) ? next.delete(genre) : next.add(genre);
      return next;
    });
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setSelected((prev) => new Set(prev).add(trimmed));
    setCustomInput("");
    setShowInput(false);
  };

  const handleCustomKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addCustom(); }
    if (e.key === "Escape") { setShowInput(false); setCustomInput(""); }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl text-white leading-tight">
          Select your genres
        </h1>
        <p className="text-sm text-white/35">
          Personalizes your preset recommendations
        </p>
      </div>

      {/* Chips grid */}
      <div className="flex flex-wrap gap-2 justify-center">
        {GENRES.map((genre) => {
          const isSelected = selected.has(genre);
          return (
            <motion.button
              key={genre}
              onClick={() => toggle(genre)}
              whileTap={{ scale: 0.94 }}
              layout
              className={cn(
                "relative px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200",
                isSelected
                  ? "border-[#FF6A3D]/60 bg-[#FF6A3D]/12 text-[#FFC857]"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white hover:bg-white/[0.07]"
              )}
              style={{
                boxShadow: isSelected
                  ? "0 0 0 1px rgba(255,120,73,0.3), 0 0 16px rgba(255,120,73,0.1)"
                  : "none",
              }}
            >
              {genre}
            </motion.button>
          );
        })}

        {/* Custom genre chips */}
        <AnimatePresence mode="popLayout">
          {Array.from(selected).filter((g) => !GENRES.includes(g)).map((custom) => (
            <motion.button
              key={custom}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              layout
              onClick={() => toggle(custom)}
              className="relative px-4 py-2 rounded-full border border-[#FF6A3D]/60 bg-[#FF6A3D]/12 text-[#FFC857] text-sm font-medium flex items-center gap-1.5"
            >
              {custom}
              <X className="w-3 h-3" />
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Add custom button / input */}
        <AnimatePresence mode="wait">
          {showInput ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.9, width: 80 }}
              animate={{ opacity: 1, scale: 1, width: 160 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#FF6A3D]/40 bg-[#FF6A3D]/8"
            >
              <input
                ref={inputRef}
                autoFocus
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={handleCustomKey}
                onBlur={() => { if (!customInput.trim()) setShowInput(false); }}
                placeholder="Type genre..."
                className="bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none w-full"
                style={{ width: 110 }}
              />
              <button onClick={addCustom} className="text-[#FF6A3D] hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowInput(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/35 text-sm font-medium hover:border-white/20 hover:text-white/60 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add genre
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Selected count */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-white/30"
          >
            {selected.size} genre{selected.size !== 1 ? "s" : ""} selected
          </motion.p>
        )}
      </AnimatePresence>

      {/* CTA */}
      <motion.button
        onClick={() => onContinue(Array.from(selected))}
        whileTap={{ scale: 0.98 }}
        className="btn-primary w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center"
      >
        {selected.size > 0 ? "Continue" : "Skip for now"}
      </motion.button>
    </div>
  );
}
