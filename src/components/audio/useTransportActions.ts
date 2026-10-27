"use client";

import { useCallback } from "react";
import { beatsApi } from "@/lib/api";
import type { AudioEngine } from "@/lib/audio/engine";
import {
  historyAfterPrevious,
  resolvePreviousAction,
  type PlayerAction,
} from "@/lib/player/decisions";
import type { BeatView } from "@/lib/types/beat";

interface TransportRefs {
  current: BeatView | null;
  pathname: string;
  playedHistory: string[];
}

function syncSnapshot(
  engine: AudioEngine,
  dispatch: React.Dispatch<PlayerAction>,
): void {
  const snap = engine.getSnapshot();
  dispatch({
    type: "sync_snapshot",
    phase: snap.phase,
    secondsRemaining: snap.secondsRemaining,
    positionSec: snap.positionSec,
  });
}

/**
 * Seek, mute, and previous-track actions for the poster transport.
 * Previous trims history only after the prior beat resolves so failed fetches keep history intact.
 */
export function useTransportActions(opts: {
  engine: AudioEngine;
  stateRef: React.MutableRefObject<TransportRefs>;
  setPlayedHistory: React.Dispatch<React.SetStateAction<string[]>>;
  commitNextBeat: (beat: BeatView) => void;
  dispatch: React.Dispatch<PlayerAction>;
}) {
  const { engine, stateRef, setPlayedHistory, commitNextBeat, dispatch } = opts;

  const toggleMute = useCallback(() => {
    dispatch({ type: "toggle_mute" });
  }, [dispatch]);

  const seek = useCallback(
    (offsetSec: number) => {
      engine.seek(offsetSec);
      syncSnapshot(engine, dispatch);
    },
    [dispatch, engine],
  );

  const previous = useCallback(() => {
    const { current, playedHistory } = stateRef.current;
    const action = resolvePreviousAction({
      positionSec: engine.getSnapshot().positionSec,
      playedHistory,
      currentId: current?.id ?? null,
    });
    if (action.kind === "seek_start") {
      engine.seek(0);
      syncSnapshot(engine, dispatch);
      return;
    }

    const currentId = current?.id ?? null;
    void beatsApi
      .getBeat(action.beatId)
      .then(async (beat) => {
        if (!beat) return;
        const trimmed = historyAfterPrevious(
          stateRef.current.playedHistory,
          currentId,
        );
        stateRef.current.playedHistory = trimmed;
        setPlayedHistory(trimmed);
        const wasPlaying = engine.getSnapshot().isPlaying;
        commitNextBeat(beat);
        if (wasPlaying) await engine.skipToTrack(beat);
        else await engine.loadTrack(beat);
        syncSnapshot(engine, dispatch);
      })
      .catch((err: unknown) => {
        dispatch({
          type: "set_error",
          error: err instanceof Error ? err.message : "Failed to load beat",
        });
      });
  }, [commitNextBeat, dispatch, engine, setPlayedHistory, stateRef]);

  return { toggleMute, seek, previous };
}
