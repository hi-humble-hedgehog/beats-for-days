import type { BeatView, TransitionView } from "../types/beat";
import type { BoundedAudioCache } from "./cache";
import {
  buildArmedTransitionState,
  resolveHandoffState,
  scheduleTrackTransition,
  teardownArmedTransition,
} from "./snapshot";
import type {
  ArmedTransitionState,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  GainNodeLike,
  PlaybackPhase,
} from "./types";

export interface ArmTransitionOptions {
  nextBeat: BeatView;
  transition: TransitionView;
  ctx: AudioContextLike;
  masterGain: GainNodeLike;
  cache: BoundedAudioCache;
  currentBeat: BeatView | null;
  currentSource: AudioBufferSourceNodeLike | null;
  currentGain: GainNodeLike | null;
  segmentStartTime: number;
  initialOffsetSec: number;
  isPlaying: boolean;
  phase: PlaybackPhase;
  onPhaseChange: (phase: PlaybackPhase) => void;
  onHandoffSuccess: (handoff: ReturnType<typeof resolveHandoffState>) => void;
  onTrackHandoff?: (nextBeat: BeatView) => void;
}

/**
 * Manages 3-node transition scheduling, safety delay timers, and handoff event broadcasting.
 */
export class TransitionCoordinator {
  private armed: ArmedTransitionState | null = null;
  private armCounter = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<(nextBeat: BeatView) => void>();

  /**
   * Returns currently armed transition state if scheduled.
   */
  getArmedTransition(): ArmedTransitionState | null {
    return this.armed;
  }

  /**
   * Registers a listener invoked whenever a scheduled handoff triggers.
   */
  addListener(listener: (nextBeat: BeatView) => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  /**
   * Cancels any pending or armed audio transition splice safely.
   */
  cancel(currentGain: GainNodeLike | null, ctx: AudioContextLike | null): void {
    this.armCounter++;
    this.clearTimer();
    if (!this.armed) return;

    if (currentGain && ctx) {
      try {
        currentGain.gain.cancelScheduledValues(ctx.currentTime);
        currentGain.gain.setValueAtTime(1, ctx.currentTime);
      } catch {
        // Ignore audio param schedule errors
      }
    }

    teardownArmedTransition(this.armed);
    this.armed = null;
  }

  /**
   * Loads buffers and schedules the three-node transition splice ahead of track loop exit.
   */
  async arm(options: ArmTransitionOptions): Promise<void> {
    const {
      nextBeat,
      transition,
      ctx,
      masterGain,
      cache,
      currentBeat,
      currentSource,
      currentGain,
      segmentStartTime,
      initialOffsetSec,
      isPlaying,
      phase,
      onPhaseChange,
      onHandoffSuccess,
      onTrackHandoff,
    } = options;

    if (!currentBeat || !isPlaying || phase === "bridge") return;
    const sourceBeatId = currentBeat.id;
    this.cancel(currentGain, ctx);
    const armId = this.armCounter;

    const [transBuffer, nextBuffer] = await Promise.all([
      cache.get(transition.audioUrl),
      cache.get(nextBeat.audioUrl),
    ]);

    if (
      !isPlaying ||
      this.armCounter !== armId ||
      currentBeat.id !== sourceBeatId
    ) {
      return;
    }

    const schedule = scheduleTrackTransition({
      beat: currentBeat,
      transition,
      audioCtxNow: ctx.currentTime,
      segmentStartTime,
      initialOffsetSec,
    });

    const { armed, delayMs } = buildArmedTransitionState(
      {
        ctx,
        masterGain,
        transBuffer,
        nextBuffer,
        nextBeat,
        transition,
        schedule,
      },
      currentGain,
      currentSource,
    );

    this.armed = armed;
    this.timer = setTimeout(() => {
      this.check(ctx, onPhaseChange, onHandoffSuccess, onTrackHandoff);
    }, delayMs);
    onPhaseChange("armed");
  }

  /**
   * Polls audio clock position to transition phases and fire handoff callbacks.
   */
  check(
    ctx: AudioContextLike | null,
    onPhaseChange: (phase: PlaybackPhase) => void,
    onHandoffSuccess: (handoff: ReturnType<typeof resolveHandoffState>) => void,
    onTrackHandoff?: (nextBeat: BeatView) => void,
  ): void {
    if (!this.armed || !ctx) return;
    const now = ctx.currentTime;
    const armed = this.armed;

    if (now >= armed.schedule.nextStart) {
      this.clearTimer();
      const nextBeat = armed.nextBeat;
      const handoff = resolveHandoffState(armed);
      this.armed = null;
      onPhaseChange("playing");
      onHandoffSuccess(handoff);
      onTrackHandoff?.(nextBeat);
      this.listeners.forEach((fn) => fn(nextBeat));
    } else {
      onPhaseChange(now >= armed.schedule.bridgeStart ? "bridge" : "armed");
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
