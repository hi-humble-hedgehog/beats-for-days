import type { BeatView, TransitionView } from "../types/beat";
import {
  computeTransitionSchedule,
  getPlayheadAndPass,
  scheduleBridgeSpliceNodes,
} from "./scheduler";
import type {
  AnalyserNodeLike,
  ArmedTransitionState,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioEngineSnapshot,
  GainNodeLike,
  PlaybackPhase,
} from "./types";

export interface SnapshotCalculationParams {
  phase: PlaybackPhase;
  currentBeat: BeatView | null;
  isPlaying: boolean;
  audioCtxNow: number;
  hasCtx: boolean;
  pausedOffsetSec: number;
  continuousPlaySec: number;
  segmentStartTime: number;
  initialOffsetSec: number;
  armedTransition: ArmedTransitionState | null;
}

/**
 * Computes an immutable playback snapshot with playhead, pass count, and seconds remaining.
 *
 * Rationale:
 * Isolates audio clock math and state projection from playback orchestration so
 * engine state can be unit-tested deterministically and kept under file size limits.
 */
export function computeEngineSnapshot(
  params: SnapshotCalculationParams,
): AudioEngineSnapshot {
  const {
    phase,
    currentBeat,
    isPlaying,
    audioCtxNow,
    hasCtx,
    pausedOffsetSec,
    continuousPlaySec,
    segmentStartTime,
    initialOffsetSec,
    armedTransition,
  } = params;

  if (!currentBeat || !isPlaying || !hasCtx) {
    return {
      phase,
      currentBeat,
      positionSec: pausedOffsetSec,
      pass: 0,
      secondsRemaining: 0,
      continuousPlaySec,
      isPlaying,
    };
  }

  const playhead = getPlayheadAndPass({
    audioCtxNow,
    segmentStartTime,
    initialOffsetSec,
    entrySec: currentBeat.loopStartMs / 1000,
    exitSec: currentBeat.loopEndMs / 1000,
    durationSec: currentBeat.durationMs / 1000,
  });

  const targetTime = armedTransition
    ? phase === "bridge"
      ? armedTransition.schedule.nextStart
      : armedTransition.schedule.bridgeStart
    : audioCtxNow + playhead.secondsUntilExit;

  return {
    phase,
    currentBeat,
    positionSec: playhead.positionSec,
    pass: playhead.pass,
    secondsRemaining: Math.max(0, Math.ceil(targetTime - audioCtxNow)),
    continuousPlaySec,
    isPlaying,
  };
}

/**
 * Safely stops and disconnects all scheduled transition and incoming track audio nodes.
 *
 * Rationale:
 * Prevents memory leaks and ghost audio playback when an armed transition is superseded or cancelled.
 */
export function teardownArmedTransition(armed: ArmedTransitionState): void {
  try {
    armed.transSource.stop();
    armed.transSource.disconnect();
    armed.transGain.disconnect();
    armed.nextSource.stop();
    armed.nextSource.disconnect();
    armed.nextGain.disconnect();
  } catch {
    // Nodes already stopped
  }
}

/**
 * Safely stops and disconnects active track playback nodes.
 *
 * Rationale:
 * Cleans up active audio graph connections on pause or skip without throwing if already stopped.
 */
export function teardownTrackNodes(
  source: { stop: (when?: number) => void; disconnect: () => void } | null,
  gain: { disconnect: () => void } | null,
): void {
  if (source) {
    try {
      source.stop();
      source.disconnect();
    } catch {
      // Node was already stopped
    }
  }
  gain?.disconnect();
}

export interface FadeOutParams {
  gain: {
    gain: {
      setValueCurveAtTime: (v: Float32Array, t: number, d: number) => void;
    };
  } | null;
  source: { stop: (when?: number) => void } | null;
  fadeOut: Float32Array;
  bridgeStart: number;
  crossfadeSec: number;
  stopTime: number;
}

/**
 * Schedules equal-power fade out and stop for the currently playing source node.
 *
 * Rationale:
 * Decouples Web Audio schedule curves from AudioEngine class orchestration.
 */
export function fadeOutCurrentSource(params: FadeOutParams): void {
  const { gain, source, fadeOut, bridgeStart, crossfadeSec, stopTime } = params;
  if (!gain || !source) return;
  gain.gain.setValueCurveAtTime(fadeOut, bridgeStart, crossfadeSec);
  source.stop(stopTime);
}

