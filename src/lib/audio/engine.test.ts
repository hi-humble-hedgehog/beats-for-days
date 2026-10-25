import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioEngine } from "./engine";
import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  GainNodeLike,
} from "./types";
import type { BeatView, TransitionView } from "../types/beat";

function createMockAudioContext() {
  let currentTime = 10;
  let state: AudioContextState = "running";
  const createdSources: AudioBufferSourceNodeLike[] = [];
  const createdGains: GainNodeLike[] = [];

  const masterGainParam = {
    value: 1,
    setValueAtTime: vi.fn(),
    setValueCurveAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };

  const masterGain: GainNodeLike = {
    gain: masterGainParam,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const context: AudioContextLike = {
    get currentTime() {
      return currentTime;
    },
    get state() {
      return state;
    },
    destination: {
      connect: vi.fn(),
      disconnect: vi.fn(),
    },
    createGain: () => {
      const param = {
        value: 1,
        setValueAtTime: vi.fn(),
        setValueCurveAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      };
      const gain: GainNodeLike = {
        gain: param,
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      createdGains.push(gain);
      return gain;
    },
    createBufferSource: () => {
      const source: AudioBufferSourceNodeLike = {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        playbackRate: {
          value: 1,
          setValueAtTime: vi.fn(),
          setValueCurveAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      createdSources.push(source);
      return source;
    },
    resume: vi.fn().mockResolvedValue(undefined),
  };

  return {
    context,
    createdSources,
    createdGains,
    masterGain,
    setTime: (t: number) => {
      currentTime = t;
    },
    setState: (s: AudioContextState) => {
      state = s;
    },
  };
}

describe("AudioEngine", () => {
  const defaultTiming = {
    handleMs: 250,
    crossfadeMs: 100,
    glueMs: 7200,
    landMs: 0,
  };

  const trackA: BeatView = {
    id: "track-a",
    name: "Soul Rhodes",
    audioUrl: "/audio/tracks/a.m4a",
    durationMs: 60000,
    loopStartMs: 10000,
    loopEndMs: 50000,
    bpm: 86,
    transitions: [],
  };

  const trackB: BeatView = {
    id: "track-b",
    name: "Jazz Flute",
    audioUrl: "/audio/tracks/b.m4a",
    durationMs: 65000,
    loopStartMs: 15000,
    loopEndMs: 55000,
    bpm: 86,
    transitions: [],
  };

  const transitionAB: TransitionView = {
    id: "tr-a-b",
    targetTrackId: "track-b",
    audioUrl: "/audio/transitions/a-to-b.m4a",
    timing: defaultTiming,
  };

  const trackC: BeatView = {
    id: "track-c",
    name: "Soul Trumpet",
    audioUrl: "/audio/tracks/c.m4a",
    durationMs: 70000,
    loopStartMs: 12000,
    loopEndMs: 52000,
    bpm: 86,
    transitions: [],
  };

  const transitionAC: TransitionView = {
    id: "tr-a-c",
    targetTrackId: "track-c",
    audioUrl: "/audio/transitions/a-to-c.m4a",
    timing: defaultTiming,
  };

  const mockBuffer: AudioBufferLike = {
    duration: 60,
    length: 60 * 44100,
    numberOfChannels: 2,
    sampleRate: 44100,
  };

  let mockAudio: ReturnType<typeof createMockAudioContext>;
  let engine: AudioEngine;

  beforeEach(() => {
    mockAudio = createMockAudioContext();
    engine = new AudioEngine({
      contextFactory: () => mockAudio.context,
      bufferLoader: () => Promise.resolve(mockBuffer),
    });
  });

  it("loads a track and begins playing with native loop points", async () => {
    await engine.loadTrack(trackA);
    await engine.play();

    const snapshot = engine.getSnapshot();
    expect(snapshot.isPlaying).toBe(true);
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.currentBeat?.id).toBe("track-a");

    const source = mockAudio.createdSources[0];
    expect(source).toBeDefined();
    expect(source?.loop).toBe(true);
    expect(source?.loopStart).toBe(10);
    expect(source?.loopEnd).toBe(50);
    expect(source?.start).toHaveBeenCalledWith(10, 0);
  });

  it("pauses playback and preserves playhead position for resume", async () => {
    await engine.loadTrack(trackA);
    await engine.play();

    mockAudio.setTime(25); // 15 seconds elapsed
    engine.pause();

    const snapshot = engine.getSnapshot();
    expect(snapshot.isPlaying).toBe(false);
    expect(snapshot.phase).toBe("idle");
    expect(snapshot.positionSec).toBeCloseTo(15, 2);

    const source = mockAudio.createdSources[0];
    expect(source?.stop).toHaveBeenCalled();

    // Advance clock while paused (10 seconds paused)
    mockAudio.setTime(35);

    // Resume playback restarts source from the paused offset
    await engine.play();
    const resumeSnap = engine.getSnapshot();
    expect(resumeSnap.isPlaying).toBe(true);
    expect(resumeSnap.phase).toBe("playing");
    expect(resumeSnap.positionSec).toBeCloseTo(15, 2);

    const resumeSource = mockAudio.createdSources[1];
    expect(resumeSource).toBeDefined();
    expect(resumeSource?.start).toHaveBeenCalledWith(35, 15);

    // Continuing playback advances position relative to resume point
    mockAudio.setTime(40);
    expect(engine.getSnapshot().positionSec).toBeCloseTo(20, 2);
  });

  it("arms a transition and handles phase progression to bridge and next track", async () => {
    const onHandoff = vi.fn();
    engine = new AudioEngine({
      contextFactory: () => mockAudio.context,
      bufferLoader: () => Promise.resolve(mockBuffer),
      onTrackHandoff: onHandoff,
    });

    mockAudio.setTime(0);
    await engine.loadTrack(trackA);
    await engine.play();

    // Loop end = 50s. minPass = 1 -> pass 1 exit = 50 + 40 = 90s.
    // bridgeStart = 90 - 0.25 = 89.75s.
    // nextStart = 90 + 7.2 = 97.2s.
    await engine.armTransition(trackB, transitionAB);

    expect(engine.getSnapshot().phase).toBe("armed");

    // Advance clock to bridge phase (89.8s) -> countdown shows time until nextStart (97.2 - 89.8 = 7.4 -> ceil 8s)
    mockAudio.setTime(89.8);
    const bridgeSnap = engine.getSnapshot();
    expect(bridgeSnap.phase).toBe("bridge");
    expect(bridgeSnap.secondsRemaining).toBe(8);

    // Advance clock past nextStart (97.3s) -> Track B handoff
    mockAudio.setTime(97.3);
    const postHandoff = engine.getSnapshot();
    expect(postHandoff.phase).toBe("playing");
    expect(postHandoff.currentBeat?.id).toBe("track-b");
    expect(postHandoff.continuousPlaySec).toBeCloseTo(0.1, 2);
    expect(onHandoff).toHaveBeenCalledWith(trackB);
  });

  it("fires onTrackHandoff and setOnTrackHandoff listeners automatically when audio clock reaches nextStart", async () => {
    vi.useFakeTimers();
    const onHandoff = vi.fn();
    const listener = vi.fn();

    engine = new AudioEngine({
      contextFactory: () => mockAudio.context,
      bufferLoader: () => Promise.resolve(mockBuffer),
      onTrackHandoff: onHandoff,
    });

    const unsubscribe = engine.setOnTrackHandoff(listener);

    mockAudio.setTime(0);
    await engine.loadTrack(trackA);
    await engine.play();

    // Loop end = 50s. minPass = 1 -> pass 1 exit = 50 + 40 = 90s.
    // nextStart = 90 + 7.2 = 97.2s -> delay = 97.2s = 97200ms
    await engine.armTransition(trackB, transitionAB);

    expect(onHandoff).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();

    // Advance audio clock and timer to nextStart without calling getSnapshot
    mockAudio.setTime(97.2);
    vi.advanceTimersByTime(97200);

    expect(onHandoff).toHaveBeenCalledWith(trackB);
    expect(listener).toHaveBeenCalledWith(trackB);

    // Unsubscribe removes listener
    unsubscribe();
    mockAudio.setTime(100);
    await engine.armTransition(trackA, transitionAB);
    mockAudio.setTime(197.2);
    vi.advanceTimersByTime(97200);

    expect(listener).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("cancels scheduled fade-out on current track when pausing while armed", async () => {
    mockAudio.setTime(0);
    await engine.loadTrack(trackA);
    await engine.play();
    const trackAGain = mockAudio.createdGains[1]; // 0 is masterGain, 1 is currentGain
    await engine.armTransition(trackB, transitionAB);

    engine.pause();
    expect(trackAGain?.gain.cancelScheduledValues).toHaveBeenCalled();
  });

  it("resumes suspended AudioContext on play and clamps setVolume", async () => {
    mockAudio.setState("suspended");
    await engine.loadTrack(trackA);
    await engine.play();
    expect(mockAudio.context.resume).toHaveBeenCalled();

    const masterGain = mockAudio.createdGains[0];
    engine.setVolume(1.5);
    expect(masterGain?.gain.setValueAtTime).toHaveBeenLastCalledWith(
      1,
      expect.any(Number),
    );
    engine.setVolume(-0.5);
    expect(masterGain?.gain.setValueAtTime).toHaveBeenLastCalledWith(
      0,
      expect.any(Number),
    );
    engine.setVolume(0.75);
    expect(masterGain?.gain.setValueAtTime).toHaveBeenLastCalledWith(
      0.75,
      expect.any(Number),
    );
  });

  it("manual skip performs hard cut immediately and resets continuous play timer", async () => {
    mockAudio.setTime(10);
    await engine.loadTrack(trackA);
    await engine.play();

    mockAudio.setTime(35); // 25s played
    expect(engine.getSnapshot().continuousPlaySec).toBeCloseTo(25, 2);

    // Hard skip to track B
    await engine.skipToTrack(trackB);

    const snapshot = engine.getSnapshot();
    expect(snapshot.currentBeat?.id).toBe("track-b");
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.continuousPlaySec).toBeCloseTo(0, 2);
  });

  it("pausing while armed cancels scheduled transition nodes", async () => {
    mockAudio.setTime(0);
    await engine.loadTrack(trackA);
    await engine.play();
    await engine.armTransition(trackB, transitionAB);

    expect(engine.getSnapshot().phase).toBe("armed");
    engine.pause();

    expect(engine.getSnapshot().phase).toBe("idle");

    // Advancing past what would have been bridge time should not trigger handoff
    mockAudio.setTime(100);
    expect(engine.getSnapshot().currentBeat?.id).toBe("track-a");
  });

  it("cancels existing armed transition when armTransition is called again", async () => {
    mockAudio.setTime(0);
    await engine.loadTrack(trackA);
    await engine.play();

    // Arm first transition (track B)
    await engine.armTransition(trackB, transitionAB);
    expect(engine.getSnapshot().phase).toBe("armed");
    const transSource1 = mockAudio.createdSources[1];
    const nextSource1 = mockAudio.createdSources[2];
    expect(transSource1).toBeDefined();
    expect(nextSource1).toBeDefined();

    // Arm second transition (track C)
    await engine.armTransition(trackC, transitionAC);
    expect(engine.getSnapshot().phase).toBe("armed");

    // The first transition nodes should have been stopped and disconnected
    expect(transSource1?.stop).toHaveBeenCalled();
    expect(transSource1?.disconnect).toHaveBeenCalled();
    expect(nextSource1?.stop).toHaveBeenCalled();
    expect(nextSource1?.disconnect).toHaveBeenCalled();
  });

  it("handles no-op guard conditions when idle or without a loaded beat", async () => {
    // Snapshot before context exists
    const idleSnap = engine.getSnapshot();
    expect(idleSnap.isPlaying).toBe(false);
    expect(idleSnap.currentBeat).toBeNull();
    expect(idleSnap.secondsRemaining).toBe(0);

    // play() without loaded beat does nothing
    await engine.play();
    expect(mockAudio.createdSources).toHaveLength(0);

    // pause() when not playing does nothing
    engine.pause();
    expect(engine.getSnapshot().phase).toBe("idle");

    // armTransition() when not playing does nothing
    await engine.loadTrack(trackA);
    await engine.armTransition(trackB, transitionAB);
    expect(engine.getSnapshot().phase).toBe("idle");

    // setVolume() before context exists does nothing
    engine.setVolume(0.5);
  });

  it("computes secondsRemaining while playing unarmed and applies non-zero landMs at exact boundaries", async () => {
    mockAudio.setTime(10);
    await engine.loadTrack(trackA);
    await engine.play();

    // At t=20 (10s elapsed), exitSec=50 -> 40s remaining until loop exit
    mockAudio.setTime(20);
    expect(engine.getSnapshot().secondsRemaining).toBe(40);

    const transitionWithLand: TransitionView = {
      ...transitionAB,
      timing: {
        handleMs: 250,
        crossfadeMs: 100,
        glueMs: 7200,
        landMs: 8000,
      },
    };

    // Pass 1 exit = 10 + 50 + 40 = 100s. bridgeStart = 99.75s. nextStart = 107.2s.
    await engine.armTransition(trackB, transitionWithLand);

    // Before bridgeStart (99.0s) -> armed, 1s remaining until bridgeStart (99.75 - 99.0 = 0.75 -> ceil 1)
    mockAudio.setTime(99.0);
    const armedSnap = engine.getSnapshot();
    expect(armedSnap.phase).toBe("armed");
    expect(armedSnap.secondsRemaining).toBe(1);

    // Exact bridgeStart boundary (99.75s) -> transitions to bridge phase
    mockAudio.setTime(99.75);
    expect(engine.getSnapshot().phase).toBe("bridge");

    // Exact nextStart boundary (107.2s) -> transitions to playing Track B at landMs (8s)
    mockAudio.setTime(107.2);
    const handoffSnap = engine.getSnapshot();
    expect(handoffSnap.phase).toBe("playing");
    expect(handoffSnap.currentBeat?.id).toBe("track-b");
    expect(handoffSnap.positionSec).toBeCloseTo(8, 3);
  });

  it("connects through AnalyserNode when createAnalyser is available and disconnects nodes on stop", async () => {
    const analyser = {
      fftSize: 0,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    mockAudio.context.createAnalyser = () => analyser;

    await engine.loadTrack(trackA);
    await engine.play();

    expect(analyser.fftSize).toBe(256);
    const trackGain = mockAudio.createdGains[1];
    expect(trackGain?.connect).toHaveBeenCalledWith(analyser);
    expect(analyser.connect).toHaveBeenCalledWith(mockAudio.createdGains[0]);

    const firstSource = mockAudio.createdSources[0];
    engine.pause();
    expect(firstSource?.disconnect).toHaveBeenCalled();
    expect(trackGain?.disconnect).toHaveBeenCalled();
  });

  it("fetches and decodes audio using default loader and throws on HTTP error", async () => {
    const decodeAudioData = vi.fn().mockResolvedValue(mockBuffer);
    const ctxWithDecode = {
      ...mockAudio.context,
      decodeAudioData,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      statusText: "OK",
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
    } as Response);

    const defaultLoaderEngine = new AudioEngine({
      contextFactory: () => ctxWithDecode,
    });

    await defaultLoaderEngine.loadTrack(trackA);
    expect(fetchSpy).toHaveBeenCalledWith("/audio/tracks/a.m4a");
    expect(decodeAudioData).toHaveBeenCalled();

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
    } as Response);

    await expect(defaultLoaderEngine.loadTrack(trackB)).rejects.toThrow(
      "Failed to fetch audio: Not Found",
    );
    fetchSpy.mockRestore();
  });

  it("ignores stale loadTrack and play completions when a newer track is loaded concurrently", async () => {
    let resolveResume!: () => void;
    mockAudio.setState("suspended");
    mockAudio.context.resume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveResume = resolve;
        }),
    );

    let resolveTrackA!: (buf: AudioBufferLike) => void;
    let resolveTrackB!: (buf: AudioBufferLike) => void;

    const concurrentEngine = new AudioEngine({
      contextFactory: () => mockAudio.context,
      bufferLoader: (url) =>
        new Promise<AudioBufferLike>((resolve) => {
          if (url.includes("a.m4a")) {
            resolveTrackA = resolve;
          } else {
            resolveTrackB = resolve;
          }
        }),
    });

    const loadAPromise = concurrentEngine.loadTrack(trackA);
    const playAPromise = concurrentEngine.play();
    const loadBPromise = concurrentEngine.loadTrack(trackB);

    // Track B finishes loading first, then Track A finishes late and resume resolves
    resolveTrackB(mockBuffer);
    await loadBPromise;
    resolveTrackA(mockBuffer);
    await loadAPromise;
    resolveResume();
    await playAPromise;

    expect(concurrentEngine.getSnapshot().currentBeat?.id).toBe("track-b");
    expect(concurrentEngine.getSnapshot().isPlaying).toBe(false);
    expect(mockAudio.createdSources).toHaveLength(0);
  });

  it("ignores stale armTransition completion when track changes while buffers are loading", async () => {
    let resolveBufferB!: (buf: AudioBufferLike) => void;
    let resolveTransitionAB!: (buf: AudioBufferLike) => void;

    const delayedEngine = new AudioEngine({
      contextFactory: () => mockAudio.context,
      bufferLoader: (url) => {
        if (url.includes("/tracks/b.m4a")) {
          return new Promise<AudioBufferLike>((resolve) => {
            resolveBufferB = resolve;
          });
        }
        if (url.includes("/transitions/a-to-b.m4a")) {
          return new Promise<AudioBufferLike>((resolve) => {
            resolveTransitionAB = resolve;
          });
        }
        return Promise.resolve(mockBuffer);
      },
    });

    mockAudio.setTime(0);
    await delayedEngine.loadTrack(trackA);
    await delayedEngine.play();

    // Start arming transition to track B (buffers pending)
    const armPromise = delayedEngine.armTransition(trackB, transitionAB);
    expect(delayedEngine.getSnapshot().phase).toBe("playing");

    // Before buffers resolve, skip to track C
    await delayedEngine.skipToTrack(trackC);
    expect(delayedEngine.getSnapshot().currentBeat?.id).toBe("track-c");

    // Now resolve buffers for track B
    resolveBufferB(mockBuffer);
    resolveTransitionAB(mockBuffer);
    await armPromise;

    // The stale armTransition must not have armed track B on top of track C
    expect(delayedEngine.getSnapshot().phase).toBe("playing");
    expect(delayedEngine.getSnapshot().currentBeat?.id).toBe("track-c");
  });

  it("starts directly on initial play, powers down on pause, and spins up when playing after pause", async () => {
    const vinylEngine = new AudioEngine({
      contextFactory: () => mockAudio.context,
      bufferLoader: () => Promise.resolve(mockBuffer),
      vinylEffects: true,
    });

    mockAudio.setTime(10);
    await vinylEngine.loadTrack(trackA);
    await vinylEngine.play();

    const source = mockAudio.createdSources[0];
    const rateParam = source?.playbackRate;
    // Initial play does not spin-up; starts directly
    expect(rateParam?.exponentialRampToValueAtTime).not.toHaveBeenCalled();

    mockAudio.setTime(20);
    vinylEngine.pause();

    // Pause triggers vinyl brake power-down (750ms duration)
    expect(rateParam?.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      0.001,
      20.75,
    );
    expect(source?.stop).toHaveBeenCalledWith(20.75);

    // Play after pause triggers spin-up (350ms duration)
    mockAudio.setTime(25);
    await vinylEngine.play();
    const secondSource = mockAudio.createdSources[1];
    expect(secondSource?.playbackRate?.setValueAtTime).toHaveBeenCalledWith(
      0.25,
      25,
    );
    expect(
      secondSource?.playbackRate?.exponentialRampToValueAtTime,
    ).toHaveBeenCalledWith(1, 25.35);
  });

  it("powers down with vinyl brake, waits, and starts new track directly on skip when vinylEffects is enabled", async () => {
    vi.useFakeTimers();
    const vinylEngine = new AudioEngine({
      contextFactory: () => mockAudio.context,
      bufferLoader: () => Promise.resolve(mockBuffer),
      vinylEffects: true,
    });

    mockAudio.setTime(10);
    await vinylEngine.loadTrack(trackA);
    await vinylEngine.play();

    const firstSource = mockAudio.createdSources[0];
    const skipPromise = vinylEngine.skipToTrack(trackB);

    // Initial brake was scheduled on first source (750ms duration)
    expect(
      firstSource?.playbackRate?.exponentialRampToValueAtTime,
    ).toHaveBeenCalledWith(0.001, 10.75);

    // Advance fake timer through the power-down and pause gap (800ms)
    await vi.advanceTimersByTimeAsync(800);
    await skipPromise;

    // Second source for track B was created and started directly without spin-up
    expect(mockAudio.createdSources).toHaveLength(2);
    const secondSource = mockAudio.createdSources[1];
    expect(secondSource?.start).toHaveBeenCalledWith(10, 0);
    expect(
      secondSource?.playbackRate?.exponentialRampToValueAtTime,
    ).not.toHaveBeenCalled();
    expect(vinylEngine.getSnapshot().currentBeat?.id).toBe("track-b");

    vi.useRealTimers();
  });

  it("powers down on pause and spins up when playing after pause", async () => {
    const vinylEngine = new AudioEngine({
      contextFactory: () => mockAudio.context,
      bufferLoader: () => Promise.resolve(mockBuffer),
      vinylEffects: true,
    });

    mockAudio.setTime(10);
    await vinylEngine.loadTrack(trackA);
    await vinylEngine.play();

    // First source starts directly
    const firstSource = mockAudio.createdSources[0];
    expect(
      firstSource?.playbackRate?.exponentialRampToValueAtTime,
    ).not.toHaveBeenCalled();

    // Pause triggers power-down vinyl brake (750ms duration)
    mockAudio.setTime(20);
    vinylEngine.pause();
    expect(
      firstSource?.playbackRate?.exponentialRampToValueAtTime,
    ).toHaveBeenCalledWith(0.001, 20.75);

    // Play after pause triggers motor spin-up (350ms duration)
    mockAudio.setTime(25);
    await vinylEngine.play();
    const secondSource = mockAudio.createdSources[1];
    expect(secondSource?.playbackRate?.setValueAtTime).toHaveBeenCalledWith(
      0.25,
      25,
    );
    expect(
      secondSource?.playbackRate?.exponentialRampToValueAtTime,
    ).toHaveBeenCalledWith(1, 25.35);
  });

  it("aborts superseded skip when user skips multiple times quickly with vinylEffects", async () => {
    vi.useFakeTimers();
    const vinylEngine = new AudioEngine({
      contextFactory: () => mockAudio.context,
      bufferLoader: () => Promise.resolve(mockBuffer),
      vinylEffects: true,
    });

    await vinylEngine.loadTrack(trackA);
    await vinylEngine.play();

    // Trigger skip to B, then immediately skip to C before the pause delay completes
    const skip1 = vinylEngine.skipToTrack(trackB);
    const skip2 = vinylEngine.skipToTrack(trackC);

    await vi.advanceTimersByTimeAsync(800);
    await Promise.all([skip1, skip2]);

    expect(vinylEngine.getSnapshot().currentBeat?.id).toBe("track-c");
    vi.useRealTimers();
  });
});
