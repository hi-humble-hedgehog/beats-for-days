"use client";

import { useCallback } from "react";
import { beatsApi } from "@/lib/api";
import type { AudioEngine } from "@/lib/audio/engine";
import {
  planAdvance,
  type AdvanceMode,
  type PlayerAction,
} from "@/lib/player/decisions";
import { updatePlayedTrackIds } from "@/lib/player/graph";
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
  dispatch: React.Dispatch<PlayerAction>;
}

/**
 * Handles manually skipping or automatically advancing to the next beat.
 * Delegates engine action planning to `planAdvance` in `src/lib/player/decisions.ts`.
 */
export function useTrackAdvancer(opts: TrackAdvanceOptions) {
  const { engine, stateRef, isResolvingRef, commitNextBeat, dispatch } = opts;

  const advanceTrack = useCallback(
    (mode: AdvanceMode = "skip") => {
      const snap = engine.getSnapshot();
      let cur = stateRef.current.current;
      let hist = stateRef.current.playedHistory;

      if (snap.currentBeat && snap.currentBeat.id !== cur?.id) {
        cur = snap.currentBeat;
        hist = updatePlayedTrackIds(hist, cur.id);
        commitNextBeat(cur);
      }

      if (!cur || isResolvingRef.current) return;

      isResolvingRef.current = true;

      beatsApi
        .getNextBeat({ currentTrackId: cur.id, playedTrackIds: hist, mode })
        .then(async (res) => {
          const plan = planAdvance(mode, res, engine.getSnapshot().isPlaying);

          if (plan.kind === "arm") {
            await engine.armTransition(plan.beat, plan.transition);
            const updated = engine.getSnapshot();
            dispatch({
              type: "sync_snapshot",
              phase: updated.phase,
              secondsRemaining: updated.secondsRemaining,
              positionSec: updated.positionSec,
            });
            return;
          }

          const skipPromise =
            plan.kind === "skip"
              ? engine.skipToTrack(plan.beat)
              : Promise.resolve();

          commitNextBeat(plan.beat);
          isResolvingRef.current = false;

          if (plan.kind === "skip") {
            await skipPromise;
            const updated = engine.getSnapshot();
            dispatch({
              type: "sync_snapshot",
              phase: updated.phase,
              secondsRemaining: updated.secondsRemaining,
              positionSec: updated.positionSec,
            });
          }
        })
        .catch((err) => {
          dispatch({
            type: "set_error",
            error:
              err instanceof Error ? err.message : "Failed to advance track",
          });
        })
        .finally(() => {
          isResolvingRef.current = false;
        });
    },
    [commitNextBeat, dispatch, engine, isResolvingRef, stateRef],
  );

  const skip = useCallback(() => advanceTrack("skip"), [advanceTrack]);
  const autoAdvance = useCallback(() => advanceTrack("auto"), [advanceTrack]);

  return { advanceTrack, skip, autoAdvance };
}
