"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { beatsApi } from "@/lib/api";
import { AudioEngine } from "@/lib/audio/engine";
import {
  createInitialPlayerUiState,
  playerReducer,
  resolveStartBeat,
  type PlayerAction,
} from "@/lib/player/decisions";
import { updatePlayedTrackIds } from "@/lib/player/graph";
import { loadPlayedHistory, savePlayedHistory } from "@/lib/player/history";
import {
  extractBeatIdFromPathname,
  formatBeatUrl,
  syncBeatUrl,
} from "@/lib/player/url";
import type { AudioPlayerState } from "@/lib/types/audio";
import type { BeatView } from "@/lib/types/beat";
import { useEngineHandoff, useEngineSync } from "./useEngineSync";
import { useTrackAdvancer } from "./useTrackAdvancer";
import { useUrlSync } from "./useUrlSync";

export const AudioPlayerContext = createContext<AudioPlayerState | null>(null);

interface PlayerStateRef {
  current: BeatView | null;
  pathname: string;
  playedHistory: string[];
}

function fetchInitialBeatData(
  initialBeatId: string | null | undefined,
  currentId: string | undefined,
  playedTrackIds: string[],
): Promise<{
  hydrated?: boolean;
  beat?: BeatView | null;
  resolveAfterSec?: number;
}> {
  if (initialBeatId) {
    if (currentId === initialBeatId) return Promise.resolve({ hydrated: true });
    return beatsApi.getBeat(initialBeatId).then((beat) => ({ beat }));
  }
  return beatsApi.getNextBeat({ playedTrackIds, mode: "skip" });
}