export interface TrackTransitionParams {
  beat: BeatView;
  transition: TransitionView;
  audioCtxNow: number;
  segmentStartTime: number;
  initialOffsetSec: number;
}

/**
 * Computes transition scheduling parameters based on current beat loop boundaries.
 *
 * Rationale:
 * Packages timing and pass boundary resolution cleanly for AudioEngine splice orchestration.
 */
export function scheduleTrackTransition(params: TrackTransitionParams) {
  const { beat, transition, audioCtxNow, segmentStartTime, initialOffsetSec } =
    params;
  return computeTransitionSchedule({
    segmentStartTime,
    initialOffsetSec,
    entrySec: beat.loopStartMs / 1000,
    exitSec: beat.loopEndMs / 1000,
    audioCtxNow,
    transitionTiming: transition.timing,
    minPass: 1,
    leadSec: 0.4,
  });
}

/**
 * Creates bridge splice nodes, fades out the active source, and constructs the armed transition.
 *
 * Rationale:
 * Encapsulates audio node graph wiring and timing delays outside AudioEngine.
 */
export function buildArmedTransitionState(
  params: Parameters<typeof scheduleBridgeSpliceNodes>[0],
  gain: GainNodeLike | null,
  source: AudioBufferSourceNodeLike | null,
): {
  armed: ArmedTransitionState;
  delayMs: number;
} {
  const nodes = scheduleBridgeSpliceNodes(params);
  fadeOutCurrentSource({
    gain,
    source,
    fadeOut: nodes.fadeOut,
    bridgeStart: params.schedule.bridgeStart,
    crossfadeSec: nodes.crossfadeSec,
    stopTime: params.schedule.currentStopTime,
  });
  const armed: ArmedTransitionState = {
    nextBeat: params.nextBeat,
    transition: params.transition,
    schedule: params.schedule,
    transSource: nodes.transSource,
    transGain: nodes.transGain,
    nextSource: nodes.nextSource,
    nextGain: nodes.nextGain,
  };
  const delayMs = Math.max(
    0,
    (params.schedule.nextStart - params.ctx.currentTime) * 1000,
  );
  return { armed, delayMs };
}

/**
 * Extracts incoming track nodes and timing markers when completing a transition handoff.
 *
 * Rationale:
 * Provides structured state handoff mappings from the armed transition to active playback state.
 */
export function resolveHandoffState(armed: ArmedTransitionState) {
  return {
    currentBeat: armed.nextBeat,
    currentSource: armed.nextSource,
    currentGain: armed.nextGain,
    segmentStartTime: armed.schedule.nextStart,
    initialOffsetSec: armed.transition.timing.landMs / 1000,
  };
}

/**
 * Connects the active track gain node to the analyser and master gain.
 *
 * Rationale:
 * Wires the node into the audio graph with fallback when analyser is omitted.
 */
export function connectSourceToOutputs(
  gain: GainNodeLike,
  analyser: AnalyserNodeLike | null,
  masterGain: GainNodeLike,
): void {
  gain.connect(analyser ?? masterGain);
  if (analyser) analyser.connect(masterGain);
}

/**
 * Creates a browser AudioContext with webkit fallback.
 *
 * Rationale:
 * Encapsulates cross-browser AudioContext initialization outside AudioEngine methods.
 */
export function createDefaultAudioContext(): AudioContextLike {
  const AudioCtx =
    (typeof window !== "undefined"
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      : undefined) ||
    (typeof AudioContext !== "undefined" ? AudioContext : undefined);
  return new AudioCtx!() as unknown as AudioContextLike;
}

/**
 * Creates and connects the master gain node and optional spectrum analyser.
 *
 * Rationale:
 * Standardizes graph root setup and keeps AudioEngine initialization concise.
 */
export function setupMasterAudioGraph(ctx: AudioContextLike): {
  masterGain: GainNodeLike;
  analyser: AnalyserNodeLike | null;
} {
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  let analyser: AnalyserNodeLike | null = null;
  if (ctx.createAnalyser) {
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
  }
  return { masterGain, analyser };
}

/**
 * Fetches an audio file via HTTP and decodes it through the Web Audio context.
 *
 * Rationale:
 * Centralizes standard fetch-and-decode audio loading logic for default engine initialization.
 */
export async function fetchAndDecodeAudio(
  url: string,
  getContext: () => unknown,
) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch audio: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  const ctx = getContext() as AudioContext;
  return ctx.decodeAudioData(arrayBuffer);
}
