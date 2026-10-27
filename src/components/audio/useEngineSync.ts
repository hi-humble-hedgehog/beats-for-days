"use client";

import { useEffect, useRef } from "react";
import type { AudioEngine } from "@/lib/audio/engine";
import { shouldTriggerAutoResolution } from "@/lib/audio/scheduler";
import type { PlayerAction } from "@/lib/player/decisions";
import type { BeatView } from "@/lib/types/beat";

export interface EngineSyncOptions {
  engine: AudioEngine;
  isPlaying: boolean;
  muted: boolean;
  isLoading: boolean;
  current: BeatView | null;
  resolveAfterSec: number;
  isResolvingRef: React.MutableRefObject<boolean>;
  commitNextBeat: (beat: BeatView) => void;
  autoAdvance: () => void;
  dispatch: React.Dispatch<PlayerAction>;
}

interface PlaybackControlOptions {
  engine: AudioEngine;
  isPlaying: boolean;
  current: BeatView | null;
  dispatch: React.Dispatch<PlayerAction>;
}

function usePlaybackControl(opts: PlaybackControlOptions) {
  const { engine, isPlaying, current, dispatch } = opts;

  useEffect(() => {
    if (!current) return;
    if (!isPlaying) {
      engine.pause();
      const snap = engine.getSnapshot();
      dispatch({
        type: "sync_snapshot",
        phase: snap.phase,
        secondsRemaining: snap.secondsRemaining,
        positionSec: snap.positionSec,
      });
      return;
    }

    let cancelled = false;
    const snap = engine.getSnapshot();
    if (!snap.isPlaying || snap.currentBeat?.id !== current.id) {
      const loadPromise =
        snap.currentBeat?.id !== current.id
          ? engine.loadTrack(current)
          : Promise.resolve();

      void loadPromise
        .then(() => (cancelled ? undefined : engine.play()))
        .then(() => {
          if (cancelled) return;
          const updated = engine.getSnapshot();
          dispatch({
            type: "sync_snapshot",
            phase: updated.phase,
            secondsRemaining: updated.secondsRemaining,
            positionSec: updated.positionSec,
          });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [engine, isPlaying, current, dispatch]);
}

export interface EngineHandoffOptions {
  engine: AudioEngine;
  commitNextBeat: (beat: BeatView) => void;
  dispatch: React.Dispatch<PlayerAction>;
}

export function useEngineHandoff(opts: EngineHandoffOptions) {
  const { engine, commitNextBeat, dispatch } = opts;

  useEffect(() => {
    return engine.setOnTrackHandoff((nextBeat) => {
      commitNextBeat(nextBeat);
      const snap = engine.getSnapshot();
      dispatch({
        type: "sync_snapshot",
        phase: snap.phase,
        secondsRemaining: snap.secondsRemaining,
        positionSec: snap.positionSec,
      });
    });
  }, [engine, commitNextBeat, dispatch]);
}

export function useEngineSync(opts: EngineSyncOptions) {
  const {
    engine,
    isPlaying,
    muted,
    isLoading,
    current,
    resolveAfterSec,
    isResolvingRef,
    commitNextBeat,
    autoAdvance,
    dispatch,
  } = opts;

  const latestRef = useRef({ current, resolveAfterSec });
  useEffect(() => {
    latestRef.current = { current, resolveAfterSec };
  });

  usePlaybackControl({
    engine,
    isPlaying,
    current,
    dispatch,
  });

  useEffect(() => {
    engine.setVolume(muted ? 0 : 1);
  }, [engine, muted, isPlaying]);

  useEffect(() => {
    if (!isPlaying || isLoading || !current) return;

    const interval = setInterval(() => {
      const prevBeatId = latestRef.current.current?.id;
      const snap = engine.getSnapshot();
      dispatch({
        type: "sync_snapshot",
        phase: snap.phase,
        secondsRemaining: snap.secondsRemaining,
        positionSec: snap.positionSec,
      });

      if (snap.currentBeat && snap.currentBeat.id !== prevBeatId) {
        commitNextBeat(snap.currentBeat);
      }

      if (
        shouldTriggerAutoResolution({
          continuousPlaySec: snap.continuousPlaySec,
          resolveAfterSec: latestRef.current.resolveAfterSec,
          isArmed: snap.phase === "armed" || snap.phase === "bridge",
          isResolving: isResolvingRef.current,
        })
      ) {
        autoAdvance();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    engine,
    isPlaying,
    isLoading,
    current,
    autoAdvance,
    commitNextBeat,
    isResolvingRef,
    dispatch,
  ]);
}
