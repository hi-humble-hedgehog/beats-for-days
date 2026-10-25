"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { beatsApi } from "@/lib/api";
import { AudioEngine } from "@/lib/audio/engine";
import { STORAGE_KEYS } from "@/lib/constants";
import { updatePlayedTrackIds } from "@/lib/player/graph";
import { syncBeatUrl } from "@/lib/player/url";
import type { AudioPlayerState, PlaybackPhase } from "@/lib/types/audio";
import type { BeatView } from "@/lib/types/beat";
import { useEngineHandoff, useEngineSync } from "./useEngineSync";

export const AudioPlayerContext = createContext<AudioPlayerState | null>(null);

function loadPlayedHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return (
      (JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.PLAYED_TRACKS) || "[]",
      ) as string[]) || []
    );
  } catch {
    return [];
  }
}

function savePlayedHistory(history: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.PLAYED_TRACKS,
      JSON.stringify(history),
    );
  } catch {
    // Ignore storage quota errors
  }
}

function useInitialBeat(initialHistory: string[]) {
  const [current, setCurrent] = useState<BeatView | null>(null);
  const [resolveAfterSec, setResolveAfterSec] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef(initialHistory);

  useEffect(() => {
    let active = true;
    beatsApi
      .getNextBeat({ playedTrackIds: historyRef.current, mode: "skip" })
      .then((res) => {
        if (!active) return;
        setCurrent(res.beat);
        if (res.resolveAfterSec) setResolveAfterSec(res.resolveAfterSec);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load beats");
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { current, setCurrent, resolveAfterSec, isLoading, error, setError };
}

interface TrackAdvanceOptions {
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

function useTrackAdvancer(opts: TrackAdvanceOptions) {
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

export interface AudioPlayerProviderProps {
  children: ReactNode;
  engine?: AudioEngine;
}

export function AudioPlayerProvider({
  children,
  engine: injectedEngine,
}: AudioPlayerProviderProps) {
  const pathname = usePathname();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [phase, setPhase] = useState<PlaybackPhase>("idle");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [playedHistory, setPlayedHistory] =
    useState<string[]>(loadPlayedHistory);
  const { current, setCurrent, resolveAfterSec, isLoading, error, setError } =
    useInitialBeat(playedHistory);

  const [defaultEngine] = useState(() => injectedEngine ?? new AudioEngine());
  const engine = injectedEngine ?? defaultEngine;
  const isResolvingRef = useRef<boolean>(false);
  const stateRef = useRef({ current, pathname, playedHistory });

  useEffect(() => {
    stateRef.current = { current, pathname, playedHistory };
  });

  const commitNextBeat = useCallback(
    (nextBeat: BeatView) => {
      const { pathname: path, playedHistory: hist } = stateRef.current;
      const nextHistory = updatePlayedTrackIds(hist, nextBeat.id);
      setPlayedHistory(nextHistory);
      savePlayedHistory(nextHistory);
      setCurrent(nextBeat);
      syncBeatUrl(path, nextBeat.id);
    },
    [setCurrent],
  );

  useEngineHandoff(engine, commitNextBeat, setPhase, setSecondsRemaining);

  const advanceTrack = useTrackAdvancer({
    engine,
    stateRef,
    isResolvingRef,
    commitNextBeat,
    setPhase,
    setSecondsRemaining,
    setError,
  });

  const activePlaying = isPlaying && pathname !== "/";
  useEngineSync({
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
  });

  const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);

  return (
    <AudioPlayerContext.Provider
      value={{
        current,
        isPlaying: activePlaying,
        phase,
        secondsRemaining,
        isLoading,
        error,
        togglePlay,
        advanceTrack,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerState {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error(
      "useAudioPlayer must be used within an AudioPlayerProvider",
    );
  }
  return context;
}
