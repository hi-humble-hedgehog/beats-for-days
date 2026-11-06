"use client";

import { useEffect, useState } from "react";
import type { AdminTrackRecord, AdminTransitionView } from "@/lib/admin";
import {
  useAuditionAudioPlayer,
  type AuditionMode,
  type AutoMixSetting,
} from "./useAuditionAudioPlayer";

export type { AuditionMode, AutoMixSetting };

export interface TrackAuditionState {
  activeClipId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  pass: number;
  phase: "idle" | "playing" | "armed" | "bridge";
  autoMix: AutoMixSetting;
  auditionMode: AuditionMode;
  startNearHandover: boolean;
  pendingTransition: AdminTransitionView | null;
  bridgeElapsedSec: number;
  bridgeDurationSec: number;
  currentTrack: AdminTrackRecord;
  outTransitions: AdminTransitionView[];
  inTransitions: AdminTransitionView[];
  isLoading: boolean;
  error: string | null;
}

export interface TrackAuditionActions {
  playBeat: () => void;
  playTransition: (transition: AdminTransitionView) => void;
  testTransition: (
    transition: AdminTransitionView,
    mode?: AuditionMode,
  ) => void;
  jumpBeforeExit: (seconds?: number) => void;
  mixAtNextExit: () => void;
  stop: () => void;
  toggleLoop: () => void;
  seek: (timeSec: number) => void;
  setAutoMix: (mode: AutoMixSetting) => void;
  setAuditionMode: (mode: AuditionMode) => void;
  setStartNearHandover: (val: boolean) => void;
}

function useTransitionsLoader(trackId: string) {
  const [outTransitions, setOutTransitions] = useState<AdminTransitionView[]>(
    [],
  );
  const [inTransitions, setInTransitions] = useState<AdminTransitionView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTransitions() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/tracks/${trackId}/transitions`);
        if (!res.ok) throw new Error("Failed to load transitions");
        const json = await res.json();
        if (!cancelled) {
          setOutTransitions(json.outTransitions ?? []);
          setInTransitions(json.inTransitions ?? []);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadTransitions();
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  return { outTransitions, inTransitions, isLoading, error };
}

/**
 * Manages audio playback, seamless Web Audio transitions, and transition clip auditioning.
 * Mimics the boom-bap Frankenstein Transition Lab for testing beat loops and track handoffs.
 */
export function useTrackAudition(
  initialTrack: AdminTrackRecord,
  allTracks: AdminTrackRecord[] = [],
): TrackAuditionState & TrackAuditionActions {
  const [trackId, setTrackId] = useState(initialTrack.id);
  const [currentTrack, setCurrentTrack] =
    useState<AdminTrackRecord>(initialTrack);

  if (initialTrack.id !== trackId) {
    setTrackId(initialTrack.id);
    setCurrentTrack(initialTrack);
  }

  const { outTransitions, inTransitions, isLoading, error } =
    useTransitionsLoader(currentTrack.id);
  const player = useAuditionAudioPlayer(
    currentTrack,
    allTracks,
    outTransitions,
  );

  return {
    ...player,
    currentTrack,
    outTransitions,
    inTransitions,
    isLoading,
    error,
    playTransition: (tr) => player.testTransition(tr, "bridge"),
  };
}
