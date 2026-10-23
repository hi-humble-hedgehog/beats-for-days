"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useAudioPlayerEngine,
  type AudioPlayerState,
} from "./useAudioPlayerEngine";

export type AudioPlayerContextValue = AudioPlayerState;

export const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(
  null,
);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayerEngine();

  return (
    <AudioPlayerContext.Provider value={player}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error(
      "useAudioPlayer must be used within an AudioPlayerProvider",
    );
  }
  return context;
}
