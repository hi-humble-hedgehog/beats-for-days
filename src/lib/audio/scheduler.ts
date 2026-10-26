import type { BeatView, TransitionTiming, TransitionView } from "../types/beat";
import type { AudioBufferLike, AudioContextLike, GainNodeLike } from "./types";

export interface PlayheadOptions {
  audioCtxNow: number;
  segmentStartTime: number;
  initialOffsetSec: number;
  entrySec: number;
  exitSec: number;
  durationSec: number;
}

export interface PlayheadSnapshot {
  positionSec: number;
  pass: number;
  secondsUntilExit: number;
}

export interface ExitContextTimeOptions {
  segmentStartTime: number;
  initialOffsetSec: number;
  entrySec: number;
  exitSec: number;
  pass: number;
}

export interface TransitionScheduleOptions {
  segmentStartTime: number;
  initialOffsetSec: number;
  entrySec: number;
  exitSec: number;
  audioCtxNow: number;
  transitionTiming: TransitionTiming;
  minPass?: number;
  leadSec?: number;
}

export interface TransitionSchedule {
  targetPass: number;
  exitTime: number;
  bridgeStart: number;
  currentStopTime: number;
  nextStart: number;
  transitionStopTime: number;
}

export interface AutoResolutionOptions {
  continuousPlaySec: number;
  resolveAfterSec: number;
  isArmed: boolean;
  isResolving: boolean;
}

/**
 * Calculates current playhead position, loop pass count, and time remaining until loop exit.
 * Accounts for initial playback offsets and modulo wrap-around between loop markers.
 */
export function getPlayheadAndPass(options: PlayheadOptions): PlayheadSnapshot {
  const {
    audioCtxNow,
    segmentStartTime,
    initialOffsetSec,
    entrySec,
    exitSec,
    durationSec,
  } = options;

  const pass0Duration = Math.max(0, exitSec - initialOffsetSec);
  const loopDuration = Math.max(0.001, exitSec - entrySec);
  const elapsed = audioCtxNow - segmentStartTime;

  if (elapsed < 0) {
    return {
      pass: 0,
      positionSec: initialOffsetSec,
      secondsUntilExit: segmentStartTime - audioCtxNow + pass0Duration,
    };
  }

  if (elapsed < pass0Duration) {
    const rawPos = initialOffsetSec + elapsed;
    const positionSec = Math.min(rawPos, durationSec);
    return {
      pass: 0,
      positionSec,
      secondsUntilExit: pass0Duration - elapsed,
    };
  }

  const loopElapsed = elapsed - pass0Duration;
  const pass = 1 + Math.floor(loopElapsed / loopDuration);
  const rem = loopElapsed % loopDuration;
  const rawPos = entrySec + rem;
  const positionSec = Math.min(rawPos, durationSec);

  return {
    pass,
    positionSec,
    secondsUntilExit: loopDuration - rem,
  };
}

/**
 * Computes the exact AudioContext timestamp when a track will reach its loop exit on a given pass.
 * Enables sample-accurate scheduling for transition cutovers.
 */
export function getExitContextTime(options: ExitContextTimeOptions): number {
  const { segmentStartTime, initialOffsetSec, entrySec, exitSec, pass } =
    options;
  const pass0Duration = Math.max(0, exitSec - initialOffsetSec);
  const loopDuration = Math.max(0.001, exitSec - entrySec);
  return segmentStartTime + pass0Duration + pass * loopDuration;
}

/**
 * Computes Web Audio schedule timestamps for a 3-node transition splice.
 * Finds the earliest loop pass that satisfies safety lookahead and transition handles.
 */
