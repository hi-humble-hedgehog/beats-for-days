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
import { updatePlayedTrackIds } from "@/lib/player/graph";
import { loadPlayedHistory, savePlayedHistory } from "@/lib/player/history";
import { extractBeatIdFromPathname, syncBeatUrl } from "@/lib/player/url";
import type { AudioPlayerState, PlaybackPhase } from "@/lib/types/audio";
import type { BeatView } from "@/lib/types/beat";
import { useEngineHandoff, useEngineSync } from "./useEngineSync";
import { useTrackAdvancer } from "./useTrackAdvancer";
import { useUrlSync } from "./useUrlSync";

export const AudioPlayerContext = createContext<AudioPlayerState | null>(null);

function useInitialBeat(
  initialHistory: string[],
  initialBeatId?: string | null,
) {
  const [current, setCurrent] = useState<BeatView | null>(null);
  const [resolveAfterSec, setResolveAfterSec] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef(initialHistory);

  useEffect(() => {
    let active = true;

    async function loadInitialBeat() {
      try {
        if (initialBeatId) {
          const beat = await beatsApi.getBeat(initialBeatId);
          if (beat && active) {
            setCurrent(beat);
            setIsLoading(false);
            return;
          }
        }

        const res = await beatsApi.getNextBeat({
          playedTrackIds: historyRef.current,
          mode: "skip",
        });
        if (!active) return;
        setCurrent(res.beat);
        if (res.resolveAfterSec) setResolveAfterSec(res.resolveAfterSec);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load beats");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadInitialBeat();

    return () => {
      active = false;
    };
  }, [initialBeatId]);

  return { current, setCurrent, resolveAfterSec, isLoading, error, setError };
}

export interface AudioPlayerProviderProps {
  children: ReactNode;
  engine?: AudioEngine;
}

function useBeatCommit(
  setCurrent: (beat: BeatView) => void,
  stateRef: React.MutableRefObject<{
    current: BeatView | null;
    pathname: string;
    playedHistory: string[];
  }>,
  setPlayedHistory: React.Dispatch<React.SetStateAction<string[]>>,
) {
  return useCallback(
    (nextBeat: BeatView) => {
      const {
        pathname: path,
        playedHistory: hist,
        current: cur,
      } = stateRef.current;
      if (cur?.id === nextBeat.id) {
        return;
      }
      const nextHistory = updatePlayedTrackIds(hist, nextBeat.id);
      setPlayedHistory(nextHistory);
      savePlayedHistory(nextHistory);
      setCurrent(nextBeat);
      const isHome =
        path === "/" ||
        (typeof window !== "undefined" && window.location.pathname === "/");
      if (!isHome) {
        syncBeatUrl(path, nextBeat.id);
      }
    },
    [setCurrent, stateRef, setPlayedHistory],
  );
}

function usePlayerState(initialBeatId: string | null) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [phase, setPhase] = useState<PlaybackPhase>("idle");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [positionSec, setPositionSec] = useState<number>(0);
  const [playedHistory, setPlayedHistory] =
    useState<string[]>(loadPlayedHistory);
  const initialBeat = useInitialBeat(playedHistory, initialBeatId);

  return {
    isPlaying,
    setIsPlaying,
    phase,
    setPhase,
    secondsRemaining,
    setSecondsRemaining,
    positionSec,
    setPositionSec,
    playedHistory,
    setPlayedHistory,
    ...initialBeat,
  };
}

interface CoordinatorOptions {
  engine: AudioEngine;
  pathname: string;
  state: ReturnType<typeof usePlayerState>;
  commitNextBeat: (beat: BeatView) => void;
  stateRef: React.MutableRefObject<{
    current: BeatView | null;
    pathname: string;
    playedHistory: string[];
  }>;
}

function useAudioCoordinator(opts: CoordinatorOptions) {
  const { engine, pathname, state, commitNextBeat, stateRef } = opts;
  const isResolvingRef = useRef<boolean>(false);

  useEngineHandoff({
    engine,
    commitNextBeat,
    setPhase: state.setPhase,
    setSecondsRemaining: state.setSecondsRemaining,
    setPositionSec: state.setPositionSec,
  });

  useUrlSync({
    engine,
    pathname,
    current: state.current,
    setCurrent: state.setCurrent,
    setPhase: state.setPhase,
    setSecondsRemaining: state.setSecondsRemaining,
    setPositionSec: state.setPositionSec,
    setError: state.setError,
    playedHistory: state.playedHistory,
    setPlayedHistory: state.setPlayedHistory,
    setIsPlaying: state.setIsPlaying,
  });

  const advanceTrack = useTrackAdvancer({
    engine,
    stateRef,
    isResolvingRef,
    commitNextBeat,
    setPhase: state.setPhase,
    setSecondsRemaining: state.setSecondsRemaining,
    setError: state.setError,
  });

  const activePlaying = state.isPlaying && pathname !== "/";
  useEngineSync({
    engine,
    activePlaying,
    isLoading: state.isLoading,
    current: state.current,
    resolveAfterSec: state.resolveAfterSec,
    isResolvingRef,
    commitNextBeat,
    advanceTrack,
    setPhase: state.setPhase,
    setSecondsRemaining: state.setSecondsRemaining,
    setPositionSec: state.setPositionSec,
  });

  return { activePlaying, advanceTrack };
}

export function AudioPlayerProvider({
  children,
  engine: injectedEngine,
}: AudioPlayerProviderProps) {
  const pathname = usePathname();
  const [initialBeatId] = useState(() => extractBeatIdFromPathname(pathname));
  const playerState = usePlayerState(initialBeatId);
  const [defaultEngine] = useState(
    () => injectedEngine ?? new AudioEngine({ vinylEffects: true }),
  );
  const engine = injectedEngine ?? defaultEngine;
  const stateRef = useRef({
    current: playerState.current,
    pathname,
    playedHistory: playerState.playedHistory,
  });

  useEffect(() => {
    stateRef.current = {
      current: playerState.current,
      pathname,
      playedHistory: playerState.playedHistory,
    };
  });

  const commitNextBeat = useBeatCommit(
    playerState.setCurrent,
    stateRef,
    playerState.setPlayedHistory,
  );

  const { activePlaying, advanceTrack } = useAudioCoordinator({
    engine,
    pathname,
    state: playerState,
    commitNextBeat,
    stateRef,
  });

  const { setIsPlaying } = playerState;
  const togglePlay = useCallback(
    () => setIsPlaying((prev) => !prev),
    [setIsPlaying],
  );
  const play = useCallback(() => setIsPlaying(true), [setIsPlaying]);
  const pause = useCallback(() => setIsPlaying(false), [setIsPlaying]);

  return (
    <AudioPlayerContext.Provider
      value={{
        current: playerState.current,
        isPlaying: activePlaying,
        phase: playerState.phase,
        secondsRemaining: playerState.secondsRemaining,
        positionSec: playerState.positionSec,
        isLoading: playerState.isLoading,
        error: playerState.error,
        playedHistory: playerState.playedHistory,
        togglePlay,
        play,
        pause,
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
