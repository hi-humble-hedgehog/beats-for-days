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
import { LIMITS, STORAGE_KEYS } from "@/lib/constants";
import { updatePlayedTrackIds } from "@/lib/player/graph";
import { syncBeatUrl } from "@/lib/player/url";
import type { AudioPlayerState } from "@/lib/types/audio";
import type { BeatView } from "@/lib/types/beat";

export const AudioPlayerContext = createContext<AudioPlayerState | null>(null);

function loadPlayedHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PLAYED_TRACKS);
    return raw ? (JSON.parse(raw) as string[]) : [];
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

function useCountdownTimer(isActive: boolean, onExpire: () => void) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    LIMITS.CYCLE_TIMER_SECONDS,
  );

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          onExpire();
          return LIMITS.CYCLE_TIMER_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, onExpire]);

  return secondsRemaining;
}

function useInitialBeat(initialHistory: string[]) {
  const [current, setCurrent] = useState<BeatView | null>(null);
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

  return { current, setCurrent, isLoading, error, setError };
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playedHistory, setPlayedHistory] =
    useState<string[]>(loadPlayedHistory);
  const { current, setCurrent, isLoading, error, setError } =
    useInitialBeat(playedHistory);

  const stateRef = useRef({ current, pathname, playedHistory });
  useEffect(() => {
    stateRef.current = { current, pathname, playedHistory };
  });

  const advanceTrack = useCallback(
    (modeOrEvent?: unknown) => {
      const {
        current: cur,
        pathname: path,
        playedHistory: hist,
      } = stateRef.current;
      if (!cur) return;

      const mode = modeOrEvent === "auto" ? "auto" : "skip";

      beatsApi
        .getNextBeat({
          currentTrackId: cur.id,
          playedTrackIds: hist,
          mode,
        })
        .then((res) => {
          const nextBeat = res.beat;
          const nextHistory = updatePlayedTrackIds(hist, nextBeat.id);
          setPlayedHistory(nextHistory);
          savePlayedHistory(nextHistory);
          setCurrent(nextBeat);
          syncBeatUrl(path, nextBeat.id);
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Failed to advance track",
          );
        });
    },
    [setCurrent, setError],
  );

  // Derived state: home landing page "/" is always paused
  const activePlaying = isPlaying && pathname !== "/";

  const handleAutoAdvance = useCallback(() => {
    advanceTrack("auto");
  }, [advanceTrack]);

  const secondsRemaining = useCountdownTimer(
    activePlaying && !isLoading && current !== null,
    handleAutoAdvance,
  );

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        current,
        isPlaying: activePlaying,
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
