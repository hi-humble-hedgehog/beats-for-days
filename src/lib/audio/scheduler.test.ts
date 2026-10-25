import { describe, expect, it, vi } from "vitest";
import {
  computeTransitionSchedule,
  createLoopingTrackNodes,
  equalPowerCurve,
  getExitContextTime,
  getPlayheadAndPass,
  scheduleBridgeSpliceNodes,
  shouldTriggerAutoResolution,
} from "./scheduler";
import type { AudioBufferLike, AudioContextLike, GainNodeLike } from "./types";
import type { BeatView, TransitionView } from "../types/beat";

describe("getPlayheadAndPass", () => {
  const timing = {
    segmentStartTime: 10,
    initialOffsetSec: 0,
    entrySec: 8.372,
    exitSec: 50.233,
    durationSec: 61.395,
  };

  it("calculates initial playhead position before playback start time", () => {
    const result = getPlayheadAndPass({
      ...timing,
      audioCtxNow: 9,
    });
    expect(result.pass).toBe(0);
    expect(result.positionSec).toBe(0);
    expect(result.secondsUntilExit).toBeCloseTo(51.233, 3);
  });

  it("handles exact start boundary (elapsed === 0) and exact pass 0 end boundary (elapsed === pass0Duration)", () => {
    const atStart = getPlayheadAndPass({
      ...timing,
      initialOffsetSec: 5,
      audioCtxNow: 10, // elapsed === 0
    });
    expect(atStart.pass).toBe(0);
    expect(atStart.positionSec).toBe(5);
    expect(atStart.secondsUntilExit).toBeCloseTo(45.233, 3);

    const atPass0End = getPlayheadAndPass({
      ...timing,
      audioCtxNow: 10 + 50.233, // elapsed === pass0Duration
    });
    expect(atPass0End.pass).toBe(1);
    expect(atPass0End.positionSec).toBeCloseTo(8.372, 3);
    expect(atPass0End.secondsUntilExit).toBeCloseTo(50.233 - 8.372, 3);
  });

  it("clamps positionSec to durationSec when rawPos exceeds durationSec", () => {
    const pass0Clamp = getPlayheadAndPass({
      segmentStartTime: 0,
      initialOffsetSec: 10,
      entrySec: 10,
      exitSec: 50,
      durationSec: 25,
      audioCtxNow: 20, // rawPos = 30 > 25
    });
    expect(pass0Clamp.positionSec).toBe(25);

    const loopClamp = getPlayheadAndPass({
      segmentStartTime: 0,
      initialOffsetSec: 0,
      entrySec: 10,
      exitSec: 50,
      durationSec: 25,
      audioCtxNow: 70, // pass 1, rem = 20, rawPos = 30 > 25
    });
    expect(loopClamp.positionSec).toBe(25);
  });

  it("tracks playhead during pass 0", () => {
    const result = getPlayheadAndPass({
      ...timing,
      audioCtxNow: 20, // 10s elapsed
    });
    expect(result.pass).toBe(0);
    expect(result.positionSec).toBeCloseTo(10, 3);
    expect(result.secondsUntilExit).toBeCloseTo(40.233, 3);
  });

  it("handles initial offset when starting mid-track (e.g. landMs)", () => {
    const result = getPlayheadAndPass({
      ...timing,
      initialOffsetSec: 5,
      audioCtxNow: 15, // 5s elapsed
    });
    expect(result.pass).toBe(0);
    expect(result.positionSec).toBeCloseTo(10, 3);
    expect(result.secondsUntilExit).toBeCloseTo(40.233, 3);
  });

  it("wraps to pass 1 and loops between entrySec and exitSec", () => {
    // pass0Duration = 50.233s. Loop length = 50.233 - 8.372 = 41.861s.
    // At audioCtxNow = 10 + 50.233 + 10 = 70.233: pass 1, elapsed into loop = 10s.
    const result = getPlayheadAndPass({
      ...timing,
      audioCtxNow: 70.233,
    });
    expect(result.pass).toBe(1);
    expect(result.positionSec).toBeCloseTo(8.372 + 10, 3);
    expect(result.secondsUntilExit).toBeCloseTo(41.861 - 10, 3);
  });

  it("wraps into pass 2 and beyond", () => {
    // 10 + 50.233 + 41.861 + 5 = 107.094: pass 2, 5s into loop
    const result = getPlayheadAndPass({
      ...timing,
      audioCtxNow: 107.094,
    });
    expect(result.pass).toBe(2);
    expect(result.positionSec).toBeCloseTo(8.372 + 5, 3);
    expect(result.secondsUntilExit).toBeCloseTo(41.861 - 5, 3);
  });
});

