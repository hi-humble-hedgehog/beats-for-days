"use client";

import { useEffect, useRef, useState } from "react";
import { beatsApi } from "@/lib/api";
import type { PlayerAction } from "@/lib/player/decisions";
import { loadInitialBeatId, saveInitialBeatId } from "@/lib/player/history";
import type { BeatView } from "@/lib/types/beat";

export interface PlayerStateRef {
  current: BeatView | null;
  pathname: string;
  playedHistory: string[];
}

export function fetchInitialBeatData(
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
  const storedInitialId =
    playedTrackIds.length === 0 ? loadInitialBeatId() : null;
  if (storedInitialId) {
    if (currentId === storedInitialId)
      return Promise.resolve({ hydrated: true });
    return beatsApi.getBeat(storedInitialId).then((beat) => ({ beat }));
  }
  return beatsApi.getNextBeat({ playedTrackIds, mode: "skip" });
}

export function useInitialBeat(
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
        if (historyRef.current.length === 0) {
          saveInitialBeatId(res.beat.id);
        }
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
