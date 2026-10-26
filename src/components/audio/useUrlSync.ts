"use client";

import { useCallback, useEffect, useRef } from "react";
import { beatsApi } from "@/lib/api";
import type { AudioEngine } from "@/lib/audio/engine";
import { resolveRouteIntent, type PlayerAction } from "@/lib/player/decisions";
import { updatePlayedTrackIds } from "@/lib/player/graph";
import { savePlayedHistory } from "@/lib/player/history";
import { formatBeatUrl } from "@/lib/player/url";
import type { BeatView } from "@/lib/types/beat";

export interface UrlSyncTrackStore {
  setCurrent: (beat: BeatView) => void;
  setPlayedHistory: React.Dispatch<React.SetStateAction<string[]>>;
  stateRef: React.MutableRefObject<{
    current: BeatView | null;
    pathname: string;
    playedHistory: string[];
  }>;
}

export interface UrlSyncOptions {
  engine: AudioEngine;
  pathname: string;
  dispatch: React.Dispatch<PlayerAction>;
  store: UrlSyncTrackStore;
}

function useTrackSwitcher(
  engine: AudioEngine,
  dispatch: React.Dispatch<PlayerAction>,
  store: UrlSyncTrackStore,
) {
  const { setCurrent, setPlayedHistory, stateRef } = store;
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
        stateRef.current.current = beat;
        stateRef.current.playedHistory = nextHistory;
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
        dispatch({
          type: "sync_snapshot",
          phase: updated.phase,
          secondsRemaining: updated.secondsRemaining,
          positionSec: updated.positionSec,
        });
      } catch (err) {
        dispatch({
          type: "set_error",
          error: err instanceof Error ? err.message : "Failed to load beat",
        });
      } finally {
        inFlightRef.current = null;
      }
    },
    [dispatch, engine, setCurrent, setPlayedHistory, stateRef],
  );
}

/**
 * Synchronizes the audio engine and player state with URL and browser history changes.
 * Delegates route decisions to `resolveRouteIntent` in `src/lib/player/decisions.ts`.
 */
export function useUrlSync(opts: UrlSyncOptions) {
  const { engine, pathname, dispatch, store } = opts;
  const { stateRef } = store;
  const switchToBeat = useTrackSwitcher(engine, dispatch, store);

  const applyRoutePathname = useCallback(
    (targetPathname: string) => {
      stateRef.current.pathname = targetPathname;
      dispatch({ type: "set_pathname", pathname: targetPathname });
      const intent = resolveRouteIntent(
        targetPathname,
        stateRef.current.current?.id,
      );
      if (intent.kind === "pause") {
        dispatch({ type: "set_playing", isPlaying: false });
      } else if (intent.kind === "load") {
        void switchToBeat(intent.beatId);
      }
    },
    [dispatch, stateRef, switchToBeat],
  );

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const stateBeatId = (event.state as { beatId?: string } | null)?.beatId;
      const targetPathname = stateBeatId
        ? formatBeatUrl(stateBeatId)
        : window.location.pathname;
      applyRoutePathname(targetPathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [applyRoutePathname]);

  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current === pathname) {
      return;
    }
    prevPathnameRef.current = pathname;
    applyRoutePathname(pathname);
  }, [applyRoutePathname, pathname]);
}
