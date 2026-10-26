"use client";

import { useCallback, useEffect, useRef } from "react";
import { beatsApi } from "@/lib/api";
import type { AudioEngine } from "@/lib/audio/engine";
import { updatePlayedTrackIds } from "@/lib/player/graph";
import { savePlayedHistory } from "@/lib/player/history";
import { extractBeatIdFromPathname } from "@/lib/player/url";
import type { PlaybackPhase } from "@/lib/types/audio";
import type { BeatView } from "@/lib/types/beat";

export interface UrlSyncOptions {
  engine: AudioEngine;
  pathname: string;
  current: BeatView | null;
  setCurrent: (beat: BeatView) => void;
  setPhase: (phase: PlaybackPhase) => void;
  setSecondsRemaining: (sec: number) => void;
  setPositionSec?: (sec: number) => void;
  setError: (err: string | null) => void;
  playedHistory: string[];
  setPlayedHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setIsPlaying?: React.Dispatch<React.SetStateAction<boolean>>;
}

interface SwitcherOptions {
  engine: AudioEngine;
  setCurrent: (beat: BeatView) => void;
  setPhase: (phase: PlaybackPhase) => void;
  setSecondsRemaining: (sec: number) => void;
  setPositionSec?: (sec: number) => void;
  setError: (err: string | null) => void;
  setPlayedHistory: React.Dispatch<React.SetStateAction<string[]>>;
  stateRef: React.MutableRefObject<{
    current: BeatView | null;
    playedHistory: string[];
  }>;
}

function useTrackSwitcher(opts: SwitcherOptions) {
  const {
    engine,
    setCurrent,
    setPhase,
    setSecondsRemaining,
    setPositionSec,
    setError,
    setPlayedHistory,
    stateRef,
  } = opts;
  const inFlightRef = useRef<string | null>(null);

  return useCallback(
    async (targetBeatId: string) => {
      if (
        inFlightRef.current === targetBeatId ||
        stateRef.current.current?.id === targetBeatId
      ) {
        return;
      }
      inFlightRef.current = targetBeatId;
      try {
        const beat = await beatsApi.getBeat(targetBeatId);
        if (!beat) return;

        const nextHistory = updatePlayedTrackIds(
          stateRef.current.playedHistory,
          beat.id,
        );
        setPlayedHistory(nextHistory);
        savePlayedHistory(nextHistory);
        setCurrent(beat);

        const snap = engine.getSnapshot();
        if (snap.isPlaying) {
          await engine.skipToTrack(beat);
        } else {
          await engine.loadTrack(beat);
        }

        const updated = engine.getSnapshot();
        setPhase(updated.phase);
        setSecondsRemaining(updated.secondsRemaining);
        setPositionSec?.(updated.positionSec);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load beat");
      } finally {
        inFlightRef.current = null;
      }
    },
    [
      engine,
      setCurrent,
      setError,
      setPhase,
      setPlayedHistory,
      setPositionSec,
      setSecondsRemaining,
      stateRef,
    ],
  );
}

/**
 * Synchronizes the audio engine and player state with URL and browser history changes.
 * Keeps the URL leading on beat routes when navigating back/forward or following links.
 */
export function useUrlSync(opts: UrlSyncOptions) {
  const {
    engine,
    pathname,
    current,
    setCurrent,
    setPhase,
    setSecondsRemaining,
    setPositionSec,
    setError,
    playedHistory,
    setPlayedHistory,
    setIsPlaying,
  } = opts;

  const stateRef = useRef({ current, playedHistory });

  useEffect(() => {
    stateRef.current = { current, playedHistory };
  });

  const switchToBeat = useTrackSwitcher({
    engine,
    setCurrent,
    setPhase,
    setSecondsRemaining,
    setPositionSec,
    setError,
    setPlayedHistory,
    stateRef,
  });

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const stateBeatId = (event.state as { beatId?: string } | null)?.beatId;
      const targetId =
        stateBeatId ?? extractBeatIdFromPathname(window.location.pathname);
      if (!targetId && window.location.pathname === "/") {
        setIsPlaying?.(false);
        return;
      }
      if (targetId && targetId !== stateRef.current.current?.id) {
        void switchToBeat(targetId);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [setIsPlaying, switchToBeat]);

  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current === pathname) {
      return;
    }
    prevPathnameRef.current = pathname;
    if (pathname === "/") {
      setIsPlaying?.(false);
      return;
    }
    const targetId = extractBeatIdFromPathname(pathname);
    if (targetId && targetId !== stateRef.current.current?.id) {
      void switchToBeat(targetId);
    }
  }, [pathname, setIsPlaying, switchToBeat]);
}
