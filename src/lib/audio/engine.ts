import type { BeatView, TransitionView } from "../types/beat";
import { BoundedAudioCache } from "./cache";
import { createLoopingTrackNodes } from "./scheduler";
import {
  buildArmedTransitionState,
  computeEngineSnapshot,
  connectSourceToOutputs,
  createDefaultAudioContext,
  fetchAndDecodeAudio,
  resolveHandoffState,
  scheduleTrackTransition,
  setupMasterAudioGraph,
  teardownArmedTransition,
  teardownTrackNodes,
} from "./snapshot";
import type {
  AnalyserNodeLike,
  ArmedTransitionState,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioEngineOptions,
  AudioEngineSnapshot,
  GainNodeLike,
  PlaybackPhase,
} from "./types";
import { applyVinylBrake, applyVinylScratch, applyVinylSpinUp } from "./vinyl";

/**
 * Orchestrates Web Audio playback, native gapless looping, and 3-node transition splices.
 * Manages gain, buffer caching, and clock-accurate state synchronization.
 */
export class AudioEngine {
  private readonly contextFactory?: () => AudioContextLike;
  private readonly cache: BoundedAudioCache;
  private readonly onTrackHandoff?: (nextBeat: BeatView) => void;
  private readonly vinylEffects: boolean;
  private ctx: AudioContextLike | null = null;
  private masterGain: GainNodeLike | null = null;
  private analyser: AnalyserNodeLike | null = null;
  private currentBeat: BeatView | null = null;
  private currentSource: AudioBufferSourceNodeLike | null = null;
  private currentGain: GainNodeLike | null = null;
  private segmentStartTime = 0;
  private initialOffsetSec = 0;
  private pausedOffsetSec = 0;
  private isPlaying = false;
  private phase: PlaybackPhase = "idle";
  private armedTransition: ArmedTransitionState | null = null;
  private continuousPlayStartCtxTime = 0;
  private continuousPlayAccumSec = 0;
  private armCounter = 0;
  private skipCounter = 0;
  private readonly handoffListeners = new Set<(nextBeat: BeatView) => void>();
  private handoffTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initializes the audio engine controller with cache and factory options.
   */
  constructor(options: AudioEngineOptions = {}) {
    this.contextFactory = options.contextFactory;
    const loader =
      options.bufferLoader ??
      ((url) => fetchAndDecodeAudio(url, () => this.getContext()));
    this.cache = new BoundedAudioCache({
      capacity: options.cacheCapacity,
      loader,
    });
    this.onTrackHandoff = options.onTrackHandoff;
    this.vinylEffects = options.vinylEffects ?? false;
  }

  /**
   * Initializes or returns the current AudioContext and master audio graph nodes.
   */
  getContext(): AudioContextLike {
    if (!this.ctx) {
      this.ctx = this.contextFactory
        ? this.contextFactory()
        : createDefaultAudioContext();
      const { masterGain, analyser } = setupMasterAudioGraph(this.ctx);
      this.masterGain = masterGain;
      this.analyser = analyser;
    }
    return this.ctx;
  }

  /**
   * Loads a beat and prepares it for playback without automatically starting.
   */
  async loadTrack(beat: BeatView, initialOffsetSec = 0): Promise<void> {
    this.currentBeat = beat;
    this.initialOffsetSec = initialOffsetSec;
    this.pausedOffsetSec = initialOffsetSec;
    await this.cache.get(beat.audioUrl);
  }

