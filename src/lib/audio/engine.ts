import type { BeatView, TransitionView } from "../types/beat";
import { BoundedAudioCache } from "./cache";
import { createLoopingTrackNodes } from "./scheduler";
import { ScratchController } from "./scratch";
import {
  computeEngineSnapshot,
  connectSourceToOutputs,
  createDefaultAudioContext,
  fetchAndDecodeAudio,
  setupMasterAudioGraph,
  teardownTrackNodes,
} from "./snapshot";
import { TransitionCoordinator } from "./transition-coordinator";
import type {
  AnalyserNodeLike,
  AudioBufferLike,
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
 * Manages gain, buffer caching, turntable physics, and clock-accurate state synchronization.
 */
export class AudioEngine {
  private readonly contextFactory?: () => AudioContextLike;
  private readonly cache: BoundedAudioCache;
  private readonly onTrackHandoff?: (nextBeat: BeatView) => void;
  private readonly vinylEffects: boolean;
  private readonly scratchController = new ScratchController();
  private readonly transitions = new TransitionCoordinator();
  private isResumingFromPause = false;
  private currentBuffer: AudioBufferLike | null = null;
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
  private continuousPlayStartCtxTime = 0;
  private continuousPlayAccumSec = 0;
  private skipCounter = 0;

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
    this.isResumingFromPause = false;
    this.currentBuffer = await this.cache.get(beat.audioUrl);
    this.scratchController.reset();
  }

  /**
   * Starts playback of the loaded track using sample-accurate loop points.
   * Spins up playback rate only when resuming from a pause state.
   */
  async play(): Promise<void> {
    const targetBeat = this.currentBeat;
    if (!targetBeat) return;
    const ctx = this.getContext();
    if (ctx.state === "suspended") await ctx.resume();

    const buffer = await this.cache.get(targetBeat.audioUrl);
    if (this.currentBeat?.id !== targetBeat.id) return;
    this.currentBuffer = buffer;
    this.stopCurrentNode();

    const { source, gain } = createLoopingTrackNodes(ctx, buffer, targetBeat);
    this.currentSource = source;
    this.currentGain = gain;
    this.currentGain.gain.setValueAtTime(1, ctx.currentTime);
    connectSourceToOutputs(this.currentGain, this.analyser, this.masterGain!);

    this.initialOffsetSec = this.pausedOffsetSec;
    source.start(ctx.currentTime, this.pausedOffsetSec);

    // Motor spin-up applies only when resuming playback after pause
    if (this.vinylEffects && this.isResumingFromPause) {
      applyVinylSpinUp({ source, startTime: ctx.currentTime });
    }
    this.isResumingFromPause = false;

    this.segmentStartTime = ctx.currentTime;
    this.continuousPlayStartCtxTime = ctx.currentTime;
    this.isPlaying = true;
    this.phase = "playing";
  }

  /**
   * Pauses playback, records the playhead position, and powers down with vinyl brake.
   */
  pause(): void {
    if (!this.isPlaying) return;
    const snapshot = this.getSnapshot();
    this.pausedOffsetSec = snapshot.positionSec;
    this.continuousPlayAccumSec = snapshot.continuousPlaySec;
    this.transitions.cancel(this.currentGain, this.ctx);
    this.stopCurrentNode(true);
    this.isResumingFromPause = true;
    this.isPlaying = false;
    this.phase = "idle";
  }

  /**
   * Pre-loads transition and next track buffers to schedule the three-node splice.
   */
  async armTransition(
    nextBeat: BeatView,
    transition: TransitionView,
  ): Promise<void> {
    const ctx = this.getContext();
    await this.transitions.arm({
      nextBeat,
      transition,
      ctx,
      masterGain: this.masterGain!,
      cache: this.cache,
      currentBeat: this.currentBeat,
      currentSource: this.currentSource,
      currentGain: this.currentGain,
      segmentStartTime: this.segmentStartTime,
      initialOffsetSec: this.initialOffsetSec,
      isPlaying: this.isPlaying,
      phase: this.phase,
      onPhaseChange: (p) => {
        this.phase = p;
      },
      onHandoffSuccess: (handoff) => {
        this.currentBeat = handoff.currentBeat;
        this.currentSource = handoff.currentSource;
        this.currentGain = handoff.currentGain;
        this.segmentStartTime = handoff.segmentStartTime;
        this.initialOffsetSec = handoff.initialOffsetSec;
        this.continuousPlayAccumSec = 0;
        this.continuousPlayStartCtxTime = handoff.segmentStartTime;
      },
      onTrackHandoff: this.onTrackHandoff,
    });
  }

  /**
   * Registers a callback invoked whenever an armed transition hands off to the next beat.
   */
  setOnTrackHandoff(listener: (nextBeat: BeatView) => void): () => void {
    return this.transitions.addListener(listener);
  }

  /**
   * Skips to the next track, powering down active audio and starting the next track directly.
   */
  async skipToTrack(nextBeat: BeatView): Promise<void> {
    this.transitions.cancel(this.currentGain, this.ctx);
    const wasPlaying = this.isPlaying;
    const skipId = ++this.skipCounter;
    this.isResumingFromPause = false;

    if (wasPlaying && this.vinylEffects && this.ctx) {
      this.stopCurrentNode(true);
      const loadPromise = this.loadTrack(nextBeat, 0);
      await new Promise((resolve) => setTimeout(resolve, 800));
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
   * Starts a live manual scratch session by muting background loop playback.
   */
  startManualScratch(): void {
    const ctx = this.getContext();
    if (ctx.state === "suspended") void ctx.resume();

    const currentPos = this.getSnapshot().positionSec;
    if (this.currentGain) {
      this.currentGain.gain.setValueAtTime(0, ctx.currentTime);
    }

    if (this.currentBuffer) {
      this.scratchController.start(
        ctx,
        this.currentBuffer,
        this.analyser ?? this.masterGain!,
        currentPos,
      );
    }
  }

  /**
   * Updates scratch playback rate and direction from pointer movement velocity.
   */
  setScratchVelocity(velocity: number, deltaSec: number): void {
    this.scratchController.update(velocity, deltaSec);
  }

  /**
   * Ends the manual scratch session and returns to normal playback or paused state.
   */
  async stopManualScratch(): Promise<void> {
    const finalPos = this.scratchController.stop();
    if (finalPos === null) return;
    this.pausedOffsetSec = finalPos;

    if (this.isPlaying) {
      this.isResumingFromPause = false;
      await this.play();
    }
  }

  /**
   * Returns a snapshot of playback position, loop pass count, countdown, and active phase.
   */
  getSnapshot(): AudioEngineSnapshot {
    this.transitions.check(
      this.ctx,
      (p) => {
        this.phase = p;
      },
      (handoff) => {
        this.currentBeat = handoff.currentBeat;
        this.currentSource = handoff.currentSource;
        this.currentGain = handoff.currentGain;
        this.segmentStartTime = handoff.segmentStartTime;
        this.initialOffsetSec = handoff.initialOffsetSec;
        this.continuousPlayAccumSec = 0;
        this.continuousPlayStartCtxTime = handoff.segmentStartTime;
      },
      this.onTrackHandoff,
    );

    const ctx = this.ctx;
    const now = ctx ? ctx.currentTime : 0;
    const continuousPlaySec =
      this.continuousPlayAccumSec +
      (this.isPlaying && ctx
        ? Math.max(0, now - this.continuousPlayStartCtxTime)
        : 0);

    const snapshot = computeEngineSnapshot({
      phase: this.phase,
      currentBeat: this.currentBeat,
      isPlaying: this.isPlaying,
      audioCtxNow: now,
      hasCtx: Boolean(ctx),
      pausedOffsetSec: this.pausedOffsetSec,
      continuousPlaySec,
      segmentStartTime: this.segmentStartTime,
      initialOffsetSec: this.initialOffsetSec,
      armedTransition: this.transitions.getArmedTransition(),
    });

    const scratchPos = this.scratchController.getPosition();
    return scratchPos !== null
      ? { ...snapshot, positionSec: scratchPos }
      : snapshot;
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
}
