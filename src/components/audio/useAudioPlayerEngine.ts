"use client";

import { useCallback, useState } from "react";
import type { BeatView } from "@/lib/types/beat";

export interface AudioPlayerState {
  current: BeatView | null;
  cycle: number;
  orderHash: string;
  secondsRemaining: number;
  isLoading: boolean;
  error: string | null;
  advanceTrack: () => void;
}

export function useAudioPlayerEngine(): AudioPlayerState {
  const [current] = useState<BeatView | null>(null);
  const [cycle] = useState<number>(1);
  const [orderHash] = useState<string>("seed_default");
  const [secondsRemaining] = useState<number>(60);
  const [isLoading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const advanceTrack = useCallback(() => {
    // Stub implementation until full audio engine is connected
  }, []);

  return {
    current,
    cycle,
    orderHash,
    secondsRemaining,
    isLoading,
    error,
    advanceTrack,
  };
}