  /**
   * Starts playback of the loaded track using sample-accurate loop points.
   */
  async play(): Promise<void> {
    const targetBeat = this.currentBeat;
    if (!targetBeat) return;
    const ctx = this.getContext();
    if (ctx.state === "suspended") await ctx.resume();

    const buffer = await this.cache.get(targetBeat.audioUrl);
    if (this.currentBeat?.id !== targetBeat.id) return;
    this.stopCurrentNode();

    const { source, gain } = createLoopingTrackNodes(ctx, buffer, targetBeat);
    this.currentSource = source;
    this.currentGain = gain;
    this.currentGain.gain.setValueAtTime(1, ctx.currentTime);
    connectSourceToOutputs(this.currentGain, this.analyser, this.masterGain!);

    this.segmentStartTime = ctx.currentTime;
    this.initialOffsetSec = this.pausedOffsetSec;
    this.continuousPlayStartCtxTime = ctx.currentTime;
    this.currentSource.start(ctx.currentTime, this.pausedOffsetSec);
    if (this.vinylEffects) {
      applyVinylSpinUp({
        source: this.currentSource,
        startTime: ctx.currentTime,
      });
    }
    this.isPlaying = true;
    this.phase = "playing";
  }

  /**
   * Pauses playback, records the playhead position, and cancels armed transitions.
   */
  pause(): void {
    if (!this.isPlaying) return;
    const snapshot = this.getSnapshot();
    this.pausedOffsetSec = snapshot.positionSec;
    this.continuousPlayAccumSec = snapshot.continuousPlaySec;
    this.cancelArmedTransition();
    this.stopCurrentNode(true);
    this.isPlaying = false;
    this.phase = "idle";
  }

  private isArmTargetValid(sourceBeatId: string, armId: number): boolean {
    if (!this.currentBeat || this.currentBeat.id !== sourceBeatId) return false;
    return (
      this.isPlaying && this.phase !== "bridge" && this.armCounter === armId
    );
  }

  /**
   * Pre-loads transition and next track buffers to schedule the three-node splice.
   * Cancels any previously armed transition to prevent duplicate scheduled splices.
   */
  async armTransition(
    nextBeat: BeatView,
    transition: TransitionView,
  ): Promise<void> {
    if (!this.currentBeat || !this.isPlaying || this.phase === "bridge") return;
    const sourceBeatId = this.currentBeat.id;
    this.cancelArmedTransition();
    const armId = this.armCounter;
    const ctx = this.getContext();
    const [transBuffer, nextBuffer] = await Promise.all([
      this.cache.get(transition.audioUrl),
      this.cache.get(nextBeat.audioUrl),
    ]);

    if (!this.isArmTargetValid(sourceBeatId, armId)) return;

    const schedule = scheduleTrackTransition({
      beat: this.currentBeat,
      transition,
      audioCtxNow: ctx.currentTime,
      segmentStartTime: this.segmentStartTime,
      initialOffsetSec: this.initialOffsetSec,
    });

    const { armed, delayMs } = buildArmedTransitionState(
      {
        ctx,
        masterGain: this.masterGain!,
        transBuffer,
        nextBuffer,
        nextBeat,
        transition,
        schedule,
      },
      this.currentGain,
      this.currentSource,
    );
    this.armedTransition = armed;
    this.handoffTimer = setTimeout(() => this.checkHandoff(), delayMs);
    this.phase = "armed";
  }

  /**
   * Registers a callback invoked whenever an armed transition hands off to the next beat.
   * Returns an unregister function to remove the listener.
   */
  setOnTrackHandoff(listener: (nextBeat: BeatView) => void): () => void {
    this.handoffListeners.add(listener);
    return () => void this.handoffListeners.delete(listener);
  }

  /**
   * Skips to the next track. If playing with vinyl effects, powers down, pauses briefly, and spins up.
   */
  async skipToTrack(nextBeat: BeatView): Promise<void> {
    this.cancelArmedTransition();
    const wasPlaying = this.isPlaying;
    const skipId = ++this.skipCounter;

    if (wasPlaying && this.vinylEffects && this.ctx) {
      this.stopCurrentNode(true);
      const loadPromise = this.loadTrack(nextBeat, 0);
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (this.skipCounter !== skipId) return;

      await loadPromise;
      if (this.skipCounter !== skipId) return;

      this.continuousPlayAccumSec = 0;
      await this.play();
      return;
    }

    this.stopCurrentNode(false);
    this.continuousPlayAccumSec = 0;
    await this.loadTrack(nextBeat, 0);
    await this.play();
  }

