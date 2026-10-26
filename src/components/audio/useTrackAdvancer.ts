"use client";

import { useCallback } from "react";
import { beatsApi } from "@/lib/api";
import type { AudioEngine } from "@/lib/audio/engine";
import { updatePlayedTrackIds } from "@/lib/player/graph";
import type { PlaybackPhase } from "@/lib/types/audio";
import type { BeatView } from "@/lib/types/beat";

export interface TrackAdvanceOptions {
  engine: AudioEngine;
  stateRef: React.MutableRefObject<{
    current: BeatView | null;
    pathname: string;
    playedHistory: string[];
  }>;
  isResolvingRef: React.MutableRefObject<boolean>;
  commitNextBeat: (beat: BeatView) => void;
  setPhase: (phase: PlaybackPhase) => void;
  setSecondsRemaining: (sec: number) => void;
  setError: (err: string | null) => void;
}

/**
 * Handles manually or automatically advancing to the next beat via transition graph resolution.
 */
export function useTrackAdvancer(opts: TrackAdvanceOptions) {
  const {
    engine,
    stateRef,
    isResolvingRef,
    commitNextBeat,
    setPhase,
    setSecondsRemaining,
    setError,
  } = opts;

  return useCallback(
    (modeOrEvent?: unknown) => {
      const snap = engine.getSnapshot();
      let cur = stateRef.current.current;
      let hist = stateRef.current.playedHistory;

      if (snap.currentBeat && snap.currentBeat.id !== cur?.id) {
        cur = snap.currentBeat;
        hist = updatePlayedTrackIds(hist, cur.id);
        commitNextBeat(cur);
      }

      if (!cur || isResolvingRef.current) return;

      const mode = modeOrEvent === "auto" ? "auto" : "skip";
      isResolvingRef.current = true;

      beatsApi
        .getNextBeat({ currentTrackId: cur.id, playedTrackIds: hist, mode })
        .then(async (res) => {
          const nextBeat = res.beat;

          if (mode === "auto" && res.transition) {
            await engine.armTransition(nextBeat, res.transition);
            const snap = engine.getSnapshot();
            setPhase(snap.phase);
            setSecondsRemaining(snap.secondsRemaining);
            return;
          }

          if (engine.getSnapshot().isPlaying) {
            await engine.skipToTrack(nextBeat);
            const snap = engine.getSnapshot();
            setPhase(snap.phase);
            setSecondsRemaining(snap.secondsRemaining);
          }
          commitNextBeat(nextBeat);
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Failed to advance track",
          );
        })
        .finally(() => {
          isResolvingRef.current = false;
        });
    },
    [
      commitNextBeat,
      engine,
      isResolvingRef,
      setError,
      setPhase,
      setSecondsRemaining,
      stateRef,
    ],
  );
}
