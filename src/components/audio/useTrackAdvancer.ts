"use client";

import { useCallback } from "react";
import { beatsApi } from "@/lib/api";
import type { AudioEngine } from "@/lib/audio/engine";
import {
  buildForwardResolution,
  planAdvance,
  resolveForwardBeatId,
  type AdvanceMode,
  type NextBeatResolution,
  type PlayerAction,
} from "@/lib/player/decisions";
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

async function resolveTargetBeat(opts: {
  cur: BeatView;
  hist: string[];
  mode: AdvanceMode;
}): Promise<NextBeatResolution> {
  const { cur, hist, mode } = opts;
  const forwardId = resolveForwardBeatId(hist, cur.id);
  if (forwardId) {
    const forwardBeat = await beatsApi.getBeat(forwardId);
    if (forwardBeat) {
      return buildForwardResolution(cur, forwardBeat);
    }
  }
  return beatsApi.getNextBeat({
    currentTrackId: cur.id,
    playedTrackIds: hist,
    mode,
  });
}

/**
 * Handles manually skipping or automatically advancing to the next beat.
 * Steps forward deterministically through `playedHistory` after Previous, or queries `/api/beats/next` at the tip.
 */
export function useTrackAdvancer(opts: TrackAdvanceOptions) {
  const { engine, stateRef, isResolvingRef, commitNextBeat, dispatch } = opts;

  const advanceTrack = useCallback(
    (mode: AdvanceMode = "skip") => {
      const snap = engine.getSnapshot();
      let cur = stateRef.current.current;

      if (snap.currentBeat && snap.currentBeat.id !== cur?.id) {
        cur = snap.currentBeat;
        commitNextBeat(cur);
      }

      if (!cur || isResolvingRef.current) return;

      const hist = stateRef.current.playedHistory;
      isResolvingRef.current = true;

      resolveTargetBeat({ cur, hist, mode })
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
