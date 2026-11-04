"use client";

import { useCallback } from "react";
import type { AdminTrackRecord, AdminTransitionView } from "@/lib/admin";
import type { AudioEngine } from "@/lib/audio/engine";
import {
  executeBlend,
  getOrCreateAudioEngine,
  resolveTrackAudioUrl,
  type AuditionMode,
} from "./audition-helpers";

interface BridgeDirectParams {
  activeClipId: string | null;
  isPlaying: boolean;
  setActiveClipId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPhase: (phase: "idle" | "playing" | "armed" | "bridge") => void;
  setBridgeDurationSec: (dur: number) => void;
}

function useBridgeDirectPlayer(params: BridgeDirectParams) {
  const {
    activeClipId,
    isPlaying,
    setActiveClipId,
    setIsPlaying,
    setPhase,
    setBridgeDurationSec,
  } = params;

  return useCallback(
    (audio: HTMLAudioElement, transition: AdminTransitionView) => {
      if (activeClipId === transition.id && isPlaying) {
        audio.pause();
        setIsPlaying(false);
        setPhase("idle");
        return;
      }
      audio.src = transition.audio_url;
      audio.load();
      setActiveClipId(transition.id);
      setIsPlaying(true);
      setPhase("bridge");
      setBridgeDurationSec(
        (transition.timing.glueMs + transition.timing.handleMs) / 1000,
      );
      void audio.play().catch(() => setIsPlaying(false));
    },
    [
      activeClipId,
      isPlaying,
      setActiveClipId,
      setBridgeDurationSec,
      setIsPlaying,
      setPhase,
    ],
  );
}

interface TransitionTesterParams {
  currentTrack: AdminTrackRecord;
  allTracks: AdminTrackRecord[];
  outTransitions: AdminTransitionView[];
  initAudio: () => HTMLAudioElement | null;
  engineRef: React.RefObject<AudioEngine | null>;
  auditionMode: AuditionMode;
  startNearHandover: boolean;
  currentTime: number;
  activeClipId: string | null;
  isPlaying: boolean;
  onJumpExit: (seconds: number) => void;
  setActiveClipId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPhase: (phase: "idle" | "playing" | "armed" | "bridge") => void;
  setPendingTransition: (t: AdminTransitionView | null) => void;
  setBridgeDurationSec: (dur: number) => void;
}

export function useAuditionTransitionTester(params: TransitionTesterParams) {
  const {
    currentTrack,
    allTracks,
    outTransitions,
    initAudio,
    engineRef,
    auditionMode,
    startNearHandover,
    currentTime,
    activeClipId,
    isPlaying,
    onJumpExit,
    setActiveClipId,
    setIsPlaying,
    setPhase,
    setPendingTransition,
    setBridgeDurationSec,
  } = params;

  const playBridgeDirect = useBridgeDirectPlayer({
    activeClipId,
    isPlaying,
    setActiveClipId,
    setIsPlaying,
    setPhase,
    setBridgeDurationSec,
  });

  const testTransition = useCallback(
    (transition: AdminTransitionView, mode: AuditionMode = auditionMode) => {
      const audio = initAudio();
      if (!audio) return;
      if (mode === "bridge") {
        playBridgeDirect(audio, transition);
        return;
      }

      setPendingTransition(transition);
      setPhase("armed");
      setActiveClipId(transition.id);
      if (startNearHandover) onJumpExit(8);

      if (!engineRef.current) engineRef.current = getOrCreateAudioEngine();
      const engine = engineRef.current;
      const target = allTracks.find((t) => t.id === transition.to_track_id);
      if (engine && target) {
        void executeBlend({
          engine,
          currentTrack,
          targetTrack: target,
          transition,
          outTransitions,
          startNearHandover,
          currentTime,
        }).then(() => setIsPlaying(true));
        return;
      }

      audio.src = transition.audio_url;
      audio.load();
      setIsPlaying(true);
      void audio.play().catch(() => setIsPlaying(false));
    },
    [
      allTracks,
      auditionMode,
      currentTrack,
      currentTime,
      engineRef,
      initAudio,
      onJumpExit,
      outTransitions,
      playBridgeDirect,
      setActiveClipId,
      setIsPlaying,
      setPendingTransition,
      setPhase,
      startNearHandover,
    ],
  );

  return { testTransition };
}

