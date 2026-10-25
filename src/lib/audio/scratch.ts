import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioNodeLike,
  GainNodeLike,
} from "./types";

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
 * Creates an in-memory reversed AudioBuffer for authentic DJ backspin and reverse scratching.
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

export interface ScratchSession {
  readonly ctx: AudioContextLike;
  readonly forwardBuffer: AudioBufferLike;
  readonly reverseBuffer: AudioBufferLike | null;
  readonly outputNode: AudioNodeLike;
  readonly gain: GainNodeLike;
  source: AudioBufferSourceNodeLike | null;
  direction: "forward" | "reverse" | "idle";
  positionSec: number;
}

export interface CreateScratchOptions {
  ctx: AudioContextLike;
  forwardBuffer: AudioBufferLike;
  reverseBuffer: AudioBufferLike | null;
  outputNode: AudioNodeLike;
  initialPositionSec: number;
}

/**
 * Initializes a live manual scratch session with a dedicated gain node.
 */
export function createScratchSession(
  options: CreateScratchOptions,
): ScratchSession {
  const { ctx, forwardBuffer, reverseBuffer, outputNode, initialPositionSec } =
    options;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.connect(outputNode);

  return {
    ctx,
    forwardBuffer,
    reverseBuffer,
    outputNode,
    gain,
    source: null,
    direction: "idle",
    positionSec: initialPositionSec,
  };
}

function stopCurrentScratchSource(session: ScratchSession): void {
  if (!session.source) return;
  try {
    session.source.stop();
    session.source.disconnect();
  } catch {
    // Graceful cleanup
  }
  session.source = null;
}

function switchScratchVoice(
  session: ScratchSession,
  isForward: boolean,
  rate: number,
): void {
  stopCurrentScratchSource(session);
  const buffer = isForward ? session.forwardBuffer : session.reverseBuffer;
  if (!buffer) return;

  const source = session.ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = false;
  if (source.playbackRate) {
    source.playbackRate.setValueAtTime(rate, session.ctx.currentTime);
  }

  const offset = isForward
    ? session.positionSec
    : Math.max(0, session.forwardBuffer.duration - session.positionSec);

  source.connect(session.gain);
  source.start(session.ctx.currentTime, offset);
  session.source = source;
  session.direction = isForward ? "forward" : "reverse";
}

/**
 * Updates the manual scratch playback rate and direction based on pointer movement velocity.
 */
export function updateScratchSession(
  session: ScratchSession,
  velocity: number,
  deltaSec: number,
): void {
  const nextPos = session.positionSec + velocity * deltaSec;
  session.positionSec = Math.max(
    0,
    Math.min(session.forwardBuffer.duration, nextPos),
  );

  const absSpeed = Math.abs(velocity);
  if (absSpeed < 0.05) {
    session.gain.gain.setValueAtTime(0, session.ctx.currentTime);
    session.direction = "idle";
    return;
  }

  const isForward = velocity > 0;
  const rate = Math.max(0.1, Math.min(3.5, absSpeed));
  const newDirection = isForward ? "forward" : "reverse";

  session.gain.gain.setValueAtTime(1, session.ctx.currentTime);

  if (session.direction === newDirection && session.source?.playbackRate) {
    session.source.playbackRate.setValueAtTime(rate, session.ctx.currentTime);
    return;
  }

  switchScratchVoice(session, isForward, rate);
}

/**
 * Stops the manual scratch session and returns the final needle position.
 */
export function stopScratchSession(session: ScratchSession): number {
  stopCurrentScratchSource(session);
  try {
    session.gain.disconnect();
  } catch {
    // Ignore if already disconnected
  }
  return session.positionSec;
}

/**
 * High-level coordinator managing live manual turntable scratch sessions.
 */
export class ScratchController {
  private session: ScratchSession | null = null;
  private reversedBuffer: AudioBufferLike | null = null;

  /**
   * Begins a live scratch session, preparing reversed channel buffers when needed.
   */
  start(
    ctx: AudioContextLike,
    buffer: AudioBufferLike,
    outputNode: AudioNodeLike,
    positionSec: number,
  ): void {
    if (!this.reversedBuffer) {
      this.reversedBuffer = createReversedAudioBuffer(ctx, buffer);
    }
    this.session = createScratchSession({
      ctx,
      forwardBuffer: buffer,
      reverseBuffer: this.reversedBuffer,
      outputNode,
      initialPositionSec: positionSec,
    });
  }

  /**
   * Modulates scratch playback speed and direction in real-time.
   */
  update(velocity: number, deltaSec: number): void {
    if (!this.session) return;
    updateScratchSession(this.session, velocity, deltaSec);
  }

  /**
   * Concludes the live scratch session and returns the updated position.
   */
  stop(): number | null {
    if (!this.session) return null;
    const finalPos = stopScratchSession(this.session);
    this.session = null;
    return finalPos;
  }

  /**
   * Resets internal cached buffers when unloading or changing tracks.
   */
  reset(): void {
    this.stop();
    this.reversedBuffer = null;
  }
}
