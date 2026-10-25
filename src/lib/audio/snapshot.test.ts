import { describe, expect, it, vi } from "vitest";
import type { BeatView, TransitionView } from "../types/beat";
import {
  computeEngineSnapshot,
  createDefaultAudioContext,
  fadeOutCurrentSource,
  fetchAndDecodeAudio,
  scheduleTrackTransition,
  setupMasterAudioGraph,
  teardownArmedTransition,
  teardownTrackNodes,
} from "./snapshot";
import type { ArmedTransitionState } from "./types";

describe("computeEngineSnapshot", () => {
  const sampleBeat: BeatView = {
    id: "beat-1",
    name: "Sample Beat",
    audioUrl: "/audio/sample.m4a",
    durationMs: 60000,
    loopStartMs: 10000,
    loopEndMs: 50000,
    bpm: 90,
    transitions: [],
  };

  it("returns paused defaults when idle, not playing, or missing context", () => {
    const snap1 = computeEngineSnapshot({
      phase: "idle",
      currentBeat: null,
      isPlaying: false,
      audioCtxNow: 0,
      hasCtx: false,
      pausedOffsetSec: 5,
      continuousPlaySec: 10,
      segmentStartTime: 0,
      initialOffsetSec: 0,
      armedTransition: null,
    });
    expect(snap1.isPlaying).toBe(false);
    expect(snap1.currentBeat).toBeNull();
    expect(snap1.positionSec).toBe(5);
    expect(snap1.secondsRemaining).toBe(0);

    const snap2 = computeEngineSnapshot({
      phase: "idle",
      currentBeat: sampleBeat,
      isPlaying: false,
      audioCtxNow: 0,
      hasCtx: true,
      pausedOffsetSec: 5,
      continuousPlaySec: 10,
      segmentStartTime: 0,
      initialOffsetSec: 0,
      armedTransition: null,
    });
    expect(snap2.isPlaying).toBe(false);
    expect(snap2.secondsRemaining).toBe(0);
  });

  it("computes active playhead and unarmed countdown to loop exit", () => {
    const snap = computeEngineSnapshot({
      phase: "playing",
      currentBeat: sampleBeat,
      isPlaying: true,
      audioCtxNow: 15,
      hasCtx: true,
      pausedOffsetSec: 0,
      continuousPlaySec: 15,
      segmentStartTime: 0,
      initialOffsetSec: 0,
      armedTransition: null,
    });
    expect(snap.isPlaying).toBe(true);
    expect(snap.positionSec).toBe(15);
    expect(snap.secondsRemaining).toBe(35); // 50s loopEnd - 15s position
  });

  it("computes seconds remaining based on bridgeStart when armed", () => {
    const mockArmed = {
      schedule: {
        bridgeStart: 25,
        nextStart: 32,
      },
    } as unknown as ArmedTransitionState;

    const snapArmed = computeEngineSnapshot({
      phase: "armed",
      currentBeat: sampleBeat,
      isPlaying: true,
      audioCtxNow: 15,
      hasCtx: true,
      pausedOffsetSec: 0,
      continuousPlaySec: 15,
      segmentStartTime: 0,
      initialOffsetSec: 0,
      armedTransition: mockArmed,
    });
    expect(snapArmed.secondsRemaining).toBe(10); // 25 - 15

    const snapBridge = computeEngineSnapshot({
      phase: "bridge",
      currentBeat: sampleBeat,
      isPlaying: true,
      audioCtxNow: 28,
      hasCtx: true,
      pausedOffsetSec: 0,
      continuousPlaySec: 28,
      segmentStartTime: 0,
      initialOffsetSec: 0,
      armedTransition: mockArmed,
    });
    expect(snapBridge.secondsRemaining).toBe(4); // 32 - 28
  });
});

describe("teardownArmedTransition", () => {
  it("stops and disconnects all transition and incoming track audio nodes", () => {
    const mockArmed = {
      transSource: { stop: vi.fn(), disconnect: vi.fn() },
      transGain: { disconnect: vi.fn() },
      nextSource: { stop: vi.fn(), disconnect: vi.fn() },
      nextGain: { disconnect: vi.fn() },
    } as unknown as ArmedTransitionState;

    teardownArmedTransition(mockArmed);

    expect(mockArmed.transSource.stop).toHaveBeenCalled();
    expect(mockArmed.transSource.disconnect).toHaveBeenCalled();
    expect(mockArmed.transGain.disconnect).toHaveBeenCalled();
    expect(mockArmed.nextSource.stop).toHaveBeenCalled();
    expect(mockArmed.nextSource.disconnect).toHaveBeenCalled();
    expect(mockArmed.nextGain.disconnect).toHaveBeenCalled();
  });

  it("handles throwing stop/disconnect methods gracefully", () => {
    const mockArmed = {
      transSource: {
        stop: vi.fn().mockImplementation(() => {
          throw new Error("Already stopped");
        }),
        disconnect: vi.fn(),
      },
      transGain: { disconnect: vi.fn() },
      nextSource: { stop: vi.fn(), disconnect: vi.fn() },
      nextGain: { disconnect: vi.fn() },
    } as unknown as ArmedTransitionState;

    expect(() => teardownArmedTransition(mockArmed)).not.toThrow();
  });
});

