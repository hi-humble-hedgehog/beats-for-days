"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminTrackRecord, AdminTransitionView } from "@/lib/admin";
import type { AudioEngine } from "@/lib/audio/engine";
import {
  attachAudioListeners,
  type AuditionMode,
  type AutoMixSetting,
} from "./audition-helpers";
import {
  useAuditionPlayback,
  useAuditionTransitionTester,
} from "./useAuditionTransport";

export type { AuditionMode, AutoMixSetting };

function useAuditionAudioElement(
  onTime: (audio: HTMLAudioElement) => void,
  onEnd: () => void,
  onDur: (d: number) => void,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const initAudio = useCallback(() => {
    if (!audioRef.current && typeof window !== "undefined") {
      const audio = new Audio();
      audioRef.current = audio;
      attachAudioListeners(audio, {
        onTimeUpdate: () => onTime(audio),
        onEnded: onEnd,
        onDuration: onDur,
      });
    }
    return audioRef.current;
  }, [onDur, onEnd, onTime]);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return { initAudio, stopAudio };
}

function useAuditionState(currentTrack: AdminTrackRecord) {
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentTrack.duration_ms / 1000);
  const [isLooping, setIsLooping] = useState(true);
  const [pass, setPass] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "armed" | "bridge">(
    "idle",
  );
  const [autoMix, setAutoMix] = useState<AutoMixSetting>("off");
  const [auditionMode, setAuditionMode] = useState<AuditionMode>("blend");
  const [startNearHandover, setStartNearHandover] = useState(true);
  const [pendingTransition, setPendingTransition] =
    useState<AdminTransitionView | null>(null);
  const [bridgeDurationSec, setBridgeDurationSec] = useState(0);

  return {
    activeClipId,
    setActiveClipId,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    isLooping,
    pass,
    setPass,
    phase,
    setPhase,
    autoMix,
    setAutoMix,
    auditionMode,
    setAuditionMode,
    startNearHandover,
    setStartNearHandover,
    pendingTransition,
    setPendingTransition,
    bridgeElapsedSec: 0,
    bridgeDurationSec,
    setBridgeDurationSec,
    toggleLoop: () => setIsLooping((l) => !l),
  };
}

/** Hook managing audio player transport, Web Audio engine, and transition blends. */
export function useAuditionAudioPlayer(
  currentTrack: AdminTrackRecord,
  allTracks: AdminTrackRecord[],
  outTransitions: AdminTransitionView[],
) {
  const s = useAuditionState(currentTrack);
  const loopRef = useRef(s.isLooping);
  const currentTrackRef = useRef(currentTrack);
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    loopRef.current = s.isLooping;
    currentTrackRef.current = currentTrack;
  }, [s.isLooping, currentTrack]);

  const { initAudio, stopAudio } = useAuditionAudioElement(
    (audio) => {
      s.setCurrentTime(audio.currentTime);
      const endSec = currentTrackRef.current.loop_end_ms / 1000;
      const startSec = currentTrackRef.current.loop_start_ms / 1000;
      if (loopRef.current && audio.currentTime >= endSec) {
        audio.currentTime = startSec;
        s.setPass((p) => p + 1);
      }
    },
    () => {
      s.setIsPlaying(false);
      s.setActiveClipId(null);
      s.setPhase("idle");
    },
    (dur) => s.setDuration(dur),
  );

  const playback = useAuditionPlayback({
    currentTrack,
    initAudio,
    stopAudio,
    activeClipId: s.activeClipId,
    isPlaying: s.isPlaying,
    duration: s.duration,
    engineRef,
    setActiveClipId: s.setActiveClipId,
    setIsPlaying: s.setIsPlaying,
    setCurrentTime: s.setCurrentTime,
    setDuration: s.setDuration,
    setPhase: s.setPhase,
    setPendingTransition: s.setPendingTransition,
  });

  const tester = useAuditionTransitionTester({
    currentTrack,
    allTracks,
    outTransitions,
    initAudio,
    engineRef,
    auditionMode: s.auditionMode,
    startNearHandover: s.startNearHandover,
    currentTime: s.currentTime,
    activeClipId: s.activeClipId,
    isPlaying: s.isPlaying,
    onJumpExit: playback.jumpBeforeExit,
    setActiveClipId: s.setActiveClipId,
    setIsPlaying: s.setIsPlaying,
    setPhase: s.setPhase,
    setPendingTransition: s.setPendingTransition,
    setBridgeDurationSec: s.setBridgeDurationSec,
  });

  const mixAtNextExit = useCallback(() => {
    const firstOut = outTransitions[0];
    if (firstOut) tester.testTransition(firstOut, "blend");
  }, [outTransitions, tester]);

  return {
    ...s,
    ...playback,
    testTransition: tester.testTransition,
    mixAtNextExit,
  };
}