describe("getExitContextTime", () => {
  const timing = {
    segmentStartTime: 10,
    initialOffsetSec: 0,
    entrySec: 8,
    exitSec: 48,
  };
  // pass0Duration = 48. loopDuration = 40.

  it("calculates exit context time for pass 0", () => {
    const exitTime = getExitContextTime({
      ...timing,
      pass: 0,
    });
    expect(exitTime).toBe(58); // 10 + 48
  });

  it("calculates exit context time for pass 1", () => {
    const exitTime = getExitContextTime({
      ...timing,
      pass: 1,
    });
    expect(exitTime).toBe(98); // 10 + 48 + 40
  });

  it("calculates exit context time for pass 2", () => {
    const exitTime = getExitContextTime({
      ...timing,
      pass: 2,
    });
    expect(exitTime).toBe(138); // 10 + 48 + 80
  });

  it("accounts for initial offset", () => {
    const exitTime = getExitContextTime({
      ...timing,
      initialOffsetSec: 8,
      pass: 1,
    });
    // pass0Duration = 40. loopDuration = 40. pass 1 exit = 10 + 40 + 40 = 90
    expect(exitTime).toBe(90);
  });
});

describe("computeTransitionSchedule", () => {
  const baseConfig = {
    segmentStartTime: 0,
    initialOffsetSec: 0,
    entrySec: 10,
    exitSec: 50, // pass0Duration = 50, loopDuration = 40. Pass 0 exit = 50, Pass 1 exit = 90.
    transitionTiming: {
      handleMs: 250,
      crossfadeMs: 100,
      glueMs: 7200,
      landMs: 0,
    },
    minPass: 1,
    leadSec: 0.4,
  };

  it("selects pass 1 when current time is well ahead of pass 1 exit", () => {
    const schedule = computeTransitionSchedule({
      ...baseConfig,
      audioCtxNow: 30, // 30s is way before pass 1 bridgeStart (90 - 0.25 = 89.75)
    });

    expect(schedule.targetPass).toBe(1);
    expect(schedule.exitTime).toBe(90);
    expect(schedule.bridgeStart).toBeCloseTo(89.75, 4);
    expect(schedule.currentStopTime).toBeCloseTo(89.75 + 0.1 + 0.02, 4);
    expect(schedule.nextStart).toBeCloseTo(90 + 7.2, 4);
    expect(schedule.transitionStopTime).toBeCloseTo(90 + 7.2 + 0.1 + 0.02, 4);
  });

  it("skips pass 1 and selects pass 2 when pass 1 is within safety window", () => {
    // Pass 1 bridgeStart = 89.75. Lead time = 0.4s. Safety cutoff = 89.35.
    const schedule = computeTransitionSchedule({
      ...baseConfig,
      audioCtxNow: 89.5, // Inside lead window
    });

    expect(schedule.targetPass).toBe(2);
    expect(schedule.exitTime).toBe(130); // 50 + 40 * 2 = 130
    expect(schedule.bridgeStart).toBeCloseTo(129.75, 4);
  });

  it("respects custom minPass = 0 when specified and handles exact leadSec boundary", () => {
    const schedule = computeTransitionSchedule({
      ...baseConfig,
      minPass: 0,
      audioCtxNow: 20, // Pass 0 bridgeStart = 49.75
    });

    expect(schedule.targetPass).toBe(0);
    expect(schedule.exitTime).toBe(50);
    expect(schedule.bridgeStart).toBeCloseTo(49.75, 4);

    // Exact boundary: exitTime - handleSec === audioCtxNow + leadSec (89.75 === 89.35 + 0.4)
    const boundarySchedule = computeTransitionSchedule({
      ...baseConfig,
      audioCtxNow: 89.35,
    });
    expect(boundarySchedule.targetPass).toBe(1);
    expect(boundarySchedule.exitTime).toBe(90);
  });
});

describe("shouldTriggerAutoResolution", () => {
  it("returns true when threshold is met and not armed or resolving", () => {
    expect(
      shouldTriggerAutoResolution({
        continuousPlaySec: 30,
        resolveAfterSec: 30,
        isArmed: false,
        isResolving: false,
      }),
    ).toBe(true);

    expect(
      shouldTriggerAutoResolution({
        continuousPlaySec: 35,
        resolveAfterSec: 30,
        isArmed: false,
        isResolving: false,
      }),
    ).toBe(true);
  });

  it("returns false when threshold is not reached", () => {
    expect(
      shouldTriggerAutoResolution({
        continuousPlaySec: 29.9,
        resolveAfterSec: 30,
        isArmed: false,
        isResolving: false,
      }),
    ).toBe(false);
  });

  it("returns false if already armed or resolving", () => {
    expect(
      shouldTriggerAutoResolution({
        continuousPlaySec: 40,
        resolveAfterSec: 30,
        isArmed: true,
        isResolving: false,
      }),
    ).toBe(false);

    expect(
      shouldTriggerAutoResolution({
        continuousPlaySec: 40,
        resolveAfterSec: 30,
        isArmed: false,
        isResolving: true,
      }),
    ).toBe(false);
  });
});

