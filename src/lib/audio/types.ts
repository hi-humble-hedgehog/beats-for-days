import type { BeatView, TransitionView } from "../types/beat";

export type PlaybackPhase = "idle" | "playing" | "armed" | "bridge";

export interface AudioParamLike {
  value: number;
  setValueAtTime: (value: number, startTime: number) => void;
  setValueCurveAtTime: (
    values: Float32Array,
    startTime: number,
    duration: number,
  ) => void;
  cancelScheduledValues: (cancelTime: number) => void;
  exponentialRampToValueAtTime?: (value: number, endTime: number) => void;
  linearRampToValueAtTime?: (value: number, endTime: number) => void;
}

export interface AudioNodeLike {
  connect: (destination: AudioNodeLike) => AudioNodeLike | void;
  disconnect: () => void;
}

export interface GainNodeLike extends AudioNodeLike {
  gain: AudioParamLike;
}

export interface AnalyserNodeLike extends AudioNodeLike {
  fftSize: number;
  frequencyBinCount: number;
  getByteFrequencyData?: (array: Uint8Array) => void;
}

export interface AudioBufferLike {
  duration: number;
  length: number;
  numberOfChannels: number;
  sampleRate: number;
}

export interface AudioBufferSourceNodeLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  playbackRate?: AudioParamLike;
  start: (when?: number, offset?: number, duration?: number) => void;
  stop: (when?: number) => void;
  onended?: (() => void) | null;
}

export interface AudioContextLike {
  readonly currentTime: number;
  readonly state: AudioContextState;
  readonly destination: AudioNodeLike;
  createGain: () => GainNodeLike;
  createAnalyser?: () => AnalyserNodeLike;
  createBufferSource: () => AudioBufferSourceNodeLike;
  resume: () => Promise<void>;
  close?: () => Promise<void>;
}

export interface AudioEngineSnapshot {
  phase: PlaybackPhase;
  currentBeat: BeatView | null;
  positionSec: number;
  pass: number;
  secondsRemaining: number;
  continuousPlaySec: number;
  isPlaying: boolean;
}

export interface ArmedTransitionState {
  nextBeat: BeatView;
  transition: TransitionView;
  schedule: {
    targetPass: number;
    exitTime: number;
    bridgeStart: number;
    currentStopTime: number;
    nextStart: number;
    transitionStopTime: number;
  };
  transSource: AudioBufferSourceNodeLike;
  transGain: GainNodeLike;
  nextSource: AudioBufferSourceNodeLike;
  nextGain: GainNodeLike;
}

export type BufferLoader = (url: string) => Promise<AudioBufferLike>;

export interface AudioEngineOptions {
  contextFactory?: () => AudioContextLike;
  bufferLoader?: BufferLoader;
  cacheCapacity?: number;
  onTrackHandoff?: (nextBeat: BeatView) => void;
  vinylEffects?: boolean;
}
