"use client";

import { useCallback } from "react";
import { beatsApi } from "@/lib/api";
import type { AudioEngine } from "@/lib/audio/engine";
import {
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
 * Previous walks backward along `playedHistory` without discarding forward tracks so Next remains deterministic.
 */
export function useTransportActions(opts: {
  engine: AudioEngine;
  stateRef: React.MutableRefObject<TransportRefs>;
  commitNextBeat: (
    beat: BeatView,
    opts?: { traverse?: boolean; replaceUrl?: boolean },
  ) => void;
  dispatch: React.Dispatch<PlayerAction>;
}) {
  const { engine, stateRef, commitNextBeat, dispatch } = opts;

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

    void beatsApi
      .getBeat(action.beatId)
      .then(async (beat) => {
        if (!beat) return;
        const wasPlaying = engine.getSnapshot().isPlaying;
        commitNextBeat(beat, { traverse: true, replaceUrl: true });
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
  }, [commitNextBeat, dispatch, engine, stateRef]);

  return { toggleMute, seek, previous };
}

/**
 * Play, pause, toggle, and SSR hydration commands for the audio player context.
 */
export function usePlaybackCommands(
  dispatch: React.Dispatch<PlayerAction>,
  setCurrent: (beat: BeatView) => void,
  stateRef: React.MutableRefObject<TransportRefs>,
) {
  const hydrateBeat = useCallback(
    (beat: BeatView) => {
      if (stateRef.current.current) return;
      stateRef.current.current = beat;
      setCurrent(beat);
    },
    [setCurrent, stateRef],
  );
  const togglePlay = useCallback(
    () => dispatch({ type: "toggle_playing" }),
    [dispatch],
  );
  const play = useCallback(
    () => dispatch({ type: "set_playing", isPlaying: true }),
    [dispatch],
  );
  const pause = useCallback(
    () => dispatch({ type: "set_playing", isPlaying: false }),
    [dispatch],
  );
  return { hydrateBeat, togglePlay, play, pause };
}