describe("equalPowerCurve", () => {
  it("creates fade-in curve starting at 0 and ending at 1", () => {
    const curve = equalPowerCurve("in", 128);
    expect(curve).toHaveLength(128);
    expect(curve[0]).toBeCloseTo(0, 5);
    expect(curve[127]).toBeCloseTo(1, 5);
    // Center value (sin(pi / 4) ~= 0.7071)
    expect(curve[63.5 | 0]).toBeCloseTo(Math.SQRT1_2, 2);
  });

  it("creates fade-out curve starting at 1 and ending at 0", () => {
    const curve = equalPowerCurve("out", 128);
    expect(curve).toHaveLength(128);
    expect(curve[0]).toBeCloseTo(1, 5);
    expect(curve[127]).toBeCloseTo(0, 5);
    expect(curve[63.5 | 0]).toBeCloseTo(Math.SQRT1_2, 2);
  });

  it("preserves constant power between in and out curves", () => {
    const fadeIn = equalPowerCurve("in", 64);
    const fadeOut = equalPowerCurve("out", 64);

    for (let i = 0; i < 64; i++) {
      const inVal = fadeIn[i] ?? 0;
      const outVal = fadeOut[i] ?? 0;
      const sumOfSquares = inVal * inVal + outVal * outVal;
      expect(sumOfSquares).toBeCloseTo(1, 5);
    }

    // Default length is 128
    expect(equalPowerCurve("in")).toHaveLength(128);
    // Single-element curve avoids division by zero
    expect(equalPowerCurve("out", 1)[0]).toBe(1);
  });
});

describe("createLoopingTrackNodes and scheduleBridgeSpliceNodes", () => {
  const mockBuffer: AudioBufferLike = {
    duration: 60,
    length: 60 * 44100,
    numberOfChannels: 2,
    sampleRate: 44100,
  };

  const nextBeat: BeatView = {
    id: "track-b",
    name: "Jazz Flute",
    audioUrl: "/audio/tracks/b.m4a",
    durationMs: 65000,
    loopStartMs: 15000,
    loopEndMs: 55000,
    bpm: 86,
    transitions: [],
  };

  const transition: TransitionView = {
    id: "tr-a-b",
    targetTrackId: "track-b",
    audioUrl: "/audio/transitions/a-to-b.m4a",
    timing: {
      handleMs: 250,
      crossfadeMs: 100,
      glueMs: 7200,
      landMs: 4000,
    },
  };

  function makeMockCtx(): AudioContextLike {
    return {
      currentTime: 30,
      state: "running",
      destination: { connect: vi.fn(), disconnect: vi.fn() },
      createGain: () => ({
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          setValueCurveAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createBufferSource: () => ({
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      resume: vi.fn().mockResolvedValue(undefined),
    };
  }

  it("configures looping source and gain node in createLoopingTrackNodes", () => {
    const ctx = makeMockCtx();
    const { source, gain } = createLoopingTrackNodes(ctx, mockBuffer, nextBeat);
    expect(source.buffer).toBe(mockBuffer);
    expect(source.loop).toBe(true);
    expect(source.loopStart).toBe(15);
    expect(source.loopEnd).toBe(55);
    expect(source.connect).toHaveBeenCalledWith(gain);
  });

  it("schedules transition and incoming track nodes with equal-power crossfades", () => {
    const ctx = makeMockCtx();
    const masterGain: GainNodeLike = ctx.createGain();
    const schedule = {
      targetPass: 1,
      exitTime: 90,
      bridgeStart: 89.75,
      currentStopTime: 89.87,
      nextStart: 97.2,
      transitionStopTime: 97.32,
    };

    const result = scheduleBridgeSpliceNodes({
      ctx,
      masterGain,
      transBuffer: mockBuffer,
      nextBuffer: mockBuffer,
      nextBeat,
      transition,
      schedule,
    });

    expect(result.crossfadeSec).toBe(0.1);
    expect(result.transSource.loop).toBe(false);
    expect(result.transSource.buffer).toBe(mockBuffer);
    expect(result.transGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 30);
    expect(result.transGain.gain.setValueCurveAtTime).toHaveBeenCalledWith(
      expect.any(Float32Array),
      89.75,
      0.1,
    );
    expect(result.transGain.gain.setValueCurveAtTime).toHaveBeenCalledWith(
      expect.any(Float32Array),
      97.2,
      0.1,
    );
    expect(result.transSource.connect).toHaveBeenCalledWith(result.transGain);
    expect(result.transGain.connect).toHaveBeenCalledWith(masterGain);
    expect(result.transSource.start).toHaveBeenCalledWith(89.75, 0);
    expect(result.transSource.stop).toHaveBeenCalledWith(97.32);

    expect(result.nextGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 30);
    expect(result.nextGain.gain.setValueCurveAtTime).toHaveBeenCalledWith(
      expect.any(Float32Array),
      97.2,
      0.1,
    );
    expect(result.nextGain.connect).toHaveBeenCalledWith(masterGain);
    expect(result.nextSource.start).toHaveBeenCalledWith(97.2, 4);
  });
});