  /**
   * Returns a snapshot of playback position, loop pass count, countdown, and active phase.
   */
  getSnapshot(): AudioEngineSnapshot {
    this.checkHandoff();
    const ctx = this.ctx;
    const now = ctx ? ctx.currentTime : 0;
    const continuousPlaySec =
      this.continuousPlayAccumSec +
      (this.isPlaying && ctx
        ? Math.max(0, now - this.continuousPlayStartCtxTime)
        : 0);

    return computeEngineSnapshot({
      phase: this.phase,
      currentBeat: this.currentBeat,
      isPlaying: this.isPlaying,
      audioCtxNow: now,
      hasCtx: Boolean(ctx),
      pausedOffsetSec: this.pausedOffsetSec,
      continuousPlaySec,
      segmentStartTime: this.segmentStartTime,
      initialOffsetSec: this.initialOffsetSec,
      armedTransition: this.armedTransition,
    });
  }

  /**
   * Sets master output volume level.
   */
  setVolume(volume: number): void {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this.ctx.currentTime,
    );
  }

  /**
   * Triggers an on-demand turntable scratch effect on the active track.
   */
  scratch(rateMultiplier = 1.6, durationSec = 0.16): void {
    if (!this.currentSource || !this.ctx || !this.isPlaying) return;
    applyVinylScratch({
      source: this.currentSource,
      currentTime: this.ctx.currentTime,
      rateMultiplier,
      durationSec,
    });
  }

  private stopCurrentNode(withBrake = false): void {
    if (!this.currentSource) return;

    if (withBrake && this.vinylEffects && this.ctx) {
      applyVinylBrake({
        source: this.currentSource,
        gain: this.currentGain,
        currentTime: this.ctx.currentTime,
      });
      this.currentSource = null;
      this.currentGain = null;
      return;
    }

    teardownTrackNodes(this.currentSource, this.currentGain);
    this.currentSource = null;
    this.currentGain = null;
  }

  private clearHandoffTimer(): void {
    if (this.handoffTimer) {
      clearTimeout(this.handoffTimer);
      this.handoffTimer = null;
    }
  }

  private cancelArmedTransition(): void {
    this.armCounter++;
    this.clearHandoffTimer();
    if (!this.armedTransition) return;
    if (this.currentGain && this.ctx) {
      this.currentGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.currentGain.gain.setValueAtTime(1, this.ctx.currentTime);
    }
    teardownArmedTransition(this.armedTransition);
    this.armedTransition = null;
    if (this.isPlaying && this.phase === "armed") {
      this.phase = "playing";
    }
  }

  private checkHandoff(): void {
    if (!this.armedTransition || !this.ctx) return;
    const now = this.ctx.currentTime;
    const armed = this.armedTransition;

    if (now >= armed.schedule.nextStart) {
      this.clearHandoffTimer();
      const nextBeat = armed.nextBeat;
      const handoff = resolveHandoffState(armed);
      this.currentBeat = handoff.currentBeat;
      this.currentSource = handoff.currentSource;
      this.currentGain = handoff.currentGain;
      this.segmentStartTime = handoff.segmentStartTime;
      this.initialOffsetSec = handoff.initialOffsetSec;
      this.continuousPlayAccumSec = 0;
      this.continuousPlayStartCtxTime = handoff.segmentStartTime;
      this.armedTransition = null;
      this.phase = "playing";
      this.onTrackHandoff?.(nextBeat);
      this.handoffListeners.forEach((listener) => listener(nextBeat));
    } else {
      this.phase = now >= armed.schedule.bridgeStart ? "bridge" : "armed";
    }
  }
}