interface SeekParams {
  currentTrack: AdminTrackRecord;
  duration: number;
  initAudio: () => HTMLAudioElement | null;
  engineRef: React.RefObject<AudioEngine | null>;
  setCurrentTime: (time: number) => void;
}

function useAuditionSeek(params: SeekParams) {
  const { currentTrack, duration, initAudio, engineRef, setCurrentTime } =
    params;

  const jumpBeforeExit = useCallback(
    (seconds = 8) => {
      const targetTime = Math.max(
        currentTrack.loop_start_ms / 1000,
        currentTrack.loop_end_ms / 1000 - seconds,
      );
      const audio = initAudio();
      if (audio) audio.currentTime = targetTime;
      engineRef.current?.seek(targetTime);
      setCurrentTime(targetTime);
    },
    [
      currentTrack.loop_end_ms,
      currentTrack.loop_start_ms,
      engineRef,
      initAudio,
      setCurrentTime,
    ],
  );

  const seek = useCallback(
    (timeSec: number) => {
      const clamped = Math.max(0, Math.min(Math.max(duration, 1), timeSec));
      const audio = initAudio();
      if (audio) audio.currentTime = clamped;
      engineRef.current?.seek(clamped);
      setCurrentTime(clamped);
    },
    [duration, engineRef, initAudio, setCurrentTime],
  );

  return { jumpBeforeExit, seek };
}

interface TransportParams {
  currentTrack: AdminTrackRecord;
  initAudio: () => HTMLAudioElement | null;
  stopAudio: () => void;
  activeClipId: string | null;
  isPlaying: boolean;
  duration: number;
  engineRef: React.RefObject<AudioEngine | null>;
  setActiveClipId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (dur: number) => void;
  setPhase: (phase: "idle" | "playing" | "armed" | "bridge") => void;
  setPendingTransition: (t: AdminTransitionView | null) => void;
}

export function useAuditionPlayback(params: TransportParams) {
  const {
    currentTrack,
    initAudio,
    stopAudio,
    activeClipId,
    isPlaying,
    duration,
    engineRef,
    setActiveClipId,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setPhase,
    setPendingTransition,
  } = params;

  const { jumpBeforeExit, seek } = useAuditionSeek({
    currentTrack,
    duration,
    initAudio,
    engineRef,
    setCurrentTime,
  });

  const stop = useCallback(() => {
    stopAudio();
    engineRef.current?.pause();
    setIsPlaying(false);
    setActiveClipId(null);
    setPendingTransition(null);
    setPhase("idle");
  }, [
    engineRef,
    setActiveClipId,
    setIsPlaying,
    setPendingTransition,
    setPhase,
    stopAudio,
  ]);

  const playBeat = useCallback(() => {
    const audio = initAudio();
    if (!audio) return;
    if (activeClipId === "beat" && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setPhase("idle");
      return;
    }
    const beatUrl = resolveTrackAudioUrl(currentTrack);
    if (audio.src !== beatUrl && !audio.src.endsWith(beatUrl)) {
      audio.src = beatUrl;
      audio.load();
    }
    setActiveClipId("beat");
    setDuration(currentTrack.duration_ms / 1000);
    setIsPlaying(true);
    setPhase("playing");
    void audio.play().catch(() => setIsPlaying(false));
  }, [
    activeClipId,
    currentTrack,
    initAudio,
    isPlaying,
    setActiveClipId,
    setDuration,
    setIsPlaying,
    setPhase,
  ]);

  return { playBeat, jumpBeforeExit, stop, seek };
}
