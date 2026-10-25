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
  setPositionSec?: (sec: number) => void;
}

interface PlaybackControlOptions {
  engine: AudioEngine;
  activePlaying: boolean;
  current: BeatView | null;
  setPhase: (phase: PlaybackPhase) => void;
  setSecondsRemaining: (sec: number) => void;
  setPositionSec?: (sec: number) => void;
}

function usePlaybackControl(opts: PlaybackControlOptions) {
  const {
    engine,
    activePlaying,
    current,
    setPhase,
    setSecondsRemaining,
    setPositionSec,
  } = opts;

  useEffect(() => {
    if (!current) return;
    if (!activePlaying) {
      engine.pause();
      const snap = engine.getSnapshot();
      setPhase(snap.phase);
      setPositionSec?.(snap.positionSec);
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
          setPositionSec?.(updated.positionSec);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [
    engine,
    activePlaying,
    current,
    setPhase,
    setSecondsRemaining,
    setPositionSec,
  ]);
}

export interface EngineHandoffOptions {
  engine: AudioEngine;
  commitNextBeat: (beat: BeatView) => void;
  setPhase: (phase: PlaybackPhase) => void;
  setSecondsRemaining: (sec: number) => void;
  setPositionSec?: (sec: number) => void;
}

export function useEngineHandoff(opts: EngineHandoffOptions) {
  const {
    engine,
    commitNextBeat,
    setPhase,
    setSecondsRemaining,
    setPositionSec,
  } = opts;

  useEffect(() => {
    return engine.setOnTrackHandoff((nextBeat) => {
      commitNextBeat(nextBeat);
      const snap = engine.getSnapshot();
      setPhase(snap.phase);
      setSecondsRemaining(snap.secondsRemaining);
      setPositionSec?.(snap.positionSec);
    });
  }, [engine, commitNextBeat, setPhase, setSecondsRemaining, setPositionSec]);
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
    setPositionSec,
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
    setPositionSec,
  });

  useEffect(() => {
    if (!activePlaying || isLoading || !current) return;

    const interval = setInterval(() => {
      const prevBeatId = latestRef.current.current?.id;
      const snap = engine.getSnapshot();
      setPhase(snap.phase);
      setSecondsRemaining(snap.secondsRemaining);
      setPositionSec?.(snap.positionSec);

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
    }, 100);

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
    setPositionSec,
  ]);
}