describe("teardownTrackNodes", () => {
  it("stops and disconnects source and disconnects gain", () => {
    const source = { stop: vi.fn(), disconnect: vi.fn() };
    const gain = { disconnect: vi.fn() };

    teardownTrackNodes(source, gain);
    expect(source.stop).toHaveBeenCalled();
    expect(source.disconnect).toHaveBeenCalled();
    expect(gain.disconnect).toHaveBeenCalled();
  });

  it("handles null nodes and stopped errors gracefully", () => {
    expect(() => teardownTrackNodes(null, null)).not.toThrow();

    const throwingSource = {
      stop: vi.fn().mockImplementation(() => {
        throw new Error("Already stopped");
      }),
      disconnect: vi.fn(),
    };
    expect(() => teardownTrackNodes(throwingSource, null)).not.toThrow();
  });
});

describe("fadeOutCurrentSource", () => {
  it("schedules fade out curve and stops source", () => {
    const gain = { gain: { setValueCurveAtTime: vi.fn() } };
    const source = { stop: vi.fn() };
    const curve = new Float32Array([1, 0]);

    fadeOutCurrentSource({
      gain,
      source,
      fadeOut: curve,
      bridgeStart: 10,
      crossfadeSec: 0.1,
      stopTime: 10.25,
    });
    expect(gain.gain.setValueCurveAtTime).toHaveBeenCalledWith(curve, 10, 0.1);
    expect(source.stop).toHaveBeenCalledWith(10.25);
  });

  it("does nothing when gain or source is missing", () => {
    const gain = { gain: { setValueCurveAtTime: vi.fn() } };
    const source = { stop: vi.fn() };
    const curve = new Float32Array([1, 0]);

    fadeOutCurrentSource({
      gain: null,
      source,
      fadeOut: curve,
      bridgeStart: 10,
      crossfadeSec: 0.1,
      stopTime: 10.25,
    });
    expect(source.stop).not.toHaveBeenCalled();

    fadeOutCurrentSource({
      gain,
      source: null,
      fadeOut: curve,
      bridgeStart: 10,
      crossfadeSec: 0.1,
      stopTime: 10.25,
    });
    expect(gain.gain.setValueCurveAtTime).not.toHaveBeenCalled();
  });
});

describe("fetchAndDecodeAudio", () => {
  it("fetches array buffer and decodes via audio context", async () => {
    const fakeBuffer = { duration: 10 };
    const mockCtx = {
      decodeAudioData: vi.fn().mockResolvedValue(fakeBuffer),
    };
    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchAndDecodeAudio("http://audio.mp4", () => mockCtx);
    expect(result).toBe(fakeBuffer);
    expect(mockCtx.decodeAudioData).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("throws when fetch response is not ok", async () => {
    const mockCtx = { decodeAudioData: vi.fn() };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, statusText: "Not Found" }),
    );

    await expect(
      fetchAndDecodeAudio("http://missing.mp4", () => mockCtx),
    ).rejects.toThrow("Failed to fetch audio: Not Found");
    vi.unstubAllGlobals();
  });
});

describe("createDefaultAudioContext & setupMasterAudioGraph", () => {
  it("initializes master gain and optional analyser", () => {
    const mockDestination = { connect: vi.fn(), disconnect: vi.fn() };
    const mockGain = { gain: { value: 1 }, connect: vi.fn() };
    const mockAnalyser = { fftSize: 0 };
    const mockCtx = {
      destination: mockDestination,
      createGain: vi.fn().mockReturnValue(mockGain),
      createAnalyser: vi.fn().mockReturnValue(mockAnalyser),
    };

    const graph = setupMasterAudioGraph(mockCtx as never);
    expect(graph.masterGain).toBe(mockGain);
    expect(mockGain.connect).toHaveBeenCalledWith(mockDestination);
    expect(graph.analyser).toBe(mockAnalyser);
    expect(graph.analyser?.fftSize).toBe(256);
  });

  it("handles audio contexts without createAnalyser", () => {
    const mockDestination = { connect: vi.fn(), disconnect: vi.fn() };
    const mockGain = { gain: { value: 1 }, connect: vi.fn() };
    const mockCtx = {
      destination: mockDestination,
      createGain: vi.fn().mockReturnValue(mockGain),
    };

    const graph = setupMasterAudioGraph(mockCtx as never);
    expect(graph.masterGain).toBe(mockGain);
    expect(graph.analyser).toBeNull();
  });

  it("creates default audio context from window constructor", () => {
    class FakeAudioContext {
      state = "running";
    }
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const ctx = createDefaultAudioContext();
    expect(ctx.state).toBe("running");
    vi.unstubAllGlobals();
  });

  it("computes track transition schedule correctly", () => {
    const mockBeat = {
      loopStartMs: 5000,
      loopEndMs: 25000,
    } as BeatView;
    const mockTransition = {
      timing: {
        handleMs: 250,
        crossfadeMs: 100,
        glueMs: 7000,
        landMs: 0,
      },
    } as TransitionView;

    const schedule = scheduleTrackTransition({
      beat: mockBeat,
      transition: mockTransition,
      audioCtxNow: 10,
      segmentStartTime: 0,
      initialOffsetSec: 0,
    });
    expect(schedule.bridgeStart).toBeGreaterThan(0);
    expect(schedule.nextStart).toBeGreaterThan(schedule.bridgeStart);
  });
});
