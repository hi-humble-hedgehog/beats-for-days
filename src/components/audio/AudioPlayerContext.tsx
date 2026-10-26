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
import { usePathname } from "next/navigation";
import { beatsApi } from "@/lib/api";
import { AudioEngine } from "@/lib/audio/engine";
import {
  createInitialPlayerUiState,
  playerReducer,
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

function useInitialBeat(
  initialHistory: string[],
  initialBeatId: string | null | undefined,
  dispatch: React.Dispatch<PlayerAction>,
) {
  const [current, setCurrent] = useState<BeatView | null>(null);
  const [resolveAfterSec, setResolveAfterSec] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
        dispatch({
          type: "set_error",
          error: err instanceof Error ? err.message : "Failed to load beats",
        });
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadInitialBeat();

    return () => {
      active = false;
    };
  }, [dispatch, initialBeatId]);

  return { current, setCurrent, resolveAfterSec, isLoading };
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
  dispatch: React.Dispatch<PlayerAction>,
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

function usePlayerState(pathname: string, initialBeatId: string | null) {
  const [ui, dispatch] = useReducer(
    playerReducer,
    pathname,
    createInitialPlayerUiState,
  );
  const [playedHistory, setPlayedHistory] =
    useState<string[]>(loadPlayedHistory);
  const initialBeat = useInitialBeat(playedHistory, initialBeatId, dispatch);

  return {
    ui,
    dispatch,
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
    dispatch: state.dispatch,
  });

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

  const { advanceTrack, skip, autoAdvance } = useTrackAdvancer({
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
    autoAdvance,
    dispatch: state.dispatch,
  });

  return { advanceTrack, skip, autoAdvance };
}

export function AudioPlayerProvider({
  children,
  engine: injectedEngine,
}: AudioPlayerProviderProps) {
  const pathname = usePathname();
  const [initialBeatId] = useState(() => extractBeatIdFromPathname(pathname));
  const playerState = usePlayerState(pathname, initialBeatId);
  const [defaultEngine] = useState(
    () => injectedEngine ?? new AudioEngine({ vinylEffects: true }),
  );
  const engine = injectedEngine ?? defaultEngine;
  const stateRef = useRef({
    current: playerState.current,
    pathname: playerState.ui.activePathname,
    playedHistory: playerState.playedHistory,
  });

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

  const { dispatch } = playerState;
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
        activePathname: playerState.ui.activePathname,
        isPlaying: playerState.ui.isPlaying,
        phase: playerState.ui.phase,
        secondsRemaining: playerState.ui.secondsRemaining,
        positionSec: playerState.ui.positionSec,
        isLoading: playerState.isLoading,
        error: playerState.ui.error,
        playedHistory: playerState.playedHistory,
        togglePlay,
        play,
        pause,
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
