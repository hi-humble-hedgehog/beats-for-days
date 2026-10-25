import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  GainNodeLike,
} from "./types";

export interface VinylSpinUpOptions {
  source: AudioBufferSourceNodeLike | null;
  startTime: number;
  durationSec?: number;
  startRate?: number;
}

export interface VinylBrakeOptions {
  source: AudioBufferSourceNodeLike | null;
  gain: GainNodeLike | null;
  currentTime: number;
  durationSec?: number;
}

export interface VinylScratchOptions {
  source: AudioBufferSourceNodeLike | null;
  currentTime: number;
  rateMultiplier: number;
  durationSec?: number;
}

function rampParamDown(
  param: AudioParamLike | undefined,
  currentTime: number,
  stopTime: number,
): void {
  if (!param) return;
  try {
    const currentVal = Math.max(0.001, param.value || 1.0);
    param.cancelScheduledValues(currentTime);
    param.setValueAtTime(currentVal, currentTime);

    if (typeof param.exponentialRampToValueAtTime === "function") {
      param.exponentialRampToValueAtTime(0.001, stopTime);
    } else if (typeof param.linearRampToValueAtTime === "function") {
      param.linearRampToValueAtTime(0, stopTime);
    }
  } catch {
    // Ignore parameter schedule conflicts in hardware nodes
  }
}

/**
 * Automates playback rate spin-up to recreate authentic turntable motor start inertia.
 * Ramps smoothly from a low pitch up to normal playback speed.
 */
export function applyVinylSpinUp(options: VinylSpinUpOptions): void {
  const { source, startTime, durationSec = 0.25, startRate = 0.25 } = options;
  if (!source?.playbackRate) return;

  try {
    const rate = source.playbackRate;
    const safeStart = Math.max(0.001, startRate);
    rate.cancelScheduledValues(startTime);
    rate.setValueAtTime(safeStart, startTime);

    if (typeof rate.exponentialRampToValueAtTime === "function") {
      rate.exponentialRampToValueAtTime(1.0, startTime + durationSec);
    } else if (typeof rate.linearRampToValueAtTime === "function") {
      rate.linearRampToValueAtTime(1.0, startTime + durationSec);
    } else {
      rate.setValueAtTime(1.0, startTime);
    }
  } catch {
    // Ignore parameter schedule conflicts
  }
}

/**
 * Automates turntable motor brake on playback pause or track stop.
 * Drops playback pitch and volume exponentially to mimic turntable power-down without digital clicks.
 */
export function applyVinylBrake(options: VinylBrakeOptions): void {
  const { source, gain, currentTime, durationSec = 0.45 } = options;
  if (!source) return;

  const stopTime = currentTime + durationSec;

  rampParamDown(source.playbackRate, currentTime, stopTime);
  rampParamDown(gain?.gain, currentTime, stopTime);

  try {
    source.stop(stopTime);
  } catch {
    // Gracefully catch if node was already stopped
  }
}

/**
 * Automates transient turntable pitch and speed modulation for DJ scratch effects.
 * Temporarily shifts playback rate before returning to normal speed.
 */
export function applyVinylScratch(options: VinylScratchOptions): void {
  const { source, currentTime, rateMultiplier, durationSec = 0.16 } = options;
  if (!source?.playbackRate) return;

  try {
    const rate = source.playbackRate;
    const clampedMultiplier = Math.max(0.05, Math.min(3.0, rateMultiplier));
    const halfDuration = durationSec / 2;
    const currentRate = Math.max(0.001, rate.value || 1.0);

    rate.cancelScheduledValues(currentTime);
    rate.setValueAtTime(currentRate, currentTime);

    if (typeof rate.exponentialRampToValueAtTime === "function") {
      rate.exponentialRampToValueAtTime(
        clampedMultiplier,
        currentTime + halfDuration,
      );
      rate.exponentialRampToValueAtTime(1.0, currentTime + durationSec);
    } else if (typeof rate.linearRampToValueAtTime === "function") {
      rate.linearRampToValueAtTime(
        clampedMultiplier,
        currentTime + halfDuration,
      );
      rate.linearRampToValueAtTime(1.0, currentTime + durationSec);
    } else {
      rate.setValueAtTime(1.0, currentTime);
    }
  } catch {
    // Ignore parameter schedule conflicts
  }
}

export interface ReverseBufferOptions {
  startSec?: number;
  durationSec?: number;
}

function computeSliceRange(
  sourceLength: number,
  sampleRate: number,
  options: ReverseBufferOptions,
): { startSample: number; targetSamples: number } {
  const startSec = Math.max(0, options.startSec ?? 0);
  const startSample = Math.min(sourceLength, Math.floor(startSec * sampleRate));
  const maxAvailable = sourceLength - startSample;
  const targetSamples =
    options.durationSec !== undefined
      ? Math.min(maxAvailable, Math.floor(options.durationSec * sampleRate))
      : maxAvailable;
  return { startSample, targetSamples };
}

/**
 * Creates a reversed copy of an AudioBuffer (or a specified time slice) for backward playback.
 * Used for DJ baby scratches, reverse sound design, and bidirectional vinyl scrubbing.
 */
