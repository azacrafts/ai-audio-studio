"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerTrack {
  id: string;
  audioUrl: string;
  title: string;
  model?: string;
  provider?: string;
  duration?: number | null;
  watermarked?: boolean;
}

interface AudioContextType {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  volume: number;

  /** Load a track and start playing it immediately */
  play: (track: PlayerTrack) => void;
  /** Pause the current track */
  pause: () => void;
  /** Resume the current track */
  resume: () => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Set volume 0–1 */
  setVolume: (v: number) => void;

  // Internal: StickyPlayer syncs these back when the <audio> element fires events
  _setIsPlaying: (v: boolean) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AudioCtx = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, _setIsPlaying]       = useState(false);
  const [volume, _setVolume]             = useState(0.8);

  const play = useCallback((track: PlayerTrack) => {
    setCurrentTrack(track);
    _setIsPlaying(true);
  }, []);

  const pause  = useCallback(() => _setIsPlaying(false), []);
  const resume = useCallback(() => _setIsPlaying(true), []);
  const toggle = useCallback(() => _setIsPlaying((p) => !p), []);

  const setVolume = useCallback((v: number) => {
    _setVolume(Math.max(0, Math.min(1, v)));
  }, []);

  return (
    <AudioCtx.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        play,
        pause,
        resume,
        toggle,
        setVolume,
        _setIsPlaying,
      }}
    >
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio(): AudioContextType {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used inside <AudioProvider>");
  return ctx;
}