export function computeTransitionSchedule(
  options: TransitionScheduleOptions,
): TransitionSchedule {
  const {
    segmentStartTime,
    initialOffsetSec,
    entrySec,
    exitSec,
    audioCtxNow,
    transitionTiming,
    minPass = 1,
    leadSec = 0.4,
  } = options;

  const handleSec = transitionTiming.handleMs / 1000;
  const crossfadeSec = transitionTiming.crossfadeMs / 1000;
  const glueSec = transitionTiming.glueMs / 1000;

  let targetPass = Math.max(0, minPass);
  let exitTime = getExitContextTime({
    segmentStartTime,
    initialOffsetSec,
    entrySec,
    exitSec,
    pass: targetPass,
  });

  while (exitTime - handleSec < audioCtxNow + leadSec) {
    targetPass += 1;
    exitTime = getExitContextTime({
      segmentStartTime,
      initialOffsetSec,
      entrySec,
      exitSec,
      pass: targetPass,
    });
  }

  const bridgeStart = exitTime - handleSec;
  const currentStopTime = bridgeStart + crossfadeSec + 0.02;
  const nextStart = exitTime + glueSec;
  const transitionStopTime = nextStart + crossfadeSec + 0.02;

  return {
    targetPass,
    exitTime,
    bridgeStart,
    currentStopTime,
    nextStart,
    transitionStopTime,
  };
}

/**
 * Determines whether continuous playback duration has reached the auto-advance threshold.
 * Prevents re-triggering while a transition is already resolving or scheduled.
 */
export function shouldTriggerAutoResolution(
  options: AutoResolutionOptions,
): boolean {
  return (
    options.continuousPlaySec >= options.resolveAfterSec &&
    !options.isArmed &&
    !options.isResolving
  );
}

/**
 * Generates an equal-power sine/cosine crossfade curve for AudioParam.setValueCurveAtTime.
 * Preserves constant acoustic energy during audio splices without center volume dips.
 */
export function equalPowerCurve(
  direction: "in" | "out",
  length = 128,
): Float32Array {
  const curve = new Float32Array(length);
  const lastIndex = Math.max(1, length - 1);

  for (let i = 0; i < length; i++) {
    const t = i / lastIndex;
    curve[i] =
      direction === "in"
        ? Math.sin((t * Math.PI) / 2)
        : Math.cos((t * Math.PI) / 2);
  }

  return curve;
}

export interface SpliceNodeParams {
  ctx: AudioContextLike;
  masterGain: GainNodeLike;
  transBuffer: AudioBufferLike;
  nextBuffer: AudioBufferLike;
  nextBeat: BeatView;
  transition: TransitionView;
  schedule: TransitionSchedule;
}

/**
 * Creates a looping AudioBufferSourceNode and GainNode pair configured with a beat's loop markers.
 */
export function createLoopingTrackNodes(
  ctx: AudioContextLike,
  buffer: AudioBufferLike,
  beat: BeatView,
) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = beat.loopStartMs / 1000;
  source.loopEnd = beat.loopEndMs / 1000;
  const gain = ctx.createGain();
  source.connect(gain);
  return { source, gain };
}

/**
 * Creates and schedules Web Audio transition and incoming track nodes with equal-power crossfades.
 */
export function scheduleBridgeSpliceNodes(params: SpliceNodeParams) {
  const {
    ctx,
    masterGain,
    transBuffer,
    nextBuffer,
    nextBeat,
    transition,
    schedule,
  } = params;
  const crossfadeSec = transition.timing.crossfadeMs / 1000;
  const fadeOut = equalPowerCurve("out");
  const fadeIn = equalPowerCurve("in");

  const transSource = ctx.createBufferSource();
  transSource.buffer = transBuffer;
  transSource.loop = false;
  const transGain = ctx.createGain();
  transGain.gain.setValueAtTime(0, ctx.currentTime);
  transGain.gain.setValueCurveAtTime(
    fadeIn,
    schedule.bridgeStart,
    crossfadeSec,
  );
  transGain.gain.setValueCurveAtTime(fadeOut, schedule.nextStart, crossfadeSec);
  transSource.connect(transGain);
  transGain.connect(masterGain);
  transSource.start(schedule.bridgeStart, 0);
  transSource.stop(schedule.transitionStopTime);

  const { source: nextSource, gain: nextGain } = createLoopingTrackNodes(
    ctx,
    nextBuffer,
    nextBeat,
  );
  nextGain.gain.setValueAtTime(0, ctx.currentTime);
  nextGain.gain.setValueCurveAtTime(fadeIn, schedule.nextStart, crossfadeSec);
  nextGain.connect(masterGain);
  nextSource.start(schedule.nextStart, transition.timing.landMs / 1000);

  return {
    transSource,
    transGain,
    nextSource,
    nextGain,
    fadeOut,
    crossfadeSec,
  };
}