export function createReversedAudioBuffer(
  ctx: AudioContextLike,
  sourceBuffer: AudioBufferLike,
  options: ReverseBufferOptions = {},
): AudioBufferLike | null {
  if (
    !ctx.createBuffer ||
    !sourceBuffer.getChannelData ||
    sourceBuffer.length <= 0
  ) {
    return null;
  }

  const { startSample, targetSamples } = computeSliceRange(
    sourceBuffer.length,
    sourceBuffer.sampleRate,
    options,
  );
  if (targetSamples <= 0) return null;

  const reversed = ctx.createBuffer(
    sourceBuffer.numberOfChannels,
    targetSamples,
    sourceBuffer.sampleRate,
  );
  if (!reversed.getChannelData) return reversed;

  for (let c = 0; c < sourceBuffer.numberOfChannels; c++) {
    const srcData = sourceBuffer.getChannelData(c);
    const destData = reversed.getChannelData(c);
    for (let i = 0; i < targetSamples; i++) {
      destData[i] = srcData[startSample + targetSamples - 1 - i] ?? 0;
    }
  }

  return reversed;
}

export interface BabyScratchDropParams {
  ctx: AudioContextLike;
  forwardBuffer: AudioBufferLike;
  reverseBuffer: AudioBufferLike;
  outputNode: AudioNodeLike;
  startTime: number;
  offsetSec?: number;
  strokeCount?: number;
  strokeDurationSec?: number;
  strokeSpeed?: number;
}

export interface BabyScratchDropResult {
  releaseTime: number;
  strokeNodes: Array<{ source: AudioBufferSourceNodeLike; gain: GainNodeLike }>;
}

/**
 * Schedules rhythmic forward and backward baby scratch strokes before dropping the beat on the 1.
 * Renders the iconic hip-hop DJ needle cue pattern without manual turntable hardware.
 */
export function scheduleBabyScratchDrop(
  params: BabyScratchDropParams,
): BabyScratchDropResult {
  const {
    ctx,
    forwardBuffer,
    reverseBuffer,
    outputNode,
    startTime,
    offsetSec = 0,
    strokeCount = 4,
    strokeDurationSec = 0.075,
    strokeSpeed = 1.25,
  } = params;

  const strokeNodes: Array<{
    source: AudioBufferSourceNodeLike;
    gain: GainNodeLike;
  }> = [];

  for (let i = 0; i < strokeCount; i++) {
    const isForward = i % 2 === 0;
    const strokeStart = startTime + i * strokeDurationSec;
    const strokeStop = strokeStart + strokeDurationSec;

    const source = ctx.createBufferSource();
    source.buffer = isForward ? forwardBuffer : reverseBuffer;
    source.loop = false;

    if (source.playbackRate) {
      source.playbackRate.setValueAtTime(strokeSpeed, strokeStart);
    }

    const gain = ctx.createGain();
    const g = gain.gain;
    g.setValueAtTime(0, strokeStart);
    if (typeof g.linearRampToValueAtTime === "function") {
      g.linearRampToValueAtTime(1, strokeStart + 0.003);
      g.setValueAtTime(1, strokeStop - 0.003);
      g.linearRampToValueAtTime(0, strokeStop);
    } else {
      g.setValueAtTime(1, strokeStart);
    }

    source.connect(gain);
    gain.connect(outputNode);

    const bufferOffset = isForward ? offsetSec : 0;
    source.start(strokeStart, bufferOffset, strokeDurationSec);
    source.stop(strokeStop);

    strokeNodes.push({ source, gain });
  }

  const releaseTime = startTime + strokeCount * strokeDurationSec;
  return { releaseTime, strokeNodes };
}

/**
 * Safely stops and disconnects all transient baby scratch nodes.
 */
export function teardownScratchNodes(nodes: AudioBufferSourceNodeLike[]): void {
  for (const node of nodes) {
    try {
      node.stop();
      node.disconnect();
    } catch {
      // Node was already stopped
    }
  }
}

export interface StartTrackVinylOptions {
  ctx: AudioContextLike;
  source: AudioBufferSourceNodeLike;
  buffer: AudioBufferLike;
  outputNode: AudioNodeLike;
  offsetSec: number;
  vinylEffects: boolean;
  startEffect: "spin-up" | "baby-scratch";
}

export interface StartTrackVinylResult {
  segmentStartTime: number;
  strokeSources: AudioBufferSourceNodeLike[];
}

/**
 * Starts track playback with either baby-scratch drop or motor spin-up based on configuration.
 */
export function startTrackWithVinylEffect(
  options: StartTrackVinylOptions,
): StartTrackVinylResult {
  const {
    ctx,
    source,
    buffer,
    outputNode,
    offsetSec,
    vinylEffects,
    startEffect,
  } = options;

  const revBuffer =
    vinylEffects && startEffect === "baby-scratch"
      ? createReversedAudioBuffer(ctx, buffer, {
          startSec: offsetSec,
          durationSec: 0.15,
        })
      : null;

  if (revBuffer) {
    const drop = scheduleBabyScratchDrop({
      ctx,
      forwardBuffer: buffer,
      reverseBuffer: revBuffer,
      outputNode,
      startTime: ctx.currentTime,
      offsetSec,
    });
    source.start(drop.releaseTime, offsetSec);
    return {
      segmentStartTime: drop.releaseTime,
      strokeSources: drop.strokeNodes.map((n) => n.source),
    };
  }

  source.start(ctx.currentTime, offsetSec);
  if (vinylEffects) {
    applyVinylSpinUp({ source, startTime: ctx.currentTime });
  }

  return {
    segmentStartTime: ctx.currentTime,
    strokeSources: [],
  };
}
