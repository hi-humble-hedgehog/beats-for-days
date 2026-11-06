"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AudioEngine } from "@/lib/audio/engine";
import {
  advancePlayedHistory,
  createInitialPlayerUiState,
  playerReducer,
  type PlayerAction,
} from "@/lib/player/decisions";
import { loadPlayedHistory, savePlayedHistory } from "@/lib/player/history";
import {
  extractBeatIdFromPathname,
  formatBeatUrl,
  syncBeatUrl,
} from "@/lib/player/url";
import type { AudioPlayerState } from "@/lib/types/audio";
import type { BeatView } from "@/lib/types/beat";
import { useEngineHandoff, useEngineSync } from "./useEngineSync";
import { useInitialBeat, type PlayerStateRef } from "./useInitialBeat";
import { useTrackAdvancer } from "./useTrackAdvancer";
import {
  usePlaybackCommands,
  useTransportActions,
} from "./useTransportActions";
import { useUrlSync } from "./useUrlSync";

export const AudioPlayerContext = createContext<AudioPlayerState | null>(null);

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
    (
      nextBeat: BeatView,
      opts?: { traverse?: boolean; replaceUrl?: boolean },
    ) => {
      const {
        pathname: path,
        playedHistory: hist,
        current: cur,
      } = stateRef.current;
      dispatch({ type: "set_not_found", beatId: null });
      if (cur?.id === nextBeat.id) return;
      const nextHistory = advancePlayedHistory(
        hist,
        cur?.id ?? null,
        nextBeat.id,
        opts?.traverse,
      );
      stateRef.current = {
        ...stateRef.current,
        current: nextBeat,
        playedHistory: nextHistory,
      };
      setPlayedHistory(nextHistory);
      savePlayedHistory(nextHistory);
      setCurrent(nextBeat);
      if (syncBeatUrl(path, nextBeat.id, undefined, opts?.replaceUrl)) {
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
    muted: state.ui.muted,
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

  useLayoutEffect(() => {
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
  const advancer = useAudioCoordinator({
    engine,
    pathname,
    state: playerState,
    commitNextBeat,
    stateRef,
  });
  const commands = usePlaybackCommands(
    playerState.dispatch,
    playerState.setCurrent,
    stateRef,
  );
  const transport = useTransportActions({
    engine,
    stateRef,
    commitNextBeat,
    dispatch: playerState.dispatch,
  });
  const getByteFrequencyData = useCallback(
    (array: Uint8Array) => engine.getByteFrequencyData(array),
    [engine],
  );

  return (
    <AudioPlayerContext.Provider
      value={{
        ...playerState.ui,
        current: playerState.current,
        isLoading: playerState.isLoading,
        playedHistory: playerState.playedHistory,
        ...commands,
        ...advancer,
        ...transport,
        commitBeat: commitNextBeat,
        getByteFrequencyData,
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
