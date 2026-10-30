"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminTrackRecord, AdminTransitionView } from "@/lib/admin";

interface TrackAuditionState {
  activeClipId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  isLoading: boolean;
  error: string | null;
  outTransitions: AdminTransitionView[];
  inTransitions: AdminTransitionView[];
}

interface TrackAuditionActions {
  playBeat: () => void;
  playTransition: (transition: AdminTransitionView) => void;
  stop: () => void;
  toggleLoop: () => void;
  seek: (timeSec: number) => void;
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

function playAudioClip(audio: HTMLAudioElement, url: string) {
  if (audio.src !== url && !audio.src.endsWith(url)) {
    audio.src = url;
    audio.load();
  }
}

interface AudioHandlers {
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onMetadata: (dur: number) => void;
}

function attachAudioHandlers(audio: HTMLAudioElement, handlers: AudioHandlers) {
  audio.addEventListener("timeupdate", () =>
    handlers.onTimeUpdate(audio.currentTime),
  );
  audio.addEventListener("ended", handlers.onEnded);
  audio.addEventListener("loadedmetadata", () => {
    if (audio.duration && Number.isFinite(audio.duration)) {
      handlers.onMetadata(audio.duration);
    }
  });
}

function initAuditionAudio(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  getIsLooping: () => boolean,
  loopRange: { start: number; end: number },
  handlers: AudioHandlers,
): HTMLAudioElement | null {
  if (!audioRef.current && typeof window !== "undefined") {
    const audio = new Audio();
    audioRef.current = audio;
    attachAudioHandlers(audio, {
      onTimeUpdate: (time) => {
        handlers.onTimeUpdate(time);
        if (getIsLooping() && time >= loopRange.end) {
          audio.currentTime = loopRange.start;
        }
      },
      onEnded: handlers.onEnded,
      onMetadata: handlers.onMetadata,
    });
  }
  return audioRef.current;
}

function useAudioCleanup(audioRef: React.RefObject<HTMLAudioElement | null>) {
  useEffect(() => {
    return () => {
      // Audio element is initialized lazily; cleanup must pause current instance on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioRef.current?.pause();
    };
  }, [audioRef]);
}

function useAuditionAudioPlayer(track: AdminTrackRecord) {
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.duration_ms / 1000);
  const [isLooping, setIsLooping] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isLoopingRef = useRef(isLooping);
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useAudioCleanup(audioRef);

  const initAudio = useCallback(() => {
    return initAuditionAudio(
      audioRef,
      () => isLoopingRef.current,
      { start: track.loop_start_ms / 1000, end: track.loop_end_ms / 1000 },
      {
        onTimeUpdate: (t) => setCurrentTime(t),
        onEnded: () => {
          setIsPlaying(false);
          setActiveClipId(null);
        },
        onMetadata: (dur) => setDuration(dur),
      },
    );
  }, [track.loop_end_ms, track.loop_start_ms]);

  const toggleClip = useCallback(
    (clipId: string, url: string, newDuration?: number) => {
      const audio = initAudio();
      if (!audio) return;
      if (activeClipId === clipId && isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }
      if (newDuration !== undefined) setDuration(newDuration);
      playAudioClip(audio, url);
      setActiveClipId(clipId);
      setIsPlaying(true);
      void audio.play().catch(() => setIsPlaying(false));
    },
    [activeClipId, initAudio, isPlaying],
  );

  return {
    activeClipId,
    isPlaying,
    currentTime,
    duration,
    isLooping,
    playBeat: () =>
      toggleClip(
        "beat",
        track.audio_url || `/audio/${track.audio_path}`,
        track.duration_ms / 1000,
      ),
    playTransition: (tr: AdminTransitionView) =>
      toggleClip(tr.id, tr.audio_url),
    stop: () => {
      audioRef.current?.pause();
      setIsPlaying(false);
      setActiveClipId(null);
    },
    toggleLoop: () => setIsLooping((prev) => !prev),
    seek: (timeSec: number) => {
      if (audioRef.current) audioRef.current.currentTime = timeSec;
      setCurrentTime(timeSec);
    },
  };
}

/**
 * Manages audio playback and transitions loading for admin track auditioning.
 * Coordinates play/pause between the main beat and its connected transitions.
 */
export function useTrackAudition(
  track: AdminTrackRecord,
): TrackAuditionState & TrackAuditionActions {
  const { outTransitions, inTransitions, isLoading, error } =
    useTransitionsLoader(track.id);
  const player = useAuditionAudioPlayer(track);

  return {
    ...player,
    outTransitions,
    inTransitions,
    isLoading,
    error,
  };
}
