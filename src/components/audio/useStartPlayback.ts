"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { beatsApi } from "@/lib/api";
import { resolveStartBeat } from "@/lib/player/decisions";
import { useAudioPlayer } from "./AudioPlayerContext";

/**
 * Shared callback used by Home, 404, and the persistent player bar to start playback
 * via `resolveStartBeat` and navigate to the target beat deck.
 */
export function useStartPlayback(): () => void {
  const router = useRouter();
  const s = useAudioPlayer();
  return useCallback(() => {
    void resolveStartBeat({
      current: s.current,
      hasPausedBeat: s.hasPausedBeat,
      playedHistory: s.playedHistory ?? [],
      fetchNextBeat: (req) => beatsApi.getNextBeat(req),
      commitBeat: s.commitBeat,
      startPlay: () => (s.play ? s.play() : !s.isPlaying && s.togglePlay()),
      navigate: (url) => router.push(url),
    });
  }, [router, s]);
}
