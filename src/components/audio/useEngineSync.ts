"use client";

import { useEffect, useRef } from "react";
import type { AudioEngine } from "@/lib/audio/engine";
import { shouldTriggerAutoResolution } from "@/lib/audio/scheduler";
import type { PlaybackPhase } from "@/lib/types/audio";
import type { BeatView } from "@/lib/types/beat";

export interface EngineSyncOptions {
  engine: AudioEngine;
  activePlaying: boolean;
  isLoading: boolean;
  current: BeatView | null;
  resolveAfterSec: number;
  isResolvingRef: React.MutableRefObject<boolean>;
  commitNextBeat: (beat: BeatView) => void;
  advanceTrack: (mode?: unknown) => void;
  setPhase: (phase: PlaybackPhase) => void;
  setSecondsRemaining: (sec: number) => void;
}

interface PlaybackControlOptions {
  engine: AudioEngine;
  activePlaying: boolean;
  current: BeatView | null;
  setPhase: (phase: PlaybackPhase) => void;
  setSecondsRemaining: (sec: number) => void;
}

function usePlaybackControl(opts: PlaybackControlOptions) {
  const { engine, activePlaying, current, setPhase, setSecondsRemaining } =
    opts;

  useEffect(() => {
    if (!current) return;
    if (!activePlaying) {
      engine.pause();
      setPhase(engine.getSnapshot().phase);
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
          setPhase(updated.phase);
          setSecondsRemaining(updated.secondsRemaining);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [engine, activePlaying, current, setPhase, setSecondsRemaining]);
}

export function useEngineHandoff(
  engine: AudioEngine,
  commitNextBeat: (beat: BeatView) => void,
  setPhase: (phase: PlaybackPhase) => void,
  setSecondsRemaining: (sec: number) => void,
) {
  useEffect(() => {
    return engine.setOnTrackHandoff((nextBeat) => {
      commitNextBeat(nextBeat);
      const snap = engine.getSnapshot();
      setPhase(snap.phase);
      setSecondsRemaining(snap.secondsRemaining);
    });
  }, [engine, commitNextBeat, setPhase, setSecondsRemaining]);
}

export function useEngineSync(opts: EngineSyncOptions) {
  const {
    engine,
    activePlaying,
    isLoading,
    current,
    resolveAfterSec,
    isResolvingRef,
    commitNextBeat,
    advanceTrack,
    setPhase,
    setSecondsRemaining,
  } = opts;

  const latestRef = useRef({ current, resolveAfterSec });
  useEffect(() => {
    latestRef.current = { current, resolveAfterSec };
  });

  usePlaybackControl({
    engine,
    activePlaying,
    current,
    setPhase,
    setSecondsRemaining,
  });

  useEffect(() => {
    if (!activePlaying || isLoading || !current) return;

    const interval = setInterval(() => {
      const prevBeatId = latestRef.current.current?.id;
      const snap = engine.getSnapshot();
      setPhase(snap.phase);
      setSecondsRemaining(snap.secondsRemaining);

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
        advanceTrack("auto");
      }
    }, 200);

    return () => clearInterval(interval);
  }, [
    engine,
    activePlaying,
    isLoading,
    current,
    advanceTrack,
    commitNextBeat,
    isResolvingRef,
    setPhase,
    setSecondsRemaining,
  ]);
}
