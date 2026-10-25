import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioNodeLike,
  GainNodeLike,
} from "./types";
import { applyVinylSpinUp } from "./vinyl";

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
  const remaining = sourceLength - startSample;
  const targetSamples =
    options.durationSec !== undefined
      ? Math.min(
          remaining,
          Math.max(0, Math.floor(options.durationSec * sampleRate)),
        )
      : remaining;
  return { startSample, targetSamples };
}

/**
 * Creates an in-memory reversed AudioBuffer for authentic DJ backspin and reverse strokes.
 * Inverts sample data across channels since native Web Audio nodes do not support negative playback rates.
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
  bpm?: number;
  strokeCount?: number;
  strokeDurationSec?: number;
  strokeSpeed?: number;
}

export interface BabyScratchDropResult {
  releaseTime: number;
  strokeNodes: Array<{ source: AudioBufferSourceNodeLike; gain: GainNodeLike }>;
}

function resolveStrokeDuration(bpm?: number, customDuration?: number): number {
  if (customDuration && customDuration > 0) return customDuration;
  const safeBpm = bpm && bpm > 0 ? bpm : 90;
  return 60 / safeBpm;
}

function rampStrokeGain(
  gain: GainNodeLike,
  strokeStart: number,
  strokeStop: number,
): void {
  const g = gain.gain;
  g.setValueAtTime(0, strokeStart);
  if (typeof g.linearRampToValueAtTime === "function") {
    g.linearRampToValueAtTime(1, strokeStart + 0.005);
    g.setValueAtTime(1, strokeStop - 0.005);
    g.linearRampToValueAtTime(0, strokeStop);
  } else {
    g.setValueAtTime(1, strokeStart);
  }
}

interface StrokeScheduleOptions {
  ctx: AudioContextLike;
  buffer: AudioBufferLike;
  speed: number;
  strokeStart: number;
  strokeStop: number;
  bufferOffset: number;
  duration: number;
  outputNode: AudioNodeLike;
}

function scheduleSingleStroke(options: StrokeScheduleOptions): {
  source: AudioBufferSourceNodeLike;
  gain: GainNodeLike;
} {
  const {
    ctx,
    buffer,
    speed,
    strokeStart,
    strokeStop,
    bufferOffset,
    duration,
    outputNode,
  } = options;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = false;

  if (source.playbackRate) {
    source.playbackRate.setValueAtTime(speed, strokeStart);
  }

  const gain = ctx.createGain();
  rampStrokeGain(gain, strokeStart, strokeStop);

  source.connect(gain);
  gain.connect(outputNode);
  source.start(strokeStart, bufferOffset, duration);
  source.stop(strokeStop);

  return { source, gain };
}

/**
 * Schedules rhythmic forward and backward baby scratch strokes before dropping the beat on the 1.
 * Strokes follow 4th notes (quarter notes) at the track's BPM to align with the musical grid.
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
    strokeSpeed = 1.0,
  } = params;

  const strokeDurationSec = resolveStrokeDuration(
    params.bpm,
    params.strokeDurationSec,
  );
  const strokeNodes: Array<{
    source: AudioBufferSourceNodeLike;
    gain: GainNodeLike;
  }> = [];

  for (let i = 0; i < strokeCount; i++) {
    const isForward = i % 2 === 0;
    const strokeStart = startTime + i * strokeDurationSec;
    const strokeStop = strokeStart + strokeDurationSec;

    strokeNodes.push(
      scheduleSingleStroke({
        ctx,
        buffer: isForward ? forwardBuffer : reverseBuffer,
        speed: strokeSpeed,
        strokeStart,
        strokeStop,
        bufferOffset: isForward ? offsetSec : 0,
        duration: strokeDurationSec,
        outputNode,
      }),
    );
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
  bpm?: number;
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
    bpm = 90,
  } = options;

  const validBpm = bpm > 0 ? bpm : 90;
  const strokeDurationSec = 60 / validBpm;

  const revBuffer =
    vinylEffects && startEffect === "baby-scratch"
      ? createReversedAudioBuffer(ctx, buffer, {
          startSec: offsetSec,
          durationSec: strokeDurationSec,
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
      bpm: validBpm,
      strokeDurationSec,
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