function useInitialBeat(
  initialHistory: string[],
  initialBeatId: string | null | undefined,
  dispatch: React.Dispatch<PlayerAction>,
  stateRef: React.MutableRefObject<PlayerStateRef>,
) {
  const [current, setCurrent] = useState<BeatView | null>(null);
  const [resolveAfterSec, setResolveAfterSec] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const historyRef = useRef(initialHistory);

  useEffect(() => {
    let active = true;
    fetchInitialBeatData(
      initialBeatId,
      stateRef.current.current?.id,
      historyRef.current,
    )
      .then((res) => {
        if (!active || res.hydrated) return;
        if (!res.beat) {
          dispatch({ type: "set_not_found", beatId: initialBeatId ?? null });
          return;
        }
        setCurrent(res.beat);
        if (res.resolveAfterSec) setResolveAfterSec(res.resolveAfterSec);
      })
      .catch((err: unknown) => {
        if (!active) return;
        dispatch({
          type: "set_error",
          error: err instanceof Error ? err.message : "Failed to load beats",
        });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dispatch, initialBeatId, stateRef]);

  return { current, setCurrent, resolveAfterSec, isLoading };
}

export interface AudioPlayerProviderProps {
  children: ReactNode;
  engine?: AudioEngine;
}

function useBeatCommit(
  setCurrent: (beat: BeatView) => void,
  stateRef: React.MutableRefObject<PlayerStateRef>,
  setPlayedHistory: React.Dispatch<React.SetStateAction<string[]>>,
  dispatch: React.Dispatch<PlayerAction>,
) {
  return useCallback(
    (nextBeat: BeatView) => {
      const {
        pathname: path,
        playedHistory: hist,
        current: cur,
      } = stateRef.current;
      dispatch({ type: "set_not_found", beatId: null });
      if (cur?.id === nextBeat.id) return;
      const nextHistory = updatePlayedTrackIds(hist, nextBeat.id);
      stateRef.current.current = nextBeat;
      stateRef.current.playedHistory = nextHistory;
      setPlayedHistory(nextHistory);
      savePlayedHistory(nextHistory);
      setCurrent(nextBeat);
      if (syncBeatUrl(path, nextBeat.id)) {
        const nextPathname = formatBeatUrl(nextBeat.id);
        stateRef.current.pathname = nextPathname;
        dispatch({ type: "set_pathname", pathname: nextPathname });
      }
    },
    [dispatch, setCurrent, stateRef, setPlayedHistory],
  );
}

function usePlayerState(
  pathname: string,
  initialBeatId: string | null,
  stateRef: React.MutableRefObject<PlayerStateRef>,
) {
  const [ui, dispatch] = useReducer(
    playerReducer,
    pathname,
    createInitialPlayerUiState,
  );
  const [playedHistory, setPlayedHistory] =
    useState<string[]>(loadPlayedHistory);
  const initialBeat = useInitialBeat(
    playedHistory,
    initialBeatId,
    dispatch,
    stateRef,
  );
  return { ui, dispatch, playedHistory, setPlayedHistory, ...initialBeat };
}

function useAudioCoordinator(opts: {
  engine: AudioEngine;
  pathname: string;
  state: ReturnType<typeof usePlayerState>;
  commitNextBeat: (beat: BeatView) => void;
  stateRef: React.MutableRefObject<PlayerStateRef>;
}) {
  const { engine, pathname, state, commitNextBeat, stateRef } = opts;
  const isResolvingRef = useRef<boolean>(false);

  useEngineHandoff({ engine, commitNextBeat, dispatch: state.dispatch });
  useUrlSync({
    engine,
    pathname,
    dispatch: state.dispatch,
    store: {
      setCurrent: state.setCurrent,
      setPlayedHistory: state.setPlayedHistory,
      stateRef,
    },
  });

  const advancer = useTrackAdvancer({
    engine,
    stateRef,
    isResolvingRef,
    commitNextBeat,
    dispatch: state.dispatch,
  });

  useEngineSync({
    engine,
    isPlaying: state.ui.isPlaying,
    isLoading: state.isLoading,
    current: state.current,
    resolveAfterSec: state.resolveAfterSec,
    isResolvingRef,
    commitNextBeat,
    autoAdvance: advancer.autoAdvance,
    dispatch: state.dispatch,
  });

  return advancer;
}

export function AudioPlayerProvider({
  children,
  engine: injectedEngine,
}: AudioPlayerProviderProps) {
  const pathname = usePathname();
  const [initialBeatId] = useState(() => extractBeatIdFromPathname(pathname));
  const stateRef = useRef<PlayerStateRef>({
    current: null,
    pathname,
    playedHistory: [],
  });
  const playerState = usePlayerState(pathname, initialBeatId, stateRef);
  const [defaultEngine] = useState(
    () => injectedEngine ?? new AudioEngine({ vinylEffects: true }),
  );
  const engine = injectedEngine ?? defaultEngine;

  useEffect(() => {
    stateRef.current = {
      current: playerState.current,
      pathname: playerState.ui.activePathname,
      playedHistory: playerState.playedHistory,
    };
  });

  const commitNextBeat = useBeatCommit(
    playerState.setCurrent,
    stateRef,
    playerState.setPlayedHistory,
    playerState.dispatch,
  );

  const { advanceTrack, skip, autoAdvance } = useAudioCoordinator({
    engine,
    pathname,
    state: playerState,
    commitNextBeat,
    stateRef,
  });

  const { dispatch, ui } = playerState;
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

  return (
    <AudioPlayerContext.Provider
      value={{
        current: playerState.current,
        activePathname: ui.activePathname,
        hasPausedBeat: ui.hasPausedBeat,
        notFoundBeatId: ui.notFoundBeatId,
        isPlaying: ui.isPlaying,
        phase: ui.phase,
        secondsRemaining: ui.secondsRemaining,
        positionSec: ui.positionSec,
        isLoading: playerState.isLoading,
        error: ui.error,
        playedHistory: playerState.playedHistory,
        togglePlay,
        play,
        pause,
        commitBeat: commitNextBeat,
        skip,
        autoAdvance,
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

/**
 * Shared callback used by Home, 404, and the persistent player bar to start playback
 * via `resolveStartBeat` and navigate to the target beat deck.
 */
export function useStartPlayback(): () => void {
  const router = useRouter();
  const s = useAudioPlayer();
  return useCallback(() => {
    void resolveStartBeat({
      current: s.current,
      hasPausedBeat: s.hasPausedBeat,
      playedHistory: s.playedHistory ?? [],
      fetchNextBeat: (req) => beatsApi.getNextBeat(req),
      commitBeat: s.commitBeat,
      startPlay: () => (s.play ? s.play() : !s.isPlaying && s.togglePlay()),
      navigate: (url) => router.push(url),
    });
  }, [router, s]);
}
